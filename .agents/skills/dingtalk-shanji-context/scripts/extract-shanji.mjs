#!/usr/bin/env node

import fs from 'fs';

const SHANJI_URL_REGEX =
  /^https?:\/\/shanji\.dingtalk\.com\/app\/transcribes\/[A-Za-z0-9_%\-]+/i;

function parseArgs(argv) {
  const args = {
    url: '',
    storageStatePath: '',
    headless: true,
  };

  const rest = [...argv];
  if (rest.length > 0 && !rest[0].startsWith('--')) {
    args.url = rest.shift().trim();
  }

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token === '--storage-state') {
      args.storageStatePath = String(rest[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (token === '--headful') {
      args.headless = false;
      continue;
    }
  }

  return args;
}

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function linesToSegments(lines) {
  const segments = [];
  const seen = new Set();
  for (const raw of lines) {
    const text = String(raw || '').replace(/\s+/g, ' ').trim();
    if (text.length < 6 || seen.has(text)) {
      continue;
    }
    seen.add(text);
    segments.push({
      index: segments.length + 1,
      text: text.slice(0, 600),
    });
    if (segments.length >= 500) {
      break;
    }
  }
  return segments;
}

function summarize(transcriptText, segments) {
  const snippets = [];
  const sourceLines =
    segments.length > 0 ? segments.map((item) => item.text) : transcriptText.split('\n');
  const seen = new Set();
  for (const line of sourceLines) {
    const text = String(line || '').replace(/\s+/g, ' ').trim();
    if (text.length < 8 || seen.has(text)) {
      continue;
    }
    seen.add(text);
    snippets.push(text.slice(0, 180));
    if (snippets.length >= 5) {
      break;
    }
  }
  const summary =
    transcriptText.trim().length > 0
      ? `共提取 ${segments.length || snippets.length} 条内容。主要内容：${
          snippets.slice(0, 2).join('；') || transcriptText.slice(0, 120)
        }`
      : '未提取到有效正文。';

  return { summary, snippets };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url || !SHANJI_URL_REGEX.test(args.url)) {
    fail(
      'Usage: extract-shanji.mjs <shanji_url> [--storage-state /abs/path/state.json] [--headful]',
      2,
    );
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch (error) {
    fail(
      `playwright-core is required: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const launchOptions = {
    headless: args.headless,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  };

  const browser = await chromium.launch(launchOptions);
  try {
    const contextOptions = {};
    if (args.storageStatePath && fs.existsSync(args.storageStatePath)) {
      contextOptions.storageState = args.storageStatePath;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    const data = await page.evaluate(() => {
      const selectors = [
        '[data-testid*="transcribe"]',
        '[data-testid*="minutes"]',
        '[class*="transcript"]',
        '[class*="minutes"]',
        '[class*="record"]',
        'main',
        'article',
      ];
      const blocks = [];
      for (const selector of selectors) {
        const nodes = Array.from(document.querySelectorAll(selector)).slice(0, 60);
        for (const node of nodes) {
          const text = node.innerText?.trim();
          if (text && text.length > 8) {
            blocks.push(text);
          }
        }
      }
      const bodyText = (document.body?.innerText || '').trim();
      if (bodyText) {
        blocks.push(bodyText);
      }
      const lines = Array.from(
        new Set(
          blocks
            .join('\n')
            .split('\n')
            .map((line) => line.replace(/\s+/g, ' ').trim())
            .filter((line) => line.length > 5),
        ),
      ).slice(0, 800);

      const audioCandidates = [];
      for (const media of Array.from(document.querySelectorAll('audio,video'))) {
        if (media.src) {
          audioCandidates.push(media.src);
        }
        for (const source of Array.from(media.querySelectorAll('source'))) {
          if (source.src) {
            audioCandidates.push(source.src);
          }
        }
      }
      for (const anchor of Array.from(document.querySelectorAll('a[href]')).slice(0, 200)) {
        if (anchor.href) {
          audioCandidates.push(anchor.href);
        }
      }

      return {
        bodyText: bodyText.slice(0, 30000),
        lines,
        audioCandidates: Array.from(new Set(audioCandidates)).slice(0, 200),
      };
    });

    const segments = linesToSegments(data.lines);
    const transcriptText =
      segments.map((item) => item.text).join('\n').trim() || String(data.bodyText || '');
    const audioUrl =
      data.audioCandidates.find((url) =>
        /(\.mp3|\.m4a|\.wav|\.aac|\/audio|queryplayinfo|audiourl)/i.test(url),
      ) || undefined;

    const { summary, snippets } = summarize(transcriptText, segments);
    const output = {
      sourceUrl: args.url,
      summary,
      keySnippets: snippets,
      audioUrl,
      transcriptText,
      transcriptSegments: segments,
      fetchedAt: new Date().toISOString(),
    };

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});

import fs from 'fs';
import type { ShanjiFetchPayload, ShanjiTranscriptSegment } from './shanji.types';

const SHANJI_URL_REGEX =
  /^https?:\/\/shanji\.dingtalk\.com\/app\/transcribes\/[A-Za-z0-9_%\-]+/i;

export class ShanjiPlaywrightFetcher {
  private readonly timeoutMs = this.readPositiveInt(
    process.env.SHANJI_PLAYWRIGHT_TIMEOUT_MS,
    30000,
  );
  private readonly settleMs = this.readPositiveInt(
    process.env.SHANJI_PLAYWRIGHT_SETTLE_MS,
    2500,
  );
  private readonly headless = process.env.SHANJI_PLAYWRIGHT_HEADLESS !== 'false';
  private readonly executablePath =
    process.env.SHANJI_PLAYWRIGHT_EXECUTABLE_PATH?.trim() ||
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
    '';
  private readonly storageStatePath =
    process.env.SHANJI_PLAYWRIGHT_STORAGE_STATE_PATH?.trim() || '';

  async fetch(
    url: string,
    options?: {
      meetingAgentToken?: string;
      meetingAgentTokenKey?: string;
    },
  ): Promise<ShanjiFetchPayload> {
    const sourceUrl = this.normalizeAndValidateUrl(url);

    let playwright: { chromium: { launch: (options?: unknown) => Promise<any> } };
    try {
      playwright = (await import('playwright-core')) as {
        chromium: { launch: (options?: unknown) => Promise<any> };
      };
    } catch (error) {
      throw new Error(
        `[shanji_playwright_missing] Missing playwright-core dependency: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const launchOptions: Record<string, unknown> = {
      headless: this.headless,
      timeout: this.timeoutMs,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    };
    if (this.executablePath) {
      launchOptions.executablePath = this.executablePath;
    }

    const browser = await playwright.chromium.launch(launchOptions);
    try {
      const contextOptions: Record<string, unknown> = {};
      if (this.storageStatePath && fs.existsSync(this.storageStatePath)) {
        contextOptions.storageState = this.storageStatePath;
      }

      const context = await browser.newContext(contextOptions);
      await this.injectMeetingTokenIfNeeded(context, options);
      const page = await context.newPage();

      const apiPayloads: unknown[] = [];
      page.on('response', async (response: any) => {
        const requestUrl = String(response.url?.() ?? '');
        if (!this.isInterestingNetworkUrl(requestUrl)) {
          return;
        }

        const headers =
          typeof response.headers === 'function'
            ? (response.headers() as Record<string, string>)
            : {};
        const contentType = headers['content-type'] || headers['Content-Type'] || '';
        if (!contentType.toLowerCase().includes('application/json')) {
          return;
        }

        try {
          const payload = await response.json();
          apiPayloads.push(payload);
        } catch {
          // ignore invalid json payloads
        }
      });

      await page.goto(sourceUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeoutMs,
      });
      await page.waitForTimeout(this.settleMs);

      const domData = (await page.evaluate(() => {
        const selectorList = [
          '[data-testid*="transcribe"]',
          '[data-testid*="minutes"]',
          '[class*="transcript"]',
          '[class*="minutes"]',
          '[class*="record"]',
          'main',
          'article',
        ];

        const textBlocks: string[] = [];
        for (const selector of selectorList) {
          const nodes = Array.from(document.querySelectorAll(selector)).slice(0, 60);
          for (const node of nodes) {
            const text = (node as HTMLElement).innerText?.trim();
            if (text && text.length > 8) {
              textBlocks.push(text);
            }
          }
        }

        const bodyText = (document.body?.innerText || '').trim();
        if (bodyText) {
          textBlocks.push(bodyText);
        }

        const uniqueLines = Array.from(
          new Set(
            textBlocks
              .join('\n')
              .split('\n')
              .map((line) => line.replace(/\s+/g, ' ').trim())
              .filter((line) => line.length > 5),
          ),
        ).slice(0, 800);

        const audioCandidates: string[] = [];
        for (const media of Array.from(document.querySelectorAll('audio,video'))) {
          const mediaSrc = (media as HTMLMediaElement).src;
          if (mediaSrc) {
            audioCandidates.push(mediaSrc);
          }
          for (const sourceNode of Array.from(media.querySelectorAll('source'))) {
            const sourceSrc = (sourceNode as HTMLSourceElement).src;
            if (sourceSrc) {
              audioCandidates.push(sourceSrc);
            }
          }
        }

        for (const anchor of Array.from(document.querySelectorAll('a[href]')).slice(0, 200)) {
          const href = (anchor as HTMLAnchorElement).href;
          if (href) {
            audioCandidates.push(href);
          }
        }

        return {
          bodyText: bodyText.slice(0, 30000),
          lineCandidates: uniqueLines,
          audioCandidates: Array.from(new Set(audioCandidates)).slice(0, 200),
        };
      })) as {
        bodyText: string;
        lineCandidates: string[];
        audioCandidates: string[];
      };

      const networkSegments: ShanjiTranscriptSegment[] = [];
      const networkAudioCandidates: string[] = [];
      for (const payload of apiPayloads) {
        this.extractFromPayload(payload, networkSegments, networkAudioCandidates, 0);
      }

      const domSegments = this.linesToSegments(domData.lineCandidates);
      const transcriptSegments = this.dedupeSegments([...networkSegments, ...domSegments]);
      const transcriptText = transcriptSegments
        .map((segment) => segment.text)
        .join('\n')
        .trim() || domData.bodyText.trim();

      if (!transcriptText) {
        throw new Error('[shanji_playwright_empty] No transcript content extracted from page.');
      }

      const audioUrl = this.pickBestAudioUrl([
        ...networkAudioCandidates,
        ...domData.audioCandidates,
      ]);

      return {
        sourceUrl,
        transcriptText,
        transcriptSegments,
        audioUrl,
      };
    } finally {
      await browser.close();
    }
  }

  private normalizeAndValidateUrl(url: string): string {
    const normalized = typeof url === 'string' ? url.trim() : '';
    if (!normalized) {
      throw new Error('[shanji_url_required] Shanji URL is required.');
    }
    if (!SHANJI_URL_REGEX.test(normalized)) {
      throw new Error('[shanji_url_invalid] Unsupported Shanji URL.');
    }
    return normalized;
  }

  private isInterestingNetworkUrl(url: string): boolean {
    if (!url) {
      return false;
    }
    return (
      url.includes('/r/Adaptor/') ||
      url.includes('queryAudioSegments') ||
      url.includes('queryMeetingBrief') ||
      url.includes('queryPlayInfo') ||
      url.includes('listMinutesTextRecord') ||
      url.includes('queryRecordingMinutesByBizInfo')
    );
  }

  private extractFromPayload(
    payload: unknown,
    transcriptSegments: ShanjiTranscriptSegment[],
    audioCandidates: string[],
    depth: number,
  ): void {
    if (depth > 8 || payload === null || payload === undefined) {
      return;
    }

    if (Array.isArray(payload)) {
      for (const item of payload) {
        this.extractFromPayload(item, transcriptSegments, audioCandidates, depth + 1);
      }
      return;
    }

    if (typeof payload !== 'object') {
      return;
    }

    const record = payload as Record<string, unknown>;
    const text = this.pickTextCandidate(record);
    if (text) {
      const startMs = this.readTimeValue(record, [
        'start',
        'startTime',
        'startMs',
        'start_time',
      ]);
      const endMs = this.readTimeValue(record, ['end', 'endTime', 'endMs', 'end_time']);
      const speaker = this.readString(record, ['speaker', 'speakerName', 'role']);
      transcriptSegments.push({
        index: transcriptSegments.length + 1,
        text,
        startMs,
        endMs,
        speaker,
      });
    }

    const audioUrl = this.pickAudioCandidate(record);
    if (audioUrl) {
      audioCandidates.push(audioUrl);
    }

    for (const value of Object.values(record)) {
      this.extractFromPayload(value, transcriptSegments, audioCandidates, depth + 1);
    }
  }

  private pickTextCandidate(record: Record<string, unknown>): string | undefined {
    const candidates = [
      'text',
      'content',
      'sentence',
      'transcript',
      'transcriptText',
      'recordText',
      'value',
      'paragraph',
    ];
    for (const key of candidates) {
      const value = record[key];
      if (typeof value === 'string') {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (normalized.length > 6) {
          return normalized.slice(0, 600);
        }
      }
    }
    return undefined;
  }

  private pickAudioCandidate(record: Record<string, unknown>): string | undefined {
    const preferredKeys = [
      'audioUrl',
      'audio_url',
      'playUrl',
      'play_url',
      'audioPlayUrl',
      'mediaUrl',
    ];
    for (const key of preferredKeys) {
      const value = record[key];
      if (typeof value === 'string' && this.looksLikeAudioUrl(value)) {
        return value;
      }
    }

    const rawUrl = record.url;
    if (typeof rawUrl === 'string' && this.looksLikeAudioUrl(rawUrl)) {
      return rawUrl;
    }
    return undefined;
  }

  private looksLikeAudioUrl(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      return false;
    }
    return (
      normalized.includes('.mp3') ||
      normalized.includes('.m4a') ||
      normalized.includes('.wav') ||
      normalized.includes('.aac') ||
      normalized.includes('/audio') ||
      normalized.includes('queryplayinfo') ||
      normalized.includes('audiourl')
    );
  }

  private readString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string') {
        const normalized = value.trim();
        if (normalized) {
          return normalized.slice(0, 80);
        }
      }
    }
    return undefined;
  }

  private readTimeValue(record: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.round(value));
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return Math.max(0, Math.round(parsed));
        }
      }
    }
    return undefined;
  }

  private linesToSegments(lines: string[]): ShanjiTranscriptSegment[] {
    const segments: ShanjiTranscriptSegment[] = [];
    for (const line of lines) {
      const normalized = line.replace(/\s+/g, ' ').trim();
      if (normalized.length < 6) {
        continue;
      }
      segments.push({
        index: segments.length + 1,
        text: normalized.slice(0, 600),
      });
      if (segments.length >= 300) {
        break;
      }
    }
    return segments;
  }

  private dedupeSegments(segments: ShanjiTranscriptSegment[]): ShanjiTranscriptSegment[] {
    const deduped: ShanjiTranscriptSegment[] = [];
    const seen = new Set<string>();
    for (const segment of segments) {
      const text = segment.text?.replace(/\s+/g, ' ').trim();
      if (!text) {
        continue;
      }
      const dedupeKey = `${segment.startMs ?? 'na'}|${text}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      deduped.push({
        ...segment,
        index: deduped.length + 1,
        text,
      });
      if (deduped.length >= 600) {
        break;
      }
    }
    return deduped;
  }

  private pickBestAudioUrl(candidates: string[]): string | undefined {
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }
      const normalized = candidate.trim();
      if (this.looksLikeAudioUrl(normalized)) {
        return normalized;
      }
    }
    return undefined;
  }

  private readPositiveInt(raw: string | undefined, fallback: number): number {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
    return fallback;
  }

  private async injectMeetingTokenIfNeeded(
    context: {
    addCookies: (cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      secure: boolean;
      httpOnly: boolean;
      sameSite: 'Lax' | 'None' | 'Strict';
    }>) => Promise<void>;
    addInitScript: (
      script: (input: { token: string; key: string }) => void,
      arg: { token: string; key: string },
    ) => Promise<void>;
    },
    options?: {
      meetingAgentToken?: string;
      meetingAgentTokenKey?: string;
    },
  ): Promise<void> {
    const token =
      typeof options?.meetingAgentToken === 'string'
        ? options.meetingAgentToken.trim()
        : '';
    if (!token) {
      return;
    }

    const tokenKey =
      typeof options?.meetingAgentTokenKey === 'string' && options.meetingAgentTokenKey.trim()
        ? options.meetingAgentTokenKey.trim()
        : 'dt-meeting-agent-token';

    await context.addCookies([
      {
        name: tokenKey,
        value: token,
        domain: 'shanji.dingtalk.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
      },
    ]);

    await context.addInitScript(
      ({ token, key }) => {
        try {
          localStorage.setItem(key, token);
        } catch {
          // ignore storage errors
        }
        try {
          sessionStorage.setItem(key, token);
        } catch {
          // ignore storage errors
        }
      },
      {
        token,
        key: tokenKey,
      },
    );
  }
}

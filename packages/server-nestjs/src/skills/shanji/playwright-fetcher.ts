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
  private readonly executablePath = this.resolveExecutablePath();
  private readonly storageStatePath =
    process.env.SHANJI_PLAYWRIGHT_STORAGE_STATE_PATH?.trim() || '';
  private readonly tokenAliasKeys = [
    'dt-meeting-agent-token',
    'meeting-agent-token',
    'meetingAgentToken',
    'agent-token',
  ];

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

    const headlessModes = this.resolveHeadlessModes(options?.meetingAgentToken);
    let lastError: unknown;
    for (const headless of headlessModes) {
      try {
        return await this.fetchWithHeadless(playwright, sourceUrl, headless, options);
      } catch (error) {
        lastError = error;
        if (
          !options?.meetingAgentToken ||
          !this.isAuthRequiredError(error) ||
          headlessModes[headlessModes.length - 1] === headless
        ) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async fetchWithHeadless(
    playwright: { chromium: { launch: (options?: unknown) => Promise<any> } },
    sourceUrl: string,
    headless: boolean,
    options?: {
      meetingAgentToken?: string;
      meetingAgentTokenKey?: string;
    },
  ): Promise<ShanjiFetchPayload> {
    const launchOptions: Record<string, unknown> = {
      headless,
      timeout: this.timeoutMs,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    };
    if (this.executablePath) {
      launchOptions.executablePath = this.executablePath;
    }

    let browser: any;
    try {
      browser = await playwright.chromium.launch(launchOptions);
    } catch (error) {
      throw this.toLaunchError(error);
    }
    try {
      const contextOptions: Record<string, unknown> = {};
      if (this.storageStatePath && fs.existsSync(this.storageStatePath)) {
        contextOptions.storageState = this.storageStatePath;
      }

      const context = await browser.newContext(contextOptions);
      await this.injectMeetingTokenIfNeeded(context, options);
      const page = await context.newPage();

      const apiPayloads: unknown[] = [];
      const interestingResponses: Array<{ url: string; status: number; body?: unknown }> = [];
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
          interestingResponses.push({
            url: requestUrl,
            status: typeof response.status === 'function' ? Number(response.status()) : 0,
            body: payload,
          });
        } catch {
          // ignore invalid json payloads
        }
      });

      await page.goto(sourceUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeoutMs,
      });
      await this.waitForTranscriptSignals(page, options?.meetingAgentToken);
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
      let preferredTranscriptText = '';
      for (const payload of apiPayloads) {
        this.extractFromPayload(payload, networkSegments, networkAudioCandidates, 0);
        const structuredTranscript = this.extractPreferredTranscriptText(payload);
        if (structuredTranscript && structuredTranscript.length > preferredTranscriptText.length) {
          preferredTranscriptText = structuredTranscript;
        }
      }

      const domSegments = this.linesToSegments(domData.lineCandidates);
      const transcriptSegments = this.dedupeSegments([...networkSegments, ...domSegments]);
      const transcriptText =
        preferredTranscriptText ||
        transcriptSegments
          .map((segment) => segment.text)
          .join('\n')
          .trim() ||
        domData.bodyText.trim();

      if (!transcriptText) {
        throw new Error('[shanji_playwright_empty] No transcript content extracted from page.');
      }

      this.assertNoAuthInterstitial(
        transcriptText,
        interestingResponses.map((item) => item.body),
      );

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

  private resolveHeadlessModes(meetingAgentToken?: string): boolean[] {
    if (!meetingAgentToken) {
      return [this.headless];
    }

    return this.headless ? [true, false] : [false, true];
  }

  private isAuthRequiredError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('[shanji_auth_required]');
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

  private resolveExecutablePath(): string {
    const explicit =
      process.env.SHANJI_PLAYWRIGHT_EXECUTABLE_PATH?.trim() ||
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
      '';
    if (explicit) {
      return explicit;
    }

    for (const candidate of this.getBrowserExecutableCandidates()) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return '';
  }

  private getBrowserExecutableCandidates(): string[] {
    switch (process.platform) {
      case 'darwin':
        return [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ];
      case 'win32': {
        const prefixes = [
          process.env.PROGRAMFILES,
          process.env['PROGRAMFILES(X86)'],
          process.env.LOCALAPPDATA,
        ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        return prefixes.flatMap((prefix) => [
          `${prefix}\\Google\\Chrome\\Application\\chrome.exe`,
          `${prefix}\\Chromium\\Application\\chrome.exe`,
          `${prefix}\\Microsoft\\Edge\\Application\\msedge.exe`,
        ]);
      }
      default:
        return [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/snap/bin/chromium',
          '/usr/bin/microsoft-edge',
        ];
    }
  }

  private toLaunchError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Executable doesn't exist")) {
      const hint =
        this.executablePath
          ? `Configured executable not found: ${this.executablePath}`
          : 'No browser executable was auto-detected. Set SHANJI_PLAYWRIGHT_EXECUTABLE_PATH or install Google Chrome / Chromium / Microsoft Edge.';
      return new Error(`[shanji_playwright_launch_failed] ${hint}; original=${message}`);
    }

    return new Error(`[shanji_playwright_launch_failed] ${message}`);
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

  private extractPreferredTranscriptText(payload: unknown, depth = 0): string | undefined {
    if (depth > 8 || payload === null || payload === undefined) {
      return undefined;
    }

    if (Array.isArray(payload)) {
      let longest = '';
      for (const item of payload) {
        const candidate = this.extractPreferredTranscriptText(item, depth + 1);
        if (candidate && candidate.length > longest.length) {
          longest = candidate;
        }
      }
      return longest || undefined;
    }

    if (typeof payload !== 'object') {
      return undefined;
    }

    const record = payload as Record<string, unknown>;
    const fullTextSummary = this.readFullTextSummary(record);
    if (fullTextSummary) {
      return fullTextSummary;
    }

    let longest = '';
    for (const value of Object.values(record)) {
      const candidate = this.extractPreferredTranscriptText(value, depth + 1);
      if (candidate && candidate.length > longest.length) {
        longest = candidate;
      }
    }

    return longest || undefined;
  }

  private readFullTextSummary(record: Record<string, unknown>): string | undefined {
    const candidate = record.fullTextSummary;
    if (typeof candidate === 'string') {
      const normalized = candidate.replace(/\s+/g, ' ').trim();
      return normalized.length > 20 ? normalized : undefined;
    }
    if (!candidate || typeof candidate !== 'object') {
      return undefined;
    }

    const value = (candidate as Record<string, unknown>).value;
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 20 ? normalized.slice(0, 120000) : undefined;
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
      script: (input: { token: string; key: string; keys: string[] }) => void,
      arg: { token: string; key: string; keys: string[] },
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

    const cookieKeys = Array.from(new Set([tokenKey, ...this.tokenAliasKeys]));
    await context.addCookies(
      cookieKeys.map((key) => ({
        name: key,
        value: token,
        domain: 'shanji.dingtalk.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax' as const,
      })),
    );

    await context.addInitScript(
      ({ token, key, keys }) => {
        try {
          for (const alias of keys) {
            try {
              localStorage.setItem(alias, token);
            } catch {
              // ignore storage errors
            }
            try {
              sessionStorage.setItem(alias, token);
            } catch {
              // ignore storage errors
            }
          }
        } catch {
          // ignore storage errors
        }
        try {
          document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(token)}; path=/; domain=shanji.dingtalk.com; secure; SameSite=Lax`;
        } catch {
          // ignore cookie write errors
        }
      },
      {
        token,
        key: tokenKey,
        keys: cookieKeys,
      },
    );
  }

  private async waitForTranscriptSignals(
    page: {
      waitForResponse: (
        predicate: (response: any) => boolean,
        options?: { timeout?: number },
      ) => Promise<unknown>;
      waitForFunction: (
        pageFunction: () => boolean,
        options?: { timeout?: number },
      ) => Promise<unknown>;
      waitForTimeout: (timeout: number) => Promise<void>;
    },
    meetingAgentToken?: string,
  ): Promise<void> {
    const authTimeout = Math.min(this.timeoutMs, 12000);
    const transcriptTimeout = Math.min(this.timeoutMs, 18000);
    const settleBoost = meetingAgentToken ? 5500 : 1500;

    if (meetingAgentToken) {
      await page
        .waitForResponse(
          (response: any) => {
            const url = String(response.url?.() ?? '');
            if (!this.isAuthBootstrapNetworkUrl(url)) {
              return false;
            }
            const status = typeof response.status === 'function' ? Number(response.status()) : 0;
            return status >= 200 && status < 500;
          },
          { timeout: authTimeout },
        )
        .catch(() => undefined);
    }

    const transcriptResponseWait = page
      .waitForResponse(
        (response: any) => {
          const url = String(response.url?.() ?? '');
          if (!this.isTranscriptBearingNetworkUrl(url)) {
            return false;
          }
          const status = typeof response.status === 'function' ? Number(response.status()) : 0;
          return status >= 200 && status < 500;
        },
        { timeout: transcriptTimeout },
      )
      .catch(() => undefined);

    const domWait = page
      .waitForFunction(
        () => {
          const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
          return (
            text.includes('AI 纪要') ||
            text.includes('章节') ||
            text.includes('发言人') ||
            text.includes('会议主要围绕') ||
            text.includes('开票流程') ||
            text.includes('注册流程')
          );
        },
        { timeout: transcriptTimeout },
      )
      .catch(() => undefined);

    await Promise.race([transcriptResponseWait, domWait]);
    await page.waitForTimeout(settleBoost);
  }

  private assertNoAuthInterstitial(
    transcriptText: string,
    responsePayloads: unknown[],
  ): void {
    const normalized = transcriptText.replace(/\s+/g, ' ').trim();
    if (
      this.containsMeaningfulTranscript(normalized) ||
      responsePayloads.some((payload) => this.hasSuccessfulMeetingBrief(payload))
    ) {
      return;
    }

    const authMarkers = [
      '欢迎使用企业账号',
      '企业账号支持登录后用于办公',
      '绑定手机号码',
      '绑定邮箱',
      '服务协议、隐私政策、企业账号使用须知',
    ];
    const authMarkerHits = authMarkers.reduce(
      (count, marker) => count + (normalized.includes(marker) ? 1 : 0),
      0,
    );
    if (authMarkerHits >= 2) {
      throw new Error(
        '[shanji_auth_required] Extracted page looks like a DingTalk login or enterprise account screen, not transcript content.',
      );
    }
  }

  private hasSuccessfulMeetingBrief(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }
    const record = payload as Record<string, unknown>;
    const data = record.data;
    if (!data || typeof data !== 'object') {
      return false;
    }
    const result = (data as Record<string, unknown>).result;
    if (!result || typeof result !== 'object') {
      return false;
    }
    return Boolean(this.readFullTextSummary(result as Record<string, unknown>));
  }

  private containsMeaningfulTranscript(text: string): boolean {
    if (!text) {
      return false;
    }
    const positiveMarkers = [
      '会议主要围绕',
      'AI 纪要',
      '发言人',
      '章节',
      '税务工单',
      '开票流程',
      '发票开具',
      '注册流程',
    ];
    return positiveMarkers.some((marker) => text.includes(marker));
  }

  private isAuthBootstrapNetworkUrl(url: string): boolean {
    if (!url) {
      return false;
    }
    return (
      url.includes('generateDingUserToken') ||
      url.includes('getUserInfo')
    );
  }

  private isTranscriptBearingNetworkUrl(url: string): boolean {
    if (!url) {
      return false;
    }
    return (
      url.includes('queryMeetingBrief') ||
      url.includes('minutesDetailV') ||
      url.includes('queryRecordingMinutesByBizInfo') ||
      url.includes('listMinutesTextRecord') ||
      url.includes('queryAudioSegments')
    );
  }
}

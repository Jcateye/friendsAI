import { Injectable, Optional } from '@nestjs/common';
import { inspectMeetingAgentToken } from './meeting-token.util';
import { ShanjiMcpFetcher } from './mcp-fetcher';
import { ShanjiPlaywrightFetcher } from './playwright-fetcher';
import type { ShanjiExtractResult, ShanjiFetchPayload, ShanjiTranscriptSegment } from './shanji.types';

type ShanjiFetchMode = 'playwright' | 'mcp';

const SHANJI_UI_NOISE_PATTERNS = [
  /^👋?\s*hi[,，]?/i,
  /我可以帮你干点什么/i,
  /问答范围/i,
  /帮我提炼一下重点内容/i,
  /不同发言人的核心观点是什么/i,
  /AI\s*[问纪]答/i,
  /^章节$/,
  /^发言人$/,
  /主题模板/i,
  /AI 模型/i,
  /^登录$/,
  /^打开钉钉$/,
  /^立即登录$/,
  /体验完整听记功能/,
];

@Injectable()
export class ShanjiExtractorService {
  private readonly configuredMode = this.resolveConfiguredMode();
  private readonly enableMcpFallback = process.env.SHANJI_ENABLE_MCP_FALLBACK === 'true';

  constructor(
    @Optional() private readonly playwrightFetcher = new ShanjiPlaywrightFetcher(),
    @Optional() private readonly mcpFetcher = new ShanjiMcpFetcher(),
  ) { }

  async extractFromUrl(input: {
    url: string;
    meetingAgentToken?: string;
    meetingAgentTokenKey?: string;
  }): Promise<ShanjiExtractResult> {
    const normalizedToken = this.normalizeMeetingAgentToken(input.meetingAgentToken);
    const preferredMode: ShanjiFetchMode = this.configuredMode === 'mcp' ? 'mcp' : 'playwright';
    const fallbackMode: ShanjiFetchMode = preferredMode === 'playwright' ? 'mcp' : 'playwright';

    try {
      const payload = await this.fetchByMode(preferredMode, {
        ...input,
        meetingAgentToken: normalizedToken,
      });
      return this.toResult(payload, preferredMode);
    } catch (primaryError) {
      if (!this.enableMcpFallback) {
        throw this.toExtractError(primaryError, preferredMode, undefined);
      }

      try {
        const payload = await this.fetchByMode(fallbackMode, {
          ...input,
          meetingAgentToken: normalizedToken,
        });
        return this.toResult(payload, fallbackMode);
      } catch (fallbackError) {
        throw this.toExtractError(primaryError, preferredMode, fallbackError);
      }
    }
  }

  private async fetchByMode(
    mode: ShanjiFetchMode,
    input: {
      url: string;
      meetingAgentToken?: string;
      meetingAgentTokenKey?: string;
    },
  ): Promise<ShanjiFetchPayload> {
    if (mode === 'mcp') {
      return this.mcpFetcher.fetch(input.url);
    }
    return this.playwrightFetcher.fetch(input.url, {
      meetingAgentToken: input.meetingAgentToken,
      meetingAgentTokenKey: input.meetingAgentTokenKey,
    });
  }

  private toResult(payload: ShanjiFetchPayload, fetchMode: ShanjiFetchMode): ShanjiExtractResult {
    const normalizedSegments = this.normalizeSegments(payload.transcriptSegments);
    const transcriptText = this.normalizeTranscriptText(
      payload.transcriptText,
      normalizedSegments.map((segment) => segment.text).join('\n'),
    );
    this.assertTranscriptLooksUsable(transcriptText);
    const keySnippets = this.buildKeySnippets(transcriptText, normalizedSegments);
    const summary = this.buildSummary(transcriptText, normalizedSegments, keySnippets);

    return {
      sourceUrl: payload.sourceUrl,
      transcriptText,
      transcriptSegments: normalizedSegments,
      audioUrl: payload.audioUrl,
      summary,
      keySnippets,
      fetchMode,
      fetchedAt: new Date().toISOString(),
    };
  }

  private normalizeSegments(segments: ShanjiTranscriptSegment[]): ShanjiTranscriptSegment[] {
    const normalized: ShanjiTranscriptSegment[] = [];
    const dedupe = new Set<string>();

    for (const segment of segments) {
      const text = segment.text?.replace(/\s+/g, ' ').trim();
      if (!text) {
        continue;
      }
      if (this.isTranscriptNoise(text)) {
        continue;
      }

      const dedupeKey = `${segment.startMs ?? 'na'}|${text}`;
      if (dedupe.has(dedupeKey)) {
        continue;
      }
      dedupe.add(dedupeKey);

      normalized.push({
        index: normalized.length + 1,
        text: text.slice(0, 600),
        startMs: typeof segment.startMs === 'number' ? Math.max(0, Math.round(segment.startMs)) : undefined,
        endMs: typeof segment.endMs === 'number' ? Math.max(0, Math.round(segment.endMs)) : undefined,
        speaker: segment.speaker ? segment.speaker.slice(0, 80) : undefined,
      });
      if (normalized.length >= 600) {
        break;
      }
    }

    return normalized;
  }

  private normalizeTranscriptText(primary: string, fallback: string): string {
    const raw = (primary || fallback || '').replace(/\r\n/g, '\n').trim();
    if (!raw) {
      return '';
    }
    return raw.slice(0, 120000);
  }

  private buildKeySnippets(
    transcriptText: string,
    segments: ShanjiTranscriptSegment[],
  ): string[] {
    const snippets: string[] = [];
    const seen = new Set<string>();

    const transcriptLines = this.extractMeaningfulTranscriptLines(transcriptText);
    const sourceLines =
      transcriptLines.length > 0
        ? transcriptLines
        : segments.map((segment) => segment.text);

    for (const line of sourceLines) {
      const normalized = line.replace(/\s+/g, ' ').trim();
      if (normalized.length < 8) {
        continue;
      }
      if (this.isTranscriptNoise(normalized)) {
        continue;
      }
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      snippets.push(normalized.slice(0, 180));
      if (snippets.length >= 5) {
        break;
      }
    }

    return snippets;
  }

  private buildSummary(
    transcriptText: string,
    segments: ShanjiTranscriptSegment[],
    keySnippets: string[],
  ): string {
    if (!transcriptText) {
      return '未提取到可用正文内容。';
    }

    const transcriptLines = this.extractMeaningfulTranscriptLines(transcriptText);
    const leadSentence =
      transcriptLines.find((line) => /[。！？!?；;]/.test(line)) ??
      transcriptLines[0] ??
      keySnippets[0] ??
      transcriptText.slice(0, 160);
    const segmentInfo = segments.length > 0 ? `共提取 ${segments.length} 条记录。` : '已提取正文文本。';
    return `${segmentInfo} 主要内容：${leadSentence.slice(0, 220)}`;
  }

  private resolveConfiguredMode(): ShanjiFetchMode {
    const raw = (process.env.SHANJI_FETCH_MODE ?? 'playwright').trim().toLowerCase();
    if (raw === 'mcp') {
      return 'mcp';
    }
    return 'playwright';
  }

  private normalizeMeetingAgentToken(token: string | undefined): string | undefined {
    if (!token) {
      return undefined;
    }

    const inspection = inspectMeetingAgentToken(token);
    if (!inspection) {
      throw new Error('[shanji_token_invalid] Meeting agent token is malformed.');
    }
    if (inspection.isExpired) {
      throw new Error(
        `[shanji_token_expired] Meeting agent token expired at ${inspection.expiresAt ?? 'unknown time'}.`,
      );
    }
    return inspection.token;
  }

  private assertTranscriptLooksUsable(transcriptText: string): void {
    const normalized = transcriptText.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      throw new Error('[shanji_extract_empty] No transcript content extracted from Shanji.');
    }

    const authMarkers = [
      '欢迎使用企业账号',
      '企业账号支持登录后用于办公',
      '绑定手机号码',
      '绑定邮箱',
      '服务协议、隐私政策、企业账号使用须知',
      '立即登录',
      '打开钉钉',
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

  private extractMeaningfulTranscriptLines(transcriptText: string): string[] {
    const lines = transcriptText
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
      .filter((line) => line.length >= 8)
      .filter((line) => !this.isTranscriptNoise(line));

    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      if (seen.has(line)) {
        continue;
      }
      seen.add(line);
      deduped.push(line);
      if (deduped.length >= 32) {
        break;
      }
    }
    return deduped;
  }

  private isTranscriptNoise(text: string): boolean {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return true;
    }
    return SHANJI_UI_NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  private toExtractError(
    primaryError: unknown,
    primaryMode: ShanjiFetchMode,
    fallbackError: unknown,
  ): Error {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    if (!fallbackError) {
      return new Error(
        `[shanji_extract_failed] mode=${primaryMode}; error=${primaryMessage}`,
      );
    }

    const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
    return new Error(
      `[shanji_extract_failed] mode=${primaryMode}; primary=${primaryMessage}; fallback=${fallbackMessage}`,
    );
  }
}

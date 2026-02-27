import { Injectable } from '@nestjs/common';
import { ShanjiMcpFetcher } from './mcp-fetcher';
import { ShanjiPlaywrightFetcher } from './playwright-fetcher';
import type { ShanjiExtractResult, ShanjiFetchPayload, ShanjiTranscriptSegment } from './shanji.types';

type ShanjiFetchMode = 'playwright' | 'mcp';

@Injectable()
export class ShanjiExtractorService {
  private readonly configuredMode = this.resolveConfiguredMode();
  private readonly enableMcpFallback = process.env.SHANJI_ENABLE_MCP_FALLBACK === 'true';

  constructor(
    private readonly playwrightFetcher = new ShanjiPlaywrightFetcher(),
    private readonly mcpFetcher = new ShanjiMcpFetcher(),
  ) {}

  async extractFromUrl(input: {
    url: string;
    meetingAgentToken?: string;
    meetingAgentTokenKey?: string;
  }): Promise<ShanjiExtractResult> {
    const preferredMode: ShanjiFetchMode = this.configuredMode === 'mcp' ? 'mcp' : 'playwright';
    const fallbackMode: ShanjiFetchMode = preferredMode === 'playwright' ? 'mcp' : 'playwright';

    try {
      const payload = await this.fetchByMode(preferredMode, input);
      return this.toResult(payload, preferredMode);
    } catch (primaryError) {
      if (!this.enableMcpFallback) {
        throw this.toExtractError(primaryError, preferredMode, undefined);
      }

      try {
        const payload = await this.fetchByMode(fallbackMode, input);
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

    const sourceLines =
      segments.length > 0
        ? segments.map((segment) => segment.text)
        : transcriptText.split('\n').map((line) => line.trim());

    for (const line of sourceLines) {
      const normalized = line.replace(/\s+/g, ' ').trim();
      if (normalized.length < 8) {
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

    const snippetsPreview =
      keySnippets.length > 0 ? keySnippets.slice(0, 2).join('；') : transcriptText.slice(0, 120);
    const segmentInfo = segments.length > 0 ? `共提取 ${segments.length} 条记录。` : '已提取正文文本。';
    return `${segmentInfo} 主要内容：${snippetsPreview}`;
  }

  private resolveConfiguredMode(): ShanjiFetchMode {
    const raw = (process.env.SHANJI_FETCH_MODE ?? 'playwright').trim().toLowerCase();
    if (raw === 'mcp') {
      return 'mcp';
    }
    return 'playwright';
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

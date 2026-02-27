export interface ShanjiTranscriptSegment {
  index: number;
  text: string;
  startMs?: number;
  endMs?: number;
  speaker?: string;
}

export interface ShanjiFetchPayload {
  sourceUrl: string;
  transcriptText: string;
  transcriptSegments: ShanjiTranscriptSegment[];
  audioUrl?: string;
}

export interface ShanjiExtractResult extends ShanjiFetchPayload {
  summary: string;
  keySnippets: string[];
  fetchMode: 'playwright' | 'mcp';
  fetchedAt: string;
}

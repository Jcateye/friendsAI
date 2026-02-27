import { ShanjiExtractorService } from './shanji-extractor.service';
import type { ShanjiFetchPayload } from './shanji.types';

function buildPayload(overrides?: Partial<ShanjiFetchPayload>): ShanjiFetchPayload {
  return {
    sourceUrl:
      'https://shanji.dingtalk.com/app/transcribes/7632756964313937363739373137323434345f3336313539333232385f35',
    transcriptText: '客户说本周需要方案初稿。\n我们确认周三给出第一版。',
    transcriptSegments: [
      { index: 1, text: '客户说本周需要方案初稿。' },
      { index: 2, text: '我们确认周三给出第一版。' },
    ],
    audioUrl: 'https://example.com/audio/test.m4a',
    ...overrides,
  };
}

describe('ShanjiExtractorService', () => {
  const envBackup = {
    SHANJI_FETCH_MODE: process.env.SHANJI_FETCH_MODE,
    SHANJI_ENABLE_MCP_FALLBACK: process.env.SHANJI_ENABLE_MCP_FALLBACK,
  };

  afterEach(() => {
    process.env.SHANJI_FETCH_MODE = envBackup.SHANJI_FETCH_MODE;
    process.env.SHANJI_ENABLE_MCP_FALLBACK = envBackup.SHANJI_ENABLE_MCP_FALLBACK;
    jest.clearAllMocks();
  });

  it('should extract via playwright mode and return normalized result', async () => {
    process.env.SHANJI_FETCH_MODE = 'playwright';
    process.env.SHANJI_ENABLE_MCP_FALLBACK = 'false';

    const playwrightFetcher = {
      fetch: jest.fn().mockResolvedValue(buildPayload()),
    };
    const mcpFetcher = {
      fetch: jest.fn(),
    };

    const service = new ShanjiExtractorService(
      playwrightFetcher as any,
      mcpFetcher as any,
    );

    const result = await service.extractFromUrl({
      url: buildPayload().sourceUrl,
    });

    expect(playwrightFetcher.fetch).toHaveBeenCalledTimes(1);
    expect(mcpFetcher.fetch).not.toHaveBeenCalled();
    expect(result.fetchMode).toBe('playwright');
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.keySnippets.length).toBeGreaterThan(0);
    expect(result.audioUrl).toBe('https://example.com/audio/test.m4a');
    expect(result.transcriptText).toContain('客户说本周需要方案初稿');
  });

  it('should fallback to mcp when enabled and playwright fails', async () => {
    process.env.SHANJI_FETCH_MODE = 'playwright';
    process.env.SHANJI_ENABLE_MCP_FALLBACK = 'true';

    const playwrightFetcher = {
      fetch: jest.fn().mockRejectedValue(new Error('playwright failed')),
    };
    const mcpFetcher = {
      fetch: jest
        .fn()
        .mockResolvedValue(buildPayload({ audioUrl: 'https://example.com/audio/from-mcp.mp3' })),
    };

    const service = new ShanjiExtractorService(
      playwrightFetcher as any,
      mcpFetcher as any,
    );

    const result = await service.extractFromUrl({
      url: buildPayload().sourceUrl,
    });

    expect(playwrightFetcher.fetch).toHaveBeenCalledTimes(1);
    expect(mcpFetcher.fetch).toHaveBeenCalledTimes(1);
    expect(result.fetchMode).toBe('mcp');
    expect(result.audioUrl).toBe('https://example.com/audio/from-mcp.mp3');
  });

  it('should throw a structured error when both primary and fallback fail', async () => {
    process.env.SHANJI_FETCH_MODE = 'playwright';
    process.env.SHANJI_ENABLE_MCP_FALLBACK = 'true';

    const service = new ShanjiExtractorService(
      {
        fetch: jest.fn().mockRejectedValue(new Error('playwright failed')),
      } as any,
      {
        fetch: jest.fn().mockRejectedValue(new Error('mcp failed')),
      } as any,
    );

    await expect(
      service.extractFromUrl({
        url: buildPayload().sourceUrl,
      }),
    ).rejects.toThrow('[shanji_extract_failed]');
  });
});

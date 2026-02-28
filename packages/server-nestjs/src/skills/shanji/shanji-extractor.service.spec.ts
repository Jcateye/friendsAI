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

  it('should sanitize meeting token before passing it to the fetcher', async () => {
    process.env.SHANJI_FETCH_MODE = 'playwright';
    process.env.SHANJI_ENABLE_MCP_FALLBACK = 'false';

    const playwrightFetcher = {
      fetch: jest.fn().mockResolvedValue(buildPayload()),
    };

    const service = new ShanjiExtractorService(playwrightFetcher as any, {
      fetch: jest.fn(),
    } as any);

    await service.extractFromUrl({
      url: buildPayload().sourceUrl,
      meetingAgentToken:
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.Xur5T8wNLbYOffhOZ2vqWS1xtL-xv7BwLmiyYLk7kOQtoken',
    });

    expect(playwrightFetcher.fetch).toHaveBeenCalledWith(buildPayload().sourceUrl, {
      meetingAgentToken:
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.Xur5T8wNLbYOffhOZ2vqWS1xtL-xv7BwLmiyYLk7kOQ',
      meetingAgentTokenKey: undefined,
    });
  });

  it('should prefer meaningful transcript lines over Shanji UI prompts in summary and snippets', async () => {
    process.env.SHANJI_FETCH_MODE = 'playwright';
    process.env.SHANJI_ENABLE_MCP_FALLBACK = 'false';

    const playwrightFetcher = {
      fetch: jest.fn().mockResolvedValue(
        buildPayload({
          transcriptText: [
            '会议主要围绕开票流程、税务工单处理及与渠道商和客户的协作展开。',
            '发言人1详细介绍了接收客户开票需求、核对购买方信息、填写开票类目与金额、上传合同与付款流水、提交系统申请等操作。',
            '开票流程与操作细节',
          ].join('\n'),
          transcriptSegments: [
            { index: 1, text: '👋Hi，我可以帮你干点什么？' },
            { index: 2, text: '问答范围：01-22 税务开票流程与系统操作说明' },
            { index: 3, text: '帮我提炼一下重点内容' },
            {
              index: 4,
              text: '会议主要围绕开票流程、税务工单处理及与渠道商和客户的协作展开。',
            },
          ],
        }),
      ),
    };

    const service = new ShanjiExtractorService(playwrightFetcher as any, {
      fetch: jest.fn(),
    } as any);

    const result = await service.extractFromUrl({
      url: buildPayload().sourceUrl,
    });

    expect(result.summary).toContain('会议主要围绕开票流程');
    expect(result.summary).not.toContain('我可以帮你干点什么');
    expect(result.keySnippets[0]).toContain('会议主要围绕开票流程');
    expect(result.keySnippets.join('\n')).not.toContain('问答范围');
    expect(result.transcriptSegments.map((segment) => segment.text)).not.toContain(
      '👋Hi，我可以帮你干点什么？',
    );
  });

  it('should reject extracted auth interstitial content instead of returning fake transcript', async () => {
    process.env.SHANJI_FETCH_MODE = 'playwright';
    process.env.SHANJI_ENABLE_MCP_FALLBACK = 'false';

    const playwrightFetcher = {
      fetch: jest.fn().mockResolvedValue(
        buildPayload({
          transcriptText: [
            '欢迎使用企业账号',
            '企业账号支持登录后用于办公、沟通和协同',
            '绑定手机号码',
            '绑定邮箱',
          ].join('\n'),
          transcriptSegments: [
            { index: 1, text: '欢迎使用企业账号' },
            { index: 2, text: '企业账号支持登录后用于办公、沟通和协同' },
          ],
          audioUrl: undefined,
        }),
      ),
    };

    const service = new ShanjiExtractorService(playwrightFetcher as any, {
      fetch: jest.fn(),
    } as any);

    await expect(
      service.extractFromUrl({
        url: buildPayload().sourceUrl,
      }),
    ).rejects.toThrow('[shanji_extract_failed] mode=playwright; error=[shanji_auth_required]');
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

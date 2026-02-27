import { SkillParserService } from './skill-parser.service';
import { getBuiltinSkillCatalog } from './skills.builtin';

describe('SkillParserService', () => {
  let service: SkillParserService;

  beforeEach(() => {
    service = new SkillParserService();
  });

  it('should parse DingTalk Shanji link into dingtalk_shanji:extract intent', () => {
    const catalog = getBuiltinSkillCatalog();
    const text =
      '请帮我解析这个闪记 https://shanji.dingtalk.com/app/transcribes/7632756964313937363739373137323434345f3336313539333232385f35';

    const result = service.parse({
      text,
      catalog,
    });

    expect(result.matched).toBe(true);
    expect(result.status).toBe('parsed');
    expect(result.skillKey).toBe('dingtalk_shanji');
    expect(result.operation).toBe('extract');
    expect(result.args).toMatchObject({
      url: 'https://shanji.dingtalk.com/app/transcribes/7632756964313937363739373137323434345f3336313539333232385f35',
    });
    expect(result.execution?.agentId).toBe('dingtalk_shanji');
    expect(result.execution?.operation).toBe('extract');
    expect(result.execution?.input).toMatchObject({
      url: 'https://shanji.dingtalk.com/app/transcribes/7632756964313937363739373137323434345f3336313539333232385f35',
    });
  });

  it('should ignore shanji parsing for non-shanji links', () => {
    const catalog = getBuiltinSkillCatalog();
    const result = service.parse({
      text: '请处理这个链接 https://example.com/transcribes/123',
      catalog,
    });

    expect(result.skillKey).not.toBe('dingtalk_shanji');
  });

  it('should extract meeting token from chat text when present', () => {
    const catalog = getBuiltinSkillCatalog();
    const token =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature';
    const result = service.parse({
      text: `请解析这个闪记 https://shanji.dingtalk.com/app/transcribes/demo\ndt-meeting-agent-token\n${token}`,
      catalog,
    });

    expect(result.matched).toBe(true);
    expect(result.skillKey).toBe('dingtalk_shanji');
    expect(result.operation).toBe('extract');
    expect(result.args).toMatchObject({
      url: 'https://shanji.dingtalk.com/app/transcribes/demo',
      meetingAgentToken: token,
    });
    expect(result.execution?.input).toMatchObject({
      url: 'https://shanji.dingtalk.com/app/transcribes/demo',
      meetingAgentToken: token,
    });
  });
});

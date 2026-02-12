import { describe, expect, it } from 'vitest';
import {
  buildProxyPayload,
  buildToolResult,
  extractAssistantReply,
  extractContactCardFromText,
  isToolEnabled,
  parseChatRequestBody,
} from './logic';

describe('parseChatRequestBody', () => {
  it('validates and normalizes payload', () => {
    const result = parseChatRequestBody({
      contact: { id: 'c-1', name: '张三' },
      messages: [
        { role: 'user', content: '你好，我邮箱是 test@example.com' },
        { role: 'assistant', content: '收到' },
      ],
    });

    expect(result.contact.id).toBe('c-1');
    expect(result.contact.name).toBe('张三');
    expect(result.messages).toHaveLength(2);
    expect(result.tools?.enabled).toEqual(['extract_contact_info']);
  });

  it('deduplicates enabled tools and applies mode default', () => {
    const result = parseChatRequestBody({
      contact: { id: 'c-2', name: '李四' },
      messages: [{ role: 'user', content: 'hello' }],
      tools: {
        enabled: ['extract_contact_info', 'feishu_template_message', 'extract_contact_info'],
        feishuTemplateMessage: {
          templateId: ' tpl_123 ',
        },
      },
    });

    expect(result.tools?.enabled).toEqual(['extract_contact_info', 'feishu_template_message']);
    expect(result.tools?.feishuTemplateMessage?.templateId).toBe('tpl_123');
    expect(result.tools?.feishuTemplateMessage?.mode).toBe('sync');
  });

  it('throws when enabled tool name is invalid', () => {
    expect(() =>
      parseChatRequestBody({
        contact: { id: 'c-1', name: '张三' },
        messages: [{ role: 'user', content: 'x' }],
        tools: {
          enabled: ['extract_contact_info', 'unknown_tool'],
        },
      })
    ).toThrow('tools.enabled 包含不支持的工具');
  });

  it('throws when variables value is not string', () => {
    expect(() =>
      parseChatRequestBody({
        contact: { id: 'c-1', name: '张三' },
        messages: [{ role: 'user', content: 'x' }],
        tools: {
          enabled: ['feishu_template_message'],
          feishuTemplateMessage: {
            variables: {
              company: 123,
            },
          },
        },
      })
    ).toThrow('tools.feishuTemplateMessage.variables 的值必须是字符串');
  });

  it('throws when mode is invalid', () => {
    expect(() =>
      parseChatRequestBody({
        contact: { id: 'c-1', name: '张三' },
        messages: [{ role: 'user', content: 'x' }],
        tools: {
          enabled: ['feishu_template_message'],
          feishuTemplateMessage: {
            mode: 'async',
          },
        },
      })
    ).toThrow('tools.feishuTemplateMessage.mode 无效');
  });

  it('throws when role is invalid', () => {
    expect(() =>
      parseChatRequestBody({
        contact: { id: 'c-1', name: '张三' },
        messages: [{ role: 'system', content: 'x' }],
      })
    ).toThrow();
  });

  it('throws when message content exceeds limit', () => {
    expect(() =>
      parseChatRequestBody({
        contact: { id: 'c-1', name: '张三' },
        messages: [{ role: 'user', content: 'a'.repeat(12001) }],
      })
    ).toThrow();
  });
});

describe('isToolEnabled', () => {
  it('returns true for default extract tool', () => {
    expect(isToolEnabled({}, 'extract_contact_info')).toBe(true);
  });

  it('returns false when tool is not enabled', () => {
    expect(
      isToolEnabled(
        {
          tools: {
            enabled: ['extract_contact_info'],
          },
        },
        'feishu_template_message'
      )
    ).toBe(false);
  });
});

describe('buildProxyPayload', () => {
  it('adds system prompt and maps messages', () => {
    const payload = buildProxyPayload(
      {
        contact: { id: 'c-1', name: '张三' },
        messages: [{ role: 'user', content: 'hello' }],
      },
      'claude-sonnet-4-5-thinking'
    );

    expect(payload.model).toBe('claude-sonnet-4-5-thinking');
    expect(payload.messages[0].role).toBe('system');
    expect(payload.messages[1].role).toBe('user');
  });
});

describe('extractAssistantReply', () => {
  it('returns fallback when empty', () => {
    expect(extractAssistantReply({})).toBe('我已经记下来了。');
  });

  it('returns trimmed content', () => {
    expect(
      extractAssistantReply({
        choices: [{ message: { content: '  这是回复  ' } }],
      })
    ).toBe('这是回复');
  });
});

describe('extractContactCardFromText', () => {
  it('extracts contact card with key fields', () => {
    const card = extractContactCardFromText(
      '我在字节工作，手机号 13812345678，邮箱 test@example.com，做工程师，研究 React 和 AI',
      '王五',
      'source-1'
    );

    expect(card).not.toBeNull();
    expect(card?.name).toBe('王五');
    expect(card?.email).toBe('test@example.com');
    expect(card?.phone).toBe('13812345678');
    expect(card?.tags).toContain('React');
    expect(card?.tags).toContain('AI');
  });

  it('returns null when no extractable field', () => {
    const card = extractContactCardFromText('今天天气不错', '王五', 'source-2');
    expect(card).toBeNull();
  });
});

describe('buildToolResult', () => {
  it('builds readable tool result', () => {
    const card = extractContactCardFromText(
      '邮箱 test@example.com，手机号 13812345678，做工程师',
      '王五',
      'source-3'
    );

    const result = buildToolResult(card);
    expect(result).toContain('已提取联系人信息');
  });

  it('returns undefined when no card', () => {
    expect(buildToolResult(null)).toBeUndefined();
  });
});

/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatInputBox, type ToolOption } from './ChatInputBox';

const TOOLS: ToolOption[] = [
  {
    id: 'web_search',
    name: '网络搜索',
    description: '搜索最新信息',
  },
  {
    id: 'feishu_send_template_message',
    name: '发送飞书消息',
    description: '按模板发送飞书消息',
  },
];

describe('ChatInputBox', () => {
  afterEach(() => {
    cleanup();
  });

  it('submits composer payload with tool + feishu + thinking + inputMode', async () => {
    const onSendMessage = vi.fn();

    render(
      <ChatInputBox
        onSendMessage={onSendMessage}
        availableTools={TOOLS}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('输入消息...'), {
      target: { value: '你好，帮我发一条消息' },
    });

    fireEvent.click(screen.getByRole('button', { name: '打开菜单' }));
    fireEvent.click(screen.getByText('网络搜索'));

    fireEvent.click(screen.getByRole('button', { name: '飞书多维表' }));
    fireEvent.click(screen.getByRole('button', { name: '深度思考' }));
    fireEvent.click(screen.getByRole('button', { name: '语音输入' }));
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage.mock.calls[0][0]).toMatchObject({
      content: '你好，帮我发一条消息',
      tools: ['web_search'],
      feishuEnabled: true,
      thinkingEnabled: true,
      inputMode: 'voice',
    });
  });

  it('adds and removes file attachments', async () => {
    const onSendMessage = vi.fn();

    render(
      <ChatInputBox
        onSendMessage={onSendMessage}
        availableTools={TOOLS}
      />
    );

    const fileInput = screen.getByTestId('chat-file-input') as HTMLInputElement;
    const file = new File(['demo'], 'demo.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    expect(screen.queryByText('demo.txt')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '移除文件' }));

    await waitFor(() => {
      expect(screen.queryByText('demo.txt')).toBeNull();
    });
  });

  it('triggers stop callback when loading', () => {
    const onStop = vi.fn();

    render(
      <ChatInputBox
        onSendMessage={vi.fn()}
        onStop={onStop}
        isLoading
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '停止生成' }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});

/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExecutionTimeline } from './ExecutionTimeline';
import { ThinkingProcess } from './ThinkingProcess';

describe('message detail cards', () => {
  afterEach(() => {
    cleanup();
  });

  it('auto-collapses the thinking process after streaming completes', () => {
    const { rerender } = render(
      <ThinkingProcess content={'第一步\n第二步'} isStreaming />
    );

    expect(screen.getByText('第一步')).toBeTruthy();
    expect(screen.getByRole('button', { name: /思考过程/i }).getAttribute('aria-expanded')).toBe('true');

    rerender(<ThinkingProcess content={'第一步\n第二步'} isStreaming={false} />);

    expect(screen.queryByText('第一步')).toBeNull();
    expect(screen.getByRole('button', { name: /思考过程/i }).getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: /思考过程/i }));
    expect(screen.getByText('第一步')).toBeTruthy();
  });

  it('auto-collapses the execution timeline after streaming completes', () => {
    const trace = {
      status: 'succeeded',
      steps: [
        {
          id: 'step-1',
          kind: 'skill' as const,
          itemId: 'dingtalk_shanji',
          title: 'dingtalk_shanji',
          status: 'running',
          message: '正在解析链接',
          input: {
            url: 'https://shanji.dingtalk.com/app/transcribes/763275696431393736313233736343234343445f3333',
          },
        },
      ],
    };

    const { rerender } = render(<ExecutionTimeline trace={trace} isStreaming />);

    expect(screen.getByText('dingtalk_shanji')).toBeTruthy();
    expect(screen.getByRole('button', { name: /执行过程/i }).getAttribute('aria-expanded')).toBe('true');

    rerender(<ExecutionTimeline trace={trace} isStreaming={false} />);

    expect(screen.queryByText('dingtalk_shanji')).toBeNull();
    expect(screen.getByRole('button', { name: /执行过程/i }).getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: /执行过程/i }));
    expect(screen.getByText('dingtalk_shanji')).toBeTruthy();
  });
});

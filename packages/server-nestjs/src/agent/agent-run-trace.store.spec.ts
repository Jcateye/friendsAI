import { AgentRunTraceStore } from './agent-run-trace.store';
import type { AgentSseEvent } from './client-types';

describe('AgentRunTraceStore', () => {
  it('records start/tool/end events in order', () => {
    const store = new AgentRunTraceStore();

    const start: AgentSseEvent = {
      event: 'agent.start',
      data: {
        runId: 'run-1',
        createdAt: '2026-02-22T09:00:00.000Z',
      },
    };

    const tool: AgentSseEvent = {
      event: 'tool.state',
      data: {
        runId: 'run-1',
        toolId: 'tool-1',
        name: 'fetch_contacts',
        status: 'running',
        at: '2026-02-22T09:00:01.000Z',
      },
    } as AgentSseEvent;

    const end: AgentSseEvent = {
      event: 'agent.end',
      data: {
        runId: 'run-1',
        status: 'succeeded',
        finishedAt: '2026-02-22T09:00:02.000Z',
      },
    };

    store.append(start);
    store.append(tool);
    store.append(end);

    const timeline = store.get('run-1');
    expect(timeline).toBeDefined();
    expect(timeline?.status).toBe('succeeded');
    expect(timeline?.events.map((item) => item.event)).toEqual(['agent.start', 'tool.state', 'agent.end']);
    expect(timeline?.events.map((item) => item.seq)).toEqual([1, 2, 3]);
  });
});

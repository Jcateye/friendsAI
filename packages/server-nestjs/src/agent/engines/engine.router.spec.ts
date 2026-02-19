import type { AgentStreamEvent } from '../agent.types';
import type { IAgentEngine } from './engine.interface';
import { EnginePolicyResolver } from './engine-policy.resolver';
import { EngineRouter } from './engine.router';
import { LocalEngine } from './local.engine';
import type { RuntimeRouterDecision } from './engine.types';

function createDecision(overrides: Partial<RuntimeRouterDecision> = {}): RuntimeRouterDecision {
  return {
    request: {
      endpoint: 'run',
      userId: 'user-1',
      agentId: 'title_summary',
      operation: null,
    },
    primaryEngine: 'local',
    fallbackEngine: null,
    ...overrides,
  };
}

function createStream(events: AgentStreamEvent[]): AsyncGenerator<AgentStreamEvent> {
  return (async function* streamGenerator() {
    for (const event of events) {
      yield event;
    }
  })();
}

function createFailingStream(message: string): AsyncGenerator<AgentStreamEvent> {
  return (async function* streamGenerator() {
    throw new Error(message);
  })();
}

async function collectEvents(stream: AsyncGenerator<AgentStreamEvent>): Promise<AgentStreamEvent[]> {
  const events: AgentStreamEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe('EngineRouter', () => {
  let policyResolver: jest.Mocked<EnginePolicyResolver>;
  let localEngine: jest.Mocked<LocalEngine>;

  beforeEach(() => {
    policyResolver = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<EnginePolicyResolver>;

    localEngine = {
      name: 'local',
      streamChat: jest.fn(),
      run: jest.fn(),
    } as unknown as jest.Mocked<LocalEngine>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('routes run to local engine when policy selects local', async () => {
    policyResolver.resolve.mockReturnValue(createDecision());
    localEngine.run.mockResolvedValue({
      runId: 'run-local',
      cached: false,
      data: { ok: true },
    });

    const router = new EngineRouter(policyResolver, localEngine);
    const result = await router.run('title_summary', null, { conversationId: 'conv-1' }, { userId: 'u1' });

    expect(result).toMatchObject({ runId: 'run-local', cached: false, data: { ok: true } });
    expect(localEngine.run).toHaveBeenCalledWith(
      'title_summary',
      null,
      { conversationId: 'conv-1' },
      { userId: 'u1' },
    );
  });

  it('falls back to local engine when openclaw engine is unavailable', async () => {
    policyResolver.resolve.mockReturnValue(
      createDecision({
        primaryEngine: 'openclaw',
        fallbackEngine: 'local',
      }),
    );
    localEngine.run.mockResolvedValue({
      runId: 'run-fallback',
      cached: false,
      data: { from: 'local' },
    });

    const router = new EngineRouter(policyResolver, localEngine);
    const result = await router.run('title_summary', null, { conversationId: 'conv-2' }, { userId: 'u2' });

    expect(result.runId).toBe('run-fallback');
    expect(localEngine.run).toHaveBeenCalledTimes(1);
  });

  it('falls back to local engine when openclaw run fails', async () => {
    const openclawEngine = {
      name: 'openclaw',
      isAvailable: jest.fn().mockReturnValue(true),
      streamChat: jest.fn(),
      run: jest.fn().mockRejectedValue(new Error('openclaw unavailable')),
    } as unknown as jest.Mocked<IAgentEngine>;

    policyResolver.resolve.mockReturnValue(
      createDecision({
        primaryEngine: 'openclaw',
        fallbackEngine: 'local',
      }),
    );
    localEngine.run.mockResolvedValue({
      runId: 'run-fallback-on-error',
      cached: false,
      data: { from: 'local' },
    });

    const router = new EngineRouter(policyResolver, localEngine, openclawEngine);
    const result = await router.run('title_summary', null, { conversationId: 'conv-3' }, { userId: 'u3' });

    expect(openclawEngine.run).toHaveBeenCalledTimes(1);
    expect(localEngine.run).toHaveBeenCalledTimes(1);
    expect(result.runId).toBe('run-fallback-on-error');
  });

  it('falls back to local stream when openclaw stream fails before any event', async () => {
    const openclawEngine = {
      name: 'openclaw',
      isAvailable: jest.fn().mockReturnValue(true),
      streamChat: jest.fn().mockReturnValue(createFailingStream('openclaw stream failed')),
      run: jest.fn(),
    } as unknown as jest.Mocked<IAgentEngine>;

    policyResolver.resolve.mockReturnValue(
      createDecision({
        request: {
          endpoint: 'chat',
          userId: 'user-4',
          operation: null,
        },
        primaryEngine: 'openclaw',
        fallbackEngine: 'local',
      }),
    );
    localEngine.streamChat.mockReturnValue(
      createStream([
        {
          event: 'agent.start',
          data: {
            runId: 'run-stream-local',
            createdAt: new Date('2026-02-18T10:00:00.000Z').toISOString(),
            input: 'hello',
          },
        },
        {
          event: 'agent.end',
          data: {
            runId: 'run-stream-local',
            status: 'succeeded',
            finishedAt: new Date('2026-02-18T10:00:01.000Z').toISOString(),
          },
        },
      ]),
    );

    const router = new EngineRouter(policyResolver, localEngine, openclawEngine);
    const events = await collectEvents(router.streamChat({ prompt: 'hello', userId: 'user-4' }));

    expect(openclawEngine.streamChat).toHaveBeenCalledTimes(1);
    expect(localEngine.streamChat).toHaveBeenCalledTimes(1);
    expect(events.map((event) => event.event)).toEqual(['agent.start', 'agent.end']);
  });

  it('throws when fallback is disabled and primary engine is unavailable', async () => {
    policyResolver.resolve.mockReturnValue(
      createDecision({
        primaryEngine: 'openclaw',
        fallbackEngine: null,
      }),
    );

    const router = new EngineRouter(policyResolver, localEngine);

    await expect(
      router.run('title_summary', null, { conversationId: 'conv-5' }, { userId: 'u5' }),
    ).rejects.toThrow('Engine openclaw is not available');
  });
});

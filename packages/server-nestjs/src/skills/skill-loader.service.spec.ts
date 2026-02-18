import { SkillLoaderService } from './skill-loader.service';
import type { SkillCatalogItem } from './skills.types';

describe('SkillLoaderService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  const makeBuiltinItem = (version = 'v1'): SkillCatalogItem => ({
    key: 'contact_insight',
    displayName: 'Contact Insight',
    description: 'test',
    source: 'builtin',
    scopeType: 'tenant',
    scopeId: 'tenant-1',
    version,
    status: 'active',
    actions: [],
  });

  const createService = () => {
    const mountRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
      create: jest.fn((entity) => ({ id: 'mount-1', ...entity })),
    };
    const definitionRepo = {
      findOne: jest.fn(),
    };
    const versionRepo = {
      findOne: jest.fn(),
    };
    const resolver = {
      resolveCatalog: jest.fn(),
    };

    const service = new SkillLoaderService(
      mountRepo as never,
      definitionRepo as never,
      versionRepo as never,
      resolver as never,
    );

    return {
      service,
      mountRepo,
      definitionRepo,
      versionRepo,
      resolver,
    };
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SKILL_OPENCLAW_RELOAD_PROTOCOL;
    delete process.env.SKILL_RUNTIME_ENGINE_POLICY;
    delete process.env.SKILL_OPENCLAW_RELOAD_MAX_RETRIES;
    delete process.env.SKILL_OPENCLAW_RETRY_BACKOFF_MS;
    process.env.SKILL_OPENCLAW_RELOAD_TIMEOUT_MS = '1000';
    process.env.SKILL_EXPORT_DIR = '/tmp/friendsai-skill-loader-test';
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('builds unloadActions from previous applied skills', async () => {
    process.env.SKILL_OPENCLAW_SYNC_ENABLED = 'false';
    const { service, resolver, mountRepo } = createService();

    const existing = {
      id: 'mount-1',
      tenantId: 'tenant-1',
      engine: 'local',
      agentScope: 'agent-1',
      desiredHash: 'old',
      appliedHash: 'old',
      status: 'applied',
      details: {
        appliedSkills: [
          {
            key: 'contact_insight',
            version: 'v1',
            checksum: 'checksum-v1',
          },
        ],
      },
      lastReconcileAt: new Date(),
    };

    mountRepo.findOne.mockResolvedValue(existing);
    resolver.resolveCatalog.mockResolvedValue({
      items: [],
      warnings: [],
    });

    const result = await service.reconcile({
      tenantId: 'tenant-1',
      agentScope: 'agent-1',
      engine: 'local',
    });

    expect(result.status).toBe('applied');
    expect(result.plan.unloadActions).toEqual(['unload:contact_insight@v1']);
  });

  it('retries openclaw reload on 5xx then succeeds', async () => {
    process.env.SKILL_OPENCLAW_SYNC_ENABLED = 'true';
    process.env.OPENCLAW_GATEWAY_URL = 'http://127.0.0.1:18789';
    process.env.SKILL_OPENCLAW_RELOAD_PROTOCOL = 'v2';
    process.env.SKILL_OPENCLAW_RELOAD_MAX_RETRIES = '2';
    process.env.SKILL_OPENCLAW_RETRY_BACKOFF_MS = '1';

    const { service, resolver, mountRepo } = createService();

    const existing = {
      id: 'mount-1',
      tenantId: 'tenant-1',
      engine: 'openclaw',
      agentScope: 'agent-1',
      desiredHash: 'old',
      appliedHash: 'old',
      status: 'applied',
      details: {
        appliedSkills: [],
      },
      lastReconcileAt: new Date(),
    };

    mountRepo.findOne.mockResolvedValue(existing);
    resolver.resolveCatalog.mockResolvedValue({
      items: [makeBuiltinItem('v2')],
      warnings: [],
    });

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock
      .mockResolvedValueOnce(new Response('server error', { status: 500, statusText: 'Internal Server Error' }))
      .mockImplementationOnce(async (_url, init) => {
        const payload = JSON.parse(String(init?.body ?? '{}')) as { desiredHash?: string };
        return new Response(
          JSON.stringify({
            ok: true,
            executionMode: 'control-plane-only',
            tenantId: 'tenant-1',
            agentScope: 'agent-1',
            desiredHash: payload.desiredHash ?? '',
            acceptedAtMs: Date.now(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

    const resultPromise = service.reconcile({
      tenantId: 'tenant-1',
      agentScope: 'agent-1',
      engine: 'openclaw',
    });

    const result = await resultPromise;
    const lastSaved = mountRepo.save.mock.calls.at(-1)?.[0] as { details?: Record<string, unknown> };
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('applied');
    expect(lastSaved?.details?.reloadAttempts).toBe(2);
    expect(lastSaved?.details?.gatewaySummary).toMatchObject({
      executionMode: 'control-plane-only',
    });
    expect(lastSaved?.details?.traceId).toBeDefined();
    expect(lastSaved?.details?.phaseDurationsMs).toBeDefined();
    expect((lastSaved?.details?.appliedSkills as Array<{ key: string }> | undefined)?.[0]?.key).toBe(
      'contact_insight',
    );
  });

  it('fails in strict policy after timeout retry budget exhausted', async () => {
    process.env.SKILL_OPENCLAW_SYNC_ENABLED = 'true';
    process.env.OPENCLAW_GATEWAY_URL = 'http://127.0.0.1:18789';
    process.env.SKILL_RUNTIME_ENGINE_POLICY = 'strict_openclaw';
    process.env.SKILL_OPENCLAW_RELOAD_MAX_RETRIES = '1';
    process.env.SKILL_OPENCLAW_RETRY_BACKOFF_MS = '1';

    const { service, resolver, mountRepo } = createService();

    mountRepo.findOne.mockResolvedValue({
      id: 'mount-1',
      tenantId: 'tenant-1',
      engine: 'openclaw',
      agentScope: 'agent-1',
      desiredHash: 'old',
      appliedHash: 'old',
      status: 'applied',
      details: {
        appliedSkills: [],
      },
      lastReconcileAt: new Date(),
    });
    resolver.resolveCatalog.mockResolvedValue({
      items: [makeBuiltinItem('v2')],
      warnings: [],
    });

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    const abortError = new Error('timeout');
    abortError.name = 'AbortError';
    fetchMock.mockRejectedValue(abortError);

    const result = await service.reconcile({
      tenantId: 'tenant-1',
      agentScope: 'agent-1',
      engine: 'openclaw',
    });
    const lastSaved = mountRepo.save.mock.calls.at(-1)?.[0] as { details?: Record<string, unknown> };

    expect(result.status).toBe('failed');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastSaved?.details?.reloadAttempts).toBe(2);
    expect(lastSaved?.details?.error).toContain('timeout');
  });

  it('marks degraded apply in fallback_local policy when reload fails', async () => {
    process.env.SKILL_OPENCLAW_SYNC_ENABLED = 'true';
    process.env.OPENCLAW_GATEWAY_URL = 'http://127.0.0.1:18789';
    process.env.SKILL_RUNTIME_ENGINE_POLICY = 'fallback_local';
    process.env.SKILL_OPENCLAW_RELOAD_MAX_RETRIES = '0';

    const { service, resolver, mountRepo } = createService();

    mountRepo.findOne.mockResolvedValue({
      id: 'mount-1',
      tenantId: 'tenant-1',
      engine: 'openclaw',
      agentScope: 'agent-1',
      desiredHash: 'old',
      appliedHash: 'old',
      status: 'applied',
      details: {
        appliedSkills: [],
      },
      lastReconcileAt: new Date(),
    });
    resolver.resolveCatalog.mockResolvedValue({
      items: [makeBuiltinItem('v2')],
      warnings: [],
    });

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response('invalid', {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    const result = await service.reconcile({
      tenantId: 'tenant-1',
      agentScope: 'agent-1',
      engine: 'openclaw',
    });
    const lastSaved = mountRepo.save.mock.calls.at(-1)?.[0] as { details?: Record<string, unknown> };

    expect(result.status).toBe('applied');
    expect(result.message).toContain('fallback_local');
    expect(lastSaved?.details?.degraded).toBe(true);
    expect(lastSaved?.details?.gatewaySummary).toMatchObject({ fallback: true });
  });
});

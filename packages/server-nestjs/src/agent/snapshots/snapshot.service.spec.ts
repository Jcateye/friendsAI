import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SnapshotService } from './snapshot.service';
import { SnapshotRepository } from './snapshot.repository';
import { AgentSnapshot, ScopeType } from '../../entities/agent-snapshot.entity';

describe('SnapshotService', () => {
  let service: SnapshotService;
  let repository: SnapshotRepository;
  let mockRepository: jest.Mocked<Repository<AgentSnapshot>>;

  const mockSnapshot: AgentSnapshot = {
    id: 'snapshot-123',
    agentId: 'test-agent',
    operation: 'test-operation',
    scopeType: 'conversation' as ScopeType,
    scopeId: 'conv-123',
    userId: 'user-123',
    sourceHash: 'hash-123',
    promptVersion: 'v1.0',
    model: 'gpt-4',
    input: { test: 'input' },
    output: { test: 'output' },
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const expiredSnapshot: AgentSnapshot = {
    ...mockSnapshot,
    id: 'snapshot-expired',
    expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
  };

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnapshotService,
        SnapshotRepository,
        {
          provide: getRepositoryToken(AgentSnapshot),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SnapshotService>(SnapshotService);
    repository = module.get<SnapshotRepository>(SnapshotRepository);
  });

  describe('findSnapshot', () => {
    it('should return cached snapshot when found and not expired', async () => {
      jest.spyOn(repository, 'findBySourceHash').mockResolvedValue(mockSnapshot);

      const params = {
        agentId: 'test-agent',
        operation: 'test-operation',
        userId: 'user-123',
        scopeType: 'conversation' as ScopeType,
        scopeId: 'conv-123',
        sourceHash: 'hash-123',
        promptVersion: 'v1.0',
      };

      const result = await service.findSnapshot(params);

      expect(result.snapshot).toEqual(mockSnapshot);
      expect(result.cached).toBe(true);
    });

    it('should return null when snapshot not found', async () => {
      jest.spyOn(repository, 'findBySourceHash').mockResolvedValue(null);

      const params = {
        agentId: 'test-agent',
        operation: 'test-operation',
        userId: 'user-123',
        scopeType: 'conversation' as ScopeType,
        scopeId: 'conv-123',
        sourceHash: 'hash-123',
        promptVersion: 'v1.0',
      };

      const result = await service.findSnapshot(params);

      expect(result.snapshot).toBeNull();
      expect(result.cached).toBe(false);
    });

    it('should return null when snapshot is expired', async () => {
      jest.spyOn(repository, 'findBySourceHash').mockResolvedValue(expiredSnapshot);

      const params = {
        agentId: 'test-agent',
        operation: 'test-operation',
        userId: 'user-123',
        scopeType: 'conversation' as ScopeType,
        scopeId: 'conv-123',
        sourceHash: 'hash-123',
        promptVersion: 'v1.0',
      };

      const result = await service.findSnapshot(params);

      expect(result.snapshot).toBeNull();
      expect(result.cached).toBe(false);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const params = {
        agentId: 'test-agent',
        operation: 'test-operation',
        userId: 'user-123',
        scopeType: 'conversation' as ScopeType,
        scopeId: 'conv-123',
        sourceHash: 'hash-123',
        promptVersion: 'v1.0',
      };

      const result = await service.findSnapshot(params, { forceRefresh: true });

      expect(result.snapshot).toBeNull();
      expect(result.cached).toBe(false);
      expect(repository.findBySourceHash).not.toHaveBeenCalled();
    });

    it('should handle snapshot without expiresAt', async () => {
      const snapshotWithoutExpiry = {
        ...mockSnapshot,
        expiresAt: null,
      };
      jest.spyOn(repository, 'findBySourceHash').mockResolvedValue(snapshotWithoutExpiry);

      const params = {
        agentId: 'test-agent',
        operation: 'test-operation',
        userId: 'user-123',
        scopeType: 'conversation' as ScopeType,
        scopeId: 'conv-123',
        sourceHash: 'hash-123',
        promptVersion: 'v1.0',
      };

      const result = await service.findSnapshot(params);

      expect(result.snapshot).toEqual(snapshotWithoutExpiry);
      expect(result.cached).toBe(true);
    });
  });

  describe('createSnapshot', () => {
    it('should create snapshot with TTL', async () => {
      jest.spyOn(repository, 'create').mockResolvedValue(mockSnapshot);

      const data = {
        agentId: 'test-agent',
        operation: 'test-operation',
        scopeType: 'conversation' as ScopeType,
        scopeId: 'conv-123',
        userId: 'user-123',
        sourceHash: 'hash-123',
        promptVersion: 'v1.0',
        model: 'gpt-4',
        input: { test: 'input' },
        output: { test: 'output' },
        ttlSeconds: 3600,
      };

      const result = await service.createSnapshot(data);

      expect(result).toEqual(mockSnapshot);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: data.agentId,
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('should create snapshot without TTL', async () => {
      const snapshotWithoutExpiry = {
        ...mockSnapshot,
        expiresAt: null,
      };
      jest.spyOn(repository, 'create').mockResolvedValue(snapshotWithoutExpiry);

      const data = {
        agentId: 'test-agent',
        operation: 'test-operation',
        scopeType: 'conversation' as ScopeType,
        scopeId: 'conv-123',
        userId: 'user-123',
        sourceHash: 'hash-123',
        promptVersion: 'v1.0',
        model: 'gpt-4',
        input: { test: 'input' },
        output: { test: 'output' },
      };

      const result = await service.createSnapshot(data);

      expect(result).toEqual(snapshotWithoutExpiry);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: data.agentId,
          expiresAt: null,
        }),
      );
    });
  });

  describe('invalidateSnapshot', () => {
    it('should delete snapshot', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined);

      await service.invalidateSnapshot('snapshot-123');

      expect(repository.delete).toHaveBeenCalledWith('snapshot-123');
    });
  });

  describe('cleanupExpiredSnapshots', () => {
    it('should delete expired snapshots', async () => {
      jest.spyOn(repository, 'deleteExpiredSnapshots').mockResolvedValue(5);

      const result = await service.cleanupExpiredSnapshots();

      expect(result).toBe(5);
      expect(repository.deleteExpiredSnapshots).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe('computeSourceHash', () => {
    it('should compute consistent hash for same input', () => {
      const input = { test: 'data', nested: { value: 123 } };
      const hash1 = service.computeSourceHash('agent-1', 'op-1', input);
      const hash2 = service.computeSourceHash('agent-1', 'op-1', input);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex string length
    });

    it('should compute different hash for different agentId', () => {
      const input = { test: 'data' };
      const hash1 = service.computeSourceHash('agent-1', 'op-1', input);
      const hash2 = service.computeSourceHash('agent-2', 'op-1', input);

      expect(hash1).not.toBe(hash2);
    });

    it('should compute different hash for different operation', () => {
      const input = { test: 'data' };
      const hash1 = service.computeSourceHash('agent-1', 'op-1', input);
      const hash2 = service.computeSourceHash('agent-1', 'op-2', input);

      expect(hash1).not.toBe(hash2);
    });

    it('should compute different hash for different input', () => {
      const hash1 = service.computeSourceHash('agent-1', 'op-1', { test: 'data1' });
      const hash2 = service.computeSourceHash('agent-1', 'op-1', { test: 'data2' });

      expect(hash1).not.toBe(hash2);
    });

    it('should handle null operation', () => {
      const input = { test: 'data' };
      const hash1 = service.computeSourceHash('agent-1', null, input);
      const hash2 = service.computeSourceHash('agent-1', null, input);

      expect(hash1).toBe(hash2);
    });

    it('should handle undefined operation', () => {
      const input = { test: 'data' };
      const hash1 = service.computeSourceHash('agent-1', undefined, input);
      const hash2 = service.computeSourceHash('agent-1', null, input);

      expect(hash1).toBe(hash2);
    });

    it('should throw error on serialization failure', () => {
      const circularInput: any = { test: 'data' };
      circularInput.self = circularInput; // Create circular reference

      expect(() => {
        service.computeSourceHash('agent-1', 'op-1', circularInput);
      }).toThrow('snapshot_hash_build_failed');
    });
  });

  describe('error handling', () => {
    it('should throw snapshot_expiry_invalid for negative TTL', async () => {
      const data = {
        agentId: 'test-agent',
        scopeType: 'conversation' as ScopeType,
        sourceHash: 'hash-123',
        promptVersion: 'v1.0',
        input: { test: 'input' },
        output: { test: 'output' },
        ttlSeconds: -100,
      };

      await expect(service.createSnapshot(data)).rejects.toThrow('snapshot_expiry_invalid');
    });

    it('should handle invalid expiresAt in snapshot', async () => {
      const invalidSnapshot = {
        ...mockSnapshot,
        expiresAt: new Date('invalid') as any,
      };
      jest.spyOn(repository, 'findBySourceHash').mockResolvedValue(invalidSnapshot);

      const params = {
        agentId: 'test-agent',
        operation: 'test-operation',
        userId: 'user-123',
        scopeType: 'conversation' as ScopeType,
        scopeId: 'conv-123',
        sourceHash: 'hash-123',
        promptVersion: 'v1.0',
      };

      await expect(service.findSnapshot(params)).rejects.toThrow('snapshot_expiry_invalid');
    });
  });
});



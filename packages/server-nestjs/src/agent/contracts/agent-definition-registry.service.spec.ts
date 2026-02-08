import { Test, TestingModule } from '@nestjs/testing';
import { AgentDefinitionRegistry } from './agent-definition-registry.service';
import {
  AgentDefinitionError,
  AgentDefinitionErrorCode,
} from './agent-definition-registry.interface';

describe('AgentDefinitionRegistry', () => {
  let service: AgentDefinitionRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentDefinitionRegistry],
    }).compile();

    service = module.get<AgentDefinitionRegistry>(AgentDefinitionRegistry);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadDefinition', () => {
    it('should load example_agent definition', async () => {
      const bundle = await service.loadDefinition('example_agent');

      expect(bundle.definition.id).toBe('example_agent');
      expect(bundle.definition.version).toBe('1.0.0');
      expect(bundle.systemTemplate).toContain('helpful AI assistant');
      expect(bundle.userTemplate).toContain('User input');
      expect(bundle.defaults).toBeDefined();
      expect(bundle.defaults?.contact).toBeDefined();
      expect(bundle.outputSchema).toBeDefined();
      expect(bundle.outputSchema?.type).toBe('object');
    });

    it('should throw error for non-existent agent', async () => {
      await expect(service.loadDefinition('non_existent_agent')).rejects.toThrow(
        AgentDefinitionError,
      );
      await expect(service.loadDefinition('non_existent_agent')).rejects.toThrow(
        AgentDefinitionErrorCode.DEFINITION_NOT_FOUND,
      );
    });
  });

  describe('getDefinitionPath', () => {
    it('should return correct path', () => {
      const path = service.getDefinitionPath('example_agent');
      expect(path).toContain('example_agent');
      expect(path).toContain('definitions');
    });
  });
});





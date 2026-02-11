import { Test, TestingModule } from '@nestjs/testing';
import { PromptValidationService } from './prompt-validation.service';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('PromptValidationService', () => {
  let service: PromptValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptValidationService],
    }).compile();

    service = module.get<PromptValidationService>(PromptValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePromptContent', () => {
    it('should pass validation for a complete prompt with all required elements', () => {
      const completePrompt = `
You are an expert analyst.

## Output Format

You MUST respond with a valid JSON object:
\`\`\`json
{
  "actionCards": [
    {
      "actionId": "uuid-v4-format",
      "whyNow": "Specific reason",
      "evidence": [
        {
          "type": "conversation",
          "source": "conv_123",
          "reference": "Direct quote"
        }
      ],
      "effortMinutes": 15,
      "confidence": 0.85,
      "riskLevel": "low"
    }
  ]
}
\`\`\`

## CRITICAL: Action Card Requirements

Every actionCards entry MUST include:
1. **actionId**: Generate a unique UUID v4 format identifier
2. **whyNow**: A specific, explainable reason based on data
3. **evidence**: Array of specific data points with type, source, reference

## Output Language

**Default: Chinese**

## Quality Standards

- All insights must be evidence-based
- Every action card MUST have a non-empty whyNow field
- Every action card MUST have at least one evidence item
`;

      const result = service.validatePromptContent(completePrompt);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for prompt missing output format', () => {
      const incompletePrompt = `
You are an expert analyst.

Generate insights about the contact.
`;

      const result = service.validatePromptContent(incompletePrompt);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Output Format'))).toBe(true);
    });

    it('should fail validation for prompt missing whyNow requirement', () => {
      const promptWithoutWhyNow = `
## Output Format

\`\`\`json
{
  "actionCards": [
    {
      "actionId": "uuid",
      "evidence": []
    }
  ]
}
\`\`\`

## Quality Standards

All insights must be evidence-based.
`;

      const result = service.validatePromptContent(promptWithoutWhyNow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('whyNow'))).toBe(true);
    });

    it('should fail validation for prompt missing evidence requirement', () => {
      const promptWithoutEvidence = `
## Output Format

\`\`\`json
{
  "actionCards": [
    {
      "actionId": "uuid",
      "whyNow": "Specific reason"
    }
  ]
}
\`\`\`
`;

      const result = service.validatePromptContent(promptWithoutEvidence);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('evidence'))).toBe(true);
    });

    it('should warn when whyNow lacks specificity', () => {
      const vaguePrompt = `
## Output Format

\`\`\`json
{
  "actionCards": [
    {
      "whyNow": "some reason"
    }
  ]
}
\`\`\`
`;

      const result = service.validatePromptContent(vaguePrompt);

      // May not be invalid, but should warn
      expect(result.warnings.some(w => w.includes('specificity'))).toBe(true);
    });

    it('should warn when evidence structure is not defined', () => {
      const vagueEvidencePrompt = `
## Output Format

\`\`\`json
{
  "actionCards": [
    {
      "whyNow": "reason",
      "evidence": "some evidence"
    }
  ]
}
\`\`\`
`;

      const result = service.validatePromptContent(vagueEvidencePrompt);

      expect(result.warnings.some(w => w.includes('structure'))).toBe(true);
    });

    it('should warn for missing quality standards section', () => {
      const noQualityPrompt = `
## Output Format

\`\`\`json
{
  "actionCards": [
    {
      "actionId": "uuid",
      "whyNow": "reason",
      "evidence": []
    }
  ]
}
\`\`\`

## CRITICAL Requirements

Include whyNow and evidence.
`;

      const result = service.validatePromptContent(noQualityPrompt);

      expect(result.warnings.some(w => w.includes('Quality Standards'))).toBe(true);
    });

    it('should warn for missing effort estimation requirements', () => {
      const noEffortPrompt = `
## Output Format

\`\`\`json
{
  "actionCards": [
    {
      "actionId": "uuid",
      "whyNow": "reason",
      "evidence": []
    }
  ]
}
\`\`\`
`;

      const result = service.validatePromptContent(noEffortPrompt);

      expect(result.warnings.some(w => w.includes('effort'))).toBe(true);
    });

    it('should warn for missing confidence requirements', () => {
      const noConfidencePrompt = `
## Output Format

\`\`\`json
{
  "actionCards": [
    {
      "actionId": "uuid",
      "whyNow": "reason",
      "evidence": [],
      "effortMinutes": 15
    }
  ]
}
\`\`\`
`;

      const result = service.validatePromptContent(noConfidencePrompt);

      expect(result.warnings.some(w => w.includes('confidence'))).toBe(true);
    });

    it('should warn for missing risk level requirements', () => {
      const noRiskPrompt = `
## Output Format

\`\`\`json
{
  "actionCards": [
    {
      "actionId": "uuid",
      "whyNow": "reason",
      "evidence": [],
      "effortMinutes": 15,
      "confidence": 0.85
    }
  ]
}
\`\`\`
`;

      const result = service.validatePromptContent(noRiskPrompt);

      expect(result.warnings.some(w => w.includes('risk'))).toBe(true);
    });

    it('should allow selective validation options', () => {
      const minimalPrompt = `
## Output Format

\`\`\`json
{
  "result": "value"
}
\`\`\`
`;

      // With relaxed options, should pass
      const result = service.validatePromptContent(minimalPrompt, {
        requireEvidence: false,
        requireWhyNow: false,
        requireOutputFormat: true,
        requireQualityStandards: false,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('validatePromptFile', () => {
    it('should validate contact_insight system template', () => {
      const result = service.validatePromptFile('contact_insight', 'system.mustache');

      // The enhanced template should pass all validations
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate network_action system template', () => {
      const result = service.validatePromptFile('network_action', 'system.mustache');

      // The enhanced template should pass all validations
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle non-existent template files gracefully', () => {
      const result = service.validatePromptFile('nonexistent_agent', 'system.mustache');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to read');
    });
  });

  describe('validateAllAgents', () => {
    it('should validate multiple agents and return summary', () => {
      const results = service.validateAllAgents(['contact_insight', 'network_action']);

      expect(results).toHaveProperty('contact_insight');
      expect(results).toHaveProperty('network_action');

      // Both should be valid with the enhanced templates
      expect(results.contact_insight.valid).toBe(true);
      expect(results.network_action.valid).toBe(true);
    });
  });

  describe('getValidationSummary', () => {
    it('should generate correct summary from validation results', () => {
      const mockResults = {
        agent1: { valid: true, errors: [], warnings: [] },
        agent2: { valid: false, errors: ['error1'], warnings: ['warning1'] },
        agent3: { valid: true, errors: [], warnings: ['warning2'] },
      };

      const summary = service.getValidationSummary(mockResults);

      expect(summary.total).toBe(3);
      expect(summary.valid).toBe(2);
      expect(summary.invalid).toBe(1);
      expect(summary.warnings).toBe(2);
      expect(summary.details).toHaveLength(3);
    });

    it('should include detailed breakdown in summary', () => {
      const mockResults = {
        agent1: { valid: true, errors: [], warnings: [] },
        agent2: { valid: false, errors: ['error1', 'error2'], warnings: ['warning1'] },
      };

      const summary = service.getValidationSummary(mockResults);

      expect(summary.details).toEqual([
        { agentId: 'agent1', valid: true, errorCount: 0, warningCount: 0 },
        { agentId: 'agent2', valid: false, errorCount: 2, warningCount: 1 },
      ]);
    });
  });
});

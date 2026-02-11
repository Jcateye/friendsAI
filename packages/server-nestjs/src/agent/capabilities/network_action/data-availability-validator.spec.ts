import { DataAvailabilityValidator } from './data-availability-validator';
import type { NetworkActionTemplateContext } from './network-action.types';

describe('DataAvailabilityValidator', () => {
  let validator: DataAvailabilityValidator;

  beforeEach(() => {
    validator = new DataAvailabilityValidator();
  });

  describe('validate', () => {
    describe('High Quality Data', () => {
      it('should return high quality with sufficient interactions', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            {
              id: '1',
              name: 'Alice',
              company: 'Tech Co',
              position: 'Engineer',
              lastInteractionAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
            },
            {
              id: '2',
              name: 'Bob',
              company: 'Design Inc',
              position: 'Designer',
              lastInteractionAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
            },
          ],
          recentInteractions: [
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), summary: 'Coffee chat' },
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), summary: 'Project meeting' },
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), summary: 'Email exchange' },
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(), summary: 'Phone call' },
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(), summary: 'Intro meeting' },
          ],
          metadata: {
            totalContacts: 2,
            totalInteractions: 10,
          },
        };

        const result = validator.validate(context);

        expect(result.dataQuality).toBe('high');
        expect(result.hasSufficientData).toBe(true);
        expect(result.confidenceAdjustment).toBe(0);
        expect(result.metrics.dataFreshness).toBe('fresh');
      });

      it('should return high quality with high interaction count', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            {
              id: '1',
              name: 'Alice',
              company: 'Tech Co',
              position: 'Engineer',
              lastInteractionAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            },
          ],
          recentInteractions: Array.from({ length: 10 }, (_, i) => ({
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
            summary: `Interaction ${i}`,
          })),
          metadata: {
            totalContacts: 1,
            totalInteractions: 15,
          },
        };

        const result = validator.validate(context);

        expect(result.dataQuality).toBe('high');
        expect(result.hasSufficientData).toBe(true);
        expect(result.missingFields).toEqual([]);
      });
    });

    describe('Medium Quality Data', () => {
      it('should return medium quality with moderate interactions', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            {
              id: '1',
              name: 'Alice',
              lastInteractionAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
            },
          ],
          recentInteractions: [
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(), summary: 'Meeting' },
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(), summary: 'Call' },
          ],
          metadata: {
            totalContacts: 1,
            totalInteractions: 2,
          },
        };

        const result = validator.validate(context);

        expect(result.dataQuality).toBe('medium');
        expect(result.hasSufficientData).toBe(true);
        expect(result.confidenceAdjustment).toBe(0.3);
      });

      it('should return medium quality with stale data', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            {
              id: '1',
              name: 'Alice',
              lastInteractionAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), // 60 days ago
            },
          ],
          recentInteractions: [
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), summary: 'Meeting' },
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 65).toISOString(), summary: 'Call' },
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 70).toISOString(), summary: 'Email' },
          ],
          metadata: {
            totalContacts: 1,
            totalInteractions: 3,
          },
        };

        const result = validator.validate(context);

        expect(result.dataQuality).toBe('medium');
        expect(result.metrics.dataFreshness).toBe('stale');
      });
    });

    describe('Low Quality Data', () => {
      it('should return low quality with no contacts', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [],
          recentInteractions: [],
          metadata: {
            totalContacts: 0,
            totalInteractions: 0,
          },
        };

        const result = validator.validate(context);

        expect(result.dataQuality).toBe('low');
        expect(result.hasSufficientData).toBe(false);
        expect(result.confidenceAdjustment).toBe(0.9);
        expect(result.missingFields).toContain('contacts');
        expect(result.missingFields).toContain('interactions');
      });

      it('should return low quality with contacts but no interactions', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            {
              id: '1',
              name: 'Alice',
              lastInteractionAt: '从未交互',
            },
          ],
          recentInteractions: [],
          metadata: {
            totalContacts: 1,
            totalInteractions: 0,
          },
        };

        const result = validator.validate(context);

        expect(result.dataQuality).toBe('low');
        expect(result.hasSufficientData).toBe(true); // Has contacts
        expect(result.confidenceAdjustment).toBe(0.6);
        expect(result.missingFields).toContain('interactions');
        expect(result.missingFields).toContain('contact_interactions');
      });

      it('should return low quality with single interaction', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            {
              id: '1',
              name: 'Alice',
              lastInteractionAt: new Date().toISOString(),
            },
          ],
          recentInteractions: [
            { date: new Date().toISOString(), summary: 'Meeting' },
          ],
          metadata: {
            totalContacts: 1,
            totalInteractions: 1,
          },
        };

        const result = validator.validate(context);

        expect(result.dataQuality).toBe('low');
        expect(result.hasSufficientData).toBe(true);
        expect(result.confidenceAdjustment).toBe(0.6);
      });
    });

    describe('Missing Fields Detection', () => {
      it('should identify missing contacts', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [],
          recentInteractions: [],
          metadata: {
            totalContacts: 0,
            totalInteractions: 0,
          },
        };

        const result = validator.validate(context);

        expect(result.missingFields).toContain('contacts');
        expect(result.missingFields).toContain('interactions');
      });

      it('should identify missing interactions', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            {
              id: '1',
              name: 'Alice',
              lastInteractionAt: '从未交互',
            },
          ],
          recentInteractions: [],
          metadata: {
            totalContacts: 1,
            totalInteractions: 0,
          },
        };

        const result = validator.validate(context);

        expect(result.missingFields).toContain('interactions');
        expect(result.missingFields).toContain('contact_interactions');
      });

      it('should identify stale interactions', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            {
              id: '1',
              name: 'Alice',
              lastInteractionAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
            },
          ],
          recentInteractions: [
            { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), summary: 'Old meeting' },
          ],
          metadata: {
            totalContacts: 1,
            totalInteractions: 1,
          },
        };

        const result = validator.validate(context);

        expect(result.missingFields).toContain('recent_interactions');
      });
    });

    describe('Metrics Computation', () => {
      it('should correctly compute average interactions per contact', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            { id: '1', name: 'Alice', lastInteractionAt: new Date().toISOString() },
            { id: '2', name: 'Bob', lastInteractionAt: new Date().toISOString() },
            { id: '3', name: 'Charlie', lastInteractionAt: '从未交互' },
          ],
          recentInteractions: [
            { date: new Date().toISOString(), summary: 'Meeting 1' },
            { date: new Date().toISOString(), summary: 'Meeting 2' },
          ],
          metadata: {
            totalContacts: 3,
            totalInteractions: 2,
          },
        };

        const result = validator.validate(context);

        expect(result.metrics.avgInteractionsPerContact).toBeCloseTo(0.67, 2);
      });

      it('should correctly count contacts with interactions', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            { id: '1', name: 'Alice', lastInteractionAt: new Date().toISOString() },
            { id: '2', name: 'Bob', lastInteractionAt: new Date().toISOString() },
            { id: '3', name: 'Charlie', lastInteractionAt: '从未交互' },
          ],
          recentInteractions: [],
          metadata: {
            totalContacts: 3,
            totalInteractions: 0,
          },
        };

        const result = validator.validate(context);

        expect(result.metrics.contactsWithInteraction).toBe(2);
      });
    });

    describe('Confidence Adjustment', () => {
      it('should return minimal adjustment for high quality fresh data', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            {
              id: '1',
              name: 'Alice',
              lastInteractionAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
            },
          ],
          recentInteractions: Array.from({ length: 10 }, (_, i) => ({
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
            summary: `Interaction ${i}`,
          })),
          metadata: {
            totalContacts: 1,
            totalInteractions: 15,
          },
        };

        const result = validator.validate(context);

        expect(result.confidenceAdjustment).toBe(0);
      });

      it('should return 0.9 adjustment for no contacts', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [],
          recentInteractions: [],
          metadata: {
            totalContacts: 0,
            totalInteractions: 0,
          },
        };

        const result = validator.validate(context);

        expect(result.confidenceAdjustment).toBe(0.9);
      });

      it('should return 0.6 adjustment for low quality with some contacts', () => {
        const context: NetworkActionTemplateContext = {
          contacts: [
            { id: '1', name: 'Alice', lastInteractionAt: '从未交互' },
          ],
          recentInteractions: [],
          metadata: {
            totalContacts: 1,
            totalInteractions: 0,
          },
        };

        const result = validator.validate(context);

        expect(result.confidenceAdjustment).toBe(0.6);
      });
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom minInteractionsForHighQuality', () => {
      const customValidator = new DataAvailabilityValidator({
        minInteractionsForHighQuality: 20,
      });

      const context: NetworkActionTemplateContext = {
        contacts: [
          {
            id: '1',
            name: 'Alice',
            lastInteractionAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          },
        ],
        recentInteractions: Array.from({ length: 15 }, (_, i) => ({
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
          summary: `Interaction ${i}`,
        })),
        metadata: {
          totalContacts: 1,
          totalInteractions: 15,
        },
      };

      const result = customValidator.validate(context);

      // With default threshold of 5, this would be high quality
      // With custom threshold of 20, it should be medium
      expect(result.dataQuality).toBe('medium');
    });

    it('should use custom requireReciprocityData', () => {
      const customValidator = new DataAvailabilityValidator({
        requireReciprocityData: true,
      });

      const context: NetworkActionTemplateContext = {
        contacts: [
          {
            id: '1',
            name: 'Alice',
            lastInteractionAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          },
        ],
        recentInteractions: [
          { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), summary: 'Meeting' },
        ],
        metadata: {
          totalContacts: 1,
          totalInteractions: 1,
        },
      };

      const result = customValidator.validate(context);

      expect(result.missingFields).toContain('reciprocity_data');
    });
  });
});

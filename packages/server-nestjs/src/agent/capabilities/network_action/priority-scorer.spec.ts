import {
  calculatePriorityScore,
  calculatePriorityFromRaw,
  PriorityScoreInput,
  RawPriorityInput,
} from './priority-scorer';

describe('PriorityScorer', () => {
  describe('calculatePriorityScore', () => {
    describe('Score Calculation', () => {
      it('should calculate score with all zero inputs', () => {
        const input: PriorityScoreInput = {
          recencyGap: 0,
          reciprocityGap: 0,
          importance: 0,
          momentWindow: 0,
          replyLikelihood: 0,
        };

        const result = calculatePriorityScore(input);

        expect(result.score).toBe(0);
        expect(result.queue).toBe('lightTouches');
        expect(result.priority).toBe('low');
      });

      it('should calculate score with all maximum inputs', () => {
        const input: PriorityScoreInput = {
          recencyGap: 100,
          reciprocityGap: 100,
          importance: 100,
          momentWindow: 100,
          replyLikelihood: 100,
        };

        const result = calculatePriorityScore(input);

        expect(result.score).toBe(100);
        expect(result.queue).toBe('urgentRepairs');
        expect(result.priority).toBe('high');
      });

      it('should correctly apply weighted formula', () => {
        // Test specific values: recencyGap=80, reciprocityGap=60, importance=40, momentWindow=20, replyLikelihood=10
        // Expected: 0.35*80 + 0.25*60 + 0.20*40 + 0.10*20 + 0.10*10
        // = 28 + 15 + 8 + 2 + 1 = 54
        const input: PriorityScoreInput = {
          recencyGap: 80,
          reciprocityGap: 60,
          importance: 40,
          momentWindow: 20,
          replyLikelihood: 10,
        };

        const result = calculatePriorityScore(input);

        expect(result.score).toBe(54);
        expect(result.queue).toBe('opportunityBridges');
        expect(result.priority).toBe('medium');
      });
    });

    describe('Queue Categorization - Boundary Values', () => {
      describe('Light Touches (< 45)', () => {
        const testCases = [
          { score: 0, expected: 'lightTouches' },
          { score: 30, expected: 'lightTouches' },
          { score: 44, expected: 'lightTouches' },
        ];

        testCases.forEach(({ score, expected }) => {
          it(`score ${score} should categorize as ${expected}`, () => {
            // Find inputs that produce this score
            // Since score = 0.35*recencyGap + ..., we can set recencyGap = score / 0.35
            const recencyGap = Math.round(score / 0.35);

            const result = calculatePriorityScore({
              recencyGap,
              reciprocityGap: 0,
              importance: 0,
              momentWindow: 0,
              replyLikelihood: 0,
            });

            expect(result.queue).toBe(expected);
            expect(result.priority).toBe('low');
          });
        });

        it('score 44 (boundary) should be lightTouches', () => {
          // recencyGap = 44 / 0.35 ≈ 125.71, but max is 100
          // Let's use multiple factors: 0.35*80 + 0.25*40 = 28 + 10 = 38
          // Add 6 from other factors...
          const result = calculatePriorityScore({
            recencyGap: 80,
            reciprocityGap: 40,
            importance: 0,
            momentWindow: 30,
            replyLikelihood: 0,
          });

          // 28 + 10 + 0 + 3 + 0 = 41 (close to 44)
          // Let's try exact 44:
          // 44 = 0.35*80 + 0.25*40 + 0.20*10 + 0.10*20 + 0.10*10
          // = 28 + 10 + 2 + 2 + 1 = 43
          // Need 1 more: increase replyLikelihood to 20
          const exactResult = calculatePriorityScore({
            recencyGap: 80,
            reciprocityGap: 40,
            importance: 10,
            momentWindow: 20,
            replyLikelihood: 20,
          });

          expect(exactResult.score).toBe(44);
          expect(exactResult.queue).toBe('lightTouches');
          expect(exactResult.priority).toBe('low');
        });
      });

      describe('Opportunity Bridges (45-74)', () => {
        it('score 45 (boundary) should be opportunityBridges', () => {
          const result = calculatePriorityScore({
            recencyGap: 80,
            reciprocityGap: 40,
            importance: 10,
            momentWindow: 20,
            replyLikelihood: 30,
          });

          expect(result.score).toBe(45);
          expect(result.queue).toBe('opportunityBridges');
          expect(result.priority).toBe('medium');
        });

        it('score 74 (boundary) should be opportunityBridges', () => {
          // 74 = 0.35*100 + 0.25*60 + 0.20*40 + 0.10*10 + 0.10*0
          // = 35 + 15 + 8 + 1 + 0 = 59 (too low)
          // Try: 100, 80, 50, 30, 10
          // = 35 + 20 + 10 + 3 + 1 = 69
          // Try: 100, 90, 60, 20, 10
          // = 35 + 22.5 + 12 + 2 + 1 = 72.5 ≈ 73
          // Let's find exact 74:
          // recencyGap=100 (35), reciprocityGap=100 (25), importance=40 (8), momentWindow=40 (4), replyLikelihood=20 (2)
          // = 35 + 25 + 8 + 4 + 2 = 74
          const result = calculatePriorityScore({
            recencyGap: 100,
            reciprocityGap: 100,
            importance: 40,
            momentWindow: 40,
            replyLikelihood: 20,
          });

          expect(result.score).toBe(74);
          expect(result.queue).toBe('opportunityBridges');
          expect(result.priority).toBe('medium');
        });

        it('score 60 should be opportunityBridges', () => {
          // 60 = 0.35*100 + 0.25*40 + 0.20*20 + 0.10*0 + 0.10*0
          // = 35 + 10 + 4 + 0 + 0 = 49 (too low)
          // Try: 100, 60, 30, 0, 0
          // = 35 + 15 + 6 = 56
          // Try: 100, 60, 40, 0, 0
          // = 35 + 15 + 8 = 58
          // Try: 100, 60, 50, 0, 0
          // = 35 + 15 + 10 = 60
          const result = calculatePriorityScore({
            recencyGap: 100,
            reciprocityGap: 60,
            importance: 50,
            momentWindow: 0,
            replyLikelihood: 0,
          });

          expect(result.score).toBe(60);
          expect(result.queue).toBe('opportunityBridges');
          expect(result.priority).toBe('medium');
        });
      });

      describe('Urgent Repairs (>= 75)', () => {
        it('score 75 (boundary) should be urgentRepairs', () => {
          // 75 = 0.35*100 + 0.25*100 + 0.20*10 + 0.10*0 + 0.10*0
          // = 35 + 25 + 2 + 0 + 0 = 62 (too low)
          // Try: 100, 100, 50, 0, 0
          // = 35 + 25 + 10 = 70
          // Try: 100, 100, 75, 0, 0
          // = 35 + 25 + 15 = 75
          const result = calculatePriorityScore({
            recencyGap: 100,
            reciprocityGap: 100,
            importance: 75,
            momentWindow: 0,
            replyLikelihood: 0,
          });

          expect(result.score).toBe(75);
          expect(result.queue).toBe('urgentRepairs');
          expect(result.priority).toBe('high');
        });

        it('score 90 should be urgentRepairs', () => {
          // 90 = 0.35*100 + 0.25*100 + 0.20*100 + 0.10*0 + 0.10*0
          // = 35 + 25 + 20 = 80
          // Need 10 more from momentWindow and replyLikelihood
          // 10 from 0.10*x + 0.10*y = x + y, so x=10, y=0 works
          const result = calculatePriorityScore({
            recencyGap: 100,
            reciprocityGap: 100,
            importance: 100,
            momentWindow: 100,
            replyLikelihood: 0,
          });

          expect(result.score).toBe(90);
          expect(result.queue).toBe('urgentRepairs');
          expect(result.priority).toBe('high');
        });
      });
    });

    describe('Input Validation', () => {
      it('should throw error for negative recencyGap', () => {
        expect(() => {
          calculatePriorityScore({
            recencyGap: -1,
            reciprocityGap: 0,
            importance: 0,
            momentWindow: 0,
            replyLikelihood: 0,
          });
        }).toThrow('recencyGap must be between 0 and 100');
      });

      it('should throw error for recencyGap > 100', () => {
        expect(() => {
          calculatePriorityScore({
            recencyGap: 101,
            reciprocityGap: 0,
            importance: 0,
            momentWindow: 0,
            replyLikelihood: 0,
          });
        }).toThrow('recencyGap must be between 0 and 100');
      });

      it('should throw error for invalid reciprocityGap', () => {
        expect(() => {
          calculatePriorityScore({
            recencyGap: 0,
            reciprocityGap: 150,
            importance: 0,
            momentWindow: 0,
            replyLikelihood: 0,
          });
        }).toThrow('reciprocityGap must be between 0 and 100');
      });

      it('should throw error for invalid importance', () => {
        expect(() => {
          calculatePriorityScore({
            recencyGap: 0,
            reciprocityGap: 0,
            importance: -10,
            momentWindow: 0,
            replyLikelihood: 0,
          });
        }).toThrow('importance must be between 0 and 100');
      });

      it('should throw error for invalid momentWindow', () => {
        expect(() => {
          calculatePriorityScore({
            recencyGap: 0,
            reciprocityGap: 0,
            importance: 0,
            momentWindow: 101,
            replyLikelihood: 0,
          });
        }).toThrow('momentWindow must be between 0 and 100');
      });

      it('should throw error for invalid replyLikelihood', () => {
        expect(() => {
          calculatePriorityScore({
            recencyGap: 0,
            reciprocityGap: 0,
            importance: 0,
            momentWindow: 0,
            replyLikelihood: -5,
          });
        }).toThrow('replyLikelihood must be between 0 and 100');
      });
    });
  });

  describe('calculatePriorityFromRaw', () => {
    it('should calculate priority from raw VIP contact with long gap', () => {
      const input: RawPriorityInput = {
        daysSinceLastContact: 180,
        messagesSent: 10,
        messagesReceived: 0,
        tier: 'vip',
        hasOpportunity: false,
        responseRate: 0.3,
      };

      const result = calculatePriorityFromRaw(input);

      expect(result.score).toBeGreaterThan(45);
      expect(result.queue).toBe('opportunityBridges');
      expect(result.priority).toBe('medium');
    });

    it('should calculate priority from regular contact with short gap', () => {
      const input: RawPriorityInput = {
        daysSinceLastContact: 7,
        messagesSent: 5,
        messagesReceived: 5,
        tier: 'regular',
        hasOpportunity: false,
        responseRate: 0.8,
      };

      const result = calculatePriorityFromRaw(input);

      expect(result.score).toBeLessThan(45);
      expect(result.queue).toBe('lightTouches');
      expect(result.priority).toBe('low');
    });

    it('should calculate priority for distant contact with current opportunity', () => {
      const input: RawPriorityInput = {
        daysSinceLastContact: 365,
        messagesSent: 20,
        messagesReceived: 0,
        tier: 'distant',
        hasOpportunity: true,
        responseRate: 0.1,
      };

      const result = calculatePriorityFromRaw(input);

      // Even though distant, the long gap and one-sided communication should push this up
      expect(result.score).toBeGreaterThan(30);
    });

    it('should handle zero total messages gracefully', () => {
      const input: RawPriorityInput = {
        daysSinceLastContact: 30,
        messagesSent: 0,
        messagesReceived: 0,
        tier: 'regular',
        hasOpportunity: false,
        responseRate: 0.5,
      };

      const result = calculatePriorityFromRaw(input);

      // Should not throw, reciprocityGap should be 0
      expect(result.queue).toBe('lightTouches');
      expect(result.priority).toBe('low');
    });

    it('should normalize recency gap correctly', () => {
      const input1: RawPriorityInput = {
        daysSinceLastContact: 0,
        messagesSent: 0,
        messagesReceived: 0,
        tier: 'regular',
        hasOpportunity: false,
        responseRate: 0.5,
      };

      const result1 = calculatePriorityFromRaw(input1);
      expect(result1.score).toBeLessThan(20);

      const input2: RawPriorityInput = {
        daysSinceLastContact: 365,
        messagesSent: 0,
        messagesReceived: 0,
        tier: 'regular',
        hasOpportunity: false,
        responseRate: 0.5,
      };

      const result2 = calculatePriorityFromRaw(input2);
      expect(result2.score).toBeGreaterThan(30);
    });

    describe('Tier Importance Mapping', () => {
      it('should assign 100 to VIP tier', () => {
        const input: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 0,
          messagesReceived: 0,
          tier: 'vip',
          hasOpportunity: false,
          responseRate: 0,
        };

        const result = calculatePriorityFromRaw(input);
        // Only importance contributes (20% of 100 = 20)
        expect(result.score).toBe(20);
      });

      it('should assign 75 to important tier', () => {
        const input: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 0,
          messagesReceived: 0,
          tier: 'important',
          hasOpportunity: false,
          responseRate: 0,
        };

        const result = calculatePriorityFromRaw(input);
        // 20% of 75 = 15
        expect(result.score).toBe(15);
      });

      it('should assign 50 to regular tier', () => {
        const input: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 0,
          messagesReceived: 0,
          tier: 'regular',
          hasOpportunity: false,
          responseRate: 0,
        };

        const result = calculatePriorityFromRaw(input);
        // 20% of 50 = 10
        expect(result.score).toBe(10);
      });

      it('should assign 25 to distant tier', () => {
        const input: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 0,
          messagesReceived: 0,
          tier: 'distant',
          hasOpportunity: false,
          responseRate: 0,
        };

        const result = calculatePriorityFromRaw(input);
        // 20% of 25 = 5
        expect(result.score).toBe(5);
      });
    });

    describe('Reciprocity Gap Calculation', () => {
      it('should calculate high gap for one-sided communication', () => {
        const input: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 10,
          messagesReceived: 0,
          tier: 'regular',
          hasOpportunity: false,
          responseRate: 0,
        };

        const result = calculatePriorityFromRaw(input);
        // sentRatio = 10/10 = 1, gap = |1 - 0.5| * 2 * 100 = 100
        // 25% of 100 = 25
        expect(result.score).toBe(35); // 10 (regular tier) + 25 (reciprocity gap)
      });

      it('should calculate zero gap for balanced communication', () => {
        const input: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 5,
          messagesReceived: 5,
          tier: 'regular',
          hasOpportunity: false,
          responseRate: 0,
        };

        const result = calculatePriorityFromRaw(input);
        // sentRatio = 0.5, gap = 0
        expect(result.score).toBe(10); // Only tier importance
      });

      it('should calculate moderate gap for slightly imbalanced', () => {
        const input: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 8,
          messagesReceived: 2,
          tier: 'regular',
          hasOpportunity: false,
          responseRate: 0,
        };

        const result = calculatePriorityFromRaw(input);
        // sentRatio = 8/10 = 0.8, gap = |0.8 - 0.5| * 2 * 100 = 60
        // 25% of 60 = 15
        expect(result.score).toBe(25); // 10 (tier) + 15 (reciprocity)
      });
    });

    describe('Opportunity Window', () => {
      it('should add full weight when opportunity exists', () => {
        const input1: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 0,
          messagesReceived: 0,
          tier: 'regular',
          hasOpportunity: false,
          responseRate: 0,
        };

        const result1 = calculatePriorityFromRaw(input1);
        const baseScore = result1.score;

        const input2: RawPriorityInput = {
          ...input1,
          hasOpportunity: true,
        };

        const result2 = calculatePriorityFromRaw(input2);
        // 10% weight for momentWindow
        expect(result2.score).toBe(baseScore + 10);
      });
    });

    describe('Response Rate', () => {
      it('should normalize response rate correctly', () => {
        const input: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 0,
          messagesReceived: 0,
          tier: 'regular',
          hasOpportunity: false,
          responseRate: 1.0,
        };

        const result = calculatePriorityFromRaw(input);
        // 10% of 100 = 10
        expect(result.score).toBe(20); // 10 (tier) + 10 (response rate)
      });

      it('should handle zero response rate', () => {
        const input: RawPriorityInput = {
          daysSinceLastContact: 0,
          messagesSent: 0,
          messagesReceived: 0,
          tier: 'regular',
          hasOpportunity: false,
          responseRate: 0,
        };

        const result = calculatePriorityFromRaw(input);
        expect(result.score).toBe(10); // Only tier importance
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal scores with rounding', () => {
      // These values should produce decimal score that gets rounded
      const input: PriorityScoreInput = {
        recencyGap: 33,
        reciprocityGap: 33,
        importance: 33,
        momentWindow: 33,
        replyLikelihood: 33,
      };

      const result = calculatePriorityScore(input);
      // 0.35*33 + 0.25*33 + 0.20*33 + 0.10*33 + 0.10*33
      // = 11.55 + 8.25 + 6.6 + 3.3 + 3.3 = 33
      expect(result.score).toBe(33);
    });

    it('should handle boundary score of 44.99 rounds to 45', () => {
      const input: PriorityScoreInput = {
        recencyGap: 80,
        reciprocityGap: 40,
        importance: 10,
        momentWindow: 20,
        replyLikelihood: 33,
      };

      const result = calculatePriorityScore(input);
      // 28 + 10 + 2 + 2 + 3.3 = 45.3, rounds to 45
      expect(result.score).toBe(45);
      expect(result.queue).toBe('opportunityBridges');
    });
  });
});

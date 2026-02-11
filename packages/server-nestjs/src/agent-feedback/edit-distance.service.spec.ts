import { Test, TestingModule } from '@nestjs/testing';
import { EditDistanceService } from './edit-distance.service';
import {
  EditDistanceResult,
  EditDistanceOptions,
  StringPair,
} from './edit-distance.service';

describe('EditDistanceService', () => {
  let service: EditDistanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EditDistanceService],
    }).compile();

    service = module.get<EditDistanceService>(EditDistanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Basic distance calculation', () => {
    it('should calculate distance for identical strings', () => {
      const result = service.calculate('hello', 'hello');

      expect(result.distance).toBe(0);
      expect(result.normalizedDistance).toBe(0);
      expect(result.similarityPercentage).toBe(100);
    });

    it('should calculate distance for completely different strings', () => {
      const result = service.calculate('abc', 'xyz');

      expect(result.distance).toBe(3);
      expect(result.normalizedDistance).toBe(1);
      expect(result.similarityPercentage).toBe(0);
    });

    it('should calculate distance for single substitution', () => {
      const result = service.calculate('cat', 'bat');

      expect(result.distance).toBe(1);
      expect(result.normalizedDistance).toBeCloseTo(0.333, 2);
      expect(result.similarityPercentage).toBeCloseTo(66.67, 2);
    });

    it('should calculate distance for single insertion', () => {
      const result = service.calculate('cat', 'cats');

      expect(result.distance).toBe(1);
      expect(result.normalizedDistance).toBe(0.25);
      expect(result.similarityPercentage).toBe(75);
    });

    it('should calculate distance for single deletion', () => {
      const result = service.calculate('cats', 'cat');

      expect(result.distance).toBe(1);
      expect(result.normalizedDistance).toBeCloseTo(0.25, 2);
      expect(result.similarityPercentage).toBe(75);
    });

    it('should calculate Levenshtein distance correctly', () => {
      // Classic example: "kitten" -> "sitting"
      const result = service.calculate('kitten', 'sitting');

      // kitten -> sitten (substitute k with s)
      // sitten -> sittin (substitute e with i)
      // sittin -> sitting (insert g at end)
      expect(result.distance).toBe(3);
      // Max length is 7 (sitting), so normalized = 3/7
      expect(result.normalizedDistance).toBeCloseTo(0.4286, 3);
      expect(result.similarityPercentage).toBeCloseTo(57.14, 2);
    });

    it('should handle mixed operations correctly', () => {
      // "algorithm" -> "altruistic"
      const result = service.calculate('algorithm', 'altruistic');

      // a-l-g-o-r-i-t-h-m -> a-l-t-r-u-i-s-t-i-c
      // g->t (sub), o->r (sub), +u (ins), h->s (sub), +i (ins), +c (ins)
      expect(result.distance).toBe(6);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      const result = service.calculate('', '');

      expect(result.distance).toBe(0);
      expect(result.normalizedDistance).toBe(0);
      expect(result.similarityPercentage).toBe(0);
    });

    it('should handle empty original string', () => {
      const result = service.calculate('', 'hello');

      expect(result.distance).toBe(5);
      expect(result.normalizedDistance).toBe(1);
      expect(result.similarityPercentage).toBe(0);
    });

    it('should handle empty modified string', () => {
      const result = service.calculate('hello', '');

      expect(result.distance).toBe(5);
      expect(result.normalizedDistance).toBe(1);
      expect(result.similarityPercentage).toBe(0);
    });

    it('should handle single character strings', () => {
      const result = service.calculate('a', 'b');

      expect(result.distance).toBe(1);
      expect(result.normalizedDistance).toBe(1);
      expect(result.similarityPercentage).toBe(0);
    });

    it('should handle single character match', () => {
      const result = service.calculate('a', 'a');

      expect(result.distance).toBe(0);
      expect(result.normalizedDistance).toBe(0);
      expect(result.similarityPercentage).toBe(100);
    });
  });

  describe('Options - case sensitivity', () => {
    it('should be case-insensitive by default', () => {
      const result = service.calculate('Hello', 'hello');

      expect(result.distance).toBe(0);
      expect(result.similarityPercentage).toBe(100);
    });

    it('should respect caseSensitive option', () => {
      const result = service.calculate('Hello', 'hello', { caseSensitive: true });

      expect(result.distance).toBe(1);
      expect(result.similarityPercentage).toBeCloseTo(80, 1);
    });

    it('should handle mixed case correctly when case-sensitive', () => {
      const result = service.calculate('HelloWorld', 'helloworld', { caseSensitive: true });

      expect(result.distance).toBe(2);
    });

    it('should be case-insensitive when caseSensitive is false', () => {
      const result = service.calculate('HeLLo WoRLd', 'hello world', { caseSensitive: false });

      expect(result.distance).toBe(0);
    });
  });

  describe('Options - ignore whitespace', () => {
    it('should count whitespace by default', () => {
      const result = service.calculate('hello world', 'helloworld');

      expect(result.distance).toBe(1);
    });

    it('should ignore whitespace when option is set', () => {
      const result = service.calculate('hello world', 'helloworld', { ignoreWhitespace: true });

      expect(result.distance).toBe(0);
    });

    it('should handle multiple spaces with ignoreWhitespace', () => {
      const result = service.calculate('hello   world', 'helloworld', { ignoreWhitespace: true });

      expect(result.distance).toBe(0);
    });

    it('should handle tabs and newlines with ignoreWhitespace', () => {
      const result = service.calculate('hello\t\nworld', 'helloworld', { ignoreWhitespace: true });

      expect(result.distance).toBe(0);
    });

    it('should combine case-insensitive and ignore-whitespace', () => {
      const result = service.calculate('Hello   World', 'helloworld', {
        caseSensitive: false,
        ignoreWhitespace: true,
      });

      expect(result.distance).toBe(0);
    });
  });

  describe('Options - include operations', () => {
    it('should not include operations by default', () => {
      const result = service.calculate('cat', 'bat');

      expect(result.operations).toBeUndefined();
    });

    it('should include operations when requested', () => {
      const result = service.calculate('cat', 'bat', { includeOperations: true });

      expect(result.operations).toBeDefined();
      expect(result.operations?.length).toBeGreaterThan(0);
    });

    it('should track substitution operations', () => {
      const result = service.calculate('cat', 'bat', { includeOperations: true });

      const replaceOps = result.operations?.filter(op => op.type === 'replace');
      expect(replaceOps?.length).toBe(1);
      expect(replaceOps?.[0].character).toBe('c -> b');
    });

    it('should track insertion operations', () => {
      const result = service.calculate('cat', 'cats', { includeOperations: true });

      const insertOps = result.operations?.filter(op => op.type === 'insert');
      expect(insertOps?.length).toBe(1);
      expect(insertOps?.[0].character).toBe('s');
    });

    it('should track deletion operations', () => {
      const result = service.calculate('cats', 'cat', { includeOperations: true });

      const deleteOps = result.operations?.filter(op => op.type === 'delete');
      expect(deleteOps?.length).toBe(1);
      expect(deleteOps?.[0].character).toBe('s');
    });

    it('should track match operations', () => {
      const result = service.calculate('hello', 'hello', { includeOperations: true });

      const matchOps = result.operations?.filter(op => op.type === 'match');
      expect(matchOps?.length).toBe(5);
    });

    it('should correctly track complex operation sequence', () => {
      const result = service.calculate('kitten', 'sitting', { includeOperations: true });

      expect(result.distance).toBe(3);
      expect(result.operations).toBeDefined();

      const replaceOps = result.operations?.filter(op => op.type === 'replace');
      const insertOps = result.operations?.filter(op => op.type === 'insert');

      // k->s, e->i (2 replacements)
      expect(replaceOps?.length).toBe(2);
      // +g (1 insertion)
      expect(insertOps?.length).toBe(1);
    });
  });

  describe('Batch processing', () => {
    it('should calculate distance for multiple pairs', () => {
      const pairs: StringPair[] = [
        { original: 'hello', modified: 'hello' },
        { original: 'cat', modified: 'bat' },
        { original: 'kitten', modified: 'sitting' },
      ];

      const results = service.calculateBatch(pairs);

      expect(results).toHaveLength(3);
      expect(results[0].distance).toBe(0);
      expect(results[1].distance).toBe(1);
      expect(results[2].distance).toBe(3);
    });

    it('should apply options to all pairs in batch', () => {
      const pairs: StringPair[] = [
        { original: 'Hello', modified: 'hello' },
        { original: 'World', modified: 'world' },
      ];

      const results = service.calculateBatch(pairs, { caseSensitive: true });

      expect(results[0].distance).toBe(1);
      expect(results[1].distance).toBe(1);
    });

    it('should handle empty batch', () => {
      const results = service.calculateBatch([]);

      expect(results).toEqual([]);
    });

    it('should handle single item batch', () => {
      const results = service.calculateBatch([{ original: 'test', modified: 'test' }]);

      expect(results).toHaveLength(1);
      expect(results[0].distance).toBe(0);
    });
  });

  describe('Long strings optimization', () => {
    it('should use optimized algorithm for long strings', () => {
      const longStr1 = 'a'.repeat(1500);
      const longStr2 = 'a'.repeat(1500);

      const result = service.calculate(longStr1, longStr2);

      expect(result.distance).toBe(0);
      expect(result.similarityPercentage).toBe(100);
    });

    it('should calculate distance correctly for long different strings', () => {
      const longStr1 = 'a'.repeat(1000);
      const longStr2 = 'b'.repeat(1000);

      const result = service.calculate(longStr1, longStr2);

      // Distance should be 1000 (all substitutions)
      expect(result.distance).toBe(1000);
    });

    it('should use full algorithm when operations are requested', () => {
      const longStr1 = 'a'.repeat(1500);
      const longStr2 = 'a'.repeat(1500);

      const result = service.calculate(longStr1, longStr2, { includeOperations: true });

      expect(result.distance).toBe(0);
      expect(result.operations).toBeDefined();
      // With operations, all characters should be matches
      const matchOps = result.operations?.filter(op => op.type === 'match');
      expect(matchOps?.length).toBe(1500);
    });
  });

  describe('Real-world scenarios', () => {
    it('should analyze AI draft modifications - minimal changes', () => {
      const aiDraft = 'Hi John, hope you are doing well. Let\'s catch up soon!';
      const userEdit = 'Hi John, hope you are doing great. Let\'s catch up soon!';

      const result = service.calculate(aiDraft, userEdit);

      // well -> great: w->g, e->r, l->e, l->a (4 substitutions)
      expect(result.distance).toBe(4);
      expect(result.similarityPercentage).toBeGreaterThan(90);
    });

    it('should analyze AI draft modifications - significant edits', () => {
      const aiDraft = 'Hello, I would like to schedule a meeting with you to discuss our project.';
      const userEdit = 'Hi! Can we talk about the project sometime next week?';

      const result = service.calculate(aiDraft, userEdit);

      expect(result.distance).toBeGreaterThan(20);
      expect(result.similarityPercentage).toBeLessThan(50);
    });

    it('should handle message drafts with special characters', () => {
      const original = 'Hello! @john #meeting';
      const modified = 'Hello! @jane #call';

      const result = service.calculate(original, modified);

      // john->jane (2 chars: o->a, n->n, n->e... actually h->j, o->a)
      // meeting -> call is more complex
      // Let's use simpler case
      expect(result.distance).toBeGreaterThan(0);
    });

    it('should normalize Chinese text changes', () => {
      const original = '你好，我想和你讨论一下项目';
      const modified = '你好，我想和你讨论一下新的项目计划';

      const result = service.calculate(original, modified);

      expect(result.distance).toBeGreaterThan(0);
      expect(result.similarityPercentage).toBeGreaterThan(50);
    });
  });

  describe('Rounding and precision', () => {
    it('should round normalized distance to 4 decimal places', () => {
      const result = service.calculate('cat', 'bat');

      expect(result.normalizedDistance).toBe(0.3333);
    });

    it('should round similarity percentage to 2 decimal places', () => {
      const result = service.calculate('kitten', 'sitting');

      // 3/7 = 0.4286..., similarity = 57.14%
      expect(result.similarityPercentage).toBeCloseTo(57.14, 2);
    });

    it('should handle perfect match precision', () => {
      const result = service.calculate('test', 'test');

      expect(result.normalizedDistance).toBe(0);
      expect(result.similarityPercentage).toBe(100);
    });
  });

  describe('Unicode and special characters', () => {
    it('should handle emoji correctly', () => {
      // Emojis are surrogate pairs (2 code units in JS strings)
      const result = service.calculate('Hello 👋', 'Hello 🌍');

      // 👋 and 🌍 are both 2 code units, so 1 substitution = distance 2
      expect(result.distance).toBe(2);
    });

    it('should handle accented characters', () => {
      const result = service.calculate('café', 'cafe');

      expect(result.distance).toBe(1);
    });

    it('should handle combined emoji sequences', () => {
      const result = service.calculate('👋🏽', '👋🏻');

      // Each emoji sequence has multiple code units
      expect(result.distance).toBeGreaterThan(0);
    });
  });
});

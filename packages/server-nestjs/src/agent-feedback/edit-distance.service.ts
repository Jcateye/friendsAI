/**
 * Edit distance calculation service using Levenshtein distance algorithm.
 * Used for analyzing user modifications to AI-generated drafts.
 */

import { Injectable } from '@nestjs/common';

/**
 * Single edit operation in the transformation sequence
 */
export interface EditOperation {
  /** Type of operation performed */
  type: 'insert' | 'delete' | 'replace' | 'match';
  /** Character involved (if applicable) */
  character?: string;
  /** Position in the original string */
  position: number;
}

/**
 * Result of edit distance calculation
 */
export interface EditDistanceResult {
  /** Raw edit distance (number of operations) */
  distance: number;
  /** Normalized distance (0-1, based on longer string length) */
  normalizedDistance: number;
  /** Similarity percentage (0-100) */
  similarityPercentage: number;
  /** Sequence of operations (included only when requested) */
  operations?: EditOperation[];
}

/**
 * Options for edit distance calculation
 */
export interface EditDistanceOptions {
  /** Whether to be case-sensitive, defaults to false */
  caseSensitive?: boolean;
  /** Whether to ignore whitespace, defaults to false */
  ignoreWhitespace?: boolean;
  /** Whether to include operation sequence, defaults to false */
  includeOperations?: boolean;
}

/**
 * Pair of strings for batch processing
 */
export interface StringPair {
  original: string;
  modified: string;
}

@Injectable()
export class EditDistanceService {
  /**
   * Calculate Levenshtein distance between two strings
   * @param original - The original string
   * @param modified - The modified string
   * @param options - Calculation options
   * @returns EditDistanceResult with distance metrics
   */
  calculate(
    original: string,
    modified: string,
    options: EditDistanceOptions = {},
  ): EditDistanceResult {
    const {
      caseSensitive = false,
      ignoreWhitespace = false,
      includeOperations = false,
    } = options;

    // Apply preprocessing options
    const processedOriginal = this.preprocessString(original, caseSensitive, ignoreWhitespace);
    const processedModified = this.preprocessString(modified, caseSensitive, ignoreWhitespace);

    const originalLen = processedOriginal.length;
    const modifiedLen = processedModified.length;

    // Handle edge cases
    if (originalLen === 0 && modifiedLen === 0) {
      return this.buildResult(0, 0, 0, includeOperations ? [] : undefined);
    }

    if (originalLen === 0) {
      const operations = includeOperations
        ? this.buildInsertOperations(processedModified)
        : undefined;
      return this.buildResult(modifiedLen, 1, 0, operations);
    }

    if (modifiedLen === 0) {
      const operations = includeOperations
        ? this.buildDeleteOperations(processedOriginal)
        : undefined;
      return this.buildResult(originalLen, 1, 0, operations);
    }

    // For long strings, use optimized version without operation tracking
    const useOptimized = !includeOperations && Math.max(originalLen, modifiedLen) > 1000;

    let distance: number;
    let operations: EditOperation[] | undefined;

    if (useOptimized) {
      distance = this.calculateOptimizedDistance(processedOriginal, processedModified);
    } else if (includeOperations) {
      const result = this.calculateWithOperations(processedOriginal, processedModified);
      distance = result.distance;
      operations = result.operations;
    } else {
      distance = this.calculateBasicDistance(processedOriginal, processedModified);
    }

    const maxLength = Math.max(originalLen, modifiedLen);
    const normalizedDistance = distance / maxLength;
    const similarityPercentage = (1 - normalizedDistance) * 100;

    return this.buildResult(distance, normalizedDistance, similarityPercentage, operations);
  }

  /**
   * Calculate edit distance for multiple string pairs
   * @param pairs - Array of string pairs
   * @param options - Calculation options (applied to all pairs)
   * @returns Array of EditDistanceResult
   */
  calculateBatch(
    pairs: StringPair[],
    options: EditDistanceOptions = {},
  ): EditDistanceResult[] {
    return pairs.map(pair =>
      this.calculate(pair.original, pair.modified, options),
    );
  }

  /**
   * Preprocess string based on options
   */
  private preprocessString(
    str: string,
    caseSensitive: boolean,
    ignoreWhitespace: boolean,
  ): string {
    let processed = str;

    if (!caseSensitive) {
      processed = processed.toLowerCase();
    }

    if (ignoreWhitespace) {
      processed = processed.replace(/\s+/g, '');
    }

    return processed;
  }

  /**
   * Basic Levenshtein distance calculation using dynamic programming
   * Time complexity: O(n*m), Space complexity: O(n*m)
   */
  private calculateBasicDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create DP table
    const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
      Array(len2 + 1).fill(0),
    );

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }

    // Fill the DP table
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1], // substitution
          );
        }
      }
    }

    return dp[len1][len2];
  }

  /**
   * Calculate distance with operation tracking using backtracking
   * Time complexity: O(n*m), Space complexity: O(n*m)
   */
  private calculateWithOperations(
    str1: string,
    str2: string,
  ): { distance: number; operations: EditOperation[] } {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create DP table
    const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
      Array(len2 + 1).fill(0),
    );

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }

    // Fill the DP table
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],
            dp[i][j - 1],
            dp[i - 1][j - 1],
          );
        }
      }
    }

    // Backtrack to find operations
    const operations: EditOperation[] = [];
    let i = len1;
    let j = len2;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
        operations.unshift({
          type: 'match',
          character: str1[i - 1],
          position: i - 1,
        });
        i--;
        j--;
      } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        operations.unshift({
          type: 'replace',
          character: `${str1[i - 1]} -> ${str2[j - 1]}`,
          position: i - 1,
        });
        i--;
        j--;
      } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
        operations.unshift({
          type: 'insert',
          character: str2[j - 1],
          position: i,
        });
        j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        operations.unshift({
          type: 'delete',
          character: str1[i - 1],
          position: i - 1,
        });
        i--;
      } else if (i > 0) {
        operations.unshift({
          type: 'delete',
          character: str1[i - 1],
          position: i - 1,
        });
        i--;
      } else {
        operations.unshift({
          type: 'insert',
          character: str2[j - 1],
          position: i,
        });
        j--;
      }
    }

    return { distance: dp[len1][len2], operations };
  }

  /**
   * Optimized calculation using only two rows
   * Time complexity: O(n*m), Space complexity: O(min(n,m))
   */
  private calculateOptimizedDistance(str1: string, str2: string): number {
    // Ensure str1 is the shorter string for space optimization
    if (str1.length > str2.length) {
      [str1, str2] = [str2, str1];
    }

    const len1 = str1.length;
    const len2 = str2.length;

    let prevRow = Array.from({ length: len1 + 1 }, (_, i) => i);

    for (let j = 1; j <= len2; j++) {
      const currRow = [j];
      for (let i = 1; i <= len1; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          currRow[i] = prevRow[i - 1];
        } else {
          currRow[i] = 1 + Math.min(
            prevRow[i],      // deletion
            currRow[i - 1],  // insertion
            prevRow[i - 1],  // substitution
          );
        }
      }
      prevRow = currRow;
    }

    return prevRow[len1];
  }

  /**
   * Build insert operations for empty original string
   */
  private buildInsertOperations(str: string): EditOperation[] {
    return str.split('').map((char, index) => ({
      type: 'insert' as const,
      character: char,
      position: index,
    }));
  }

  /**
   * Build delete operations for empty modified string
   */
  private buildDeleteOperations(str: string): EditOperation[] {
    return str.split('').map((char, index) => ({
      type: 'delete' as const,
      character: char,
      position: index,
    }));
  }

  /**
   * Build result object with proper rounding
   */
  private buildResult(
    distance: number,
    normalizedDistance: number,
    similarityPercentage: number,
    operations?: EditOperation[],
  ): EditDistanceResult {
    const result: EditDistanceResult = {
      distance,
      normalizedDistance: Math.round(normalizedDistance * 10000) / 10000,
      similarityPercentage: Math.round(similarityPercentage * 100) / 100,
    };

    if (operations) {
      result.operations = operations;
    }

    return result;
  }
}

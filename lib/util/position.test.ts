import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getLineAtPosition } from './position.js';

describe('getLineAtPosition function', () => {
  describe('basic functionality', () => {
    it('should return line at position in single line', () => {
      const content = 'hello world';
      assert.strictEqual(getLineAtPosition(content, 0), 'hello world');
      assert.strictEqual(getLineAtPosition(content, 6), 'hello world');
      assert.strictEqual(getLineAtPosition(content, 10), 'hello world');
    });

    it('should return correct line in multi-line content', () => {
      const content = 'line one\nline two\nline three';
      assert.strictEqual(getLineAtPosition(content, 0), 'line one');
      assert.strictEqual(getLineAtPosition(content, 4), 'line one');
      assert.strictEqual(getLineAtPosition(content, 9), 'line two');
      assert.strictEqual(getLineAtPosition(content, 18), 'line three');
    });

    it('should handle position at the start of a line', () => {
      const content = 'first\nsecond\nthird';
      // Position 0 is start of first line
      assert.strictEqual(getLineAtPosition(content, 0), 'first');
      // Position 6 is start of second line (after \n)
      assert.strictEqual(getLineAtPosition(content, 6), 'second');
      // Position 13 is start of third line (after \n)
      assert.strictEqual(getLineAtPosition(content, 13), 'third');
    });

    it('should handle position at the end of a line', () => {
      const content = 'first\nsecond\nthird';
      // Position 4 is last char of first line
      assert.strictEqual(getLineAtPosition(content, 4), 'first');
      // Position 11 is last char of second line
      assert.strictEqual(getLineAtPosition(content, 11), 'second');
      // Position 17 is last char of third line
      assert.strictEqual(getLineAtPosition(content, 17), 'third');
    });
  });

  describe('newline handling', () => {
    it('should handle Unix newlines (\\n)', () => {
      const content = 'line1\nline2\nline3';
      assert.strictEqual(getLineAtPosition(content, 0), 'line1');
      assert.strictEqual(getLineAtPosition(content, 6), 'line2');
      assert.strictEqual(getLineAtPosition(content, 12), 'line3');
    });

    it('should not include newline characters in result', () => {
      const content = 'first\nsecond\nthird';
      assert.strictEqual(getLineAtPosition(content, 0), 'first');
      assert.strictEqual(getLineAtPosition(content, 6), 'second');
      assert.strictEqual(getLineAtPosition(content, 13), 'third');
      // Verify no newline characters in results
      assert.ok(!getLineAtPosition(content, 0).includes('\n'));
      assert.ok(!getLineAtPosition(content, 6).includes('\n'));
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const content = '';
      assert.strictEqual(getLineAtPosition(content, 0), '');
    });

    it('should handle single character', () => {
      const content = 'x';
      assert.strictEqual(getLineAtPosition(content, 0), 'x');
    });

    it('should handle position at end of file', () => {
      const content = 'hello world';
      // Position at last character
      assert.strictEqual(
        getLineAtPosition(content, content.length - 1),
        'hello world',
      );
    });

    it('should handle empty lines', () => {
      const content = 'line1\n\nline3';
      assert.strictEqual(getLineAtPosition(content, 0), 'line1');
      assert.strictEqual(getLineAtPosition(content, 6), ''); // Empty line
      assert.strictEqual(getLineAtPosition(content, 7), 'line3');
    });

    it('should handle multiple consecutive empty lines', () => {
      const content = 'line1\n\n\nline4';
      assert.strictEqual(getLineAtPosition(content, 6), '');
      assert.strictEqual(getLineAtPosition(content, 7), '');
    });

    it('should handle line with only whitespace', () => {
      const content = 'text\n   \nmore';
      assert.strictEqual(getLineAtPosition(content, 5), '   ');
    });

    it('should handle content ending with newline', () => {
      const content = 'line1\nline2\n';
      assert.strictEqual(getLineAtPosition(content, 0), 'line1');
      assert.strictEqual(getLineAtPosition(content, 6), 'line2');
    });

    it('should handle content starting with newline', () => {
      const content = '\nline2\nline3';
      assert.strictEqual(getLineAtPosition(content, 0), '');
      assert.strictEqual(getLineAtPosition(content, 1), 'line2');
    });
  });

  describe('position at newline characters', () => {
    it('should handle position at \\n character', () => {
      const content = 'first\nsecond';
      // Position 5 is the \n character
      // Since we go backwards from position and stop at newline,
      // position 5 should give us "first"
      assert.strictEqual(getLineAtPosition(content, 5), 'first');
    });
  });
});

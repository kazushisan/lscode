import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getPosition } from './position.js';

describe('getPosition function', () => {
  it('should calculate position at the start of first line', () => {
    const content = 'hello world';
    const position = getPosition(0, 0, content);
    assert.strictEqual(position, 0);
  });

  it('should calculate position in the middle of first line', () => {
    const content = 'hello world';
    const position = getPosition(0, 6, content);
    assert.strictEqual(position, 6);
  });

  it('should calculate position at the end of first line', () => {
    const content = 'hello world';
    const position = getPosition(0, 11, content);
    assert.strictEqual(position, 11);
  });

  it('should calculate position at the start of second line', () => {
    const content = 'hello\nworld';
    const position = getPosition(1, 0, content);
    assert.strictEqual(position, 6);
  });

  it('should calculate position in the middle of second line', () => {
    const content = 'hello\nworld';
    const position = getPosition(1, 3, content);
    assert.strictEqual(position, 9);
  });

  it('should calculate position with multiple lines', () => {
    const content = 'line1\nline2\nline3';
    assert.strictEqual(getPosition(0, 0, content), 0);
    assert.strictEqual(getPosition(1, 0, content), 6);
    assert.strictEqual(getPosition(2, 0, content), 12);
  });

  it('should calculate position in multi-line content', () => {
    const content = 'const x = 1;\nconst y = 2;\nconst z = 3;';
    assert.strictEqual(getPosition(0, 6, content), 6);
    assert.strictEqual(getPosition(1, 6, content), 19);
    assert.strictEqual(getPosition(2, 6, content), 32);
  });

  it('should handle empty lines', () => {
    const content = 'line1\n\nline3';
    assert.strictEqual(getPosition(0, 0, content), 0);
    assert.strictEqual(getPosition(1, 0, content), 6);
    assert.strictEqual(getPosition(2, 0, content), 7);
  });

  it('should handle content with only newlines', () => {
    const content = '\n\n\n';
    assert.strictEqual(getPosition(0, 0, content), 0);
    assert.strictEqual(getPosition(1, 0, content), 1);
    assert.strictEqual(getPosition(2, 0, content), 2);
    assert.strictEqual(getPosition(3, 0, content), 3);
  });

  it('should handle single character content', () => {
    const content = 'x';
    assert.strictEqual(getPosition(0, 0, content), 0);
    assert.strictEqual(getPosition(0, 1, content), 1);
  });

  it('should handle empty content', () => {
    const content = '';
    assert.strictEqual(getPosition(0, 0, content), 0);
  });

  it('should throw error for line out of range', () => {
    const content = 'hello\nworld';
    assert.throws(() => getPosition(5, 0, content), /Line 5 is out of range/);
  });

  it('should handle last line without trailing newline', () => {
    const content = 'line1\nline2';
    assert.strictEqual(getPosition(1, 5, content), 11);
  });

  it('should handle TypeScript code', () => {
    const content =
      'export const add = (a: number, b: number): number => {\n  return a + b;\n};';
    assert.strictEqual(getPosition(0, 14, content), 14);
    assert.strictEqual(getPosition(1, 2, content), 57);
    assert.strictEqual(getPosition(2, 0, content), 71);
  });
});

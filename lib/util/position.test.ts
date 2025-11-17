import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getPosition, getKeywordPosition } from './position.js';

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

describe('getKeywordPosition function', () => {
  it('should find keyword at the start of content', () => {
    const content = 'hello world';
    const pos = getKeywordPosition('hello', content);
    assert.strictEqual(pos.line, 0);
    assert.strictEqual(pos.character, 0);
  });

  it('should find keyword in the middle of first line', () => {
    const content = 'hello world';
    const pos = getKeywordPosition('world', content);
    assert.strictEqual(pos.line, 0);
    assert.strictEqual(pos.character, 6);
  });

  it('should find keyword on second line', () => {
    const content = 'hello\nworld';
    const pos = getKeywordPosition('world', content);
    assert.strictEqual(pos.line, 1);
    assert.strictEqual(pos.character, 0);
  });

  it('should find keyword in the middle of second line', () => {
    const content = 'hello\nworld foo';
    const pos = getKeywordPosition('foo', content);
    assert.strictEqual(pos.line, 1);
    assert.strictEqual(pos.character, 6);
  });

  it('should find keyword across multiple lines', () => {
    const content = 'line1\nline2\nline3';
    const pos1 = getKeywordPosition('line1', content);
    assert.strictEqual(pos1.line, 0);
    assert.strictEqual(pos1.character, 0);

    const pos2 = getKeywordPosition('line2', content);
    assert.strictEqual(pos2.line, 1);
    assert.strictEqual(pos2.character, 0);

    const pos3 = getKeywordPosition('line3', content);
    assert.strictEqual(pos3.line, 2);
    assert.strictEqual(pos3.character, 0);
  });

  it('should find keyword in TypeScript code', () => {
    const content =
      'export const add = (a: number, b: number) => {\n  return a + b;\n};';
    const pos = getKeywordPosition('add', content);
    assert.strictEqual(pos.line, 0);
    assert.strictEqual(pos.character, 13);
  });

  it('should find keyword with special characters', () => {
    const content = 'const myVar = 123;\nlet anotherVar = 456;';
    const pos = getKeywordPosition('myVar', content);
    assert.strictEqual(pos.line, 0);
    assert.strictEqual(pos.character, 6);
  });

  it('should find first occurrence of keyword when multiple exist', () => {
    const content = 'const x = x + 1;';
    const pos = getKeywordPosition('x', content);
    assert.strictEqual(pos.line, 0);
    assert.strictEqual(pos.character, 6);
  });

  it('should throw error when keyword not found', () => {
    const content = 'hello world';
    assert.throws(
      () => getKeywordPosition('notfound', content),
      /Keyword "notfound" not found in content/,
    );
  });

  it('should handle empty lines before keyword', () => {
    const content = 'line1\n\nline3';
    const pos = getKeywordPosition('line3', content);
    assert.strictEqual(pos.line, 2);
    assert.strictEqual(pos.character, 0);
  });

  it('should find keyword at end of line', () => {
    const content = 'hello world\nfoo bar';
    const pos = getKeywordPosition('bar', content);
    assert.strictEqual(pos.line, 1);
    assert.strictEqual(pos.character, 4);
  });
});

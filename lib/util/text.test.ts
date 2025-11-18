import { describe, it } from 'node:test';
import assert from 'node:assert';
import { forwardMatch } from './text.js';

describe('forwardMatch function', () => {
  it('should find single occurrence of keyword', () => {
    const content = 'hello world';
    const positions = forwardMatch(content, 'world');
    assert.deepStrictEqual(positions, [6]);
  });

  it('should find multiple occurrences of keyword', () => {
    const content = 'hello world, hello universe';
    const positions = forwardMatch(content, 'hello');
    assert.deepStrictEqual(positions, [0, 13]);
  });

  it('should find overlapping occurrences', () => {
    const content = 'aaaa';
    const positions = forwardMatch(content, 'aa');
    assert.deepStrictEqual(positions, [0, 1, 2]);
  });

  it('should return empty array when keyword not found', () => {
    const content = 'hello world';
    const positions = forwardMatch(content, 'notfound');
    assert.deepStrictEqual(positions, []);
  });

  it('should return empty array for empty keyword', () => {
    const content = 'hello world';
    const positions = forwardMatch(content, '');
    assert.deepStrictEqual(positions, []);
  });

  it('should handle empty content', () => {
    const content = '';
    const positions = forwardMatch(content, 'test');
    assert.deepStrictEqual(positions, []);
  });

  it('should find keyword at start of content', () => {
    const content = 'hello world';
    const positions = forwardMatch(content, 'hello');
    assert.deepStrictEqual(positions, [0]);
  });

  it('should find keyword at end of content', () => {
    const content = 'hello world';
    const positions = forwardMatch(content, 'world');
    assert.deepStrictEqual(positions, [6]);
  });

  it('should find single character keyword', () => {
    const content = 'a b a c a';
    const positions = forwardMatch(content, 'a');
    assert.deepStrictEqual(positions, [0, 4, 8]);
  });

  it('should handle multi-line content', () => {
    const content = 'line1\nline2\nline1';
    const positions = forwardMatch(content, 'line1');
    assert.deepStrictEqual(positions, [0, 12]);
  });

  it('should find keyword in TypeScript code', () => {
    const content = 'const add = (a, b) => a + b;\\nconst result = add(1, 2);';
    const positions = forwardMatch(content, 'add');
    assert.deepStrictEqual(positions, [6, 45]);
  });

  it('should handle consecutive occurrences', () => {
    const content = 'testtest';
    const positions = forwardMatch(content, 'test');
    assert.deepStrictEqual(positions, [0, 4]);
  });

  it('should handle special characters in keyword', () => {
    const content = 'const x = 1; const y = 2;';
    const positions = forwardMatch(content, 'const');
    assert.deepStrictEqual(positions, [0, 13]);
  });

  it('should handle newline characters in content', () => {
    const content = 'hello\nworld\nhello';
    const positions = forwardMatch(content, '\n');
    assert.deepStrictEqual(positions, [5, 11]);
  });

  it('should be case-sensitive', () => {
    const content = 'Hello hello HELLO';
    const positions = forwardMatch(content, 'hello');
    assert.deepStrictEqual(positions, [6]);
  });

  it('should handle very long keyword', () => {
    const longKeyword = 'verylongkeywordthatspansmanychars';
    const content = `start ${longKeyword} middle ${longKeyword} end`;
    const positions = forwardMatch(content, longKeyword);
    assert.deepStrictEqual(positions, [6, 47]);
  });

  it('should handle content that is the same as keyword', () => {
    const content = 'exact';
    const positions = forwardMatch(content, 'exact');
    assert.deepStrictEqual(positions, [0]);
  });

  it('should handle keyword longer than content', () => {
    const content = 'hi';
    const positions = forwardMatch(content, 'hello');
    assert.deepStrictEqual(positions, []);
  });

  it('should find repeated pattern in realistic code', () => {
    const content = `export const add = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};`;
    const positions = forwardMatch(content, 'number');
    assert.deepStrictEqual(positions, [23, 34, 43, 103, 114, 123]);
  });
});

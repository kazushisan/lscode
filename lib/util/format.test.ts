import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatFindReferences, formatGetTsconfig } from './format.js';
import { findReferences } from './findReferences.js';
import { styleText } from 'node:util';
import path from 'node:path';

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

describe('formatGetTsconfig function', () => {
  it('should format tsconfig path with [info] styling', () => {
    const result = formatGetTsconfig({
      resolvedConfigPath: path.join(fixturesDir, 'tsconfig.json'),
      cwd: fixturesDir,
      fileName: path.join(fixturesDir, 'main.ts'),
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(
      result[0],
      `[${styleText('blue', 'info')}] using tsconfig tsconfig.json`,
    );
  });

  it('should return relative path from cwd', () => {
    const result = formatGetTsconfig({
      resolvedConfigPath: path.join(fixturesDir, 'tsconfig.json'),
      cwd: process.cwd(),
      fileName: path.join(fixturesDir, 'main.ts'),
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(
      result[0],
      `[${styleText('blue', 'info')}] using tsconfig test/fixtures/basic/tsconfig.json`,
    );
  });

  it('should return warning when resolvedConfigPath is undefined', () => {
    const fileName = path.join(fixturesDir, 'main.ts');
    const result = formatGetTsconfig({
      resolvedConfigPath: undefined,
      cwd: fixturesDir,
      fileName,
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(
      result[0],
      `[${styleText('yellow', 'warning')}] Could not find a TypeScript project for main.ts (no matching tsconfig found). Using default compiler options with cwd.`,
    );
  });
});

describe('formatFindReferences function', () => {
  it('should format references for add function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const result = findReferences({
      symbol: 'add',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 0,
    });

    const formatted = formatFindReferences({
      references: result.references,
      symbols: result.symbols,
      n: 0,
      cwd: fixturesDir,
      symbol: 'add',
    });

    const expected = [
      'Found symbols:',
      `${styleText('gray', 'math.ts:1:14:')} export const ${styleText('green', 'add')} = (a: number, b: number): number => {`,
      `${styleText('gray', 'math.ts:12:9:')} const ${styleText('green', 'add')} = () => {};`,
      '',
      'References shown for symbol #0 at math.ts:1:14',
      `${styleText('gray', 'math.ts:1:14:')} export const ${styleText('green', 'add')} = (a: number, b: number): number => {`,
      `${styleText('gray', 'main.ts:1:10:')} import { ${styleText('green', 'add')}, multiply, PI } from './math.js';`,
      `${styleText('gray', 'main.ts:3:17:')} const result1 = ${styleText('green', 'add')}(5, 3);`,
      `${styleText('gray', 'main.ts:4:17:')} const result2 = ${styleText('green', 'add')}(10, 20);`,
      `${styleText('gray', 'main.ts:13:15:')}   const sum = ${styleText('green', 'add')}(1, 2);`,
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format references for add function with n=1', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const result = findReferences({
      symbol: 'add',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 1,
    });

    const formatted = formatFindReferences({
      references: result.references,
      symbols: result.symbols,
      n: 1,
      cwd: fixturesDir,
      symbol: 'add',
    });

    const expected = [
      'Found symbols:',
      `${styleText('gray', 'math.ts:1:14:')} export const ${styleText('green', 'add')} = (a: number, b: number): number => {`,
      `${styleText('gray', 'math.ts:12:9:')} const ${styleText('green', 'add')} = () => {};`,
      '',
      'References shown for symbol #1 at math.ts:12:9',
      `${styleText('gray', 'math.ts:12:9:')}   const ${styleText('green', 'add')} = () => {};`,
      `${styleText('gray', 'math.ts:14:10:')}   return ${styleText('green', 'add')};`,
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format references for PI constant', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const result = findReferences({
      symbol: 'PI',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 0,
    });

    const formatted = formatFindReferences({
      references: result.references,
      symbols: result.symbols,
      n: 0,
      cwd: fixturesDir,
      symbol: 'PI',
    });

    const expected = [
      'Found symbols:',
      `${styleText('gray', 'math.ts:9:14:')} export const ${styleText('green', 'PI')} = 3.14159;`,
      '',
      'References shown for symbol #0 at math.ts:9:14',
      `${styleText('gray', 'math.ts:9:14:')} export const ${styleText('green', 'PI')} = 3.14159;`,
      `${styleText('gray', 'main.ts:1:25:')} import { add, multiply, ${styleText('green', 'PI')} } from './math.js';`,
      `${styleText('gray', 'main.ts:8:27:')} const circumference = 2 * ${styleText('green', 'PI')} * 10;`,
      `${styleText('gray', 'main.ts:14:24:')}   return multiply(sum, ${styleText('green', 'PI')});`,
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format references for multiply function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const result = findReferences({
      symbol: 'multiply',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 0,
    });

    const formatted = formatFindReferences({
      references: result.references,
      symbols: result.symbols,
      n: 0,
      cwd: fixturesDir,
      symbol: 'multiply',
    });

    const output = formatted.join('\n');
    assert.ok(output.includes('Found symbols:'));
    assert.ok(output.includes('References shown for symbol #0'));
    assert.ok(output.includes('math.ts'));
    assert.ok(output.includes('main.ts'));
  });
});

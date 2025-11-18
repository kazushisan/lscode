import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatFindReferences } from './format.js';
import { findReferences } from './findReferences.js';
import { styleText } from 'node:util';
import path from 'node:path';

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

describe('formatFindReferences function', () => {
  it('should format references for add function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const result = findReferences({
      symbol: 'add',
      fileName: mathFile,
      cwd: fixturesDir,
    });

    const formatted = formatFindReferences({
      references: result.references,
      symbols: result.symbols,
      index: result.index,
      cwd: fixturesDir,
      symbol: 'add',
    });

    const expected = [
      'Found symbols:',
      `${styleText('gray', 'math.ts:1:14:')} export const ${styleText('green', 'add')} = (a: number, b: number): number => {`,
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

  it('should format references for PI constant', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const result = findReferences({
      symbol: 'PI',
      fileName: mathFile,
      cwd: fixturesDir,
    });

    const formatted = formatFindReferences({
      references: result.references,
      symbols: result.symbols,
      index: result.index,
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
    });

    const formatted = formatFindReferences({
      references: result.references,
      symbols: result.symbols,
      index: result.index,
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

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatFindReferences,
  formatGetDefinition,
  formatGetTsconfig,
  formatSymbolsInfo,
} from './format.js';
import { findReferences } from './findReferences.js';
import { setupLanguageService } from './languageService.js';
import { resolveSymbol } from './symbol.js';
import { getDefinition, OPERATION } from './getDefinition.js';
import { styleText } from 'node:util';
import path from 'node:path';

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

const setup = (fileName: string, keyword: string, n = 0) => {
  const { service } = setupLanguageService({
    cwd: fixturesDir,
    fileName,
    strict: false,
  });

  const program = service.getProgram()!;

  const { declaration, symbolsInfo } = resolveSymbol({
    keyword,
    fileName,
    n,
    program,
  });

  return { declaration, service, fileName, symbolsInfo };
};

describe('formatGetTsconfig function', () => {
  it('should format tsconfig path with [info] styling', () => {
    const result = formatGetTsconfig({
      resolvedConfigPath: path.join(fixturesDir, 'tsconfig.json'),
      cwd: fixturesDir,
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
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(
      result[0],
      `[${styleText('blue', 'info')}] using tsconfig test/fixtures/basic/tsconfig.json`,
    );
  });

  it('should return info message when resolvedConfigPath is undefined', () => {
    const result = formatGetTsconfig({
      resolvedConfigPath: undefined,
      cwd: fixturesDir,
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(
      result[0],
      `[${styleText('blue', 'info')}] using default compiler options`,
    );
  });
});

describe('formatSymbolsInfo function', () => {
  it('should format symbols info for add function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { symbolsInfo } = setup(mathFile, 'add');

    const formatted = formatSymbolsInfo({
      symbols: symbolsInfo,
      cwd: fixturesDir,
      keyword: 'add',
    });

    const expected = [
      'Found symbols:',
      `${styleText('gray', 'math.ts:1:14:')} export const ${styleText('green', 'add')} = (a: number, b: number): number => {`,
      `${styleText('gray', 'math.ts:12:9:')} const ${styleText('green', 'add')} = () => {};`,
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format symbols info for PI constant', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { symbolsInfo } = setup(mathFile, 'PI');

    const formatted = formatSymbolsInfo({
      symbols: symbolsInfo,
      cwd: fixturesDir,
      keyword: 'PI',
    });

    const expected = [
      'Found symbols:',
      `${styleText('gray', 'math.ts:9:14:')} export const ${styleText('green', 'PI')} = 3.14159;`,
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should return empty array when no symbols', () => {
    const formatted = formatSymbolsInfo({
      symbols: [],
      cwd: fixturesDir,
      keyword: 'notfound',
    });

    assert.strictEqual(formatted.length, 0);
  });
});

describe('formatFindReferences function', () => {
  it('should format references for add function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'add',
    );
    const { references } = findReferences({ declaration, service, fileName });

    const formatted = formatFindReferences({
      references,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
      keyword: 'add',
      c: 0,
    });

    const expected = [
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
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'add',
      1,
    );
    const { references } = findReferences({ declaration, service, fileName });

    const formatted = formatFindReferences({
      references,
      symbols: symbolsInfo,
      n: 1,
      cwd: fixturesDir,
      keyword: 'add',
      c: 0,
    });

    const expected = [
      'References shown for symbol #1 at math.ts:12:9',
      `${styleText('gray', 'math.ts:12:9:')}   const ${styleText('green', 'add')} = () => {};`,
      `${styleText('gray', 'math.ts:14:10:')}   return ${styleText('green', 'add')};`,
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format references for PI constant', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'PI',
    );
    const { references } = findReferences({ declaration, service, fileName });

    const formatted = formatFindReferences({
      references,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
      keyword: 'PI',
      c: 0,
    });

    const expected = [
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
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'multiply',
    );
    const { references } = findReferences({ declaration, service, fileName });

    const formatted = formatFindReferences({
      references,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
      keyword: 'multiply',
      c: 0,
    });

    const output = formatted.join('\n');
    assert.ok(output.includes('References shown for symbol #0'));
    assert.ok(output.includes('math.ts'));
    assert.ok(output.includes('main.ts'));
  });

  it('should format references with c=0 in single line format', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'PI',
    );
    const { references } = findReferences({ declaration, service, fileName });

    const formatted = formatFindReferences({
      references,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
      keyword: 'PI',
      c: 0,
    });

    const expected = [
      'References shown for symbol #0 at math.ts:9:14',
      `${styleText('gray', 'math.ts:9:14:')} export const ${styleText('green', 'PI')} = 3.14159;`,
      `${styleText('gray', 'main.ts:1:25:')} import { add, multiply, ${styleText('green', 'PI')} } from './math.js';`,
      `${styleText('gray', 'main.ts:8:27:')} const circumference = 2 * ${styleText('green', 'PI')} * 10;`,
      `${styleText('gray', 'main.ts:14:24:')}   return multiply(sum, ${styleText('green', 'PI')});`,
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format references with c=1 showing 1 context line before/after with line break', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'PI',
    );
    const { references } = findReferences({ declaration, service, fileName });

    const formatted = formatFindReferences({
      references,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
      keyword: 'PI',
      c: 1,
    });

    const expected = [
      'References shown for symbol #0 at math.ts:9:14',
      styleText('gray', 'math.ts:9:14:'),
      '',
      `export const ${styleText('green', 'PI')} = 3.14159;`,
      '',
      styleText('gray', 'main.ts:1:25:'),
      `import { add, multiply, ${styleText('green', 'PI')} } from './math.js';`,
      '',
      styleText('gray', 'main.ts:8:27:'),
      '',
      `const circumference = 2 * ${styleText('green', 'PI')} * 10;`,
      '',
      styleText('gray', 'main.ts:14:24:'),
      '  const sum = add(1, 2);',
      `  return multiply(sum, ${styleText('green', 'PI')});`,
      '}',
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format references with c=2 showing 2 context lines before/after', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'PI',
    );
    const { references } = findReferences({ declaration, service, fileName });

    const formatted = formatFindReferences({
      references,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
      keyword: 'PI',
      c: 2,
    });

    const expected = [
      'References shown for symbol #0 at math.ts:9:14',
      styleText('gray', 'math.ts:9:14:'),
      '};',
      '',
      `export const ${styleText('green', 'PI')} = 3.14159;`,
      '',
      'export const scoped = () => {',
      styleText('gray', 'main.ts:1:25:'),
      `import { add, multiply, ${styleText('green', 'PI')} } from './math.js';`,
      '',
      'const result1 = add(5, 3);',
      styleText('gray', 'main.ts:8:27:'),
      'const product = multiply(4, 7);',
      '',
      `const circumference = 2 * ${styleText('green', 'PI')} * 10;`,
      '',
      'console.log(result1, result2, product, circumference);',
      styleText('gray', 'main.ts:14:24:'),
      'function calculate() {',
      '  const sum = add(1, 2);',
      `  return multiply(sum, ${styleText('green', 'PI')});`,
      '}',
      '',
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should handle c parameter at file boundaries gracefully', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'add',
    );
    const { references } = findReferences({ declaration, service, fileName });

    const formatted = formatFindReferences({
      references,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
      keyword: 'add',
      c: 3,
    });

    const output = formatted.join('\n');

    assert.ok(output.includes('References shown for symbol #0'));
    assert.ok(output.includes(styleText('gray', 'math.ts:1:14:')));
  });

  it('should throw error when c is less than 0', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'PI',
    );
    const { references } = findReferences({ declaration, service, fileName });

    assert.throws(
      () => {
        formatFindReferences({
          references,
          symbols: symbolsInfo,
          n: 0,
          cwd: fixturesDir,
          keyword: 'PI',
          c: -1,
        });
      },
      { message: 'c must be 0 or greater' },
    );
  });
});

describe('formatGetDefinition function', () => {
  it('should format definition for add function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'add',
    );
    const { definitions } = getDefinition({
      fileName,
      declaration,
      service,
      operation: OPERATION.DEFINITION,
    });

    const formatted = formatGetDefinition({
      definitions,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
    });

    const expected = [
      'Definition shown for symbol #0 at math.ts:1:14',
      styleText('gray', 'math.ts:1:14:'),
      'export const add = (a: number, b: number): number => {\n  return a + b;\n};',
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format definition for add function with n=1', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'add',
      1,
    );
    const { definitions } = getDefinition({
      fileName,
      declaration,
      service,
      operation: OPERATION.DEFINITION,
    });

    const formatted = formatGetDefinition({
      definitions,
      symbols: symbolsInfo,
      n: 1,
      cwd: fixturesDir,
    });

    const expected = [
      'Definition shown for symbol #1 at math.ts:12:9',
      styleText('gray', 'math.ts:12:9:'),
      'const add = () => {};',
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format definition for PI constant', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'PI',
    );
    const { definitions } = getDefinition({
      fileName,
      declaration,
      service,
      operation: OPERATION.DEFINITION,
    });

    const formatted = formatGetDefinition({
      definitions,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
    });

    const expected = [
      'Definition shown for symbol #0 at math.ts:9:14',
      styleText('gray', 'math.ts:9:14:'),
      'export const PI = 3.14159;',
    ].join('\n');

    assert.strictEqual(formatted.join('\n'), expected);
  });

  it('should format definition for multiply function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service, fileName, symbolsInfo } = setup(
      mathFile,
      'multiply',
    );
    const { definitions } = getDefinition({
      fileName,
      declaration,
      service,
      operation: OPERATION.DEFINITION,
    });

    const formatted = formatGetDefinition({
      definitions,
      symbols: symbolsInfo,
      n: 0,
      cwd: fixturesDir,
    });

    const output = formatted.join('\n');
    assert.ok(output.includes('Definition shown for symbol #0'));
    assert.ok(output.includes('math.ts'));
    assert.ok(output.includes('multiply'));
  });
});

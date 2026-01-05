import { describe, it } from 'node:test';
import assert from 'node:assert';
import ts from 'typescript';
import path from 'node:path';
import { quickInfo, renderQuickInfo } from './quickInfo.js';
import { resolveSymbol } from './symbol.js';
import { setupLanguageService } from './languageService.js';

const createMockLanguageService = (
  files: Map<string, string>,
  compilerOptions: ts.CompilerOptions = {},
): ts.LanguageService => {
  return ts.createLanguageService({
    getScriptFileNames: () => Array.from(files.keys()),
    getScriptVersion: () => '0',
    getScriptSnapshot: (fileName: string) => {
      const content = files.get(fileName);
      return content ? ts.ScriptSnapshot.fromString(content) : undefined;
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: () => ts.getDefaultLibFileName(compilerOptions),
    fileExists: (fileName: string) => files.has(fileName),
    readFile: (fileName: string) => files.get(fileName),
    readDirectory: () => [],
    directoryExists: () => true,
    getDirectories: () => [],
  });
};

const getSymbolPosition = (
  service: ts.LanguageService,
  fileName: string,
  keyword: string,
): number => {
  const program = service.getProgram()!;
  const { declaration } = resolveSymbol({
    keyword,
    fileName,
    n: 0,
    program,
  });

  if ('name' in declaration && declaration.name) {
    return (declaration.name as ts.Identifier).getStart();
  }

  return declaration.getStart();
};

describe('renderQuickInfo', () => {
  it('should render basic variable type', () => {
    const files = new Map([['/test.ts', `const myNumber = 42;\n`]]);

    const service = createMockLanguageService(files);
    const position = getSymbolPosition(service, '/test.ts', 'myNumber');
    const info = service.getQuickInfoAtPosition('/test.ts', position)!;

    const result = renderQuickInfo(info);
    assert.strictEqual(
      result,
      `\`\`\`ts
const myNumber: 42
\`\`\``,
    );
  });

  it('should render function with JSDoc', () => {
    const files = new Map([
      [
        '/test.ts',
        `/**
 * Adds two numbers together
 * @param a - The first number
 * @param b - The second number
 * @returns The sum of a and b
 */
function add(a: number, b: number): number {
  return a + b;
}
`,
      ],
    ]);

    const service = createMockLanguageService(files);
    const position = getSymbolPosition(service, '/test.ts', 'add');
    const info = service.getQuickInfoAtPosition('/test.ts', position)!;

    const result = renderQuickInfo(info);
    assert.strictEqual(
      result,
      `\`\`\`ts
function add(a: number, b: number): number
\`\`\`

Adds two numbers together

*@param* \`a\` — The first number  

*@param* \`b\` — The second number  

*@returns* — The sum of a and b`,
    );
  });

  it('should render interface', () => {
    const files = new Map([
      [
        '/test.ts',
        `interface User {
  name: string;
  age: number;
}
`,
      ],
    ]);

    const service = createMockLanguageService(files);
    const position = getSymbolPosition(service, '/test.ts', 'User');
    const info = service.getQuickInfoAtPosition('/test.ts', position)!;

    const result = renderQuickInfo(info);
    assert.strictEqual(
      result,
      `\`\`\`ts
interface User
\`\`\``,
    );
  });

  it('should render class with documentation', () => {
    const files = new Map([
      [
        '/test.ts',
        `/**
 * Represents a person
 */
class Person {
  constructor(public name: string) {}
}
`,
      ],
    ]);

    const service = createMockLanguageService(files);
    const position = getSymbolPosition(service, '/test.ts', 'Person');
    const info = service.getQuickInfoAtPosition('/test.ts', position)!;

    const result = renderQuickInfo(info);
    assert.strictEqual(
      result,
      `\`\`\`ts
class Person
\`\`\`

Represents a person`,
    );
  });

  it('should render type alias', () => {
    const files = new Map([
      ['/test.ts', `type Status = 'active' | 'inactive' | 'pending';\n`],
    ]);

    const service = createMockLanguageService(files);
    const position = getSymbolPosition(service, '/test.ts', 'Status');
    const info = service.getQuickInfoAtPosition('/test.ts', position)!;

    const result = renderQuickInfo(info);
    assert.strictEqual(
      result,
      `\`\`\`ts
type Status = "active" | "inactive" | "pending"
\`\`\``,
    );
  });

  it('should render @example tag as code block', () => {
    const files = new Map([
      [
        '/test.ts',
        `/**
 * Multiplies two numbers
 * @example
 * multiply(2, 3) // returns 6
 */
function multiply(a: number, b: number): number {
  return a * b;
}
`,
      ],
    ]);

    const service = createMockLanguageService(files);
    const position = getSymbolPosition(service, '/test.ts', 'multiply');
    const info = service.getQuickInfoAtPosition('/test.ts', position)!;

    const result = renderQuickInfo(info);
    assert.strictEqual(
      result,
      `\`\`\`ts
function multiply(a: number, b: number): number
\`\`\`

Multiplies two numbers

*@example*  
\`\`\`ts
multiply(2, 3) // returns 6
\`\`\``,
    );
  });

  it('should render @deprecated tag', () => {
    const files = new Map([
      [
        '/test.ts',
        `/**
 * @deprecated Use newFunction instead
 */
function oldFunction() {}
`,
      ],
    ]);

    const service = createMockLanguageService(files);
    const position = getSymbolPosition(service, '/test.ts', 'oldFunction');
    const info = service.getQuickInfoAtPosition('/test.ts', position)!;

    const result = renderQuickInfo(info);
    assert.strictEqual(
      result,
      `\`\`\`ts
function oldFunction(): void
\`\`\`

*@deprecated* — Use newFunction instead`,
    );
  });

  it('should return empty string for empty quick info', () => {
    const emptyInfo: ts.QuickInfo = {
      kind: ts.ScriptElementKind.unknown,
      kindModifiers: '',
      textSpan: { start: 0, length: 0 },
      displayParts: [],
      documentation: [],
      tags: [],
    };

    const result = renderQuickInfo(emptyInfo);
    assert.strictEqual(result, '');
  });
});

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

const setup = (fileName: string, keyword: string, n = 0) => {
  const { service } = setupLanguageService({
    cwd: fixturesDir,
    fileName,
    strict: false,
  });

  const program = service.getProgram()!;

  const { declaration } = resolveSymbol({
    keyword,
    fileName,
    n,
    program,
  });

  return { declaration, service };
};

describe('quickInfo function', () => {
  it('should return quick info for the add function in math.ts', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service } = setup(mathFile, 'add');
    const result = quickInfo({
      declaration,
      service,
      fileName: mathFile,
    });

    assert.strictEqual(
      result,
      `\`\`\`ts
const add: (a: number, b: number) => number
\`\`\``,
    );
  });

  it('should return quick info for multiply function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service } = setup(mathFile, 'multiply');
    const result = quickInfo({
      declaration,
      service,
      fileName: mathFile,
    });

    assert.strictEqual(
      result,
      `\`\`\`ts
const multiply: (a: number, b: number) => number
\`\`\``,
    );
  });

  it('should return quick info for PI constant', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service } = setup(mathFile, 'PI');
    const result = quickInfo({
      declaration,
      service,
      fileName: mathFile,
    });

    assert.strictEqual(
      result,
      `\`\`\`ts
const PI: 3.14159
\`\`\``,
    );
  });
});

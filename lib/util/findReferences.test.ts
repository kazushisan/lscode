import { describe, it } from 'node:test';
import assert from 'node:assert';
import { findReferences } from './findReferences.js';
import { setupLanguageService } from './languageService.js';
import { resolveSymbol } from './symbol.js';
import path from 'node:path';

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

describe('findReferences function', () => {
  it('should find all references to the add function in math.ts', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service } = setup(mathFile, 'add');
    const { references } = findReferences({
      declaration,
      service,
      fileName: mathFile,
    });

    assert.strictEqual(references.length, 5);

    const mainReferences = references.filter((ref) =>
      ref.fileName.endsWith('main.ts'),
    );
    assert.strictEqual(mainReferences.length, 4);
  });

  it('should find references to multiply function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service } = setup(mathFile, 'multiply');
    const { references } = findReferences({
      declaration,
      service,
      fileName: mathFile,
    });

    assert.strictEqual(references.length, 4);

    const hasDefinition = references.some((ref) =>
      ref.fileName.endsWith('math.ts'),
    );
    assert.ok(hasDefinition);
  });

  it('should find references to PI constant', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service } = setup(mathFile, 'PI');
    const { references } = findReferences({
      declaration,
      service,
      fileName: mathFile,
    });

    assert.strictEqual(references.length, 4);

    const mainReferences = references.filter((ref) =>
      ref.fileName.endsWith('main.ts'),
    );
    assert.strictEqual(mainReferences.length, 3);
  });

  it('should return correct line and character positions', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { declaration, service } = setup(mathFile, 'add');
    const { references } = findReferences({
      declaration,
      service,
      fileName: mathFile,
    });

    references.forEach((ref) => {
      assert.ok(typeof ref.line === 'number');
      assert.ok(typeof ref.character === 'number');
      assert.ok(ref.line >= 0);
      assert.ok(ref.character >= 0);
      assert.ok(typeof ref.fileName === 'string');
      assert.ok(ref.fileName.length > 0);
    });
  });

  it('should find multiple usages in the same file', () => {
    const mainFile = path.join(fixturesDir, 'main.ts');
    const { declaration, service } = setup(mainFile, 'add');
    const { references } = findReferences({
      declaration,
      service,
      fileName: mainFile,
    });

    const mainFileRefs = references.filter((ref) =>
      ref.fileName.endsWith('main.ts'),
    );
    assert.strictEqual(mainFileRefs.length, 4);
  });
});

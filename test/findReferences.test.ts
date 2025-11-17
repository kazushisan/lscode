import { describe, it } from 'node:test';
import assert from 'node:assert';
import { findReferences } from '../lib/util/findReferences.js';
import path from 'node:path';

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

describe('findReferences function', () => {
  it('should find all references to the add function in main.ts', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const references = findReferences(0, 13, mathFile, fixturesDir);

    assert.strictEqual(references.length, 5);

    const mainReferences = references.filter((ref) =>
      ref.fileName.endsWith('main.ts'),
    );
    assert.strictEqual(mainReferences.length, 4);
  });

  it('should find references to multiply function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const references = findReferences(4, 13, mathFile, fixturesDir);

    assert.strictEqual(references.length, 4);

    const hasDefinition = references.some((ref) =>
      ref.fileName.endsWith('math.ts'),
    );
    assert.ok(hasDefinition);
  });

  it('should find references to PI constant', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const references = findReferences(8, 13, mathFile, fixturesDir);

    assert.strictEqual(references.length, 4);

    const mainReferences = references.filter((ref) =>
      ref.fileName.endsWith('main.ts'),
    );
    assert.strictEqual(mainReferences.length, 3);
  });

  it('should find references when starting from usage in main.ts', () => {
    const mainFile = path.join(fixturesDir, 'main.ts');
    const references = findReferences(2, 16, mainFile, fixturesDir);

    assert.strictEqual(references.length, 5);

    const hasDefinition = references.some((ref) =>
      ref.fileName.endsWith('math.ts'),
    );
    assert.ok(hasDefinition);
  });

  it('should return correct line and character positions', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const references = findReferences(0, 13, mathFile, fixturesDir);

    references.forEach((ref) => {
      assert.ok(typeof ref.line === 'number');
      assert.ok(typeof ref.character === 'number');
      assert.ok(ref.line >= 0);
      assert.ok(ref.character >= 0);
      assert.ok(typeof ref.fileName === 'string');
      assert.ok(ref.fileName.length > 0);
    });
  });

  it('should handle references to imported symbols', () => {
    const mainFile = path.join(fixturesDir, 'main.ts');
    const references = findReferences(0, 9, mainFile, fixturesDir);

    assert.strictEqual(references.length, 5);
  });

  it('should find multiple usages in the same file', () => {
    const mainFile = path.join(fixturesDir, 'main.ts');
    const references = findReferences(2, 16, mainFile, fixturesDir);

    const mainFileRefs = references.filter((ref) =>
      ref.fileName.endsWith('main.ts'),
    );
    assert.strictEqual(mainFileRefs.length, 4);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  findReferences,
  FindReferencesError,
  ERROR_TYPE,
} from '../lib/util/findReferences.js';
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

  describe('with tsConfig parameter', () => {
    const customConfigDir = path.join(
      process.cwd(),
      'test/fixtures/custom-config',
    );
    const noTsConfigDir = path.join(process.cwd(), 'test/fixtures/no-tsconfig');
    const excludedFileDir = path.join(
      process.cwd(),
      'test/fixtures/excluded-file',
    );

    it('should work with custom tsconfig path', () => {
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const references = findReferences(
        0,
        13,
        utilsFile,
        customConfigDir,
        'tsconfig.custom.json',
      );

      assert.ok(references.length > 0);
      const hasDefinition = references.some((ref) =>
        ref.fileName.endsWith('utils.ts'),
      );
      assert.ok(hasDefinition);
    });

    it('should throw TSCONFIG_NOT_FOUND error when config file does not exist', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          findReferences(0, 13, mathFile, fixturesDir, 'nonexistent.json');
        },
        (error: Error) => {
          assert.ok(error instanceof FindReferencesError);
          assert.strictEqual(
            (error as FindReferencesError).type,
            ERROR_TYPE.TSCONFIG_NOT_FOUND,
          );
          assert.ok(error.message.includes('nonexistent.json'));
          return true;
        },
      );
    });

    it('should throw FILE_NOT_IN_PROJECT error when file is not in project', () => {
      const excludedFile = path.join(excludedFileDir, 'excluded.ts');

      assert.throws(
        () => {
          findReferences(0, 13, excludedFile, excludedFileDir, 'tsconfig.json');
        },
        (error: Error) => {
          assert.ok(error instanceof FindReferencesError);
          assert.strictEqual(
            (error as FindReferencesError).type,
            ERROR_TYPE.FILE_NOT_IN_PROJECT,
          );
          assert.ok(error.message.includes('excluded.ts'));
          return true;
        },
      );
    });

    it('should work with file in project when tsconfig is specified', () => {
      const includedFile = path.join(excludedFileDir, 'src/included.ts');
      const references = findReferences(
        0,
        13,
        includedFile,
        excludedFileDir,
        'tsconfig.json',
      );

      assert.ok(references.length > 0);
      const hasDefinition = references.some((ref) =>
        ref.fileName.endsWith('included.ts'),
      );
      assert.ok(hasDefinition);
    });

    it('should fallback to empty config when no tsconfig.json exists and tsConfig not specified', () => {
      const mathFile = path.join(noTsConfigDir, 'math.ts');
      const references = findReferences(0, 13, mathFile, noTsConfigDir);

      assert.ok(references.length > 0);
      const hasDefinition = references.some((ref) =>
        ref.fileName.endsWith('math.ts'),
      );
      assert.ok(hasDefinition);
    });

    it('should use tsconfig.json from cwd when tsConfig not specified', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const references = findReferences(0, 13, mathFile, fixturesDir);

      assert.ok(references.length > 0);
    });

    it('should work with absolute path to tsconfig', () => {
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const absoluteTsConfigPath = path.join(
        customConfigDir,
        'tsconfig.custom.json',
      );
      const references = findReferences(
        0,
        13,
        utilsFile,
        customConfigDir,
        absoluteTsConfigPath,
      );

      assert.ok(references.length > 0);
    });
  });
});

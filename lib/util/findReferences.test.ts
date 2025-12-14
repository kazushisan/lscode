import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  findReferences,
  FindReferencesError,
  ERROR_TYPE,
} from './findReferences.js';
import { TsconfigError, TSCONFIG_ERROR_TYPE } from './tsconfig.js';
import path from 'node:path';

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

describe('findReferences function', () => {
  it('should find all references to the add function in main.ts', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { references } = findReferences({
      symbol: 'add',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 0,
    });

    assert.strictEqual(references.length, 5);

    const mainReferences = references.filter((ref) =>
      ref.fileName.endsWith('main.ts'),
    );
    assert.strictEqual(mainReferences.length, 4);
  });

  it('should find references to multiply function', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { references } = findReferences({
      symbol: 'multiply',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 0,
    });

    assert.strictEqual(references.length, 4);

    const hasDefinition = references.some((ref) =>
      ref.fileName.endsWith('math.ts'),
    );
    assert.ok(hasDefinition);
  });

  it('should find references to PI constant', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { references } = findReferences({
      symbol: 'PI',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 0,
    });

    assert.strictEqual(references.length, 4);

    const mainReferences = references.filter((ref) =>
      ref.fileName.endsWith('main.ts'),
    );
    assert.strictEqual(mainReferences.length, 3);
  });

  it('should find references when starting from usage in main.ts', () => {
    const mainFile = path.join(fixturesDir, 'main.ts');
    const { references } = findReferences({
      symbol: 'add',
      fileName: mainFile,
      cwd: fixturesDir,
      n: 0,
    });

    assert.strictEqual(references.length, 5);

    const hasDefinition = references.some((ref) =>
      ref.fileName.endsWith('math.ts'),
    );
    assert.ok(hasDefinition);
  });

  it('should return correct line and character positions', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { references } = findReferences({
      symbol: 'add',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 0,
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

  it('should handle references to imported symbols', () => {
    const mainFile = path.join(fixturesDir, 'main.ts');
    const { references } = findReferences({
      symbol: 'add',
      fileName: mainFile,
      cwd: fixturesDir,
      n: 0,
    });

    assert.strictEqual(references.length, 5);
  });

  it('should find multiple usages in the same file', () => {
    const mainFile = path.join(fixturesDir, 'main.ts');
    const { references } = findReferences({
      symbol: 'add',
      fileName: mainFile,
      cwd: fixturesDir,
      n: 0,
    });

    const mainFileRefs = references.filter((ref) =>
      ref.fileName.endsWith('main.ts'),
    );
    assert.strictEqual(mainFileRefs.length, 4);
  });

  it('should throw SYMBOL_NOT_FOUND error when symbol does not exist', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');

    assert.throws(
      () => {
        findReferences({
          symbol: 'nonExistentSymbol',
          fileName: mathFile,
          cwd: fixturesDir,
          n: 0,
        });
      },
      (error: Error) => {
        assert.ok(error instanceof FindReferencesError);
        assert.strictEqual(
          (error as FindReferencesError).type,
          ERROR_TYPE.SYMBOL_NOT_FOUND,
        );
        assert.ok(error.message.includes('nonExistentSymbol'));
        return true;
      },
    );
  });

  describe('with tsConfig parameter', () => {
    const customConfigDir = path.join(
      process.cwd(),
      'test/fixtures/custom-config',
    );
    const excludedFileDir = path.join(
      process.cwd(),
      'test/fixtures/excluded-file',
    );

    it('should work with custom tsconfig path', () => {
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const { references } = findReferences({
        symbol: 'square',
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: 'tsconfig.custom.json',
        n: 0,
      });

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
          findReferences({
            symbol: 'add',
            fileName: mathFile,
            cwd: fixturesDir,
            tsconfig: 'nonexistent.json',
            n: 0,
          });
        },
        (error: Error) => {
          assert.ok(error instanceof TsconfigError);
          assert.strictEqual(
            (error as TsconfigError).type,
            TSCONFIG_ERROR_TYPE.TSCONFIG_NOT_FOUND,
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
          findReferences({
            symbol: 'excluded',
            fileName: excludedFile,
            cwd: excludedFileDir,
            tsconfig: 'tsconfig.json',
            n: 0,
          });
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
      const { references } = findReferences({
        symbol: 'helper',
        fileName: includedFile,
        cwd: excludedFileDir,
        tsconfig: 'tsconfig.json',
        n: 0,
      });

      assert.ok(references.length > 0);
      const hasDefinition = references.some((ref) =>
        ref.fileName.endsWith('included.ts'),
      );
      assert.ok(hasDefinition);
    });

    it('should use tsconfig.json from cwd when tsConfig not specified', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { references } = findReferences({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      assert.ok(references.length > 0);
    });

    it('should work with absolute path to tsconfig', () => {
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const absoluteTsConfigPath = path.join(
        customConfigDir,
        'tsconfig.custom.json',
      );
      const { references } = findReferences({
        symbol: 'square',
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: absoluteTsConfigPath,
        n: 0,
      });

      assert.ok(references.length > 0);
    });
  });

  describe('symbols field', () => {
    it('should return symbols array with found symbols', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const result = findReferences({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      assert.ok(result.symbols);
      assert.ok(Array.isArray(result.symbols));
      assert.strictEqual(result.symbols.length, 2);

      const symbolInfo = result.symbols[0]!;
      assert.ok(typeof symbolInfo.character === 'number');
      assert.ok(typeof symbolInfo.line === 'number');
      assert.ok(typeof symbolInfo.code === 'string');
      assert.ok(symbolInfo.line >= 0);
      assert.ok(symbolInfo.character >= 0);
    });

    it('should have code field containing the entire line of symbol definition', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const result = findReferences({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      const symbolInfo = result.symbols[0]!;
      assert.ok(symbolInfo.code.includes('add'));
      assert.ok(symbolInfo.code.length > 0);
    });

    it('should return correct line and character for PI constant', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const result = findReferences({
        symbol: 'PI',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      assert.strictEqual(result.symbols.length, 1);
      const symbolInfo = result.symbols[0]!;
      assert.ok(symbolInfo.code.includes('PI'));
      assert.strictEqual(symbolInfo.line, 8); // PI is on line 9 (0-based index 8)
    });

    it('should return correct line and character for multiply function', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const result = findReferences({
        symbol: 'multiply',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      assert.strictEqual(result.symbols.length, 1);
      const symbolInfo = result.symbols[0]!;
      assert.ok(symbolInfo.code.includes('multiply'));
    });
  });

  describe('n parameter', () => {
    it('should use the nth symbol when n is specified', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      const result = findReferences({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 1,
      });

      assert.ok(result.references.length === 2);
    });

    it('should throw SYMBOL_INDEX_OUT_OF_RANGE error when n is out of range', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          findReferences({
            symbol: 'add',
            fileName: mathFile,
            cwd: fixturesDir,
            n: 10, // Out of range
          });
        },
        (error: Error) => {
          assert.ok(error instanceof FindReferencesError);
          assert.strictEqual(
            (error as FindReferencesError).type,
            ERROR_TYPE.SYMBOL_INDEX_OUT_OF_RANGE,
          );
          assert.ok(error.message.includes('10'));
          assert.ok(error.message.includes('out of range'));
          return true;
        },
      );
    });

    it('should throw SYMBOL_INDEX_OUT_OF_RANGE error when n is negative', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          findReferences({
            symbol: 'add',
            fileName: mathFile,
            cwd: fixturesDir,
            n: -1,
          });
        },
        (error: Error) => {
          assert.ok(error instanceof FindReferencesError);
          assert.strictEqual(
            (error as FindReferencesError).type,
            ERROR_TYPE.SYMBOL_INDEX_OUT_OF_RANGE,
          );
          return true;
        },
      );
    });
  });

  describe('with auto-discovered tsconfig', () => {
    it('should work when auto-discovered config includes the file', () => {
      // This test verifies that when a tsconfig is auto-discovered
      // and the file IS included in the project, it should work correctly
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { references } = findReferences({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      assert.ok(references.length > 0);
      const hasDefinition = references.some((ref) =>
        ref.fileName.endsWith('math.ts'),
      );
      assert.ok(hasDefinition);

      // Verify it found references in multiple files
      const mainReferences = references.filter((ref) =>
        ref.fileName.endsWith('main.ts'),
      );
      assert.ok(mainReferences.length > 0);
    });

    it('should throw FILE_NOT_IN_PROJECT when auto-discovered config excludes file', () => {
      const excludeFile = path.join(fixturesDir, 'exclude.ts');

      assert.throws(
        () => {
          findReferences({
            symbol: 'divide',
            fileName: excludeFile,
            cwd: fixturesDir,
            n: 0,
          });
        },
        (error: Error) => {
          assert.ok(error instanceof FindReferencesError);
          assert.strictEqual(
            (error as FindReferencesError).type,
            ERROR_TYPE.FILE_NOT_IN_PROJECT,
          );
          assert.ok(error.message.includes('exclude.ts'));
          return true;
        },
      );
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getDefinition,
  GetDefinitionError,
  ERROR_TYPE,
} from './getDefinition.js';
import { TsconfigError, TSCONFIG_ERROR_TYPE } from './tsconfig.js';
import path from 'node:path';

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

describe('getDefinition function', () => {
  it('should find definition of the add function from math.ts', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { definitions } = getDefinition({
      symbol: 'add',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 0,
    });

    assert.ok(definitions.length > 0);

    const mathDefinition = definitions.find((def) =>
      def.fileName.endsWith('math.ts'),
    );
    assert.ok(mathDefinition);
    assert.ok(mathDefinition.code.includes('add'));
  });

  it('should find definition when starting from usage in main.ts', () => {
    const mainFile = path.join(fixturesDir, 'main.ts');
    const { definitions } = getDefinition({
      symbol: 'add',
      fileName: mainFile,
      cwd: fixturesDir,
      n: 0,
    });

    assert.ok(definitions.length > 0);

    // Definition should point to math.ts where add is defined
    const mathDefinition = definitions.find((def) =>
      def.fileName.endsWith('math.ts'),
    );
    assert.ok(mathDefinition);
    assert.ok(mathDefinition.code.includes('add'));
  });

  it('should return correct line and character positions', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');
    const { definitions } = getDefinition({
      symbol: 'add',
      fileName: mathFile,
      cwd: fixturesDir,
      n: 0,
    });

    assert.strictEqual(definitions.length, 1);
    const def = definitions[0]!;
    assert.strictEqual(def.line, 0);
    assert.strictEqual(def.character, 13);
    assert.strictEqual(def.fileName, mathFile);
    assert.strictEqual(
      def.code,
      'export const add = (a: number, b: number): number => {\n  return a + b;\n};',
    );
  });

  it('should throw SYMBOL_NOT_FOUND error when symbol does not exist', () => {
    const mathFile = path.join(fixturesDir, 'math.ts');

    assert.throws(
      () => {
        getDefinition({
          symbol: 'nonExistentSymbol',
          fileName: mathFile,
          cwd: fixturesDir,
          n: 0,
        });
      },
      (error: Error) => {
        assert.ok(error instanceof GetDefinitionError);
        assert.strictEqual(
          (error as GetDefinitionError).type,
          ERROR_TYPE.SYMBOL_NOT_FOUND,
        );
        assert.ok(error.message.includes('nonExistentSymbol'));
        return true;
      },
    );
  });

  describe('definition code field', () => {
    it('should include the code field with the entire line of definition', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { definitions } = getDefinition({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      assert.ok(definitions.length > 0);
      const def = definitions[0]!;
      assert.ok(typeof def.code === 'string');
      assert.ok(def.code.includes('add'));
    });
  });

  describe('with tsconfig parameter', () => {
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
      const { definitions } = getDefinition({
        symbol: 'square',
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: 'tsconfig.custom.json',
        n: 0,
      });

      assert.ok(definitions.length > 0);
      const hasDefinition = definitions.some((def) =>
        def.fileName.endsWith('utils.ts'),
      );
      assert.ok(hasDefinition);
    });

    it('should throw TSCONFIG_NOT_FOUND error when config file does not exist', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          getDefinition({
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
          getDefinition({
            symbol: 'excluded',
            fileName: excludedFile,
            cwd: excludedFileDir,
            tsconfig: 'tsconfig.json',
            n: 0,
          });
        },
        (error: Error) => {
          assert.ok(error instanceof TsconfigError);
          assert.strictEqual(
            (error as TsconfigError).type,
            TSCONFIG_ERROR_TYPE.FILE_NOT_IN_PROJECT,
          );
          assert.ok(error.message.includes('excluded.ts'));
          return true;
        },
      );
    });

    it('should work with file in project when tsconfig is specified', () => {
      const includedFile = path.join(excludedFileDir, 'src/included.ts');
      const { definitions } = getDefinition({
        symbol: 'helper',
        fileName: includedFile,
        cwd: excludedFileDir,
        tsconfig: 'tsconfig.json',
        n: 0,
      });

      assert.ok(definitions.length > 0);
      const hasDefinition = definitions.some((def) =>
        def.fileName.endsWith('included.ts'),
      );
      assert.ok(hasDefinition);
    });

    it('should use tsconfig.json from cwd when tsconfig not specified', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { definitions } = getDefinition({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      assert.ok(definitions.length > 0);
    });

    it('should work with absolute path to tsconfig', () => {
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const absoluteTsConfigPath = path.join(
        customConfigDir,
        'tsconfig.custom.json',
      );
      const { definitions } = getDefinition({
        symbol: 'square',
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: absoluteTsConfigPath,
        n: 0,
      });

      assert.ok(definitions.length > 0);
    });
  });

  describe('symbols field', () => {
    it('should return symbols array with found symbols', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const result = getDefinition({
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
      const result = getDefinition({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      const symbolInfo = result.symbols[0]!;
      assert.ok(symbolInfo.code.includes('add'));
      assert.ok(symbolInfo.code.length > 0);
      assert.strictEqual(symbolInfo.line, 0); // First add is on line 1 (0-based index 0)
    });
  });

  describe('n parameter', () => {
    it('should use the nth symbol when n is specified', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      const result = getDefinition({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 1,
      });

      // Second add is the scoped one inside the scoped function
      assert.ok(result.definitions.length > 0);
    });

    it('should throw SYMBOL_INDEX_OUT_OF_RANGE error when n is out of range', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          getDefinition({
            symbol: 'add',
            fileName: mathFile,
            cwd: fixturesDir,
            n: 10, // Out of range
          });
        },
        (error: Error) => {
          assert.ok(error instanceof GetDefinitionError);
          assert.strictEqual(
            (error as GetDefinitionError).type,
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
          getDefinition({
            symbol: 'add',
            fileName: mathFile,
            cwd: fixturesDir,
            n: -1,
          });
        },
        (error: Error) => {
          assert.ok(error instanceof GetDefinitionError);
          assert.strictEqual(
            (error as GetDefinitionError).type,
            ERROR_TYPE.SYMBOL_INDEX_OUT_OF_RANGE,
          );
          return true;
        },
      );
    });
  });

  describe('with auto-discovered tsconfig', () => {
    it('should work when auto-discovered config includes the file', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { definitions } = getDefinition({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      assert.ok(definitions.length > 0);
      const hasDefinition = definitions.some((def) =>
        def.fileName.endsWith('math.ts'),
      );
      assert.ok(hasDefinition);
    });

    it('should throw FILE_NOT_IN_PROJECT when auto-discovered config excludes file', () => {
      const excludeFile = path.join(fixturesDir, 'exclude.ts');

      assert.throws(
        () => {
          getDefinition({
            symbol: 'divide',
            fileName: excludeFile,
            cwd: fixturesDir,
            n: 0,
          });
        },
        (error: Error) => {
          assert.ok(error instanceof TsconfigError);
          assert.strictEqual(
            (error as TsconfigError).type,
            TSCONFIG_ERROR_TYPE.FILE_NOT_IN_PROJECT,
          );
          assert.ok(error.message.includes('exclude.ts'));
          return true;
        },
      );
    });
  });

  describe('resolvedConfigPath field', () => {
    it('should return the resolved config path', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const result = getDefinition({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
      });

      assert.ok(result.resolvedConfigPath);
      assert.ok(result.resolvedConfigPath.endsWith('tsconfig.json'));
    });

    it('should return custom config path when specified', () => {
      const customConfigDir = path.join(
        process.cwd(),
        'test/fixtures/custom-config',
      );
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const result = getDefinition({
        symbol: 'square',
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: 'tsconfig.custom.json',
        n: 0,
      });

      assert.ok(result.resolvedConfigPath);
      assert.ok(result.resolvedConfigPath.endsWith('tsconfig.custom.json'));
    });
  });
});

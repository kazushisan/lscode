import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDefinition, OPERATION } from './getDefinition.js';
import { setupLanguageService } from './languageService.js';
import {
  resolveSymbol,
  SymbolError,
  ERROR_TYPE as SYMBOL_ERROR_TYPE,
} from './symbol.js';
import { TsconfigError, TSCONFIG_ERROR_TYPE } from './tsconfig.js';
import path from 'node:path';

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

const setup = (
  fileName: string,
  keyword: string,
  n = 0,
  cwd = fixturesDir,
  tsconfig?: string,
) => {
  const { service, resolvedConfigPath } = setupLanguageService({
    cwd,
    tsconfig,
    fileName,
  });

  const program = service.getProgram()!;

  const { declaration, symbolsInfo } = resolveSymbol({
    keyword,
    fileName,
    n,
    program,
  });

  return { declaration, service, symbolsInfo, resolvedConfigPath };
};

describe('getDefinition function', () => {
  describe('OPERATION constant', () => {
    it('should have DEFINITION and TYPE_DEFINITION keys', () => {
      assert.strictEqual(OPERATION.DEFINITION, 'operation.definition');
      assert.strictEqual(
        OPERATION.TYPE_DEFINITION,
        'operation.type_definition',
      );
    });
  });

  describe('with OPERATION.DEFINITION', () => {
    it('should find definition of the add function from math.ts', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { declaration, service } = setup(mathFile, 'add');
      const { definitions } = getDefinition({
        fileName: mathFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
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
      const { declaration, service } = setup(mainFile, 'add');
      const { definitions } = getDefinition({
        fileName: mainFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
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
      const { declaration, service } = setup(mathFile, 'add');
      const { definitions } = getDefinition({
        fileName: mathFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
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

    it('should include the code field with the entire line of definition', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { declaration, service } = setup(mathFile, 'add');
      const { definitions } = getDefinition({
        fileName: mathFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
      });

      assert.ok(definitions.length > 0);
      const def = definitions[0]!;
      assert.ok(typeof def.code === 'string');
      assert.ok(def.code.includes('add'));
    });

    it('should get value definition for typed variable', () => {
      const userFile = path.join(fixturesDir, 'user.ts');
      const { declaration, service } = setup(userFile, 'user');
      const { definitions } = getDefinition({
        fileName: userFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
      });

      assert.ok(definitions.length > 0);
      // The definition of 'user' should point to the variable declaration
      const userDefinition = definitions.find((def) =>
        def.code.includes('user'),
      );
      assert.ok(userDefinition);
    });
  });

  describe('with OPERATION.TYPE_DEFINITION', () => {
    it('should get type definition for typed variable', () => {
      const userFile = path.join(fixturesDir, 'user.ts');
      const { declaration, service } = setup(userFile, 'user');
      const { definitions } = getDefinition({
        fileName: userFile,
        declaration,
        service,
        operation: OPERATION.TYPE_DEFINITION,
      });

      assert.ok(definitions.length > 0);
      // The type definition of 'user' should point to the User class
      const userClassDefinition = definitions.find((def) =>
        def.code.includes('class User'),
      );
      assert.ok(userClassDefinition);
    });

    it('should return empty definitions for primitive type aliases', () => {
      const userFile = path.join(fixturesDir, 'user.ts');
      const { declaration, service } = setup(userFile, 'userId');
      const { definitions } = getDefinition({
        fileName: userFile,
        declaration,
        service,
        operation: OPERATION.TYPE_DEFINITION,
      });

      // Type aliases that resolve to primitive types (string | number) don't have a type definition location
      // This is expected behavior from TypeScript's getTypeDefinitionAtPosition
      assert.strictEqual(definitions.length, 0);
    });
  });

  describe('error handling', () => {
    it('should throw NOT_FOUND error when symbol does not exist', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          setup(mathFile, 'nonExistentSymbol');
        },
        (error: Error) => {
          assert.ok(error instanceof SymbolError);
          assert.strictEqual(
            (error as SymbolError).type,
            SYMBOL_ERROR_TYPE.NOT_FOUND,
          );
          assert.ok(error.message.includes('nonExistentSymbol'));
          return true;
        },
      );
    });

    it('should throw INDEX_OUT_OF_RANGE error when n is out of range', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          setup(mathFile, 'add', 10); // Out of range
        },
        (error: Error) => {
          assert.ok(error instanceof SymbolError);
          assert.strictEqual(
            (error as SymbolError).type,
            SYMBOL_ERROR_TYPE.INDEX_OUT_OF_RANGE,
          );
          assert.ok(error.message.includes('10'));
          assert.ok(error.message.includes('out of range'));
          return true;
        },
      );
    });

    it('should throw INDEX_OUT_OF_RANGE error when n is negative', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          setup(mathFile, 'add', -1);
        },
        (error: Error) => {
          assert.ok(error instanceof SymbolError);
          assert.strictEqual(
            (error as SymbolError).type,
            SYMBOL_ERROR_TYPE.INDEX_OUT_OF_RANGE,
          );
          return true;
        },
      );
    });
  });

  describe('symbols field', () => {
    it('should return symbols array with found symbols', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { symbolsInfo } = setup(mathFile, 'add');

      assert.ok(symbolsInfo);
      assert.ok(Array.isArray(symbolsInfo));
      assert.strictEqual(symbolsInfo.length, 2);

      const symbolInfo = symbolsInfo[0]!;
      assert.ok(typeof symbolInfo.character === 'number');
      assert.ok(typeof symbolInfo.line === 'number');
      assert.ok(typeof symbolInfo.code === 'string');
      assert.ok(symbolInfo.line >= 0);
      assert.ok(symbolInfo.character >= 0);
    });

    it('should have code field containing the entire line of symbol definition', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { symbolsInfo } = setup(mathFile, 'add');

      const symbolInfo = symbolsInfo[0]!;
      assert.ok(symbolInfo.code.includes('add'));
      assert.ok(symbolInfo.code.length > 0);
      assert.strictEqual(symbolInfo.line, 0); // First add is on line 1 (0-based index 0)
    });
  });

  describe('n parameter', () => {
    it('should use the nth symbol when n is specified', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { declaration, service } = setup(mathFile, 'add', 1);
      const { definitions } = getDefinition({
        fileName: mathFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
      });

      // Second add is the scoped one inside the scoped function
      assert.ok(definitions.length > 0);
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
      const { declaration, service } = setup(
        utilsFile,
        'square',
        0,
        customConfigDir,
        'tsconfig.custom.json',
      );
      const { definitions } = getDefinition({
        fileName: utilsFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
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
          setup(mathFile, 'add', 0, fixturesDir, 'nonexistent.json');
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
          setup(excludedFile, 'excluded', 0, excludedFileDir, 'tsconfig.json');
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
      const { declaration, service } = setup(
        includedFile,
        'helper',
        0,
        excludedFileDir,
        'tsconfig.json',
      );
      const { definitions } = getDefinition({
        fileName: includedFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
      });

      assert.ok(definitions.length > 0);
      const hasDefinition = definitions.some((def) =>
        def.fileName.endsWith('included.ts'),
      );
      assert.ok(hasDefinition);
    });

    it('should use tsconfig.json from cwd when tsconfig not specified', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { declaration, service } = setup(mathFile, 'add');
      const { definitions } = getDefinition({
        fileName: mathFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
      });

      assert.ok(definitions.length > 0);
    });

    it('should work with absolute path to tsconfig', () => {
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const absoluteTsConfigPath = path.join(
        customConfigDir,
        'tsconfig.custom.json',
      );
      const { declaration, service } = setup(
        utilsFile,
        'square',
        0,
        customConfigDir,
        absoluteTsConfigPath,
      );
      const { definitions } = getDefinition({
        fileName: utilsFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
      });

      assert.ok(definitions.length > 0);
    });
  });

  describe('with auto-discovered tsconfig', () => {
    it('should work when auto-discovered config includes the file', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { declaration, service } = setup(mathFile, 'add');
      const { definitions } = getDefinition({
        fileName: mathFile,
        declaration,
        service,
        operation: OPERATION.DEFINITION,
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
          setup(excludeFile, 'divide');
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
      const { resolvedConfigPath } = setup(mathFile, 'add');

      assert.ok(resolvedConfigPath);
      assert.ok(resolvedConfigPath.endsWith('tsconfig.json'));
    });

    it('should return custom config path when specified', () => {
      const customConfigDir = path.join(
        process.cwd(),
        'test/fixtures/custom-config',
      );
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const { resolvedConfigPath } = setup(
        utilsFile,
        'square',
        0,
        customConfigDir,
        'tsconfig.custom.json',
      );

      assert.ok(resolvedConfigPath);
      assert.ok(resolvedConfigPath.endsWith('tsconfig.custom.json'));
    });
  });
});

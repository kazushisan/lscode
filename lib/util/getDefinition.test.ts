import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDefinition, OPERATION } from './getDefinition.js';
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
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import ts from 'typescript';
import { findSymbol } from './symbol.js';

const createProgram = (files: { [fileName: string]: string }) => {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
  };

  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile;

  host.getSourceFile = (fileName, languageVersion) => {
    if (fileName in files) {
      return ts.createSourceFile(fileName, files[fileName]!, languageVersion);
    }
    return originalGetSourceFile(fileName, languageVersion);
  };

  const fileNames = Object.keys(files);
  return ts.createProgram(fileNames, compilerOptions, host);
};

describe('findSymbol function', () => {
  describe('VariableStatement', () => {
    it('should find variable declaration', () => {
      const program = createProgram({
        'test.ts': 'const myVar = 123;\nlet anotherVar = 456;',
      });

      const symbols = findSymbol(program, 'test.ts', 'myVar');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'myVar');
    });

    it('should find let declaration', () => {
      const program = createProgram({
        'test.ts': 'let myVar = 123;',
      });

      const symbols = findSymbol(program, 'test.ts', 'myVar');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'myVar');
    });

    it('should find var declaration', () => {
      const program = createProgram({
        'test.ts': 'var myVar = 123;',
      });

      const symbols = findSymbol(program, 'test.ts', 'myVar');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'myVar');
    });

    it('should handle destructuring in variable declaration', () => {
      const program = createProgram({
        'test.ts': 'const { myVar } = { myVar: 123 };',
      });

      const symbols = findSymbol(program, 'test.ts', 'myVar');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'myVar');
    });
  });

  describe('FunctionDeclaration', () => {
    it('should find function declaration', () => {
      const program = createProgram({
        'test.ts': 'function myFunc() { return 42; }',
      });

      const symbols = findSymbol(program, 'test.ts', 'myFunc');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'myFunc');
    });

    it('should find exported function', () => {
      const program = createProgram({
        'test.ts': 'export function myFunc() { return 42; }',
      });

      const symbols = findSymbol(program, 'test.ts', 'myFunc');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'myFunc');
    });
  });

  describe('InterfaceDeclaration', () => {
    it('should find interface declaration', () => {
      const program = createProgram({
        'test.ts': 'interface MyInterface { prop: string; }',
      });

      const symbols = findSymbol(program, 'test.ts', 'MyInterface');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'MyInterface');
    });

    it('should find exported interface', () => {
      const program = createProgram({
        'test.ts': 'export interface MyInterface { prop: string; }',
      });

      const symbols = findSymbol(program, 'test.ts', 'MyInterface');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'MyInterface');
    });
  });

  describe('ClassDeclaration', () => {
    it('should find class declaration', () => {
      const program = createProgram({
        'test.ts': 'class MyClass { constructor() {} }',
      });

      const symbols = findSymbol(program, 'test.ts', 'MyClass');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'MyClass');
    });

    it('should find exported class', () => {
      const program = createProgram({
        'test.ts': 'export class MyClass { constructor() {} }',
      });

      const symbols = findSymbol(program, 'test.ts', 'MyClass');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'MyClass');
    });
  });

  describe('TypeAliasDeclaration', () => {
    it('should find type alias', () => {
      const program = createProgram({
        'test.ts': 'type MyType = string | number;',
      });

      const symbols = findSymbol(program, 'test.ts', 'MyType');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'MyType');
    });

    it('should find exported type alias', () => {
      const program = createProgram({
        'test.ts': 'export type MyType = string | number;',
      });

      const symbols = findSymbol(program, 'test.ts', 'MyType');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'MyType');
    });
  });

  describe('EnumDeclaration', () => {
    it('should find enum declaration', () => {
      const program = createProgram({
        'test.ts': 'enum MyEnum { A, B, C }',
      });

      const symbols = findSymbol(program, 'test.ts', 'MyEnum');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'MyEnum');
    });

    it('should find exported enum', () => {
      const program = createProgram({
        'test.ts': 'export enum MyEnum { A, B, C }',
      });

      const symbols = findSymbol(program, 'test.ts', 'MyEnum');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'MyEnum');
    });
  });

  describe('Shadowing and Scoping', () => {
    it('should find all shadowed variables in different scopes', () => {
      const program = createProgram({
        'test.ts': `const myVar = 1;
function outer() {
  const myVar = 2;
  function inner() {
    const myVar = 3;
    return myVar;
  }
  return myVar;
}`,
      });

      const symbols = findSymbol(program, 'test.ts', 'myVar');
      // Should find 3 declarations: one at file scope, one in outer, one in inner
      assert.strictEqual(symbols.length, 3);
    });

    it('should find shadowed function parameters', () => {
      const program = createProgram({
        'test.ts': `const param = 1;
function test(param: number) {
  return param;
}`,
      });

      const symbols = findSymbol(program, 'test.ts', 'param');
      // Should find 2: one const declaration and one parameter
      assert.strictEqual(symbols.length, 2);
    });

    it('should handle block scope', () => {
      const program = createProgram({
        'test.ts': `const x = 1;
{
  const x = 2;
  {
    const x = 3;
  }
}`,
      });

      const symbols = findSymbol(program, 'test.ts', 'x');
      // Should find 3 declarations in different blocks
      assert.strictEqual(symbols.length, 3);
    });
  });

  describe('Exact Match', () => {
    it('should only find exact matches', () => {
      const program = createProgram({
        'test.ts': `const myVar = 1;
const myVariable = 2;
const myVarTest = 3;`,
      });

      const symbols = findSymbol(program, 'test.ts', 'myVar');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'myVar');
    });

    it('should not match partial keyword occurrences in code', () => {
      const program = createProgram({
        'test.ts': `const test = 1;
const result = test + 1; // 'test' appears here but not as a declaration`,
      });

      const symbols = findSymbol(program, 'test.ts', 'test');
      // Should only find the declaration, not the usage
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'test');
    });
  });

  describe('Multiple declarations', () => {
    it('should find multiple distinct declarations with same name', () => {
      const program = createProgram({
        'test.ts': `function test() {}
namespace N {
  function test() {}
}`,
      });

      const symbols = findSymbol(program, 'test.ts', 'test');
      // Should find both function declarations
      assert.strictEqual(symbols.length, 2);
    });
  });

  describe('Edge cases', () => {
    it('should return empty array when symbol not found', () => {
      const program = createProgram({
        'test.ts': 'const myVar = 123;',
      });

      const symbols = findSymbol(program, 'test.ts', 'notFound');
      assert.strictEqual(symbols.length, 0);
    });

    it('should handle empty file', () => {
      const program = createProgram({
        'test.ts': '',
      });

      const symbols = findSymbol(program, 'test.ts', 'anything');
      assert.strictEqual(symbols.length, 0);
    });

    it('should handle file with only comments', () => {
      const program = createProgram({
        'test.ts': '// Just a comment\n/* Another comment */',
      });

      const symbols = findSymbol(program, 'test.ts', 'comment');
      assert.strictEqual(symbols.length, 0);
    });
  });

  describe('Complex declarations', () => {
    it('should find arrow function in const', () => {
      const program = createProgram({
        'test.ts': 'const myFunc = () => 42;',
      });

      const symbols = findSymbol(program, 'test.ts', 'myFunc');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'myFunc');
    });

    it('should find class expression in const', () => {
      const program = createProgram({
        'test.ts': 'const MyClass = class { };',
      });

      const symbols = findSymbol(program, 'test.ts', 'MyClass');
      assert.strictEqual(symbols.length, 1);
      assert.strictEqual(symbols[0]?.getName(), 'MyClass');
    });
  });
});

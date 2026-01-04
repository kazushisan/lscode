import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renameSymbol } from './renameSymbol.js';
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

describe('renameSymbol function', () => {
  describe('basic rename', () => {
    it('should rename a symbol in a single file', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const { declaration, service } = setup(mathFile, 'PI');
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'TAU',
      });

      // PI is used in math.ts and main.ts
      assert.strictEqual(Object.keys(edits).length, 2);

      // Check math.ts was renamed
      assert.strictEqual(
        edits[mathFile],
        `export const add = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export const TAU = 3.14159;

export const scoped = () => {
  const add = () => {};

  return add;
};
`,
      );

      // Check main.ts was updated
      assert.strictEqual(
        edits[mainFile],
        `import { add, multiply, TAU } from './math.js';

const result1 = add(5, 3);
const result2 = add(10, 20);

const product = multiply(4, 7);

const circumference = 2 * TAU * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = add(1, 2);
  return multiply(sum, TAU);
}

calculate();
`,
      );
    });

    it('should rename a function and update all references', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const { declaration, service } = setup(mathFile, 'add');

      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'sum',
      });

      // add is defined in math.ts and used in main.ts
      assert.strictEqual(Object.keys(edits).length, 2);

      // Check math.ts was renamed
      assert.strictEqual(
        edits[mathFile],
        `export const sum = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export const PI = 3.14159;

export const scoped = () => {
  const add = () => {};

  return add;
};
`,
      );

      // Check main.ts import was updated
      assert.strictEqual(
        edits[mainFile],
        `import { sum, multiply, PI } from './math.js';

const result1 = sum(5, 3);
const result2 = sum(10, 20);

const product = multiply(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = sum(1, 2);
  return multiply(sum, PI);
}

calculate();
`,
      );
    });

    it('should rename multiply function across files', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const { declaration, service } = setup(mathFile, 'multiply');

      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'product',
      });

      assert.strictEqual(Object.keys(edits).length, 2);

      assert.strictEqual(
        edits[mathFile],
        `export const add = (a: number, b: number): number => {
  return a + b;
};

export const product = (a: number, b: number): number => {
  return a * b;
};

export const PI = 3.14159;

export const scoped = () => {
  const add = () => {};

  return add;
};
`,
      );

      assert.strictEqual(
        edits[mainFile],
        `import { add, product, PI } from './math.js';

const result1 = add(5, 3);
const result2 = add(10, 20);

const product = product(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = add(1, 2);
  return product(sum, PI);
}

calculate();
`,
      );
    });

    it('should rename scoped function', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { declaration, service } = setup(mathFile, 'scoped');
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'scopedFunction',
      });

      assert.strictEqual(Object.keys(edits).length, 1);

      assert.strictEqual(
        edits[mathFile],
        `export const add = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export const PI = 3.14159;

export const scopedFunction = () => {
  const add = () => {};

  return add;
};
`,
      );
    });
  });

  describe('scoped variables', () => {
    it('should rename scoped variable (inner add)', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      // n=1 should be the inner 'add' inside scoped function
      const { declaration, service } = setup(mathFile, 'add', 1);
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'innerAdd',
      });

      assert.strictEqual(Object.keys(edits).length, 1);

      // The inner add should be renamed, but outer add should remain
      assert.strictEqual(
        edits[mathFile],
        `export const add = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export const PI = 3.14159;

export const scoped = () => {
  const innerAdd = () => {};

  return innerAdd;
};
`,
      );
    });

    it('should not affect outer scope when renaming inner scope', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');

      // Rename inner add (n=1)
      const { declaration, service } = setup(mathFile, 'add', 1);
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'innerSum',
      });

      // main.ts should not be affected since it uses outer add
      assert.strictEqual(edits[mainFile], undefined);

      // Only math.ts should be affected
      assert.strictEqual(Object.keys(edits).length, 1);
      assert.strictEqual(
        edits[mathFile],
        `export const add = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export const PI = 3.14159;

export const scoped = () => {
  const innerSum = () => {};

  return innerSum;
};
`,
      );
    });
  });

  describe('result structure', () => {
    it('should return object with file names as keys', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { declaration, service } = setup(mathFile, 'add');
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'addition',
      });

      // Result should be an object
      assert.strictEqual(typeof edits, 'object');
      assert.ok(!Array.isArray(edits));

      // Keys should be absolute file paths
      for (const key of Object.keys(edits)) {
        assert.ok(path.isAbsolute(key));
        assert.ok(key.endsWith('.ts'));
      }
    });

    it('should return edited content as values', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { declaration, service } = setup(mathFile, 'PI');
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'PI_VALUE',
      });

      // Values should be strings (file contents)
      for (const content of Object.values(edits)) {
        assert.strictEqual(typeof content, 'string');
        assert.ok(content.length > 0);
      }
    });

    it('should not include unchanged files in result', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      // Rename scoped inner add - only math.ts should be affected
      const { declaration, service } = setup(mathFile, 'add', 1);
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'localAdd',
      });

      // Only math.ts should be in result, not main.ts
      assert.strictEqual(Object.keys(edits).length, 1);
      assert.ok(edits[mathFile]);
      const mainFile = path.join(fixturesDir, 'main.ts');
      assert.strictEqual(edits[mainFile], undefined);
    });
  });

  describe('n parameter selection', () => {
    it('should select first symbol when n=0', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');

      const { declaration, service } = setup(mathFile, 'add', 0);
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'globalAdd',
      });

      // n=0 is the exported add, should affect main.ts
      assert.strictEqual(Object.keys(edits).length, 2);
      assert.strictEqual(
        edits[mathFile],
        `export const globalAdd = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export const PI = 3.14159;

export const scoped = () => {
  const add = () => {};

  return add;
};
`,
      );
      assert.strictEqual(
        edits[mainFile],
        `import { globalAdd, multiply, PI } from './math.js';

const result1 = globalAdd(5, 3);
const result2 = globalAdd(10, 20);

const product = multiply(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = globalAdd(1, 2);
  return multiply(sum, PI);
}

calculate();
`,
      );
    });

    it('should select second symbol when n=1', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');

      const { declaration, service } = setup(mathFile, 'add', 1);
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'scopedAdd',
      });

      // n=1 is the inner add, should NOT affect main.ts
      assert.strictEqual(edits[mainFile], undefined);

      // Should only affect math.ts
      assert.strictEqual(Object.keys(edits).length, 1);
      assert.strictEqual(
        edits[mathFile],
        `export const add = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export const PI = 3.14159;

export const scoped = () => {
  const scopedAdd = () => {};

  return scopedAdd;
};
`,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle renaming to the same name gracefully', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      const { declaration, service } = setup(mathFile, 'PI');
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'PI',
      });

      // When renaming to the same name, no changes should be made
      assert.strictEqual(Object.keys(edits).length, 0);
    });

    it('should handle symbols used multiple times in the same file', () => {
      const mainFile = path.join(fixturesDir, 'main.ts');
      const mathFile = path.join(fixturesDir, 'math.ts');

      const { declaration, service } = setup(mathFile, 'add');
      const { edits } = renameSymbol({
        fileName: mathFile,
        declaration,
        service,
        newName: 'addNumbers',
      });

      assert.strictEqual(Object.keys(edits).length, 2);

      // main.ts uses add multiple times
      assert.strictEqual(
        edits[mainFile],
        `import { addNumbers, multiply, PI } from './math.js';

const result1 = addNumbers(5, 3);
const result2 = addNumbers(10, 20);

const product = multiply(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = addNumbers(1, 2);
  return multiply(sum, PI);
}

calculate();
`,
      );
    });

    it('should handle symbols from import statement', () => {
      const mainFile = path.join(fixturesDir, 'main.ts');
      const mathFile = path.join(fixturesDir, 'math.ts');

      // Rename from main.ts perspective
      const { declaration, service } = setup(mainFile, 'add');
      const { edits } = renameSymbol({
        fileName: mainFile,
        declaration,
        service,
        newName: 'addFunc',
      });

      // Both files should be updated
      assert.strictEqual(Object.keys(edits).length, 2);

      assert.strictEqual(
        edits[mathFile],
        `export const addFunc = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export const PI = 3.14159;

export const scoped = () => {
  const add = () => {};

  return add;
};
`,
      );

      assert.strictEqual(
        edits[mainFile],
        `import { addFunc, multiply, PI } from './math.js';

const result1 = addFunc(5, 3);
const result2 = addFunc(10, 20);

const product = multiply(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = addFunc(1, 2);
  return multiply(sum, PI);
}

calculate();
`,
      );
    });
  });
});

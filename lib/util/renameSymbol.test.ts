import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renameSymbol, RenameSymbolError, ERROR_TYPE } from './renameSymbol.js';
import { TsconfigError, TSCONFIG_ERROR_TYPE } from './tsconfig.js';
import path from 'node:path';

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

describe('renameSymbol function', () => {
  describe('basic rename', () => {
    it('should rename a symbol in a single file', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const { edits } = renameSymbol({
        symbol: 'PI',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
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

      const { edits } = renameSymbol({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
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

      const { edits } = renameSymbol({
        symbol: 'multiply',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
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
      const { edits } = renameSymbol({
        symbol: 'scoped',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
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
      const { edits } = renameSymbol({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 1,
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
      const { edits } = renameSymbol({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 1,
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

  describe('error handling', () => {
    it('should throw SYMBOL_NOT_FOUND error when symbol does not exist', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          renameSymbol({
            symbol: 'nonExistentSymbol',
            fileName: mathFile,
            cwd: fixturesDir,
            n: 0,
            newName: 'newName',
          });
        },
        (error: Error) => {
          assert.ok(error instanceof RenameSymbolError);
          assert.strictEqual(
            (error as RenameSymbolError).type,
            ERROR_TYPE.SYMBOL_NOT_FOUND,
          );
          assert.ok(error.message.includes('nonExistentSymbol'));
          return true;
        },
      );
    });

    it('should throw SYMBOL_INDEX_OUT_OF_RANGE error when n is out of range', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          renameSymbol({
            symbol: 'add',
            fileName: mathFile,
            cwd: fixturesDir,
            n: 10,
            newName: 'newName',
          });
        },
        (error: Error) => {
          assert.ok(error instanceof RenameSymbolError);
          assert.strictEqual(
            (error as RenameSymbolError).type,
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
          renameSymbol({
            symbol: 'add',
            fileName: mathFile,
            cwd: fixturesDir,
            n: -1,
            newName: 'newName',
          });
        },
        (error: Error) => {
          assert.ok(error instanceof RenameSymbolError);
          assert.strictEqual(
            (error as RenameSymbolError).type,
            ERROR_TYPE.SYMBOL_INDEX_OUT_OF_RANGE,
          );
          return true;
        },
      );
    });

    it('should throw error when file does not exist', () => {
      const nonExistentFile = path.join(fixturesDir, 'nonexistent.ts');

      assert.throws(
        () => {
          renameSymbol({
            symbol: 'add',
            fileName: nonExistentFile,
            cwd: fixturesDir,
            n: 0,
            newName: 'newName',
          });
        },
        (error: Error) => {
          assert.ok(error.message.includes('Failed to read file'));
          return true;
        },
      );
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
      const mainFile = path.join(customConfigDir, 'main.ts');
      const { edits } = renameSymbol({
        symbol: 'square',
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: 'tsconfig.custom.json',
        n: 0,
        newName: 'squareNumber',
      });

      assert.strictEqual(Object.keys(edits).length, 2);
      assert.strictEqual(
        edits[utilsFile],
        `export const squareNumber = (x: number): number => {
  return x * x;
};

export const cube = (x: number): number => {
  return x * x * x;
};
`,
      );
      assert.strictEqual(
        edits[mainFile],
        `import { squareNumber, cube } from './utils.js';

const result1 = squareNumber(5);
const result2 = cube(3);

console.log(result1, result2);
`,
      );
    });

    it('should throw TSCONFIG_NOT_FOUND error when config file does not exist', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      assert.throws(
        () => {
          renameSymbol({
            symbol: 'add',
            fileName: mathFile,
            cwd: fixturesDir,
            tsconfig: 'nonexistent.json',
            n: 0,
            newName: 'newName',
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
          renameSymbol({
            symbol: 'excluded',
            fileName: excludedFile,
            cwd: excludedFileDir,
            tsconfig: 'tsconfig.json',
            n: 0,
            newName: 'newName',
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
      const { edits } = renameSymbol({
        symbol: 'helper',
        fileName: includedFile,
        cwd: excludedFileDir,
        tsconfig: 'tsconfig.json',
        n: 0,
        newName: 'helperFunction',
      });

      assert.strictEqual(Object.keys(edits).length, 1);
      assert.strictEqual(
        edits[includedFile],
        `export const helperFunction = (x: number): number => {
  return x * 2;
};
`,
      );
    });

    it('should use tsconfig.json from cwd when tsconfig not specified', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const { edits } = renameSymbol({
        symbol: 'PI',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
        newName: 'CONSTANT_PI',
      });

      assert.strictEqual(Object.keys(edits).length, 2);
      assert.strictEqual(
        edits[mathFile],
        `export const add = (a: number, b: number): number => {
  return a + b;
};

export const multiply = (a: number, b: number): number => {
  return a * b;
};

export const CONSTANT_PI = 3.14159;

export const scoped = () => {
  const add = () => {};

  return add;
};
`,
      );
      assert.strictEqual(
        edits[mainFile],
        `import { add, multiply, CONSTANT_PI } from './math.js';

const result1 = add(5, 3);
const result2 = add(10, 20);

const product = multiply(4, 7);

const circumference = 2 * CONSTANT_PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = add(1, 2);
  return multiply(sum, CONSTANT_PI);
}

calculate();
`,
      );
    });

    it('should work with absolute path to tsconfig', () => {
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const mainFile = path.join(customConfigDir, 'main.ts');
      const absoluteTsConfigPath = path.join(
        customConfigDir,
        'tsconfig.custom.json',
      );
      const { edits } = renameSymbol({
        symbol: 'cube',
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: absoluteTsConfigPath,
        n: 0,
        newName: 'cubeValue',
      });

      assert.strictEqual(Object.keys(edits).length, 2);
      assert.strictEqual(
        edits[utilsFile],
        `export const square = (x: number): number => {
  return x * x;
};

export const cubeValue = (x: number): number => {
  return x * x * x;
};
`,
      );
      assert.strictEqual(
        edits[mainFile],
        `import { square, cubeValue } from './utils.js';

const result1 = square(5);
const result2 = cubeValue(3);

console.log(result1, result2);
`,
      );
    });
  });

  describe('result structure', () => {
    it('should return object with file names as keys', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const { edits } = renameSymbol({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
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
      const { edits } = renameSymbol({
        symbol: 'PI',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
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
      const { edits } = renameSymbol({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 1,
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

      const { edits } = renameSymbol({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
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

      const { edits } = renameSymbol({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 1,
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

      const { edits } = renameSymbol({
        symbol: 'PI',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
        newName: 'PI',
      });

      // When renaming to the same name, no changes should be made
      assert.strictEqual(Object.keys(edits).length, 0);
    });

    it('should handle symbols used multiple times in the same file', () => {
      const mainFile = path.join(fixturesDir, 'main.ts');
      const mathFile = path.join(fixturesDir, 'math.ts');

      const { edits } = renameSymbol({
        symbol: 'add',
        fileName: mathFile,
        cwd: fixturesDir,
        n: 0,
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
      const { edits } = renameSymbol({
        symbol: 'add',
        fileName: mainFile,
        cwd: fixturesDir,
        n: 0,
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

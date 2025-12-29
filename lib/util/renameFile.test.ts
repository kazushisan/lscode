import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renameFile, RenameFileError, ERROR_TYPE } from './renameFile.js';
import { TsconfigError, TSCONFIG_ERROR_TYPE } from './tsconfig.js';
import path from 'node:path';

const fixturesDir = path.join(process.cwd(), 'test/fixtures/basic');

describe('renameFile function', () => {
  describe('basic file rename', () => {
    it('should update import paths when renaming a file', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMathFile = path.join(fixturesDir, 'mathematics.ts');

      const { edits } = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      // main.ts imports from math.ts, so it should be updated
      assert.strictEqual(Object.keys(edits).length, 3);

      // Check that the import path was updated
      assert.strictEqual(
        edits[mainFile],
        `import { add, multiply, PI } from './mathematics.js';

const result1 = add(5, 3);
const result2 = add(10, 20);

const product = multiply(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = add(1, 2);
  return multiply(sum, PI);
}

calculate();
`,
      );

      // Check that old file is marked for deletion
      assert.strictEqual(edits[mathFile], null);

      // Check that new file has the original content
      assert.strictEqual(
        edits[newMathFile],
        `export const add = (a: number, b: number): number => {
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
    });

    it('should handle renaming a file with no imports referencing it', () => {
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMainFile = path.join(fixturesDir, 'app.ts');

      const { edits } = renameFile({
        fileName: mainFile,
        cwd: fixturesDir,
        newFileName: newMainFile,
      });

      // main.ts is not imported by any other file, but should still have rename entries
      assert.strictEqual(Object.keys(edits).length, 2);

      // Old file marked for deletion
      assert.strictEqual(edits[mainFile], null);

      // New file created with original content
      assert.strictEqual(
        edits[newMainFile],
        `import { add, multiply, PI } from './math.js';

const result1 = add(5, 3);
const result2 = add(10, 20);

const product = multiply(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = add(1, 2);
  return multiply(sum, PI);
}

calculate();
`,
      );
    });

    it('should handle renaming file to different directory', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMathFile = path.join(fixturesDir, 'utils/math.ts');

      const { edits } = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      // main.ts imports from math.ts, so it should be updated
      assert.strictEqual(Object.keys(edits).length, 3);

      // Check that the import path was updated with the new directory
      assert.strictEqual(
        edits[mainFile],
        `import { add, multiply, PI } from './utils/math.js';

const result1 = add(5, 3);
const result2 = add(10, 20);

const product = multiply(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = add(1, 2);
  return multiply(sum, PI);
}

calculate();
`,
      );

      // Check file rename entries
      assert.strictEqual(edits[mathFile], null);
      assert.strictEqual(
        edits[newMathFile],
        `export const add = (a: number, b: number): number => {
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
    });
  });

  describe('error handling', () => {
    it('should throw FILE_NOT_FOUND error when file does not exist', () => {
      const nonExistentFile = path.join(fixturesDir, 'nonexistent.ts');
      const newFile = path.join(fixturesDir, 'new.ts');

      assert.throws(
        () => {
          renameFile({
            fileName: nonExistentFile,
            cwd: fixturesDir,
            newFileName: newFile,
          });
        },
        (error: Error) => {
          assert.ok(error instanceof RenameFileError);
          assert.strictEqual(
            (error as RenameFileError).type,
            ERROR_TYPE.FILE_NOT_FOUND,
          );
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
      const newUtilsFile = path.join(customConfigDir, 'helpers.ts');

      const { edits } = renameFile({
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: 'tsconfig.custom.json',
        newFileName: newUtilsFile,
      });

      // main.ts imports from utils.ts, so it should be updated
      assert.strictEqual(Object.keys(edits).length, 3);

      assert.strictEqual(
        edits[mainFile],
        `import { square, cube } from './helpers.js';

const result1 = square(5);
const result2 = cube(3);

console.log(result1, result2);
`,
      );

      assert.strictEqual(edits[utilsFile], null);

      assert.strictEqual(
        edits[newUtilsFile],
        `export const square = (x: number): number => {
  return x * x;
};

export const cube = (x: number): number => {
  return x * x * x;
};
`,
      );
    });

    it('should throw TSCONFIG_NOT_FOUND error when config file does not exist', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const newFile = path.join(fixturesDir, 'new.ts');

      assert.throws(
        () => {
          renameFile({
            fileName: mathFile,
            cwd: fixturesDir,
            tsconfig: 'nonexistent.json',
            newFileName: newFile,
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
      const newFile = path.join(excludedFileDir, 'new.ts');

      assert.throws(
        () => {
          renameFile({
            fileName: excludedFile,
            cwd: excludedFileDir,
            tsconfig: 'tsconfig.json',
            newFileName: newFile,
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
      const newFile = path.join(excludedFileDir, 'src/helper.ts');

      const { edits } = renameFile({
        fileName: includedFile,
        cwd: excludedFileDir,
        tsconfig: 'tsconfig.json',
        newFileName: newFile,
      });

      // included.ts is not imported by any other file, but should have rename entries
      assert.strictEqual(Object.keys(edits).length, 2);

      assert.strictEqual(edits[includedFile], null);

      assert.strictEqual(
        edits[newFile],
        `export const helper = (x: number): number => {
  return x * 2;
};
`,
      );
    });
  });

  describe('result structure', () => {
    it('should return object with file names as keys', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const newMathFile = path.join(fixturesDir, 'arithmetic.ts');

      const { edits } = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
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
  });

  describe('edge cases', () => {
    it('should handle renaming to the same name gracefully', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      const { edits } = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: mathFile,
      });

      // When renaming to the same name, no changes should be made
      assert.strictEqual(Object.keys(edits).length, 0);
    });

    it('should handle relative file paths', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMathFile = path.join(fixturesDir, 'mathutils.ts');

      const { edits } = renameFile({
        fileName: 'math.ts',
        cwd: fixturesDir,
        newFileName: 'mathutils.ts',
      });

      assert.strictEqual(Object.keys(edits).length, 3);

      // main.ts imports from math.ts, so it should be updated
      assert.strictEqual(
        edits[mainFile],
        `import { add, multiply, PI } from './mathutils.js';

const result1 = add(5, 3);
const result2 = add(10, 20);

const product = multiply(4, 7);

const circumference = 2 * PI * 10;

console.log(result1, result2, product, circumference);

function calculate() {
  const sum = add(1, 2);
  return multiply(sum, PI);
}

calculate();
`,
      );

      // Check file rename entries
      assert.strictEqual(edits[mathFile], null);

      assert.strictEqual(
        edits[newMathFile],
        `export const add = (a: number, b: number): number => {
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
    });
  });
});

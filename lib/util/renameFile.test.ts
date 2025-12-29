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

      const result = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      // main.ts imports from math.ts, so it should be updated
      assert.ok(result[mainFile], 'main.ts should be in the result');

      // Check that the import path was updated
      assert.ok(
        result[mainFile]?.includes("from './mathematics.js'"),
        'Import path should be updated to mathematics.js',
      );

      // Check that old file is marked for deletion
      assert.strictEqual(
        result[mathFile],
        null,
        'Old file should be marked for deletion',
      );

      // Check that new file has content
      assert.ok(result[newMathFile], 'New file should be in the result');
      assert.ok(
        typeof result[newMathFile] === 'string',
        'New file should have content',
      );
    });

    it('should handle renaming a file with no imports referencing it', () => {
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMainFile = path.join(fixturesDir, 'app.ts');

      const result = renameFile({
        fileName: mainFile,
        cwd: fixturesDir,
        newFileName: newMainFile,
      });

      // main.ts is not imported by any other file, but should still have rename entries
      // Old file marked for deletion, new file created
      assert.strictEqual(
        result[mainFile],
        null,
        'Old file should be marked for deletion',
      );
      assert.ok(result[newMainFile], 'New file should be in the result');
      assert.ok(
        typeof result[newMainFile] === 'string',
        'New file should have content',
      );
    });

    it('should handle renaming file to different directory', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMathFile = path.join(fixturesDir, 'utils/math.ts');

      const result = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      // main.ts imports from math.ts, so it should be updated
      assert.ok(result[mainFile], 'main.ts should be in the result');

      // Check that the import path was updated with the new directory
      assert.ok(
        result[mainFile]?.includes("from './utils/math.js'"),
        'Import path should be updated to include utils directory',
      );

      // Check file rename entries
      assert.strictEqual(
        result[mathFile],
        null,
        'Old file should be marked for deletion',
      );
      assert.ok(result[newMathFile], 'New file should be in the result');
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

      const result = renameFile({
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: 'tsconfig.custom.json',
        newFileName: newUtilsFile,
      });

      // main.ts imports from utils.ts, so it should be updated
      assert.ok(result[mainFile], 'main.ts should be in the result');
      assert.ok(
        result[mainFile]?.includes("from './helpers.js'"),
        'Import path should be updated to helpers.js',
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

      const result = renameFile({
        fileName: includedFile,
        cwd: excludedFileDir,
        tsconfig: 'tsconfig.json',
        newFileName: newFile,
      });

      // included.ts is not imported by any other file, but should have rename entries
      assert.strictEqual(
        result[includedFile],
        null,
        'Old file should be marked for deletion',
      );
      assert.ok(result[newFile], 'New file should be in the result');
    });

    it('should use tsconfig.json from cwd when tsconfig not specified', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMathFile = path.join(fixturesDir, 'calc.ts');

      const result = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      // main.ts imports from math.ts, so it should be updated
      assert.ok(result[mainFile], 'main.ts should be in the result');
      assert.ok(
        result[mainFile]?.includes("from './calc.js'"),
        'Import path should be updated to calc.js',
      );
    });

    it('should work with absolute path to tsconfig', () => {
      const utilsFile = path.join(customConfigDir, 'utils.ts');
      const mainFile = path.join(customConfigDir, 'main.ts');
      const newUtilsFile = path.join(customConfigDir, 'functions.ts');
      const absoluteTsConfigPath = path.join(
        customConfigDir,
        'tsconfig.custom.json',
      );

      const result = renameFile({
        fileName: utilsFile,
        cwd: customConfigDir,
        tsconfig: absoluteTsConfigPath,
        newFileName: newUtilsFile,
      });

      assert.ok(result[mainFile], 'main.ts should be in the result');
      assert.ok(
        result[mainFile]?.includes("from './functions.js'"),
        'Import path should be updated to functions.js',
      );
    });
  });

  describe('result structure', () => {
    it('should return object with file names as keys', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const newMathFile = path.join(fixturesDir, 'arithmetic.ts');

      const result = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      // Result should be an object
      assert.strictEqual(typeof result, 'object');
      assert.ok(!Array.isArray(result));

      // Keys should be absolute file paths
      for (const key of Object.keys(result)) {
        assert.ok(path.isAbsolute(key));
        assert.ok(key.endsWith('.ts'));
      }
    });

    it('should return edited content as values or null for deletions', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const newMathFile = path.join(fixturesDir, 'mathlib.ts');

      const result = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      // Values should be strings (file contents) or null (for deletion)
      for (const [file, content] of Object.entries(result)) {
        if (file === mathFile) {
          // Old file should be null (deletion)
          assert.strictEqual(content, null);
        } else {
          // Other files should be strings
          assert.strictEqual(typeof content, 'string');
          assert.ok(content && content.length > 0);
        }
      }
    });

    it('should include file rename entries even when no imports reference the file', () => {
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMainFile = path.join(fixturesDir, 'entry.ts');

      // Rename main.ts which is not imported by anyone
      const result = renameFile({
        fileName: mainFile,
        cwd: fixturesDir,
        newFileName: newMainFile,
      });

      // Should have exactly 2 entries: old file deletion and new file creation
      assert.strictEqual(Object.keys(result).length, 2);
      assert.strictEqual(
        result[mainFile],
        null,
        'Old file should be marked for deletion',
      );
      assert.ok(result[newMainFile], 'New file should be in the result');
    });
  });

  describe('edge cases', () => {
    it('should handle renaming to the same name gracefully', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');

      const result = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: mathFile,
      });

      // When renaming to the same name, no changes should be made
      assert.strictEqual(Object.keys(result).length, 0);
    });

    it('should handle relative file paths', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMathFile = path.join(fixturesDir, 'mathutils.ts');

      const result = renameFile({
        fileName: 'math.ts',
        cwd: fixturesDir,
        newFileName: 'mathutils.ts',
      });

      // main.ts imports from math.ts, so it should be updated
      assert.ok(result[mainFile], 'main.ts should be in the result');
      assert.ok(
        result[mainFile]?.includes("from './mathutils.js'"),
        'Import path should be updated to mathutils.js',
      );

      // Check file rename entries
      assert.strictEqual(
        result[mathFile],
        null,
        'Old file should be marked for deletion',
      );
      assert.ok(result[newMathFile], 'New file should be in the result');
    });

    it('should preserve other import statements when updating', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMathFile = path.join(fixturesDir, 'newmath.ts');

      const result = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      // Verify the updated main.ts still has valid structure
      const mainContent = result[mainFile];
      assert.ok(
        mainContent && typeof mainContent === 'string',
        'main.ts should be in the result with content',
      );

      // Check that the file still contains the import with correct symbols
      assert.ok(mainContent.includes('add'), 'Should still contain add import');
      assert.ok(
        mainContent.includes('multiply'),
        'Should still contain multiply import',
      );
      assert.ok(mainContent.includes('PI'), 'Should still contain PI import');
    });
  });

  describe('path handling', () => {
    it('should handle absolute paths correctly', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMathFile = path.join(fixturesDir, 'absolute-math.ts');

      const result = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      assert.ok(result[mainFile], 'main.ts should be in the result');
      assert.ok(
        result[mainFile]?.includes("from './absolute-math.js'"),
        'Import path should be updated correctly',
      );
    });

    it('should handle renaming with extension change', () => {
      const mathFile = path.join(fixturesDir, 'math.ts');
      const mainFile = path.join(fixturesDir, 'main.ts');
      const newMathFile = path.join(fixturesDir, 'math-renamed.ts');

      const result = renameFile({
        fileName: mathFile,
        cwd: fixturesDir,
        newFileName: newMathFile,
      });

      assert.ok(result[mainFile], 'main.ts should be in the result');
      // The import statement should use .js extension as per the project's module resolution
      assert.ok(
        result[mainFile]?.includes("from './math-renamed.js'"),
        'Import path should be updated with .js extension',
      );
    });
  });
});

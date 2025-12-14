import { describe, it } from 'node:test';
import assert from 'node:assert';
import ts from 'typescript';
import picomatch from 'picomatch';
import {
  getTsConfigPath,
  TsconfigError,
  TSCONFIG_ERROR_TYPE,
} from './tsconfig.js';
import { relative } from 'node:path';

type ReadDirectory = ts.ParseConfigHost['readDirectory'];

const createMockReadDirectory = (files: Map<string, string>): ReadDirectory => {
  return (rootDir, extensions, excludes, includes) => {
    const isMatch = picomatch([...includes]);
    const isExcludeMatch = excludes ? picomatch([...excludes]) : () => false;

    return Array.from(files.keys()).reduce((acc, filePath) => {
      const hasValidExtension =
        !extensions || extensions.some((ext) => filePath.endsWith(ext));
      const relativePath = relative(rootDir, filePath);
      return hasValidExtension &&
        relativePath &&
        isMatch(relativePath) &&
        !isExcludeMatch(relativePath)
        ? [...acc, filePath]
        : acc;
    }, [] as string[]);
  };
};

describe('getTsConfigPath', () => {
  describe('when tsconfig is provided', () => {
    it('should return absolute path when config file exists', () => {
      const files = new Map([['/project/tsconfig.custom.json', '{}']]);

      const result = getTsConfigPath({
        cwd: '/project',
        tsconfig: 'tsconfig.custom.json',
        fileName: '/project/src/file.ts',
        fileExists: (path) => files.has(path),
      });

      assert.strictEqual(result, '/project/tsconfig.custom.json');
    });

    it('should resolve relative path to absolute path', () => {
      const files = new Map([['/project/config/tsconfig.json', '{}']]);

      const result = getTsConfigPath({
        cwd: '/project',
        tsconfig: 'config/tsconfig.json',
        fileName: '/project/src/file.ts',
        fileExists: (path) => files.has(path),
      });

      assert.strictEqual(result, '/project/config/tsconfig.json');
    });

    it('should handle absolute tsconfig path', () => {
      const files = new Map([['/other/tsconfig.json', '{}']]);

      const result = getTsConfigPath({
        cwd: '/project',
        tsconfig: '/other/tsconfig.json',
        fileName: '/project/src/file.ts',
        fileExists: (path) => files.has(path),
      });

      assert.strictEqual(result, '/other/tsconfig.json');
    });

    it('should throw TsconfigError when config file does not exist', () => {
      const files = new Map<string, string>();

      assert.throws(
        () => {
          getTsConfigPath({
            cwd: '/project',
            tsconfig: 'nonexistent.json',
            fileName: '/project/src/file.ts',
            fileExists: (path) => files.has(path),
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

    it('should ignore fileName when tsconfig is explicitly provided', () => {
      const files = new Map([
        ['/project/tsconfig.custom.json', '{}'],
        ['/project/tsconfig.json', '{}'],
      ]);

      const result = getTsConfigPath({
        cwd: '/project',
        tsconfig: 'tsconfig.custom.json',
        fileName: '/project/src/file.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });

      assert.strictEqual(result, '/project/tsconfig.custom.json');
    });
  });

  describe('when tsconfig is not provided', () => {
    it('should return default tsconfig.json path when it exists and file is in project', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['src/**/*'],
          }),
        ],
        ['/project/src/index.ts', ''],
      ]);

      const result = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/src/index.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });

      assert.strictEqual(result, '/project/tsconfig.json');
    });

    it('should return undefined when default tsconfig.json does not exist', () => {
      const files = new Map<string, string>();

      const result = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/src/file.ts',
        fileExists: (path) => files.has(path),
      });

      assert.strictEqual(result, undefined);
    });

    it('should not throw when default tsconfig.json does not exist', () => {
      const files = new Map<string, string>();

      assert.doesNotThrow(() => {
        getTsConfigPath({
          cwd: '/project',
          fileName: '/project/src/file.ts',
          fileExists: (path) => files.has(path),
        });
      });
    });

    it('should find tsconfig from references when file is not in root config', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            include: [],
            references: [{ path: './tsconfig.lib.json' }],
          }),
        ],
        [
          '/project/tsconfig.lib.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['lib/**/*'],
          }),
        ],
        ['/project/lib/util.ts', ''],
      ]);

      const result = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/lib/util.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });

      assert.strictEqual(result, '/project/tsconfig.lib.json');
    });

    it('should traverse nested references to find the right config', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            include: [],
            references: [
              { path: './tsconfig.lib.json' },
              { path: './tsconfig.tools.json' },
            ],
          }),
        ],
        [
          '/project/tsconfig.lib.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['lib/**/*'],
            exclude: ['**/*.test.ts'],
          }),
        ],
        [
          '/project/tsconfig.tools.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['build.ts'],
          }),
        ],
        ['/project/lib/index.ts', ''],
        ['/project/build.ts', ''],
      ]);

      const libResult = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/lib/index.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });
      assert.strictEqual(libResult, '/project/tsconfig.lib.json');

      const toolsResult = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/build.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });
      assert.strictEqual(toolsResult, '/project/tsconfig.tools.json');
    });

    it('should handle references with directory paths', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            include: [],
            references: [{ path: './packages/core' }],
          }),
        ],
        [
          '/project/packages/core/tsconfig.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['src/**/*'],
          }),
        ],
        ['/project/packages/core/src/index.ts', ''],
      ]);

      const result = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/packages/core/src/index.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });

      assert.strictEqual(result, '/project/packages/core/tsconfig.json');
    });

    it('should handle deeply nested reference chains', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            include: [],
            references: [{ path: './tsconfig.test.json' }],
          }),
        ],
        [
          '/project/tsconfig.test.json',
          JSON.stringify({
            include: ['test/**/*'],
            references: [{ path: './tsconfig.lib.json' }],
          }),
        ],
        [
          '/project/tsconfig.lib.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['lib/**/*'],
          }),
        ],
        ['/project/test/util.test.ts', ''],
        ['/project/lib/util.ts', ''],
      ]);

      // File in test config
      const testResult = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/test/util.test.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });
      assert.strictEqual(testResult, '/project/tsconfig.test.json');

      // File in lib config
      const libResult = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/lib/util.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });
      assert.strictEqual(libResult, '/project/tsconfig.lib.json');
    });

    it('should fallback to root tsconfig when file is not found in any config', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            include: [],
            references: [{ path: './tsconfig.lib.json' }],
          }),
        ],
        [
          '/project/tsconfig.lib.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['lib/**/*'],
          }),
        ],
        ['/project/src/untracked.ts', ''],
      ]);

      const result = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/src/untracked.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });

      // Falls back to root tsconfig when file is not found in any config
      assert.strictEqual(result, '/project/tsconfig.json');
    });

    it('should avoid infinite loops with circular references', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            include: [],
            references: [{ path: './tsconfig.lib.json' }],
          }),
        ],
        [
          '/project/tsconfig.lib.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['lib/**/*'],
            references: [{ path: './tsconfig.json' }],
          }),
        ],
        ['/project/unknown/file.ts', ''],
      ]);

      // Should not hang and should fallback to root tsconfig when file is not found
      const result = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/unknown/file.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });

      assert.strictEqual(result, '/project/tsconfig.json');
    });

    it('should handle missing reference files gracefully', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            include: [],
            references: [
              { path: './tsconfig.lib.json' },
              { path: './tsconfig.nonexistent.json' },
            ],
          }),
        ],
        [
          '/project/tsconfig.lib.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['lib/**/*'],
          }),
        ],
        ['/project/lib/index.ts', ''],
      ]);

      const result = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/lib/index.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });

      assert.strictEqual(result, '/project/tsconfig.lib.json');
    });

    it('should handle empty references array', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['src/**/*'],
            references: [],
          }),
        ],
        ['/project/src/index.ts', ''],
      ]);

      const result = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/src/index.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });

      assert.strictEqual(result, '/project/tsconfig.json');
    });

    it('should handle config without references field', () => {
      const files = new Map([
        [
          '/project/tsconfig.json',
          JSON.stringify({
            compilerOptions: {},
            include: ['src/**/*'],
          }),
        ],
        ['/project/src/index.ts', ''],
      ]);

      const result = getTsConfigPath({
        cwd: '/project',
        fileName: '/project/src/index.ts',
        fileExists: (path) => files.has(path),
        readFile: (path) => files.get(path),
        readDirectory: createMockReadDirectory(files),
      });

      assert.strictEqual(result, '/project/tsconfig.json');
    });
  });
});

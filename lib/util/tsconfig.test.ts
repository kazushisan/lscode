import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getTsConfigPath,
  TsconfigError,
  TSCONFIG_ERROR_TYPE,
} from './tsconfig.js';

describe('getTsConfigPath', () => {
  describe('when tsconfig is provided', () => {
    it('should return absolute path when config file exists', () => {
      const files = new Map([['/project/tsconfig.custom.json', '{}']]);

      const result = getTsConfigPath({
        cwd: '/project',
        tsconfig: 'tsconfig.custom.json',
        fileExists: (path) => files.has(path),
      });

      assert.strictEqual(result, '/project/tsconfig.custom.json');
    });

    it('should resolve relative path to absolute path', () => {
      const files = new Map([['/project/config/tsconfig.json', '{}']]);

      const result = getTsConfigPath({
        cwd: '/project',
        tsconfig: 'config/tsconfig.json',
        fileExists: (path) => files.has(path),
      });

      assert.strictEqual(result, '/project/config/tsconfig.json');
    });

    it('should handle absolute tsconfig path', () => {
      const files = new Map([['/other/tsconfig.json', '{}']]);

      const result = getTsConfigPath({
        cwd: '/project',
        tsconfig: '/other/tsconfig.json',
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
  });

  describe('when tsconfig is not provided', () => {
    it('should return default tsconfig.json path when it exists', () => {
      const files = new Map([['/project/tsconfig.json', '{}']]);

      const result = getTsConfigPath({
        cwd: '/project',
        fileExists: (path) => files.has(path),
      });

      assert.strictEqual(result, '/project/tsconfig.json');
    });

    it('should return undefined when default tsconfig.json does not exist', () => {
      const files = new Map<string, string>();

      const result = getTsConfigPath({
        cwd: '/project',
        fileExists: (path) => files.has(path),
      });

      assert.strictEqual(result, undefined);
    });

    it('should not throw when default tsconfig.json does not exist', () => {
      const files = new Map<string, string>();

      assert.doesNotThrow(() => {
        getTsConfigPath({
          cwd: '/project',
          fileExists: (path) => files.has(path),
        });
      });
    });
  });
});

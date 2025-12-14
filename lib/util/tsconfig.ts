import ts from 'typescript';
import { dirname, resolve } from 'node:path';

export const TSCONFIG_ERROR_TYPE = {
  TSCONFIG_NOT_FOUND: 'TSCONFIG_NOT_FOUND',
} as const;

type TsconfigErrorType =
  (typeof TSCONFIG_ERROR_TYPE)[keyof typeof TSCONFIG_ERROR_TYPE];

export class TsconfigError extends Error {
  type: TsconfigErrorType;

  constructor(message: string, type: TsconfigErrorType) {
    super(message);
    this.name = 'TsconfigError';
    this.type = type;
  }
}

export const getTsconfig = (cwd: string, tsconfig?: string) => {
  const configPath = tsconfig
    ? (() => {
        const absoluteConfigPath = resolve(cwd, tsconfig);

        if (!ts.sys.fileExists(absoluteConfigPath)) {
          throw new TsconfigError(
            `TypeScript config file not found: ${tsconfig}`,
            TSCONFIG_ERROR_TYPE.TSCONFIG_NOT_FOUND,
          );
        }
        return absoluteConfigPath;
      })()
    : ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json');

  const { options, fileNames } = ts.parseJsonConfigFileContent(
    configPath ? ts.readConfigFile(configPath, ts.sys.readFile).config : {},
    ts.sys,
    configPath ? dirname(configPath) : cwd,
  );

  return { options, fileNames, configFound: !!configPath };
};

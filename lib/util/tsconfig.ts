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

export const getTsconfig = ({
  cwd,
  tsconfig,
  fileExists = ts.sys.fileExists,
  readFile = ts.sys.readFile,
}: {
  cwd: string;
  tsconfig?: string;
  fileExists?: (path: string) => boolean;
  readFile?: (path: string) => string | undefined;
}) => {
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
    : fileExists(resolve(cwd, 'tsconfig.json'))
      ? resolve(cwd, 'tsconfig.json')
      : undefined;

  const { options, fileNames } = ts.parseJsonConfigFileContent(
    configPath ? ts.readConfigFile(configPath, readFile).config : {},
    ts.sys,
    configPath ? dirname(configPath) : cwd,
  );

  return { options, fileNames, configFound: !!configPath };
};

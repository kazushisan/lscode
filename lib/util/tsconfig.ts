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

const getTsConfigPath = ({
  cwd,
  tsconfig,
  fileExists,
}: {
  cwd: string;
  tsconfig?: string;
  fileExists: (path: string) => boolean;
}): string | undefined => {
  if (tsconfig) {
    const absoluteConfigPath = resolve(cwd, tsconfig);

    if (!fileExists(absoluteConfigPath)) {
      throw new TsconfigError(
        `TypeScript config file not found: ${tsconfig}`,
        TSCONFIG_ERROR_TYPE.TSCONFIG_NOT_FOUND,
      );
    }

    return absoluteConfigPath;
  }

  const defaultConfigPath = resolve(cwd, 'tsconfig.json');

  if (fileExists(defaultConfigPath)) {
    return defaultConfigPath;
  }

  return undefined;
};

export const getTsconfig = ({
  cwd,
  tsconfig,
}: {
  cwd: string;
  tsconfig?: string;
}) => {
  const configPath = getTsConfigPath({
    cwd,
    tsconfig,
    fileExists: ts.sys.fileExists,
  });

  const { options, fileNames } = ts.parseJsonConfigFileContent(
    configPath ? ts.readConfigFile(configPath, ts.sys.readFile).config : {},
    ts.sys,
    configPath ? dirname(configPath) : cwd,
  );

  return { options, fileNames, configFound: !!configPath };
};

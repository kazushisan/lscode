import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { CommandError, COMMAND_ERROR_TYPE } from './error.js';

type ReadDirectory = ts.ParseConfigHost['readDirectory'];

const parseConfigFile = ({
  configPath,
  readFile,
  fileExists,
  readDirectory,
}: {
  configPath: string;
  readFile: (path: string) => string | undefined;
  fileExists: (path: string) => boolean;
  readDirectory: ReadDirectory;
}): {
  fileNames: string[];
  references: string[];
} => {
  const configDir = dirname(configPath);
  const { config } = ts.readConfigFile(configPath, readFile);

  const parsed = ts.parseJsonConfigFileContent(
    config,
    {
      useCaseSensitiveFileNames: true,
      readFile,
      fileExists,
      readDirectory,
    },
    configDir,
  );

  const references = (
    config.references && Array.isArray(config.references)
      ? config.references
      : []
  ).reduce((acc: string[], ref: unknown) => {
    if (
      typeof ref !== 'object' ||
      !ref ||
      !('path' in ref) ||
      typeof ref.path !== 'string'
    ) {
      return acc;
    }
    const refPath = resolve(configDir, ref.path);
    const resolvedPath = fileExists(refPath)
      ? refPath
      : fileExists(resolve(refPath, 'tsconfig.json'))
        ? resolve(refPath, 'tsconfig.json')
        : undefined;

    if (resolvedPath) {
      acc.push(resolvedPath);
    }
    return acc;
  }, [] as string[]);

  return {
    fileNames: parsed.fileNames,
    references,
  };
};

const findTsConfigForFile = ({
  startConfigPath,
  fileName,
  readFile,
  fileExists,
  readDirectory,
}: {
  startConfigPath: string;
  fileName: string;
  readFile: (path: string) => string | undefined;
  fileExists: (path: string) => boolean;
  readDirectory: ReadDirectory;
}): string | undefined => {
  const visited = new Set<string>();
  const queue = [startConfigPath];

  while (queue.length > 0) {
    const currentConfigPath = queue.shift()!;

    if (visited.has(currentConfigPath)) {
      continue;
    }
    visited.add(currentConfigPath);

    if (!fileExists(currentConfigPath)) {
      continue;
    }

    const { fileNames, references } = parseConfigFile({
      configPath: currentConfigPath,
      readFile,
      fileExists,
      readDirectory,
    });

    if (fileNames.includes(fileName)) {
      return currentConfigPath;
    }

    for (const ref of references) {
      if (!visited.has(ref)) {
        queue.push(ref);
      }
    }
  }

  return undefined;
};

// tsr-skip used in test
export const getTsConfigPath = ({
  cwd,
  tsconfig,
  fileName,
  fileExists,
  readFile = ts.sys.readFile,
  readDirectory = ts.sys.readDirectory,
}: {
  cwd: string;
  tsconfig?: string;
  fileName: string;
  fileExists: (path: string) => boolean;
  readFile?: (path: string) => string | undefined;
  readDirectory?: ReadDirectory;
}): string | undefined => {
  if (tsconfig) {
    const absoluteConfigPath = resolve(cwd, tsconfig);

    if (!fileExists(absoluteConfigPath)) {
      throw new CommandError(
        `TypeScript config file not found: ${tsconfig}`,
        COMMAND_ERROR_TYPE.TSCONFIG_NOT_FOUND,
      );
    }

    return absoluteConfigPath;
  }

  const defaultConfigPath = resolve(cwd, 'tsconfig.json');

  if (!fileExists(defaultConfigPath)) {
    return undefined;
  }

  // Find the tsconfig that includes the fileName by traversing from the default config
  // If no tsconfig includes the file, return the default config path
  return (
    findTsConfigForFile({
      startConfigPath: defaultConfigPath,
      fileName,
      readFile,
      fileExists,
      readDirectory,
    }) || defaultConfigPath
  );
};

export const getTsconfig = ({
  cwd,
  tsconfig,
  fileName,
}: {
  cwd: string;
  tsconfig?: string;
  fileName: string;
}) => {
  const resolvedConfigPath = getTsConfigPath({
    cwd,
    tsconfig,
    fileName,
    fileExists: ts.sys.fileExists,
  });

  const { options, fileNames } = ts.parseJsonConfigFileContent(
    resolvedConfigPath
      ? ts.readConfigFile(resolvedConfigPath, ts.sys.readFile).config
      : {},
    ts.sys,
    resolvedConfigPath ? dirname(resolvedConfigPath) : cwd,
  );

  if (!fileNames.includes(fileName)) {
    if (resolvedConfigPath) {
      throw new CommandError(
        `${fileName} is not part of the TypeScript project ${resolve(cwd, resolvedConfigPath)}. Hint: use --tsconfig to specify the correct tsconfig file.`,
        COMMAND_ERROR_TYPE.FILE_NOT_IN_PROJECT,
      );
    }

    // when does this happen?
    throw new CommandError(
      `Could not find a TypeScript project for ${fileName} (no matching 
      tsconfig found). Attempted to use default compiler options with cwd,
       but ${fileName} is not included.`,
      COMMAND_ERROR_TYPE.FILE_NOT_IN_PROJECT,
    );
  }

  return { options, fileNames, resolvedConfigPath: resolvedConfigPath };
};

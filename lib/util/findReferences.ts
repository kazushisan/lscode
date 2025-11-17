import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { createLanguageServiceHost } from './languageServiceHost.js';
import { getPosition } from './position.js';

interface ReferenceLocation {
  fileName: string;
  line: number; // 0-based
  character: number; // 0-based
}

const ERROR_TYPE = {
  TSCONFIG_NOT_FOUND: 'TSCONFIG_NOT_FOUND',
  FILE_NOT_IN_PROJECT: 'FILE_NOT_IN_PROJECT',
} as const;

type FindReferencesErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

export class FindReferencesError extends Error {
  type: FindReferencesErrorType;

  constructor(message: string, type: FindReferencesErrorType) {
    super(message);
    this.name = 'FindReferencesError';
    this.type = type;
  }
}

export const findReferences = ({
  line,
  character,
  fileName,
  cwd,
  tsconfig,
}: {
  line: number; // 0-based
  character: number; // 0-based
  fileName: string;
  cwd: string;
  tsconfig?: string;
}) => {
  const content = ts.sys.readFile(fileName);
  if (content === undefined) {
    throw new Error(`Failed to read file: ${fileName}`);
  }
  const position = getPosition(line, character, content);

  const configPath = tsconfig
    ? (() => {
        const absoluteConfigPath = resolve(cwd, tsconfig);

        if (!ts.sys.fileExists(absoluteConfigPath)) {
          throw new FindReferencesError(
            `TypeScript config file not found: ${tsconfig}`,
            ERROR_TYPE.TSCONFIG_NOT_FOUND,
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

  if (configPath && !fileNames.includes(fileName)) {
    throw new FindReferencesError(
      `${fileName} is not part of the TypeScript project. Hint: use --tsconfig to specify the correct tsconfig file.`,
      ERROR_TYPE.FILE_NOT_IN_PROJECT,
    );
  }

  const rootFiles = fileNames.includes(fileName)
    ? fileNames
    : [...fileNames, fileName];

  const host = createLanguageServiceHost(rootFiles, options, cwd);

  const service = ts.createLanguageService(host);

  const referencesInfo = service.findReferences(fileName, position) || [];

  const results: ReferenceLocation[] = [];

  for (const item of referencesInfo.flatMap((info) => info.references)) {
    const sourceFile = service.getProgram()?.getSourceFile(item.fileName);
    if (!sourceFile) {
      continue;
    }

    const res = sourceFile.getLineAndCharacterOfPosition(item.textSpan.start);

    results.push({
      fileName: item.fileName,
      line: res.line,
      character: res.character,
    });
  }

  return results;
};

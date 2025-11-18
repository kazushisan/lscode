import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { createLanguageServiceHost } from './languageServiceHost.js';
import { findSymbol } from './symbol.js';
import { getLineAtPosition } from './position.js';

interface ReferenceLocation {
  fileName: string;
  line: number; // 0-based
  character: number; // 0-based
}

interface SymbolInfo {
  character: number; // 0-based
  line: number; // 0-based
  code: string; // entire line of the symbol's definition
}

// tsr-skip used in test
export const ERROR_TYPE = {
  TSCONFIG_NOT_FOUND: 'TSCONFIG_NOT_FOUND',
  FILE_NOT_IN_PROJECT: 'FILE_NOT_IN_PROJECT',
  SYMBOL_NOT_FOUND: 'SYMBOL_NOT_FOUND',
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
  symbol,
  fileName,
  cwd,
  tsconfig,
}: {
  symbol: string;
  fileName: string;
  cwd: string;
  tsconfig?: string;
}) => {
  const content = ts.sys.readFile(fileName);
  if (content === undefined) {
    throw new Error(`Failed to read file: ${fileName}`);
  }

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
  const program = service.getProgram();

  if (!program) {
    throw new Error('Failed to create program');
  }

  const symbols = findSymbol(program, fileName, symbol);

  if (symbols.length === 0) {
    throw new FindReferencesError(
      `Symbol '${symbol}' not found in ${fileName}`,
      ERROR_TYPE.SYMBOL_NOT_FOUND,
    );
  }

  // Use the first symbol (if multiple found, use the first one)
  const targetSymbol = symbols[0]!;
  const declarations = targetSymbol.getDeclarations();

  if (!declarations || declarations.length === 0) {
    throw new FindReferencesError(
      `Symbol '${symbol}' not found in ${fileName}`,
      ERROR_TYPE.SYMBOL_NOT_FOUND,
    );
  }

  const firstDeclaration = declarations[0]!;
  const position = firstDeclaration.getStart();

  const referencesInfo = service.findReferences(fileName, position) || [];

  const references: ReferenceLocation[] = [];

  for (const item of referencesInfo.flatMap((info) => info.references)) {
    const sourceFile = service.getProgram()?.getSourceFile(item.fileName);
    if (!sourceFile) {
      continue;
    }

    const res = sourceFile.getLineAndCharacterOfPosition(item.textSpan.start);

    references.push({
      fileName: item.fileName,
      line: res.line,
      character: res.character,
    });
  }

  // Build symbols array from found symbols
  const symbolsInfo: SymbolInfo[] = [];

  for (const foundSymbol of symbols) {
    const symbolDeclarations = foundSymbol.getDeclarations();
    if (!symbolDeclarations || symbolDeclarations.length === 0) {
      continue;
    }

    const declaration = symbolDeclarations[0]!;
    const declarationSourceFile = declaration.getSourceFile();
    const declarationPosition = declaration.getStart();
    const { line, character } =
      declarationSourceFile.getLineAndCharacterOfPosition(declarationPosition);

    // Get the entire line text for context
    const code = getLineAtPosition(
      declarationSourceFile.text,
      declarationPosition,
    );

    symbolsInfo.push({
      character,
      line,
      code,
    });
  }

  return {
    references,
    symbols: symbolsInfo,
    index: 0,
  };
};

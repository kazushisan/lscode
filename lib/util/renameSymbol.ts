import ts from 'typescript';
import { createLanguageServiceHost } from './languageServiceHost.js';
import { findSymbol } from './symbol.js';
import { getTsconfig } from './tsconfig.js';

// tsr-skip used in test
export const ERROR_TYPE = {
  SYMBOL_NOT_FOUND: 'SYMBOL_NOT_FOUND',
  SYMBOL_INDEX_OUT_OF_RANGE: 'SYMBOL_INDEX_OUT_OF_RANGE',
  RENAME_NOT_ALLOWED: 'RENAME_NOT_ALLOWED',
} as const;

type RenameSymbolErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

export class RenameSymbolError extends Error {
  type: RenameSymbolErrorType;

  constructor(message: string, type: RenameSymbolErrorType) {
    super(message);
    this.name = 'RenameSymbolError';
    this.type = type;
  }
}

interface RenameLocation {
  fileName: string;
  start: number;
  length: number;
}

const applyRenameEdits = (
  content: string,
  locations: RenameLocation[],
  newName: string,
): string => {
  // Sort locations in reverse order by start position to avoid offset issues
  const sortedLocations = [...locations].sort((a, b) => b.start - a.start);

  let result = content;
  for (const loc of sortedLocations) {
    result =
      result.slice(0, loc.start) +
      newName +
      result.slice(loc.start + loc.length);
  }

  return result;
};

export const renameSymbol = ({
  symbol,
  fileName,
  cwd,
  tsconfig,
  n,
  newName,
}: {
  symbol: string;
  fileName: string;
  cwd: string;
  tsconfig?: string;
  n: number;
  newName: string;
}): { [fileName: string]: string } => {
  const content = ts.sys.readFile(fileName);
  if (content === undefined) {
    throw new Error(`Failed to read file: ${fileName}`);
  }

  const { options, fileNames } = getTsconfig({
    cwd,
    tsconfig,
    fileName,
  });

  const host = createLanguageServiceHost(fileNames, options, cwd);

  const service = ts.createLanguageService(host);
  const program = service.getProgram();

  if (!program) {
    throw new Error('Failed to create program');
  }

  const symbols = findSymbol(program, fileName, symbol);

  if (symbols.length === 0) {
    throw new RenameSymbolError(
      `Symbol '${symbol}' not found in ${fileName}`,
      ERROR_TYPE.SYMBOL_NOT_FOUND,
    );
  }

  if (n < 0 || n >= symbols.length) {
    throw new RenameSymbolError(
      `Symbol index ${n} out of range. Found ${symbols.length} symbol(s) with name '${symbol}'`,
      ERROR_TYPE.SYMBOL_INDEX_OUT_OF_RANGE,
    );
  }

  const targetSymbol = symbols[n]!;
  const declarations = targetSymbol.getDeclarations();

  if (!declarations || declarations.length === 0) {
    throw new RenameSymbolError(
      `Symbol '${symbol}' not found in ${fileName}`,
      ERROR_TYPE.SYMBOL_NOT_FOUND,
    );
  }

  const firstDeclaration = declarations[0]!;
  const position = firstDeclaration.getStart();

  const renameInfo = service.getRenameInfo(fileName, position, {
    allowRenameOfImportPath: false,
  });

  if (!renameInfo.canRename) {
    throw new RenameSymbolError(
      renameInfo.localizedErrorMessage ||
        `Cannot rename symbol '${symbol}' at this location`,
      ERROR_TYPE.RENAME_NOT_ALLOWED,
    );
  }

  // Find all rename locations
  const renameLocations = service.findRenameLocations(
    fileName,
    position,
    false, // findInStrings
    false, // findInComments
    false, // providePrefixAndSuffixTextForRename
  );

  if (!renameLocations || renameLocations.length === 0) {
    return {};
  }

  const locationsByFile = renameLocations.reduce(
    (acc, loc) => ({
      ...acc,
      [loc.fileName]: [
        ...(acc[loc.fileName] || []),
        {
          fileName: loc.fileName,
          start: loc.textSpan.start,
          length: loc.textSpan.length,
        },
      ],
    }),
    {} as Record<string, RenameLocation[]>,
  );

  return Object.entries(locationsByFile).reduce(
    (acc, [file, locations]) => {
      const sourceFile = program.getSourceFile(file);
      if (!sourceFile) {
        return acc;
      }

      const fileContent = sourceFile.getFullText();
      const editedContent = applyRenameEdits(fileContent, locations, newName);

      if (editedContent === fileContent) {
        return acc;
      }

      return { ...acc, [file]: editedContent };
    },
    {} as Record<string, string>,
  );
};

import ts from 'typescript';
import { createLanguageServiceHost } from './languageService.js';
import { findSymbol } from './symbol.js';
import { getTsconfig } from './tsconfig.js';
import { applyTextChanges, TextChange } from './edit.js';

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
}) => {
  const content = ts.sys.readFile(fileName);
  if (content === undefined) {
    throw new Error(`Failed to read file: ${fileName}`);
  }

  const { options, fileNames, resolvedConfigPath } = getTsconfig({
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
    return { edits: {}, resolvedConfigPath };
  }

  const changesByFile = renameLocations.reduce(
    (acc, loc) => ({
      ...acc,
      [loc.fileName]: [
        ...(acc[loc.fileName] || []),
        {
          start: loc.textSpan.start,
          length: loc.textSpan.length,
          newText: newName,
        },
      ],
    }),
    {} as Record<string, TextChange[]>,
  );

  const edits = Object.entries(changesByFile).reduce(
    (acc, [file, changes]) => {
      const sourceFile = program.getSourceFile(file);
      if (!sourceFile) {
        return acc;
      }

      const fileContent = sourceFile.getFullText();
      const editedContent = applyTextChanges(fileContent, changes);

      if (editedContent === fileContent) {
        return acc;
      }

      return { ...acc, [file]: editedContent };
    },
    {} as Record<string, string>,
  );

  return { edits, resolvedConfigPath };
};

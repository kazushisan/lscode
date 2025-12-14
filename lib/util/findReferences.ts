import ts from 'typescript';
import { createLanguageServiceHost } from './languageServiceHost.js';
import { findSymbol } from './symbol.js';
import { getLineAtPosition } from './position.js';
import { getTsconfig } from './tsconfig.js';

interface ReferenceLocation {
  fileName: string;
  line: number; // 0-based
  character: number; // 0-based
}

interface SymbolInfo {
  fileName: string;
  character: number; // 0-based
  line: number; // 0-based
  code: string; // entire line of the symbol's definition
}

// tsr-skip used in test
export const ERROR_TYPE = {
  SYMBOL_NOT_FOUND: 'SYMBOL_NOT_FOUND',
  SYMBOL_INDEX_OUT_OF_RANGE: 'SYMBOL_INDEX_OUT_OF_RANGE',
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
  n,
}: {
  symbol: string;
  fileName: string;
  cwd: string;
  tsconfig?: string;
  n: number;
}) => {
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
    throw new FindReferencesError(
      `Symbol '${symbol}' not found in ${fileName}`,
      ERROR_TYPE.SYMBOL_NOT_FOUND,
    );
  }

  if (n < 0 || n >= symbols.length) {
    throw new FindReferencesError(
      `Symbol index ${n} out of range. Found ${symbols.length} symbol(s) with name '${symbol}'`,
      ERROR_TYPE.SYMBOL_INDEX_OUT_OF_RANGE,
    );
  }

  const targetSymbol = symbols[n]!;
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
      fileName: declarationSourceFile.fileName,
      character,
      line,
      code,
    });
  }

  return {
    references,
    symbols: symbolsInfo,
  };
};

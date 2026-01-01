import ts from 'typescript';
import { forwardMatch } from './match.js';
import { getLineAtPosition } from './position.js';
import { CommandError, COMMAND_ERROR_TYPE } from './error.js';

const getTokenAtPosition = (
  sourceFile: ts.SourceFile,
  position: number,
): ts.Node | undefined => {
  let result: ts.Node | undefined;

  const visit = (node: ts.Node): void => {
    // Check if position is within this node's range
    if (position >= node.getStart(sourceFile) && position < node.getEnd()) {
      result = node;
      // Continue visiting children to find the most specific node
      ts.forEachChild(node, visit);
    }
  };

  visit(sourceFile);
  return result;
};

// tsr-skip used in test
export const findSymbol = (
  program: ts.Program,
  fileName: string,
  keyword: string,
): ts.Symbol[] => {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return [];
  }

  const content = sourceFile.getFullText();
  // Get all positions where the keyword appears in the file
  const positions = forwardMatch(content, keyword);

  const typeChecker = program.getTypeChecker();
  const symbols: ts.Symbol[] = [];
  const seenSymbols = new Set<ts.Symbol>();

  for (const position of positions) {
    // Get the node at this position
    const node = getTokenAtPosition(sourceFile, position);
    if (!node) {
      continue;
    }

    // Only consider identifier nodes
    if (!ts.isIdentifier(node)) {
      continue;
    }

    const symbol = typeChecker.getSymbolAtLocation(node);

    if (!symbol || symbol.getName() !== keyword) {
      continue;
    }

    if (seenSymbols.has(symbol)) {
      continue;
    }

    seenSymbols.add(symbol);
    symbols.push(symbol);
  }

  return symbols;
};

export const resolveSymbol = ({
  keyword,
  fileName,
  n,
  program,
}: {
  keyword: string;
  fileName: string;
  n: number;
  program: ts.Program;
}) => {
  const symbols = findSymbol(program, fileName, keyword);

  if (symbols.length === 0) {
    throw new CommandError(
      `Symbol '${keyword}' not found in ${fileName}`,
      COMMAND_ERROR_TYPE.SYMBOL_NOT_FOUND,
    );
  }

  if (n < 0 || n >= symbols.length) {
    throw new CommandError(
      `Symbol index ${n} out of range. Found ${symbols.length} symbol(s) with name '${keyword}'`,
      COMMAND_ERROR_TYPE.SYMBOL_INDEX_OUT_OF_RANGE,
    );
  }

  const symbol = symbols[n]!;
  const declarations = symbol.getDeclarations();

  if (!declarations || declarations.length === 0) {
    throw new CommandError(
      `Declaration for symbol '${keyword}' not found in`,
      COMMAND_ERROR_TYPE.SYMBOL_NOT_FOUND,
    );
  }

  const declaration = declarations[0]!;

  return {
    declaration,
    symbol,
    symbolsInfo: getSymbolsInfo(symbols),
  };
};

interface SymbolInfo {
  fileName: string;
  character: number; // 0-based
  line: number; // 0-based
  code: string; // entire line of the symbol's definition
}

const getSymbolsInfo = (symbols: ts.Symbol[]) => {
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

  return symbolsInfo;
};

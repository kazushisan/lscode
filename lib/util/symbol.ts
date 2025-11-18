import ts from 'typescript';
import { forwardMatch } from './text.js';

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

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
      continue;
    }

    const isDeclarationName = declarations.some((decl) => {
      if (
        ts.isVariableDeclaration(decl) ||
        ts.isFunctionDeclaration(decl) ||
        ts.isClassDeclaration(decl) ||
        ts.isInterfaceDeclaration(decl) ||
        ts.isTypeAliasDeclaration(decl) ||
        ts.isEnumDeclaration(decl) ||
        ts.isParameter(decl) ||
        ts.isBindingElement(decl)
      ) {
        return decl.name === node;
      }
      return false;
    });

    if (!isDeclarationName) {
      continue;
    }

    seenSymbols.add(symbol);
    symbols.push(symbol);
  }

  return symbols;
};

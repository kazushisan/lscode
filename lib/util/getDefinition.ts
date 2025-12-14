import ts from 'typescript';
import { createLanguageServiceHost } from './languageServiceHost.js';
import { findSymbol } from './symbol.js';
import { getLineAtPosition } from './position.js';
import { getTsconfig } from './tsconfig.js';

interface DefinitionLocation {
  fileName: string;
  line: number; // 0-based
  character: number; // 0-based
  code: string; // entire code of the definition
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

type GetDefinitionErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

export class GetDefinitionError extends Error {
  type: GetDefinitionErrorType;

  constructor(message: string, type: GetDefinitionErrorType) {
    super(message);
    this.name = 'GetDefinitionError';
    this.type = type;
  }
}

const findNodeAtPosition = (
  node: ts.Node,
  targetPosition: number,
): ts.Node | undefined => {
  if (targetPosition < node.getStart() || targetPosition >= node.getEnd()) {
    return undefined;
  }

  // Try to find a more specific child node
  let result: ts.Node | undefined;
  ts.forEachChild(node, (child) => {
    if (!result) {
      const found = findNodeAtPosition(child, targetPosition);
      if (found) {
        result = found;
      }
    }
  });

  return result || node;
};

const findDeclarationNode = (
  node: ts.Node | undefined,
): ts.Node | undefined => {
  let current = node;
  while (current) {
    if (
      ts.isVariableStatement(current) ||
      ts.isFunctionDeclaration(current) ||
      ts.isClassDeclaration(current) ||
      ts.isInterfaceDeclaration(current) ||
      ts.isTypeAliasDeclaration(current) ||
      ts.isEnumDeclaration(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isPropertyDeclaration(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
};

export const getDefinition = ({
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
    throw new GetDefinitionError(
      `Symbol '${symbol}' not found in ${fileName}`,
      ERROR_TYPE.SYMBOL_NOT_FOUND,
    );
  }

  if (n < 0 || n >= symbols.length) {
    throw new GetDefinitionError(
      `Symbol index ${n} out of range. Found ${symbols.length} symbol(s) with name '${symbol}'`,
      ERROR_TYPE.SYMBOL_INDEX_OUT_OF_RANGE,
    );
  }

  const targetSymbol = symbols[n]!;
  const declarations = targetSymbol.getDeclarations();

  if (!declarations || declarations.length === 0) {
    throw new GetDefinitionError(
      `Symbol '${symbol}' not found in ${fileName}`,
      ERROR_TYPE.SYMBOL_NOT_FOUND,
    );
  }

  const firstDeclaration = declarations[0]!;
  const position = firstDeclaration.getStart();

  const definitionsInfo = service.getDefinitionAtPosition(fileName, position);

  const definitions: DefinitionLocation[] = [];

  if (definitionsInfo) {
    for (const item of definitionsInfo) {
      const sourceFile = service.getProgram()?.getSourceFile(item.fileName);
      if (!sourceFile) {
        continue;
      }

      const res = sourceFile.getLineAndCharacterOfPosition(item.textSpan.start);

      const nodeAtPosition = findNodeAtPosition(
        sourceFile,
        item.textSpan.start,
      );
      const declarationNode = findDeclarationNode(nodeAtPosition);
      const code = declarationNode
        ? declarationNode.getText()
        : sourceFile.text.substring(
            item.textSpan.start,
            item.textSpan.start + item.textSpan.length,
          );

      definitions.push({
        fileName: item.fileName,
        line: res.line,
        character: res.character,
        code,
      });
    }
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
    definitions,
    symbols: symbolsInfo,
    resolvedConfigPath,
  };
};

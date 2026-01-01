import ts from 'typescript';

interface DefinitionLocation {
  fileName: string;
  line: number; // 0-based
  character: number; // 0-based
  code: string; // entire code of the definition
}

// tsr-skip used in test
export const OPERATION = {
  DEFINITION: 'operation.definition',
  TYPE_DEFINITION: 'operation.type_definition',
} as const;

type Operation = (typeof OPERATION)[keyof typeof OPERATION];

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
  fileName,
  declaration,
  service,
  operation,
}: {
  fileName: string;
  declaration: ts.Declaration;
  service: ts.LanguageService;
  operation: Operation;
}) => {
  const position = declaration.getStart();

  const definitionsInfo = (() => {
    switch (operation) {
      case OPERATION.DEFINITION: {
        return service.getDefinitionAtPosition(fileName, position);
      }
      case OPERATION.TYPE_DEFINITION: {
        return service.getTypeDefinitionAtPosition(fileName, position);
      }
      default: {
        throw new Error(`Unknown operation: ${operation satisfies never}`);
      }
    }
  })();

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

  return {
    definitions,
  };
};

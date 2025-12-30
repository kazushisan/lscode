import ts from 'typescript';

interface ReferenceLocation {
  fileName: string;
  line: number; // 0-based
  character: number; // 0-based
}

export const findReferences = ({
  fileName,
  declaration,
  service,
}: {
  fileName: string;
  declaration: ts.Declaration;
  service: ts.LanguageService;
}) => {
  const position = declaration.getStart();

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

  return {
    references,
  };
};

import ts from 'typescript';
import { applyTextChanges, TextChange } from './edit.js';

// tsr-skip used in test
export const ERROR_TYPE = {
  RENAME_NOT_ALLOWED: 'RENAME_NOT_ALLOWED',
} as const;

type RenameSymbolErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

class RenameSymbolError extends Error {
  type: RenameSymbolErrorType;

  constructor(message: string, type: RenameSymbolErrorType) {
    super(message);
    this.name = 'RenameSymbolError';
    this.type = type;
  }
}

export const renameSymbol = ({
  fileName,
  declaration,
  service,
  newName,
}: {
  fileName: string;
  declaration: ts.Declaration;
  service: ts.LanguageService;
  newName: string;
}) => {
  const program = service.getProgram();

  if (!program) {
    throw new Error('Failed to get program from language service');
  }

  const position = declaration.getStart();

  const renameInfo = service.getRenameInfo(fileName, position, {
    allowRenameOfImportPath: false,
  });

  if (!renameInfo.canRename) {
    throw new RenameSymbolError(
      renameInfo.localizedErrorMessage ||
        `Cannot rename symbol at this location`,
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
    return { edits: {} };
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

  return { edits };
};

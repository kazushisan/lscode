import ts from 'typescript';
import { applyTextChanges, TextChange } from './edit.js';

// tsr-skip used in test
export const ERROR_TYPE = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
} as const;

type RenameFileErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

// tsr-skip used in test
export class RenameFileError extends Error {
  type: RenameFileErrorType;

  constructor(message: string, type: RenameFileErrorType) {
    super(message);
    this.name = 'RenameFileError';
    this.type = type;
  }
}

export const renameFile = ({
  fileName,
  newFileName,
  service,
}: {
  fileName: string;
  newFileName: string;
  service: ts.LanguageService;
}) => {
  const content = ts.sys.readFile(fileName);
  if (content === undefined) {
    throw new RenameFileError(
      `Failed to read file: ${fileName}`,
      ERROR_TYPE.FILE_NOT_FOUND,
    );
  }

  const program = service.getProgram();

  if (!program) {
    throw new Error('Failed to get program from language service');
  }

  const edits = service.getEditsForFileRename(fileName, newFileName, {}, {});

  const changesByFile = edits.reduce(
    (acc, edit) => {
      const changes: TextChange[] = edit.textChanges.map((tc) => ({
        start: tc.span.start,
        length: tc.span.length,
        newText: tc.newText,
      }));

      return {
        ...acc,
        [edit.fileName]: [...(acc[edit.fileName] || []), ...changes],
      };
    },
    {} as Record<string, TextChange[]>,
  );

  const result: Record<string, string | null> = {};

  for (const [file, changes] of Object.entries(changesByFile)) {
    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) {
      const fileContent = ts.sys.readFile(file);
      if (!fileContent) {
        continue;
      }
      const editedContent = applyTextChanges(fileContent, changes);
      if (editedContent !== fileContent) {
        result[file] = editedContent;
      }
    } else {
      const fileContent = sourceFile.getFullText();
      const editedContent = applyTextChanges(fileContent, changes);

      if (editedContent !== fileContent) {
        result[file] = editedContent;
      }
    }
  }

  if (fileName !== newFileName) {
    result[fileName] = null;
    result[newFileName] = content;
  }

  return { edits: result };
};

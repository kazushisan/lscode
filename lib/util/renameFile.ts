import ts from 'typescript';
import { createLanguageServiceHost } from './languageServiceHost.js';
import { getTsconfig } from './tsconfig.js';
import path from 'node:path';
import { applyTextChanges, TextChange } from './edit.js';

// tsr-skip used in test
export const ERROR_TYPE = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_NOT_IN_PROJECT: 'FILE_NOT_IN_PROJECT',
} as const;

type RenameFileErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

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
  cwd,
  tsconfig,
  newFileName,
}: {
  fileName: string;
  cwd: string;
  tsconfig?: string;
  newFileName: string;
}): { [fileName: string]: string | null } => {
  const absoluteFileName = path.isAbsolute(fileName)
    ? fileName
    : path.resolve(cwd, fileName);
  const absoluteNewFileName = path.isAbsolute(newFileName)
    ? newFileName
    : path.resolve(cwd, newFileName);

  const content = ts.sys.readFile(absoluteFileName);
  if (content === undefined) {
    throw new RenameFileError(
      `Failed to read file: ${absoluteFileName}`,
      ERROR_TYPE.FILE_NOT_FOUND,
    );
  }

  const { options, fileNames } = getTsconfig({
    cwd,
    tsconfig,
    fileName: absoluteFileName,
  });

  const host = createLanguageServiceHost(fileNames, options, cwd);

  const service = ts.createLanguageService(host);
  const program = service.getProgram();

  if (!program) {
    throw new Error('Failed to create program');
  }

  const edits = service.getEditsForFileRename(
    absoluteFileName,
    absoluteNewFileName,
    {},
    {},
  );

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
      const fileContent = host.readFile?.(file);
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

  if (absoluteFileName !== absoluteNewFileName) {
    result[absoluteFileName] = null;
    result[absoluteNewFileName] = content;
  }

  return result;
};

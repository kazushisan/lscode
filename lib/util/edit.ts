import ts from 'typescript';

export interface TextChange {
  start: number;
  length: number;
  newText: string;
}

export const applyTextChanges = (
  content: string,
  changes: TextChange[],
): string => {
  // Sort changes in reverse order by start position to avoid offset issues
  const sortedChanges = [...changes].sort((a, b) => b.start - a.start);

  let result = content;
  for (const change of sortedChanges) {
    result =
      result.slice(0, change.start) +
      change.newText +
      result.slice(change.start + change.length);
  }

  return result;
};

/**
 * Apply file edits to disk
 * @param edits - Object with file paths as keys and new content as values (null to delete)
 */
export const applyEdits = (edits: Record<string, string | null>): void => {
  for (const [fileName, content] of Object.entries(edits)) {
    if (content === null) {
      ts.sys.deleteFile?.(fileName);
    } else {
      ts.sys.writeFile(fileName, content);
    }
  }
};

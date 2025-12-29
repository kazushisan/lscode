import ts from 'typescript';

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

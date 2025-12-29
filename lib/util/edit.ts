import ts from 'typescript';

/**
 * Apply file edits to disk
 * @param edits - Object with file paths as keys and new content as values
 */
export const applyEdits = (edits: Record<string, string>): void => {
  for (const [fileName, content] of Object.entries(edits)) {
    ts.sys.writeFile(fileName, content);
  }
};

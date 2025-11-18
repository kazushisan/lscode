import { relative } from 'node:path';

interface Reference {
  fileName: string;
  line: number;
  character: number;
}

export const logFindReferences = (
  references: Reference[],
  cwd: string,
): void => {
  // Output results (convert to 1-based)
  for (const ref of references) {
    const relativePath = relative(cwd, ref.fileName);
    console.log(`${relativePath}:${ref.line + 1}:${ref.character + 1}`);
  }
};

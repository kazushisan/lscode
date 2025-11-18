import { relative } from 'node:path';

interface Reference {
  fileName: string;
  line: number;
  character: number;
}

export const formatFindReferences = (
  references: Reference[],
  cwd: string,
): string[] => {
  // Format results (convert to 1-based)
  return references.map((ref) => {
    const relativePath = relative(cwd, ref.fileName);
    return `${relativePath}:${ref.line + 1}:${ref.character + 1}`;
  });
};

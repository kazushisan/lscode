/**
 * Get the line containing the given position in the content
 * @param content - The file content as a string
 * @param position - The 0-based position in the content
 * @returns The line containing the position (without newline characters)
 */
export const getLineAtPosition = (
  content: string,
  position: number,
): string => {
  // Find the start of the line (go backwards to find newline or start)
  let lineStart = position;
  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--;
  }

  // Find the end of the line (go forwards to find newline or end)
  let lineEnd = position;
  while (lineEnd < content.length && content[lineEnd] !== '\n') {
    lineEnd++;
  }

  return content.substring(lineStart, lineEnd);
};

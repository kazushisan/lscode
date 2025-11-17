export const getPosition = (
  line: number,
  character: number,
  content: string,
) => {
  let position = 0;
  let currentLine = 0;

  for (let i = 0; i < content.length; i++) {
    if (currentLine === line) {
      return position + character;
    }

    if (content[i] === '\n') {
      currentLine++;
    }

    position++;
  }

  if (currentLine === line) {
    return position + character;
  }

  throw new Error(`Line ${line} is out of range`);
};

interface KeywordPosition {
  line: number; // 0-based
  character: number; // 0-based
}

export const getKeywordPosition = (
  keyword: string,
  content: string,
): KeywordPosition => {
  let line = 0;
  let character = 0;

  const index = content.indexOf(keyword);

  if (index === -1) {
    throw new Error(`Keyword "${keyword}" not found in content`);
  }

  // Count lines and calculate character position
  for (let i = 0; i < index; i++) {
    if (content[i] === '\n') {
      line++;
      character = 0;
    } else {
      character++;
    }
  }

  return { line, character };
};

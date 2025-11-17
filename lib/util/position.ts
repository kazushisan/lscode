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

import { relative } from 'node:path';
import { styleText } from 'node:util';
import ts from 'typescript';

interface Reference {
  fileName: string;
  line: number;
  character: number;
}

interface SymbolInfo {
  fileName: string;
  character: number;
  line: number;
  code: string;
}

export const formatFindReferences = ({
  references,
  symbols,
  index,
  cwd,
  symbol,
}: {
  references: Reference[];
  symbols: SymbolInfo[];
  index: number;
  cwd: string;
  symbol: string;
}): string[] => {
  const output: string[] = [];

  if (symbols.length > 0) {
    output.push('Found symbols:');
    symbols.forEach((symbolInfo) => {
      const relativePath = relative(cwd, symbolInfo.fileName);
      const location = styleText(
        'gray',
        `${relativePath}:${symbolInfo.line + 1}:${symbolInfo.character + 1}:`,
      );

      const code = symbolInfo.code.trim();
      const start = symbolInfo.character;
      const end = start + symbol.length;

      const beforeSymbol = code.substring(0, start);
      const symbolText = code.substring(start, end);
      const afterSymbol = code.substring(end);

      const highlightedSymbol = styleText('green', symbolText);

      output.push(
        `${location} ${beforeSymbol}${highlightedSymbol}${afterSymbol}`,
      );
    });
    output.push('');
  }

  if (symbols.length > 0) {
    const symbolInfo = symbols[index];
    if (symbolInfo) {
      const relativePath = relative(cwd, symbolInfo.fileName);
      output.push(
        `References shown for symbol #${index} at ${relativePath}:${symbolInfo.line + 1}:${symbolInfo.character + 1}`,
      );
    }
  }

  references.forEach((ref) => {
    const relativePath = relative(cwd, ref.fileName);

    const fileContent = ts.sys.readFile(ref.fileName);
    if (fileContent === undefined) {
      const location = `${relativePath}:${ref.line + 1}:${ref.character + 1}`;
      const lineNumber = styleText(
        'gray',
        `${relativePath}:${ref.line + 1}:${ref.character + 1}:`,
      );
      output.push(`${lineNumber} ${location}`);
      return;
    }

    const lines = fileContent.split('\n');
    const lineContent = lines[ref.line] || '';

    const location = styleText(
      'gray',
      `${relativePath}:${ref.line + 1}:${ref.character + 1}:`,
    );

    const start = ref.character;
    const end = start + symbol.length;

    const beforeSymbol = lineContent.substring(0, start);
    const symbolText = lineContent.substring(start, end);
    const afterSymbol = lineContent.substring(end);

    const highlightedSymbol = styleText('green', symbolText);

    output.push(
      `${location} ${beforeSymbol}${highlightedSymbol}${afterSymbol}`,
    );
  });

  return output;
};

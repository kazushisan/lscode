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

export const formatGetTsconfig = ({
  resolvedConfigPath,
  cwd,
  fileName,
}: {
  resolvedConfigPath?: string;
  cwd: string;
  fileName: string;
}): string[] => {
  if (!resolvedConfigPath) {
    const relativeFileName = relative(cwd, fileName);
    return [
      `[${styleText('yellow', 'warning')}] Could not find a TypeScript project for ${relativeFileName} (no matching tsconfig found). Using default compiler options with cwd.`,
    ];
  }

  const relativePath = relative(cwd, resolvedConfigPath);
  return [`[${styleText('blue', 'info')}] using tsconfig ${relativePath}`];
};

export const formatFindReferences = ({
  references,
  symbols,
  n,
  cwd,
  symbol,
}: {
  references: Reference[];
  symbols: SymbolInfo[];
  n: number;
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

      const code = symbolInfo.code;
      const trimmedCode = code.trim();
      const leadingWhitespace = code.length - code.trimStart().length;
      const start = symbolInfo.character - leadingWhitespace;
      const end = start + symbol.length;

      const beforeSymbol = trimmedCode.substring(0, start);
      const symbolText = trimmedCode.substring(start, end);
      const afterSymbol = trimmedCode.substring(end);

      const highlightedSymbol = styleText('green', symbolText);

      output.push(
        `${location} ${beforeSymbol}${highlightedSymbol}${afterSymbol}`,
      );
    });
    output.push('');
  }

  if (symbols.length > 0) {
    const symbolInfo = symbols[n];
    if (symbolInfo) {
      const relativePath = relative(cwd, symbolInfo.fileName);
      output.push(
        `References shown for symbol #${n} at ${relativePath}:${symbolInfo.line + 1}:${symbolInfo.character + 1}`,
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

interface DefinitionLocation {
  fileName: string;
  line: number;
  character: number;
  code: string;
}

export const formatGetDefinition = ({
  definitions,
  symbols,
  n,
  cwd,
  symbol,
}: {
  definitions: DefinitionLocation[];
  symbols: SymbolInfo[];
  n: number;
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

      const code = symbolInfo.code;
      const trimmedCode = code.trim();
      const leadingWhitespace = code.length - code.trimStart().length;
      const start = symbolInfo.character - leadingWhitespace;
      const end = start + symbol.length;

      const beforeSymbol = trimmedCode.substring(0, start);
      const symbolText = trimmedCode.substring(start, end);
      const afterSymbol = trimmedCode.substring(end);

      const highlightedSymbol = styleText('green', symbolText);

      output.push(
        `${location} ${beforeSymbol}${highlightedSymbol}${afterSymbol}`,
      );
    });
    output.push('');
  }

  if (symbols.length > 0) {
    const symbolInfo = symbols[n];
    if (symbolInfo) {
      const relativePath = relative(cwd, symbolInfo.fileName);
      output.push(
        `Definition shown for symbol #${n} at ${relativePath}:${symbolInfo.line + 1}:${symbolInfo.character + 1}`,
      );
    }
  }

  definitions.forEach((def) => {
    const relativePath = relative(cwd, def.fileName);

    const location = styleText(
      'gray',
      `${relativePath}:${def.line + 1}:${def.character + 1}:`,
    );

    output.push(location);
    output.push(def.code);
  });

  return output;
};

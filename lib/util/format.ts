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

export const formatSymbolsInfo = ({
  symbols,
  cwd,
  keyword,
}: {
  symbols: SymbolInfo[];
  cwd: string;
  keyword: string;
}): string[] => {
  if (symbols.length === 0) {
    return [];
  }

  const output: string[] = [];
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
    const end = start + keyword.length;

    const beforeSymbol = trimmedCode.substring(0, start);
    const symbolText = trimmedCode.substring(start, end);
    const afterSymbol = trimmedCode.substring(end);

    const highlightedSymbol = styleText('green', symbolText);

    output.push(
      `${location} ${beforeSymbol}${highlightedSymbol}${afterSymbol}`,
    );
  });
  return output;
};

export const formatGetTsconfig = ({
  resolvedConfigPath,
  cwd,
}: {
  resolvedConfigPath?: string;
  cwd: string;
}): string[] => {
  if (!resolvedConfigPath) {
    return [`[${styleText('blue', 'info')}] using default compiler options`];
  }

  const relativePath = relative(cwd, resolvedConfigPath);
  return [`[${styleText('blue', 'info')}] using tsconfig ${relativePath}`];
};

export const formatFindReferences = ({
  references,
  symbols,
  n,
  cwd,
  keyword,
}: {
  references: Reference[];
  symbols: SymbolInfo[];
  n: number;
  cwd: string;
  keyword: string;
}): string[] => {
  const output: string[] = [];

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
    const end = start + keyword.length;

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

export const formatQuickInfo = ({
  quickInfo,
  symbols,
  n,
  cwd,
}: {
  quickInfo: string;
  symbols: SymbolInfo[];
  n: number;
  cwd: string;
}): string[] => {
  const output: string[] = [];

  if (symbols.length > 0) {
    const symbolInfo = symbols[n];
    if (symbolInfo) {
      const relativePath = relative(cwd, symbolInfo.fileName);
      output.push(
        `Quick info shown for symbol #${n} at ${relativePath}:${symbolInfo.line + 1}:${symbolInfo.character + 1}`,
      );
    }
  }

  if (quickInfo) {
    output.push(quickInfo);
  }

  return output;
};

export const formatGetDefinition = ({
  definitions,
  symbols,
  n,
  cwd,
}: {
  definitions: DefinitionLocation[];
  symbols: SymbolInfo[];
  n: number;
  cwd: string;
}): string[] => {
  const output: string[] = [];

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

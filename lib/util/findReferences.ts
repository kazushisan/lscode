import ts from 'typescript';
import path from 'node:path';
import { createLanguageServiceHost } from './languageServiceHost.js';
import { getPosition } from './position.js';

export interface ReferenceLocation {
  fileName: string;
  line: number; // 0-based
  character: number; // 0-based
}

export const findReferences = (
  line: number,
  character: number, // 0-based
  fileName: string, // 0-based
  cwd: string,
) => {
  const content = ts.sys.readFile(fileName);
  if (content === undefined) {
    throw new Error(`Failed to read file: ${fileName}`);
  }
  const position = getPosition(line, character, content);

  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json');

  const { options, fileNames } = ts.parseJsonConfigFileContent(
    configPath ? ts.readConfigFile(configPath, ts.sys.readFile).config : {},
    ts.sys,
    configPath ? path.dirname(configPath) : cwd,
  );

  const rootFiles = fileNames.includes(fileName)
    ? fileNames
    : [...fileNames, fileName];

  const host = createLanguageServiceHost(rootFiles, options, cwd);

  const service = ts.createLanguageService(host);

  const referencesInfo = service.findReferences(fileName, position) || [];

  const results: ReferenceLocation[] = [];

  for (const item of referencesInfo.flatMap((info) => info.references)) {
    const sourceFile = service.getProgram()?.getSourceFile(item.fileName);
    if (!sourceFile) {
      continue;
    }

    const res = sourceFile.getLineAndCharacterOfPosition(item.textSpan.start);

    results.push({
      fileName: item.fileName,
      line: res.line,
      character: res.character,
    });
  }

  return results;
};

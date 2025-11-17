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

  const parsedConfig = ts.parseJsonConfigFileContent(
    configPath ? ts.readConfigFile(configPath, ts.sys.readFile).config : {},
    ts.sys,
    configPath ? path.dirname(configPath) : cwd,
  );

  const compilerOptions = parsedConfig.options;
  const rootFiles = parsedConfig.fileNames.includes(fileName)
    ? parsedConfig.fileNames
    : [...parsedConfig.fileNames, fileName];

  const host = createLanguageServiceHost(rootFiles, compilerOptions, cwd);

  const service = ts.createLanguageService(host);

  const referencesInfo = service.findReferences(fileName, position) || [];

  const results: ReferenceLocation[] = [];

  for (const { fileName, textSpan } of referencesInfo.flatMap(
    (info) => info.references,
  )) {
    const sourceFile = service.getProgram()?.getSourceFile(fileName);
    if (!sourceFile) {
      continue;
    }

    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      textSpan.start,
    );

    results.push({
      fileName,
      line,
      character,
    });
  }

  return results;
};

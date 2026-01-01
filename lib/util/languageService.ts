import ts from 'typescript';
import { getTsconfig } from './tsconfig.js';

const createLanguageServiceHost = (
  rootFiles: string[],
  compilerOptions: ts.CompilerOptions,
  cwd: string,
): ts.LanguageServiceHost => {
  const fileMap = new Map<string, string>();

  return {
    getScriptFileNames: () => rootFiles,
    getScriptVersion: () => '0',
    getScriptSnapshot: (fileName: string) => {
      if (!ts.sys.fileExists(fileName)) {
        return undefined;
      }

      const cache = fileMap.get(fileName);
      if (typeof cache !== 'undefined') {
        return ts.ScriptSnapshot.fromString(cache);
      }

      const content = ts.sys.readFile(fileName) || '';
      fileMap.set(fileName, content);

      return ts.ScriptSnapshot.fromString(content);
    },
    getCurrentDirectory: () => cwd,
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    getNewLine: () => ts.sys.newLine,
    writeFile: () => {
      throw new Error('writeFile not implemented');
    },
  };
};

export const setupLanguageService = ({
  cwd,
  tsconfig,
  fileName, // used for finding tsconfig
}: {
  cwd: string;
  tsconfig?: string;
  fileName: string;
}) => {
  const { options, fileNames, resolvedConfigPath } = getTsconfig({
    cwd,
    tsconfig,
    fileName,
  });

  const host = createLanguageServiceHost(fileNames, options, cwd);

  const service = ts.createLanguageService(host);

  return { service, resolvedConfigPath };
};

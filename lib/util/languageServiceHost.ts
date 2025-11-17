import ts from 'typescript';

export const createLanguageServiceHost = (
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

    getNewLine: () => {
      throw new Error('getNewLine not implemented');
    },
    writeFile: () => {
      throw new Error('writeFile not implemented');
    },
  };
};

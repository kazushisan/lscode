import { build } from 'esbuild';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import ts from 'typescript';

await build({
  entryPoints: globSync('lib/**/*.ts'),
  outdir: 'dist',
  target: 'node22',
  platform: 'node',
  format: 'esm',
  tsconfig: 'tsconfig.lib.json',
});

const root = cwd();

const { config } = ts.readConfigFile(
  resolve(root, 'tsconfig.lib.json'),
  ts.sys.readFile,
);

const { options, fileNames } = ts.parseJsonConfigFileContent(
  config,
  ts.sys,
  root,
);

const program = ts.createProgram(fileNames, {
  ...options,
  emitDeclarationOnly: true,
  outDir: resolve(root, 'dist'),
  rootDir: resolve(root, 'lib'),
});

program.emit();

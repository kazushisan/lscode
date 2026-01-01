#! /usr/bin/env node
import { resolve } from 'node:path';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findReferences } from './util/findReferences.js';
import { setupLanguageService } from './util/languageService.js';
import { resolveSymbol } from './util/symbol.js';
import { getDefinition, OPERATION } from './util/getDefinition.js';
import { renameSymbol } from './util/renameSymbol.js';
import { renameFile } from './util/renameFile.js';
import { ArgsError, CommandError } from './util/error.js';
import {
  parseMainArgs,
  parseFindReferencesArgs,
  parseGetDefinitionArgs,
  parseRenameSymbolArgs,
  parseRenameFileArgs,
} from './util/args.js';
import {
  MAIN_HELP,
  FIND_REFERENCES_HELP,
  GET_DEFINITION_HELP,
  GET_TYPE_DEFINITION_HELP,
  RENAME_SYMBOL_HELP,
  RENAME_FILE_HELP,
} from './util/help.js';
import {
  formatFindReferences,
  formatGetDefinition,
  formatGetTsconfig,
} from './util/format.js';
import { applyEdits } from './util/edit.js';
import ts from 'typescript';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const packageJson = JSON.parse(
  readFileSync(join(projectRoot, 'package.json'), 'utf-8'),
);

const version = packageJson.version;

const main = () => {
  const argv = process.argv.slice(2);
  const mainArgs = parseMainArgs(argv);

  if ('help' in mainArgs) {
    console.log(MAIN_HELP);
    process.exit(0);
  }

  if ('version' in mainArgs) {
    console.log(version);
    process.exit(0);
  }

  const command = mainArgs.command;

  if (command === null) {
    console.log(MAIN_HELP);
    process.exit(0);
  }

  const commandArgs = argv.slice(1);

  switch (command) {
    case 'find-references': {
      const args = parseFindReferencesArgs(commandArgs);

      if ('help' in args) {
        console.log(FIND_REFERENCES_HELP);
        return;
      }

      const { filePath, symbol, tsconfig } = args;
      const n = args.n || 0;

      const cwd = process.cwd();
      const fileName = resolve(cwd, filePath);

      const content = ts.sys.readFile(fileName);
      if (content === undefined) {
        throw new Error(`Failed to read file: ${fileName}`);
      }

      const { service, resolvedConfigPath } = setupLanguageService({
        cwd,
        tsconfig,
        fileName,
      });

      const program = service.getProgram();
      if (!program) {
        throw new Error('Failed to get program from language service');
      }

      const { declaration, symbolsInfo } = resolveSymbol({
        keyword: symbol,
        fileName,
        n,
        program,
      });

      const { references } = findReferences({
        fileName,
        declaration,
        service,
      });

      formatGetTsconfig({
        resolvedConfigPath,
        cwd,
        fileName,
      }).forEach((line) => console.log(line));

      const lines = formatFindReferences({
        references,
        symbols: symbolsInfo,
        n,
        cwd,
        symbol,
      });
      lines.forEach((line) => console.log(line));
      break;
    }
    case 'get-definition':
    case 'get-type-definition': {
      const args = parseGetDefinitionArgs(commandArgs);

      if ('help' in args) {
        console.log(
          (() => {
            switch (command) {
              case 'get-definition': {
                return GET_DEFINITION_HELP;
              }
              case 'get-type-definition': {
                return GET_TYPE_DEFINITION_HELP;
              }
              default: {
                throw new Error(`Unknown command: ${command satisfies never}`);
              }
            }
          })(),
        );
        return;
      }

      const { filePath, symbol, tsconfig, n } = args;

      const cwd = process.cwd();
      const fileName = resolve(cwd, filePath);

      const symbolIndex = n !== undefined ? n : 0;

      const content = ts.sys.readFile(fileName);
      if (content === undefined) {
        throw new Error(`Failed to read file: ${fileName}`);
      }

      const { service, resolvedConfigPath } = setupLanguageService({
        cwd,
        tsconfig,
        fileName,
      });

      const program = service.getProgram();
      if (!program) {
        throw new Error('Failed to get program from language service');
      }

      const { declaration, symbolsInfo } = resolveSymbol({
        keyword: symbol,
        fileName,
        n: symbolIndex,
        program,
      });

      const { definitions } = getDefinition({
        fileName,
        declaration,
        service,
        operation: (() => {
          switch (command) {
            case 'get-definition': {
              return OPERATION.DEFINITION;
            }
            case 'get-type-definition': {
              return OPERATION.TYPE_DEFINITION;
            }
            default: {
              throw new Error(`Unknown command: ${command satisfies never}`);
            }
          }
        })(),
      });

      formatGetTsconfig({
        resolvedConfigPath,
        cwd,
        fileName,
      }).forEach((line) => console.log(line));

      const lines = formatGetDefinition({
        definitions,
        symbols: symbolsInfo,
        n: symbolIndex,
        cwd,
        symbol,
      });
      lines.forEach((line) => console.log(line));
      break;
    }
    case 'rename-symbol': {
      const args = parseRenameSymbolArgs(commandArgs);

      if ('help' in args) {
        console.log(RENAME_SYMBOL_HELP);
        return;
      }

      const { filePath, symbol, newName, tsconfig, n } = args;

      const cwd = process.cwd();
      const fileName = resolve(cwd, filePath);

      const symbolIndex = n !== undefined ? n : 0;

      const content = ts.sys.readFile(fileName);
      if (content === undefined) {
        throw new Error(`Failed to read file: ${fileName}`);
      }

      const { service, resolvedConfigPath } = setupLanguageService({
        cwd,
        tsconfig,
        fileName,
      });

      const program = service.getProgram();
      if (!program) {
        throw new Error('Failed to get program from language service');
      }

      const { declaration } = resolveSymbol({
        keyword: symbol,
        fileName,
        n: symbolIndex,
        program,
      });

      const { edits } = renameSymbol({
        fileName,
        declaration,
        service,
        newName,
      });

      formatGetTsconfig({
        resolvedConfigPath,
        cwd,
        fileName,
      }).forEach((line) => console.log(line));

      applyEdits(edits);
      break;
    }
    case 'rename-file': {
      const args = parseRenameFileArgs(commandArgs);

      if ('help' in args) {
        console.log(RENAME_FILE_HELP);
        return;
      }

      const { filePath, newFilePath, tsconfig } = args;

      const cwd = process.cwd();
      const fileName = resolve(cwd, filePath);
      const newFileName = resolve(cwd, newFilePath);

      const { service, resolvedConfigPath } = setupLanguageService({
        cwd,
        tsconfig,
        fileName,
      });

      const { edits } = renameFile({
        fileName,
        newFileName,
        service,
      });

      formatGetTsconfig({
        resolvedConfigPath,
        cwd,
        fileName,
      }).forEach((line) => console.log(line));

      // Apply file edits - handle both writes and deletions
      for (const [file, content] of Object.entries(edits)) {
        if (content === null) {
          unlinkSync(file);
        } else {
          writeFileSync(file, content);
        }
      }
      break;
    }
    default: {
      console.error(`Error: Unknown command '${command}'`);
      console.log(MAIN_HELP);
      process.exit(1);
    }
  }
};

try {
  main();
} catch (error) {
  if (error instanceof ArgsError) {
    console.error(`Error: ${error.message}`);
    switch (error.command) {
      case 'find-references':
        console.log(FIND_REFERENCES_HELP);
        break;
      case 'get-definition':
        console.log(GET_DEFINITION_HELP);
        break;
      case 'get-type-definition':
        console.log(GET_TYPE_DEFINITION_HELP);
        break;
      case 'rename-symbol':
        console.log(RENAME_SYMBOL_HELP);
        break;
      case 'rename-file':
        console.log(RENAME_FILE_HELP);
        break;
      default:
        throw new Error(
          `Unknown command in ArgsError: ${error.command satisfies never}`,
        );
    }
    process.exit(1);
  }

  if (error instanceof CommandError) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  throw error;
}

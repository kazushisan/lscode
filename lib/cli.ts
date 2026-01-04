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
import { ArgsError, CommandError, COMMAND_ERROR_TYPE } from './util/error.js';
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
import { COMMAND, Command } from './util/command.js';
import {
  formatFindReferences,
  formatGetDefinition,
  formatGetTsconfig,
  formatSymbolsInfo,
} from './util/format.js';
import { applyEdits } from './util/edit.js';
import ts from 'typescript';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const packageJson = JSON.parse(
  readFileSync(join(projectRoot, 'package.json'), 'utf-8'),
);

const version = packageJson.version;

const checkFileExists = (fileName: string) => {
  const content = ts.sys.readFile(fileName);
  if (content === undefined) {
    throw new CommandError(
      `Failed to read file: ${fileName}`,
      COMMAND_ERROR_TYPE.FILE_NOT_FOUND,
    );
  }
};

type Args =
  | {
      command: Command;
      help: true;
    }
  | {
      type: 'symbol';
      command:
        | typeof COMMAND.FIND_REFERENCES
        | typeof COMMAND.GET_DEFINITION
        | typeof COMMAND.GET_TYPE_DEFINITION;
      help: false;
      filePath: string;
      keyword: string;
      tsconfig?: string;
      n?: number;
    }
  | {
      type: 'symbol';
      command: typeof COMMAND.RENAME_SYMBOL;
      help: false;
      filePath: string;
      keyword: string;
      tsconfig?: string;
      n?: number;
      newName: string;
    }
  | {
      type: 'file';
      command: typeof COMMAND.RENAME_FILE;
      help: false;
      filePath: string;
      newFilePath: string;
      tsconfig?: string;
    };

const parseArgs = (command: Command, commandArgs: string[]): Args => {
  switch (command) {
    case COMMAND.FIND_REFERENCES: {
      const args = parseFindReferencesArgs(commandArgs);
      if ('help' in args) {
        return { help: true, command };
      }
      return { type: 'symbol', help: false, command, ...args };
    }
    case COMMAND.GET_DEFINITION:
    case COMMAND.GET_TYPE_DEFINITION: {
      const args = parseGetDefinitionArgs(commandArgs);
      if ('help' in args) {
        return { help: true, command };
      }
      return { type: 'symbol', help: false, command, ...args };
    }
    case COMMAND.RENAME_SYMBOL: {
      const args = parseRenameSymbolArgs(commandArgs);
      if ('help' in args) {
        return { help: true, command };
      }
      return { type: 'symbol', help: false, command, ...args };
    }
    case COMMAND.RENAME_FILE: {
      const args = parseRenameFileArgs(commandArgs);
      if ('help' in args) {
        return { help: true, command };
      }
      return { type: 'file', help: false, command, ...args };
    }
    default: {
      throw new Error(`Unknown command: ${command satisfies never}`);
    }
  }
};

const getHelpText = (command: Command): string => {
  switch (command) {
    case COMMAND.FIND_REFERENCES:
      return FIND_REFERENCES_HELP;
    case COMMAND.GET_DEFINITION:
      return GET_DEFINITION_HELP;
    case COMMAND.GET_TYPE_DEFINITION:
      return GET_TYPE_DEFINITION_HELP;
    case COMMAND.RENAME_SYMBOL:
      return RENAME_SYMBOL_HELP;
    case COMMAND.RENAME_FILE:
      return RENAME_FILE_HELP;
    default:
      throw new Error(`Unknown command: ${command satisfies never}`);
  }
};

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
  const args = parseArgs(command, commandArgs);

  if (args.help) {
    console.log(getHelpText(command));
    return;
  }

  const cwd = process.cwd();
  const fileName = resolve(cwd, args.filePath);

  checkFileExists(fileName);

  const { service, resolvedConfigPath } = setupLanguageService({
    cwd,
    tsconfig: args.tsconfig,
    fileName,
  });

  const program = service.getProgram();

  if (!program) {
    throw new Error('Failed to get program from language service');
  }

  const prepared =
    args.type === 'symbol'
      ? {
          ...args,
          symbol: resolveSymbol({
            keyword: args.keyword,
            fileName,
            n: args.n || 0,
            program,
          }),
        }
      : args;

  switch (prepared.command) {
    case COMMAND.FIND_REFERENCES: {
      const { keyword } = prepared;
      const n = prepared.n || 0;
      const { declaration, symbolsInfo } = prepared.symbol;

      const { references } = findReferences({
        fileName,
        declaration,
        service,
      });

      console.log(
        [
          ...formatGetTsconfig({
            resolvedConfigPath,
            cwd,
            fileName,
          }),
          ...formatSymbolsInfo({
            symbols: symbolsInfo,
            cwd,
            keyword,
          }),
          ...formatFindReferences({
            references,
            symbols: symbolsInfo,
            n,
            cwd,
            keyword,
          }),
        ].join('\n'),
      );
      break;
    }
    case COMMAND.GET_DEFINITION:
    case COMMAND.GET_TYPE_DEFINITION: {
      const { keyword } = prepared;
      const n = prepared.n || 0;
      const { declaration, symbolsInfo } = prepared.symbol;

      const { definitions } = getDefinition({
        fileName,
        declaration,
        service,
        operation: (() => {
          switch (prepared.command) {
            case COMMAND.GET_DEFINITION: {
              return OPERATION.DEFINITION;
            }
            case COMMAND.GET_TYPE_DEFINITION: {
              return OPERATION.TYPE_DEFINITION;
            }
            default: {
              throw new Error(
                `Unknown command: ${prepared.command satisfies never}`,
              );
            }
          }
        })(),
      });

      console.log(
        [
          ...formatGetTsconfig({
            resolvedConfigPath,
            cwd,
            fileName,
          }),
          ...formatSymbolsInfo({
            symbols: symbolsInfo,
            cwd,
            keyword,
          }),
          ...formatGetDefinition({
            definitions,
            symbols: symbolsInfo,
            n,
            cwd,
          }),
        ].join('\n'),
      );
      break;
    }
    case COMMAND.RENAME_SYMBOL: {
      const { newName } = prepared;
      const { declaration } = prepared.symbol;

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
    case COMMAND.RENAME_FILE: {
      const newFileName = resolve(cwd, prepared.newFilePath);

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
      case COMMAND.FIND_REFERENCES:
        console.log(FIND_REFERENCES_HELP);
        break;
      case COMMAND.GET_DEFINITION:
        console.log(GET_DEFINITION_HELP);
        break;
      case COMMAND.GET_TYPE_DEFINITION:
        console.log(GET_TYPE_DEFINITION_HELP);
        break;
      case COMMAND.RENAME_SYMBOL:
        console.log(RENAME_SYMBOL_HELP);
        break;
      case COMMAND.RENAME_FILE:
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

#! /usr/bin/env node
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findReferences, FindReferencesError } from './util/findReferences.js';
import {
  parseMainArgs,
  parseFindReferencesArgs,
  ArgsError,
} from './util/args.js';
import { MAIN_HELP, FIND_REFERENCES_HELP } from './util/help.js';
import { formatFindReferences } from './util/format.js';

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

      const cwd = process.cwd();

      const { references } = findReferences({
        symbol,
        fileName: resolve(cwd, filePath),
        cwd,
        tsconfig,
      });

      const lines = formatFindReferences(references, cwd);
      lines.forEach((line) => console.log(line));
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
    }
    process.exit(1);
  }

  if (error instanceof FindReferencesError) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  throw error;
}

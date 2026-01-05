import { parseArgs } from 'node:util';
import { ArgsError } from './error.js';
import { Command, COMMAND } from './command.js';

const KNOWN_COMMANDS = Object.values(COMMAND);

type MainArgs =
  | {
      help: true;
    }
  | {
      version: true;
    }
  | {
      command: Command | null;
    };

type SymbolCommandArgs =
  | { help: true }
  | {
      filePath: string;
      keyword: string;
      tsconfig?: string;
      n?: number;
      strict: boolean;
    };

type RenameSymbolArgs =
  | { help: true }
  | {
      filePath: string;
      keyword: string;
      tsconfig?: string;
      n?: number;
      newName: string;
      strict: boolean;
    };

type RenameFileArgs =
  | {
      help: true;
    }
  | {
      filePath: string;
      newFilePath: string;
      tsconfig?: string;
      strict: boolean;
    };

export const parseMainArgs = (argv: string[]): MainArgs => {
  // If first argument is a known command, let the sub-command parser handle it
  const firstArg = argv[0];
  if (firstArg && (KNOWN_COMMANDS as readonly string[]).includes(firstArg)) {
    return {
      command: firstArg as Command,
    };
  }

  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
      version: {
        type: 'boolean',
        short: 'v',
      },
    },
    allowPositionals: true,
    strict: false, // Allow unknown options to be passed to sub-commands
  });

  if (values.version) {
    return {
      version: true,
    };
  }

  if (values.help || positionals.length === 0) {
    return {
      help: true,
    };
  }

  const command = positionals[0];
  // Check if command is a known command
  if (command && (KNOWN_COMMANDS as readonly string[]).includes(command)) {
    return {
      command: command as Command,
    };
  }

  return {
    command: null,
  };
};

const extractSymbolCommandArgs = (
  arg: string,
  nValue: string | undefined,
  command: Command,
): { filePath: string; keyword: string; n?: number } => {
  const hashIndex = arg.lastIndexOf('#');

  if (hashIndex === -1) {
    throw new ArgsError(
      'Invalid argument format. Expected: path/to/file.ts#symbol',
      command,
    );
  }

  const filePath = arg.substring(0, hashIndex);
  const keyword = arg.substring(hashIndex + 1);

  if (!filePath || !keyword) {
    throw new ArgsError(
      'Invalid argument format. Expected: path/to/file.ts#symbol',
      command,
    );
  }

  const n = nValue !== undefined ? parseInt(nValue, 10) : undefined;

  if (n !== undefined && (isNaN(n) || n < 0)) {
    throw new ArgsError(
      'Invalid value for -n option. Expected a non-negative integer.',
      command,
    );
  }

  return { filePath, keyword, n };
};

/**
 * Parses arguments for symbol-based commands (find-references, get-definition, get-type-definition).
 */
const parseSymbolCommandArgs = (
  argv: string[],
  command: Command,
): SymbolCommandArgs => {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
      tsconfig: {
        type: 'string',
      },
      n: {
        type: 'string',
        short: 'n',
      },
      strict: {
        type: 'boolean',
      },
    },
    allowPositionals: true,
  });

  if (values.help) {
    return { help: true };
  }

  if (positionals.length === 0) {
    throw new ArgsError('Missing required argument <file#symbol>', command);
  }

  const { filePath, keyword, n } = extractSymbolCommandArgs(
    positionals[0]!,
    values.n,
    command,
  );

  return {
    filePath,
    keyword,
    tsconfig: values.tsconfig,
    n,
    strict: values.strict ?? false,
  };
};

const parseRenameFileArgs = (argv: string[]): RenameFileArgs => {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
      tsconfig: {
        type: 'string',
      },
      strict: {
        type: 'boolean',
      },
    },
    allowPositionals: true,
  });

  if (values.help) {
    return {
      help: true,
    };
  }

  if (positionals.length < 2) {
    throw new ArgsError(
      'Missing required arguments <file> <newFile>',
      COMMAND.RENAME_FILE,
    );
  }

  const filePath = positionals[0]!;
  const newFilePath = positionals[1]!;

  if (!filePath) {
    throw new ArgsError(
      'Missing required argument <file>',
      COMMAND.RENAME_FILE,
    );
  }

  if (!newFilePath) {
    throw new ArgsError(
      'Missing required argument <newFile>',
      COMMAND.RENAME_FILE,
    );
  }

  return {
    filePath,
    newFilePath,
    tsconfig: values.tsconfig,
    strict: values.strict ?? false,
  };
};

const parseRenameSymbolArgs = (argv: string[]): RenameSymbolArgs => {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
      tsconfig: {
        type: 'string',
      },
      n: {
        type: 'string',
        short: 'n',
      },
      strict: {
        type: 'boolean',
      },
    },
    allowPositionals: true,
  });

  if (values.help) {
    return { help: true };
  }

  if (positionals.length < 2) {
    throw new ArgsError(
      'Missing required arguments <file#symbol> <newName>',
      COMMAND.RENAME_SYMBOL,
    );
  }

  const newName = positionals[1]!;

  if (!newName) {
    throw new ArgsError(
      'Missing required argument <newName>',
      COMMAND.RENAME_SYMBOL,
    );
  }

  const { filePath, keyword, n } = extractSymbolCommandArgs(
    positionals[0]!,
    values.n,
    COMMAND.RENAME_SYMBOL,
  );

  return {
    filePath,
    keyword,
    newName,
    tsconfig: values.tsconfig,
    n,
    strict: values.strict ?? false,
  };
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
        | typeof COMMAND.GET_TYPE_DEFINITION
        | typeof COMMAND.QUICK_INFO;
      help: false;
      filePath: string;
      keyword: string;
      tsconfig?: string;
      n: number;
      strict: boolean;
    }
  | {
      type: 'symbol';
      command: typeof COMMAND.RENAME_SYMBOL;
      help: false;
      filePath: string;
      keyword: string;
      tsconfig?: string;
      n: number;
      newName: string;
      strict: boolean;
    }
  | {
      type: 'file';
      command: typeof COMMAND.RENAME_FILE;
      help: false;
      filePath: string;
      newFilePath: string;
      tsconfig?: string;
      strict: boolean;
    };

export const parseSubcommandArgs = (
  command: Command,
  commandArgs: string[],
): Args => {
  switch (command) {
    case COMMAND.FIND_REFERENCES:
    case COMMAND.GET_DEFINITION:
    case COMMAND.GET_TYPE_DEFINITION:
    case COMMAND.QUICK_INFO: {
      const args = parseSymbolCommandArgs(commandArgs, command);
      if ('help' in args) {
        return { help: true, command };
      }
      return {
        type: 'symbol',
        help: false,
        command,
        filePath: args.filePath,
        keyword: args.keyword,
        tsconfig: args.tsconfig,
        n: args.n || 0,
        strict: args.strict,
      };
    }
    case COMMAND.RENAME_SYMBOL: {
      const args = parseRenameSymbolArgs(commandArgs);
      if ('help' in args) {
        return { help: true, command };
      }
      return {
        type: 'symbol',
        help: false,
        command,
        filePath: args.filePath,
        keyword: args.keyword,
        tsconfig: args.tsconfig,
        n: args.n || 0,
        newName: args.newName,
        strict: args.strict,
      };
    }
    case COMMAND.RENAME_FILE: {
      const args = parseRenameFileArgs(commandArgs);
      if ('help' in args) {
        return { help: true, command };
      }
      return {
        type: 'file',
        help: false,
        command,
        filePath: args.filePath,
        newFilePath: args.newFilePath,
        tsconfig: args.tsconfig,
        strict: args.strict,
      };
    }
    default: {
      throw new Error(`Unknown command: ${command satisfies never}`);
    }
  }
};

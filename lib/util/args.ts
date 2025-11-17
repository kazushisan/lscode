import { parseArgs } from 'node:util';

const KNOWN_COMMANDS = ['find-references'] as const;

export type Command = (typeof KNOWN_COMMANDS)[number];

export type MainArgs =
  | {
      help: true;
    }
  | {
      help: false;
      command: Command | null;
    };

export type FindReferencesArgs =
  | {
      help: true;
    }
  | {
      help: false;
      filePath: string;
      keyword: string;
      tsconfig?: string;
    };

export class ArgsError extends Error {
  constructor(
    message: string,
    public command: Command,
  ) {
    super(message);
    this.name = 'ArgsError';
  }
}

export const parseMainArgs = (argv: string[]): MainArgs => {
  // If first argument is a known command, let the sub-command parser handle it
  const firstArg = argv[0];
  if (firstArg && (KNOWN_COMMANDS as readonly string[]).includes(firstArg)) {
    return {
      command: firstArg as Command,
      help: false,
    };
  }

  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
    allowPositionals: true,
    strict: false, // Allow unknown options to be passed to sub-commands
  });

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
      help: false,
    };
  }

  return {
    command: null,
    help: false,
  };
};

export const parseFindReferencesArgs = (argv: string[]): FindReferencesArgs => {
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
    },
    allowPositionals: true,
  });

  if (values.help) {
    return {
      help: true,
    };
  }

  if (positionals.length === 0) {
    throw new ArgsError(
      'Missing required argument <file#keyword>',
      'find-references',
    );
  }

  const arg = positionals[0]!;
  const hashIndex = arg.lastIndexOf('#');

  if (hashIndex === -1) {
    throw new ArgsError(
      'Invalid argument format. Expected: path/to/file.ts#keyword',
      'find-references',
    );
  }

  const filePath = arg.substring(0, hashIndex);
  const keyword = arg.substring(hashIndex + 1);

  if (!filePath || !keyword) {
    throw new ArgsError(
      'Invalid argument format. Expected: path/to/file.ts#keyword',
      'find-references',
    );
  }

  return {
    filePath,
    keyword,
    tsconfig: values.tsconfig,
    help: false,
  };
};

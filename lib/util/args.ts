import { parseArgs } from 'node:util';

const KNOWN_COMMANDS = ['find-references', 'get-definition'] as const;

type Command = (typeof KNOWN_COMMANDS)[number];

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

type FindReferencesArgs =
  | {
      help: true;
    }
  | {
      filePath: string;
      symbol: string;
      tsconfig?: string;
      n?: number;
    };

type GetDefinitionArgs =
  | {
      help: true;
    }
  | {
      filePath: string;
      symbol: string;
      tsconfig?: string;
      n?: number;
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
      n: {
        type: 'string',
        short: 'n',
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
      'Missing required argument <file#symbol>',
      'find-references',
    );
  }

  const arg = positionals[0]!;
  const hashIndex = arg.lastIndexOf('#');

  if (hashIndex === -1) {
    throw new ArgsError(
      'Invalid argument format. Expected: path/to/file.ts#symbol',
      'find-references',
    );
  }

  const filePath = arg.substring(0, hashIndex);
  const symbol = arg.substring(hashIndex + 1);

  if (!filePath || !symbol) {
    throw new ArgsError(
      'Invalid argument format. Expected: path/to/file.ts#symbol',
      'find-references',
    );
  }

  const n = values.n !== undefined ? parseInt(values.n, 10) : undefined;

  if (n !== undefined && (isNaN(n) || n < 0)) {
    throw new ArgsError(
      'Invalid value for -n option. Expected a non-negative integer.',
      'find-references',
    );
  }

  return {
    filePath,
    symbol,
    tsconfig: values.tsconfig,
    n,
  };
};

export const parseGetDefinitionArgs = (argv: string[]): GetDefinitionArgs => {
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
      'Missing required argument <file#symbol>',
      'get-definition',
    );
  }

  const arg = positionals[0]!;
  const hashIndex = arg.lastIndexOf('#');

  if (hashIndex === -1) {
    throw new ArgsError(
      'Invalid argument format. Expected: path/to/file.ts#symbol',
      'get-definition',
    );
  }

  const filePath = arg.substring(0, hashIndex);
  const symbol = arg.substring(hashIndex + 1);

  if (!filePath || !symbol) {
    throw new ArgsError(
      'Invalid argument format. Expected: path/to/file.ts#symbol',
      'get-definition',
    );
  }

  const n = values.n !== undefined ? parseInt(values.n, 10) : undefined;

  if (n !== undefined && (isNaN(n) || n < 0)) {
    throw new ArgsError(
      'Invalid value for -n option. Expected a non-negative integer.',
      'get-definition',
    );
  }

  return {
    filePath,
    symbol,
    tsconfig: values.tsconfig,
    n,
  };
};

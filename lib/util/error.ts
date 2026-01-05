import type { Command } from './command.js';

export class ArgsError extends Error {
  constructor(
    message: string,
    public command: Command,
  ) {
    super(message);
    this.name = 'ArgsError';
  }
}

export const COMMAND_ERROR_TYPE = {
  TSCONFIG_NOT_FOUND: 'TSCONFIG_NOT_FOUND',
  FILE_NOT_IN_PROJECT: 'FILE_NOT_IN_PROJECT',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  SYMBOL_NOT_FOUND: 'SYMBOL_NOT_FOUND',
  SYMBOL_INDEX_OUT_OF_RANGE: 'SYMBOL_INDEX_OUT_OF_RANGE',
  RENAME_NOT_ALLOWED: 'RENAME_NOT_ALLOWED',
} as const;

type CommandErrorType =
  (typeof COMMAND_ERROR_TYPE)[keyof typeof COMMAND_ERROR_TYPE];

export class CommandError extends Error {
  type: CommandErrorType;

  constructor(message: string, type: CommandErrorType) {
    super(message);
    this.name = 'CommandError';
    this.type = type;
  }
}

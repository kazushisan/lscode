export const COMMAND = {
  FIND_REFERENCES: 'find-references',
  GET_DEFINITION: 'get-definition',
  GET_TYPE_DEFINITION: 'get-type-definition',
  RENAME_SYMBOL: 'rename-symbol',
  RENAME_FILE: 'rename-file',
} as const;

export type Command = (typeof COMMAND)[keyof typeof COMMAND];

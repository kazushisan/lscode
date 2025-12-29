export const MAIN_HELP = `
lscode - TypeScript's LanguageService for AI coding agents

Usage: lscode <command> [options]

Commands:
  find-references <file#symbol>           Find all references to a symbol in a file
  get-definition <file#symbol>            Get the definition of a symbol in a file
  get-type-definition <file#symbol>       Get the type definition of a symbol in a file
  rename-symbol <file#symbol> <newName>   Rename a symbol across all files
  rename-file <file> <newFile>            Rename a file and update all imports

Options:
  --help, -h                      Show help
  --version, -v                   Show version

Run 'lscode <command> --help' for more information on a command.
`.trim();

export const FIND_REFERENCES_HELP = `
lscode find-references - Find all references to a symbol in a file

Usage: lscode find-references <file#symbol> [options]

Arguments:
  <file#symbol>                  File path and symbol in format: path/to/file.ts#symbol

Options:
  -n <number>                     Index of the symbol to use (default: 0)
  --tsconfig <path>               Path to tsconfig.json file
  --help, -h                      Show help

Examples:
  lscode find-references src/main.ts#myFunction
  lscode find-references src/main.ts#myFunction --tsconfig ./tsconfig.json
  lscode find-references src/main.ts#myFunction -n 1
`.trim();

export const GET_DEFINITION_HELP = `
lscode get-definition - Get the definition of a symbol in a file

Usage: lscode get-definition <file#symbol> [options]

Arguments:
  <file#symbol>                  File path and symbol in format: path/to/file.ts#symbol

Options:
  -n <number>                     Index of the symbol to use (default: 0)
  --tsconfig <path>               Path to tsconfig.json file
  --help, -h                      Show help

Examples:
  lscode get-definition src/main.ts#myFunction
  lscode get-definition src/main.ts#myFunction --tsconfig ./tsconfig.json
  lscode get-definition src/main.ts#myFunction -n 1
`.trim();

export const GET_TYPE_DEFINITION_HELP = `
lscode get-type-definition - Get the type definition of a symbol in a file

Usage: lscode get-type-definition <file#symbol> [options]

Arguments:
  <file#symbol>                  File path and symbol in format: path/to/file.ts#symbol

Options:
  -n <number>                     Index of the symbol to use (default: 0)
  --tsconfig <path>               Path to tsconfig.json file
  --help, -h                      Show help

Examples:
  lscode get-type-definition src/main.ts#myVariable
  lscode get-type-definition src/main.ts#myVariable --tsconfig ./tsconfig.json
  lscode get-type-definition src/main.ts#myVariable -n 1
`.trim();

export const RENAME_SYMBOL_HELP = `
lscode rename-symbol - Rename a symbol across all files

Usage: lscode rename-symbol <file#symbol> <newName> [options]

Arguments:
  <file#symbol>                  File path and symbol in format: path/to/file.ts#symbol
  <newName>                      New name for the symbol

Options:
  -n <number>                     Index of the symbol to use (default: 0)
  --tsconfig <path>               Path to tsconfig.json file
  --help, -h                      Show help

Examples:
  lscode rename-symbol src/main.ts#myFunction newFunctionName
  lscode rename-symbol src/main.ts#myFunction newFunctionName --tsconfig ./tsconfig.json
  lscode rename-symbol src/main.ts#myFunction newFunctionName -n 1
`.trim();

export const RENAME_FILE_HELP = `
lscode rename-file - Rename a file and update all imports

Usage: lscode rename-file <file> <newFile> [options]

Arguments:
  <file>                         Path to the file to rename
  <newFile>                      New path for the file

Options:
  --tsconfig <path>               Path to tsconfig.json file
  --help, -h                      Show help

Examples:
  lscode rename-file src/utils.ts src/helpers.ts
  lscode rename-file src/utils.ts src/helpers.ts --tsconfig ./tsconfig.json
`.trim();

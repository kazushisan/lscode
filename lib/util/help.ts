export const MAIN_HELP = `
lscode - TypeScript's LanguageService for AI coding agents

Usage: lscode <command> [options]

Commands:
  find-references <file#symbol>  Find all references to a symbol in a file

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

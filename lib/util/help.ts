export const MAIN_HELP = `
lscode - TypeScript's LanguageService for AI coding agents

Usage: lscode <command> [options]

Commands:
  find-references <file#keyword>  Find all references to a keyword in a file

Options:
  --help, -h                      Show help
  --version, -v                   Show version

Run 'lscode <command> --help' for more information on a command.
`.trim();

export const FIND_REFERENCES_HELP = `
lscode find-references - Find all references to a keyword in a file

Usage: lscode find-references <file#keyword> [options]

Arguments:
  <file#keyword>                  File path and keyword in format: path/to/file.ts#keyword

Options:
  --tsconfig <path>               Path to tsconfig.json file
  --help, -h                      Show help

Examples:
  lscode find-references src/main.ts#myFunction
  lscode find-references src/main.ts#myFunction --tsconfig ./tsconfig.json
`.trim();

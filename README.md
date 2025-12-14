# lscode

> TypeScript's LanguageService for AI Coding Agents

## Why lscode?

- 🎯 **Deterministic and Precise**: lscode operates on TypeScript’s semantic model rather than raw text, enabling accurate analysis and edits with predictable results—making it a reliable foundation for AI coding agents.
- 🤖 **Designed for AI-Driven Workflows**: lscode provides an agent-friendly CLI with symbol-based addressing (`path/to/file.ts#symbol`), so AIs don't have to manage line numbers or character offsets.
- 🏗️ **Built for TypeScript**: lscode is built on lower-level TypeScript LanguageService APIs. Definition lookups return complete, semantically scoped code blocks—not just cursor positions—reducing unnecessary AI calls while enabling richer, context-aware operations.

## Install

```bash
npm install lscode
```

## Usage

```
lscode - TypeScript's LanguageService for AI coding agents

Usage: lscode <command> [options]

Commands:
  find-references <file#symbol>  Find all references to a symbol in a file
  get-definition <file#symbol>   Get the definition of a symbol in a file

Options:
  --help, -h                      Show help
  --version, -v                   Show version

Run 'lscode <command> --help' for more information on a command.
```

## Author

Kazushi Konosu (https://github.com/kazushisan)

## License

MIT License

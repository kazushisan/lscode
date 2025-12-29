# lscode

<a href="https://badge.fury.io/js/lscode"><img alt="npm version" src="https://badge.fury.io/js/lscode.svg" /></a>
<a href="https://github.com/kazushisan/lscode/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/kazushisan/lscode/actions/workflows/ci.yml/badge.svg?branch=main" /></a>

> TypeScript's LanguageService for AI Coding Agents

lscode brings the power of TypeScript language tools to AI-driven development workflows. lscode is a command-line tool tailored for AI coding agents that leverages TypeScript semantics to provide precise code analysis and manipulation features.

## Why `lscode`?

### 🎯 Deterministic and Precise

lscode operates on TypeScript’s semantic model rather than raw text, enabling accurate analysis and edits with predictable results—making it a reliable foundation for AI coding agents.

### 🤖 Designed for AI-Driven Workflows

lscode provides an agent-friendly CLI with symbol-based addressing (`path/to/file.ts#symbol`), so AIs don't have to manage line numbers or character offsets.

### 🏗️ Built for TypeScript

lscode is built on lower-level TypeScript LanguageService APIs. Definition lookups return complete, semantically scoped code blocks—not just cursor positions—reducing unnecessary AI calls while enabling richer, context-aware operations.

## Quick Start

1. Install lscode.

```bash
npm install -g lscode
```

2. Navigate to your TypeScript project.

```bash
cd /path/to/your/project
```

3. Try out lscode with your favorite AI coding agent!

```
Use lscode available in PATH to find references of myFunction in @/src/path/to/file.ts
```

## Usage

```
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
```

## Author

Kazushi Konosu (https://github.com/kazushisan)

## License

MIT License

#!/usr/bin/env node

import { scaffoldProject } from './index.js';

function printHelp() {
  console.log(`
create-dallinking-game

Usage:
  create-dallinking-game <project-directory>

Options:
  -h, --help    Show this help message
`);
}

const args = process.argv.slice(2);
const [projectPath] = args;

if (!projectPath || args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(projectPath ? 0 : 1);
}

try {
  scaffoldProject(projectPath);
} catch (error) {
  console.error('\n❌ Failed to scaffold project:', error);
  process.exit(1);
}

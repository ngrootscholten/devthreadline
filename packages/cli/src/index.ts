#!/usr/bin/env node

// Load .env.local from project root before anything else
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

import { Command } from 'commander';
import { checkCommand } from './commands/check';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('threadlines')
  .description('AI-powered linter based on your natural language documentation')
  .version('0.1.0');

program
  .command('init')
  .description('Create a template threadline file to get started')
  .action(initCommand);

program
  .command('check')
  .description('Check code against your threadlines')
  .option('--api-url <url>', 'Threadline server URL', process.env.THREADLINE_API_URL || 'http://localhost:3000')
  .option('--full', 'Show all results (compliant, attention, not_relevant). Default: only attention items')
  .option('--branch <name>', 'Review all commits in branch vs base')
  .option('--commit <sha>', 'Review specific commit')
  .option('--file <path>', 'Review entire file (all lines as additions)')
  .option('--folder <path>', 'Review all files in folder recursively')
  .option('--files <paths...>', 'Review multiple specified files')
  .action(checkCommand);

program.parse();


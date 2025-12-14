#!/usr/bin/env node

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
  .option('--api-key <key>', 'OpenAI API key', process.env.OPENAI_API_KEY)
  .action(checkCommand);

program.parse();


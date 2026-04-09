#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cwd } from 'process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, '../src/app.jsx');
const proc = spawn('npx', ['tsx', appPath], { stdio: 'inherit', shell: true, cwd: __dirname });
proc.on('exit', (code) => process.exit(code ?? 0));

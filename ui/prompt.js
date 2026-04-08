import readline from 'readline';
import chalk from 'chalk';

const amber = chalk.hex('#cc8b3c');

export function startPrompt(onCommand) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const ask = () => {
    rl.question(amber('friday > '), (input) => {
      const trimmed = input.trim();
      if (trimmed) {
        onCommand(trimmed);
      }
      ask();
    });
  };

  rl.on('SIGINT', () => {
    console.log(chalk.dim('\n  see you tomorrow. goodbye.\n'));
    process.exit(0);
  });

  ask();
}

import chalk from 'chalk';

export class Logger {
  private isVerbose: boolean;

  constructor(verbose: boolean = false) {
    this.isVerbose = verbose;
  }

  info(message: string) {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string) {
    console.log(chalk.green('✓'), message);
  }

  warn(message: string) {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string) {
    console.log(chalk.red('✗'), message);
  }

  verbose(message: string) {
    if (this.isVerbose) {
      console.log(chalk.gray('🔍'), chalk.gray(message));
    }
  }

  debug(data: any) {
    if (this.isVerbose) {
      console.log(chalk.gray('🐛 Debug:'), data);
    }
  }
}

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

  // Helper for formatted error messages with proper spacing
  errorWithDetails(title: string, message?: string, suggestions: string[] = []) {
    this.error(title);

    if (message) {
      console.log(chalk.gray(message));
    }

    if (suggestions.length > 0) {
      console.log(); // Single newline before suggestions
      suggestions.forEach((suggestion) => {
        console.log(chalk.gray(suggestion));
      });
    }
  }

  // Helper for stack traces in verbose mode
  stackTrace(error: Error) {
    if (this.isVerbose) {
      console.log(); // Single newline before stack trace
      console.log(chalk.red('Stack trace:'));
      console.log(chalk.gray(error.stack));
    }
  }
}

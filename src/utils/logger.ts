import chalk from 'chalk';
import picocolors from 'picocolors';
import { intro, outro, log } from '@clack/prompts';

export class Logger {
  private isVerbose: boolean;

  constructor(verbose: boolean = false) {
    this.isVerbose = verbose;
  }

  // Enhanced intro for CLI sessions
  intro(title: string) {
    intro(picocolors.bgCyan(picocolors.black(` ${title} `)));
  }

  // Enhanced outro for CLI sessions
  outro(message: string) {
    outro(message);
  }

  info(message: string, indent: number = 0) {
    const indentation = '  '.repeat(indent);
    console.log(indentation + picocolors.blue('ℹ'), message);
  }

  success(message: string, indent: number = 0) {
    const indentation = '  '.repeat(indent);
    console.log(indentation + picocolors.green('✓'), message);
  }

  warn(message: string, indent: number = 0) {
    const indentation = '  '.repeat(indent);
    console.log(indentation + picocolors.yellow('⚠'), message);
  }

  error(message: string, indent: number = 0) {
    const indentation = '  '.repeat(indent);
    console.log(indentation + picocolors.red('✗'), message);
  }

  verbose(message: string, indent: number = 0) {
    if (this.isVerbose) {
      const indentation = '  '.repeat(indent);
      console.log(indentation + picocolors.dim(`🔍 ${message}`));
    }
  }

  debug(data: any, indent: number = 0) {
    if (this.isVerbose) {
      const indentation = '  '.repeat(indent);
      console.log(indentation + picocolors.dim('🐛 Debug:'), data);
    }
  }

  // Enhanced box display for important information
  box(title: string, content: string) {
    console.log();
    console.log(picocolors.bold(picocolors.bgBlue(picocolors.white(` ${title} `))));
    console.log(picocolors.dim('┌' + '─'.repeat(content.length + 2) + '┐'));
    console.log(picocolors.dim('│ ') + content + picocolors.dim(' │'));
    console.log(picocolors.dim('└' + '─'.repeat(content.length + 2) + '┘'));
    console.log();
  }

  // Display a step in the process
  step(message: string, step: number, total: number) {
    const stepInfo = picocolors.dim(`[${step}/${total}]`);
    console.log(picocolors.cyan('→'), stepInfo, message);
  }

  // Helper for formatted error messages with proper spacing
  errorWithDetails(title: string, message?: string, suggestions: string[] = []) {
    this.error(title);

    if (message) {
      console.log(picocolors.dim(message));
    }

    if (suggestions.length > 0) {
      console.log(); // Single newline before suggestions
      suggestions.forEach((suggestion) => {
        console.log(picocolors.dim(`  ${suggestion}`));
      });
    }
  }

  // Helper for stack traces in verbose mode
  stackTrace(error: Error) {
    if (this.isVerbose) {
      console.log(); // Single newline before stack trace
      console.log(picocolors.red('Stack trace:'));
      console.log(picocolors.dim(error.stack || 'No stack trace available'));
    }
  }

  // Display a summary table of results
  summary(title: string, items: Array<{ label: string; value: string | number; status?: 'success' | 'error' | 'warn' }>) {
    console.log();
    console.log(picocolors.bold(title));
    console.log(picocolors.dim('─'.repeat(title.length)));

    items.forEach((item) => {
      const statusIcon =
        item.status === 'success'
          ? picocolors.green('✓')
          : item.status === 'error'
            ? picocolors.red('✗')
            : item.status === 'warn'
              ? picocolors.yellow('⚠')
              : picocolors.blue('ℹ');

      console.log(`${statusIcon} ${item.label}: ${picocolors.cyan(item.value)}`);
    });
    console.log();
  }
}

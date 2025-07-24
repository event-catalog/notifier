import { Notification, NotifierConfig, Stage, CLIOptions } from '../types';

export class Event {
  public changedFiles: string[];
  public catalogPath: string;
  public commitRange: string;
  public options: CLIOptions;

  constructor({
    catalogPath,
    changedFiles,
    commitRange,
    options,
  }: {
    catalogPath: string;
    changedFiles: string[];
    commitRange?: string;
    options: CLIOptions;
  }) {
    this.catalogPath = catalogPath;
    this.changedFiles = changedFiles;
    this.commitRange = commitRange || 'HEAD~1..HEAD';
    this.options = options;
  }

  async process(): Promise<Notification[]> {
    return [];
  }

  static getSlackMessage(config: NotifierConfig, notification: Notification, stage: Stage, actionUrl: string): any {
    throw new Error('Not implemented');
  }
}

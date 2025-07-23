import { Notification, NotifierConfig, Stage } from '../types';

export class Event {
  public changedFiles: string[];
  public catalogPath: string;
  public commitRange: string;

  constructor({ catalogPath, changedFiles, commitRange }: { catalogPath: string; changedFiles: string[]; commitRange?: string }) {
    this.catalogPath = catalogPath;
    this.changedFiles = changedFiles;
    this.commitRange = commitRange || 'HEAD~1..HEAD';
  }

  async process(): Promise<Notification[]> {
    return [];
  }

  static getSlackMessage(config: NotifierConfig, notification: Notification, stage: Stage): any {
    throw new Error('Not implemented');
  }
}

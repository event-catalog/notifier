import axios from 'axios';
import chalk from 'chalk';
import { NotifierConfig, Notification, Stage } from './types';
import { ConsumerAddedEvent } from './notifications/ConsumerAddedEvent';

export async function sendNotifications(
  config: NotifierConfig,
  notifications: Notification[],
  dryRun: boolean = false,
  lifecycle: Stage
): Promise<void> {
  for (const notification of notifications) {
    for (const ownerName in config.owners) {
      const owner = config.owners[ownerName];

      if (owner.events.includes(notification.id)) {
        for (const channel of owner.channels) {
          if (channel.type === 'slack') {
            await sendSlackNotification(config, notification, channel, dryRun, lifecycle);
          }
        }
      }
    }
  }
}

async function sendSlackNotification(
  config: NotifierConfig,
  notification: Notification,
  channel: { type: string; webhook: string; headers?: { [key: string]: string } },
  dryRun: boolean = false,
  lifecycle: Stage
): Promise<void> {
  let message = null;

  switch (notification.id) {
    case 'consumer-added':
      message = ConsumerAddedEvent.getSlackMessage(config, notification, lifecycle);
      break;
    default:
      message = null;
  }

  if (!message) {
    console.log(chalk.red('✗'), `No message found for notification ${notification.id}`);
    return;
  }

  const headers = channel.headers || {};

  if (dryRun) {
    console.log(chalk.yellow(`[DRY RUN]`), `Would send notification to ${chalk.cyan(channel.webhook)}:`);
    console.log(chalk.gray(JSON.stringify(message, null, 2)));
    if (Object.keys(headers).length > 0) {
      console.log(chalk.yellow(`[DRY RUN]`), `Headers:`, chalk.gray(JSON.stringify(headers, null, 2)));
    }
  } else {
    try {
      await axios.post(channel.webhook, message, { headers });
      console.log(chalk.green('✓'), `Notification sent successfully to ${chalk.cyan(channel.webhook)}`);
    } catch (error) {
      console.log(chalk.red('✗'), `Failed to send notification to ${chalk.cyan(channel.webhook)}:`, error);
      throw error;
    }
  }
}

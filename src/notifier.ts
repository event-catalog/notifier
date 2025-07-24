import axios from 'axios';
import chalk from 'chalk';
import { NotifierConfig, Notification, Stage } from './types';
import { ConsumerAddedEvent } from './notifications/ConsumerAddedEvent';
import { ConsumerRemovedEvent } from './notifications/ConsumerRemovedEvent';
import { Logger } from './utils/logger';
import { SubscribedSchemaChangedEvent } from './notifications/SubscribedSchemaChangedEvent';

const logger = new Logger();

export async function sendNotifications(
  config: NotifierConfig,
  notifications: Notification[],
  options: {
    dryRun: boolean;
    lifecycle: Stage;
    actionUrl: string;
  }
): Promise<void> {
  for (const notification of notifications) {
    for (const configuredOwnerName in config.owners) {
      const ownersConfiguration = config.owners[configuredOwnerName];
      const ownersSubscribedEvents = ownersConfiguration.events;

      // Check if owner is configured for this event type AND actually owns the resource
      if (
        ownersSubscribedEvents.includes(notification.id)
        // notification.resource.owners.some((resourceOwner) => resourceOwner.id === configuredOwnerName)
      ) {
        for (const channel of ownersConfiguration.channels) {
          if (channel.type === 'slack') {
            logger.info(`Sending slack notification to ${channel.webhook}`);
            logger.verbose(`Notification: ${JSON.stringify(notification, null, 2)}`);
            await sendSlackNotification(config, notification, channel, options);
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
  options: {
    dryRun: boolean;
    lifecycle: Stage;
    actionUrl: string;
  }
): Promise<void> {
  let message = null;

  switch (notification.id) {
    case 'consumer-added':
      message = ConsumerAddedEvent.getSlackMessage(config, notification, options.lifecycle, options.actionUrl);
      break;
    case 'consumer-removed':
      message = ConsumerRemovedEvent.getSlackMessage(config, notification, options.lifecycle, options.actionUrl);
      break;
    case 'subscribed-schema-changed':
      message = SubscribedSchemaChangedEvent.getSlackMessage(config, notification, options.lifecycle, options.actionUrl);
      break;
    default:
      message = null;
  }

  if (!message) {
    console.log(chalk.red('✗'), `No message found for notification ${notification.id}`);
    return;
  }

  const headers = channel.headers || {};

  if (options.dryRun) {
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

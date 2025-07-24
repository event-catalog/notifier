#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { CLIOptions } from './types';

import { getChangedFiles, GitError } from './utils/git';
import { loadConfig } from './config';
import { Logger } from './utils/logger';

// Events
import { ConsumerAddedEvent } from './notifications/ConsumerAddedEvent';
import { ConsumerRemovedEvent } from './notifications/ConsumerRemovedEvent';
import { SubscribedSchemaChangedEvent } from './notifications/SubscribedSchemaChangedEvent';

import { filterNotifications } from './filter';
import { processEvents } from './processor';
import { sendNotifications } from './notifier';

const program = new Command();

program
  .name('eventcatalog-notifier')
  .description('Detect EventCatalog consumer changes and send Slack notifications')
  .version('1.0.0');

program
  .command('detect')
  .description('Detect changes in the catalog and send notifications')
  .option('--dry-run', 'Preview changes without sending notifications')
  .option('--config <path>', 'Path to configuration file', './eventcatalog.notifier.yml')
  .option('--catalog <path>', 'Path to EventCatalog directory', './')
  .option('--commit-range <range>', 'Git commit range for comparison (e.g., HEAD~1..HEAD)')
  .option('--verbose', 'Enable verbose logging for debugging')
  .option('--lifecycle <lifecycle>', 'Lifecycle stage: draft (e.g. PR) or active (e.g. merged)', 'active')
  .option('--action-url <url>', 'Optional URL used for notification actions')
  .action(async (options: CLIOptions) => {
    const logger = new Logger(options.verbose);

    try {
      logger.verbose('Starting EventCatalog Notifier...');
      logger.verbose(`Options: ${JSON.stringify(options, null, 2)}`);

      const catalogPath = path.resolve(options.catalog);
      logger.verbose(`Resolved catalog path: ${catalogPath}`);

      // Check the directory actually exists
      if (!fs.existsSync(catalogPath)) {
        logger.error(`EventCatalog directory does not exist: ${catalogPath}`);
        process.exit(1);
      }

      if (!fs.existsSync(path.join(catalogPath, 'eventcatalog.config.js'))) {
        logger.error(`EventCatalog configuration file not found: ${path.join(catalogPath, 'eventcatalog.config.js')}`);
        logger.warn("Make sure you're pointing to a valid EventCatalog directory");
        process.exit(1);
      }

      logger.verbose('Loading notifier configuration...');
      const projectNotifierConfig = loadConfig(path.join(catalogPath, options.config));
      logger.verbose(`Configuration loaded`);

      const commitRange = options.commitRange || 'HEAD~1..HEAD';
      logger.info(`Analyzing changes in commit range: ${chalk.cyan(commitRange)}`);

      // Get all the changed files
      logger.verbose('Getting changed files from Git...');
      const changedFiles = getChangedFiles(catalogPath, commitRange);
      logger.verbose(`Found ${changedFiles.length} changed files`);

      if (changedFiles.length === 0) {
        logger.info('No files changed in the specified commit range');
        logger.success('Nothing to process');
        return;
      }

      logger.info(`Processing ${changedFiles.length} changed file(s)...`);
      logger.verbose(`Changed files: ${JSON.stringify(changedFiles, null, 2)}`);

      // Add new events here, if you want to process them
      const configuredEvents = [
        new ConsumerAddedEvent({ catalogPath, changedFiles, commitRange, options }),
        new ConsumerRemovedEvent({ catalogPath, changedFiles, commitRange, options }),
        new SubscribedSchemaChangedEvent({ catalogPath, changedFiles, commitRange, options }),
      ];

      // Here we process ALL notifications we can
      const notifications = await processEvents(configuredEvents);

      logger.verbose(`Generated ${notifications.length} raw notifications`);

      // Log the notifications
      logger.verbose(`Notifications: ${JSON.stringify(notifications, null, 2)}`);

      // Filter out the notifications only send ones that the user is interested in
      const filteredEvents = filterNotifications(projectNotifierConfig, notifications);
      logger.info(`Found ${filteredEvents.length} notification(s) to send after filtering`);

      // Log the filtered events
      logger.verbose(`Filtered events: ${JSON.stringify(filteredEvents, null, 2)}`);

      if (filteredEvents.length === 0) {
        logger.info('No notifications match your configuration');
        logger.success('Nothing to send');
        return;
      }

      if (options.dryRun) {
        logger.warn('DRY RUN MODE - No notifications will be sent');
      }

      await sendNotifications(projectNotifierConfig, filteredEvents, {
        dryRun: options.dryRun ?? false,
        lifecycle: options.lifecycle,
        actionUrl: options.actionUrl,
      });

      const mode = options.dryRun ? 'previewed' : 'sent';
      logger.success(`Successfully ${mode} ${filteredEvents.length} notification(s)`);
    } catch (error) {
      if (error instanceof GitError) {
        // Handle Git errors with user-friendly messages
        logger.errorWithDetails(error.title, error.message, error.suggestions);
        process.exit(1);
      } else {
        // Handle other errors
        logger.error('An unexpected error occurred');
        logger.verbose(`Error details: ${error}`);

        if (error instanceof Error) {
          logger.stackTrace(error);
        }

        process.exit(1);
      }
    }
  });

program.parse();

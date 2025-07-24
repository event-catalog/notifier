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
      // Enhanced CLI intro
      logger.intro('EventCatalog Notifier');

      logger.verbose('Starting EventCatalog Notifier...');
      logger.verbose(`Options: ${JSON.stringify(options, null, 2)}`);

      const catalogPath = path.resolve(options.catalog);
      logger.verbose(`Resolved catalog path: ${catalogPath}`);

      // Validation
      logger.info('Validating EventCatalog directory...');

      // Check the directory actually exists
      if (!fs.existsSync(catalogPath)) {
        logger.error(`EventCatalog directory does not exist: ${catalogPath}`, 1);
        process.exit(1);
      }

      if (!fs.existsSync(path.join(catalogPath, 'eventcatalog.config.js'))) {
        logger.error(`EventCatalog configuration file not found`, 1);
        logger.warn("Make sure you're pointing to a valid EventCatalog directory", 1);
        process.exit(1);
      }

      logger.success('EventCatalog directory validated', 1);

      // Load configuration
      logger.step('Loading configuration', 1, 4);
      logger.verbose('Loading notifier configuration...', 1);
      const projectNotifierConfig = loadConfig(path.join(catalogPath, options.config));
      logger.success('Configuration loaded', 1);

      const commitRange = options.commitRange || 'HEAD~1..HEAD';
      logger.step(`Analyzing Git changes (${chalk.cyan(commitRange)})`, 2, 4);

      // Get all the changed files
      logger.info('Retrieving changed files from Git...', 1);
      const changedFiles = getChangedFiles(catalogPath, commitRange);
      logger.verbose(`Found ${changedFiles.length} changed files`, 2);

      if (changedFiles.length === 0) {
        logger.info('No files changed in the specified commit range', 1);
        logger.outro('Nothing to process');
        return;
      }

      logger.success(`Found ${changedFiles.length} changed file(s)`, 1);
      logger.verbose(`Changed files: ${JSON.stringify(changedFiles, null, 2)}`, 2);

      // Process events with progress
      logger.step('Processing events and generating notifications', 3, 4);
      logger.info('Processing event changes...', 1);

      // Add new events here, if you want to process them
      const configuredEvents = [
        new ConsumerAddedEvent({ catalogPath, changedFiles, commitRange, options }),
        new ConsumerRemovedEvent({ catalogPath, changedFiles, commitRange, options }),
        new SubscribedSchemaChangedEvent({ catalogPath, changedFiles, commitRange, options }),
      ];

      // Here we process ALL notifications we can
      const notifications = await processEvents(configuredEvents);
      logger.success(`Generated ${notifications.length} raw notifications`, 1);

      logger.verbose(`Generated ${notifications.length} raw notifications`, 2);
      logger.verbose(`Notifications: ${JSON.stringify(notifications, null, 2)}`, 2);

      // Filter notifications
      logger.info('Filtering notifications...', 1);
      const filteredEvents = filterNotifications(projectNotifierConfig, notifications);
      logger.success(`Found ${filteredEvents.length} notification(s) after filtering`, 1);

      // Log the filtered events
      logger.verbose(`Filtered events: ${JSON.stringify(filteredEvents, null, 2)}`, 2);

      if (filteredEvents.length === 0) {
        logger.info('No notifications match your configuration', 1);
        logger.outro('Nothing to send');
        return;
      }

      if (options.dryRun) {
        logger.box('Dry Run Mode', 'No notifications will be sent - this is a preview only');
      }

      // Send notifications
      logger.step('Sending notifications', 4, 4);
      logger.info(`${options.dryRun ? 'Previewing' : 'Sending'} notifications...`, 1);

      await sendNotifications(projectNotifierConfig, filteredEvents, {
        dryRun: options.dryRun ?? false,
        lifecycle: options.lifecycle,
        actionUrl: options.actionUrl,
      });

      const mode = options.dryRun ? 'previewed' : 'sent';
      logger.success(`Successfully ${mode} ${filteredEvents.length} notification(s)`, 1);

      // Summary
      logger.summary('Process Summary', [
        { label: 'Changed files', value: changedFiles.length, status: 'success' },
        { label: 'Raw notifications', value: notifications.length, status: 'success' },
        { label: 'Filtered notifications', value: filteredEvents.length, status: 'success' },
        { label: 'Action', value: mode, status: 'success' },
      ]);

      logger.outro(`✨ Process completed successfully!`);
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

        logger.outro('❌ Process failed');
        process.exit(1);
      }
    }
  });

program.parse();

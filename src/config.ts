import { readFileSync } from 'fs';
import { NotifierConfig } from './types';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

export function loadConfig(configPath?: string): NotifierConfig {
  const config: Partial<NotifierConfig> = {};

  if (configPath) {
    try {
      // Read the raw config file
      const configContent = readFileSync(configPath, 'utf-8');

      // Replace ${ENV_VAR} placeholders with actual environment variables
      const resolvedContent = configContent.replace(/\${([^}]+)}/g, (match, envVar) => {
        const value = process.env[envVar];
        if (!value) {
          console.log(chalk.yellow('⚠'), `Environment variable ${chalk.cyan(envVar)} is not set`);
          return match; // Keep the placeholder if env var not found
        }
        return value;
      });

      // Parse the resolved YAML
      const configFile = yaml.load(resolvedContent) as NotifierConfig;
      Object.assign(config, configFile);

      // Validate required config
      validateConfig(config);
    } catch (error) {
      console.log(chalk.red('✗'), `Failed to load config file: ${chalk.cyan(configPath)}`, error);
      process.exit(1);
    }
  }

  return config as NotifierConfig;
}

// Optional: Add validation
function validateConfig(config: Partial<NotifierConfig>): void {
  if (!config.version) {
    console.log(chalk.yellow('⚠'), 'No version specified in config, assuming 1.0.0');
    config.version = '1.0.0';
  }

  // Check if any webhooks are still placeholders
  if (config.owners) {
    Object.entries(config.owners).forEach(([ownerName, ownerConfig]) => {
      ownerConfig.channels?.forEach((channel, index) => {
        if (channel.webhook?.includes('${')) {
          console.log(
            chalk.red('✗'),
            `Owner ${chalk.cyan(ownerName)} channel ${chalk.cyan(index.toString())} has unresolved webhook placeholder: ${chalk.gray(channel.webhook)}`
          );
          console.log(chalk.red('✗'), 'Please set the required environment variables');
          process.exit(1);
        }
      });
    });
  }
}

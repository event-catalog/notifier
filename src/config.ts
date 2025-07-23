import { readFileSync } from 'fs';
import { NotifierConfig } from './types';
import yaml from 'js-yaml';

export function loadConfig(configPath?: string): NotifierConfig {
  const config: Partial<NotifierConfig> = {};

  if (configPath) {
    try {
      const configFile = yaml.load(readFileSync(configPath, 'utf-8'));
      Object.assign(config, configFile);
    } catch (error) {
      console.error(`Failed to load config file: ${configPath}`, error);
      process.exit(1);
    }
  }

  return config as NotifierConfig;
}

export interface CLIOptions {
  dryRun: boolean;
  lifecycle: Stage;
  actionUrl: string;
  config: string;
  catalog: string;
  commitRange: string;
  verbose: boolean;
}

export interface EventConsumer {
  id: string;
  version: string;
}

export interface ServiceMetadata {
  id: string;
  name: string;
  version: string;
  owners?: string[];
  consumes?: EventConsumer[];
}

export interface EventMetadata {
  id: string;
  name: string;
  version: string;
  owners?: string[];
}

export interface ConsumerChange {
  serviceId: string;
  serviceName: string;
  eventId: string;
  eventVersion: string;
  changeType: 'added' | 'removed';
}

export interface SlackNotification {
  eventId: string;
  eventOwners: string[];
  serviceId: string;
  serviceName: string;
  changeType: 'added' | 'removed';
}

export interface SubscribedSchemaChanged extends Notification {
  before: string;
  after: string;
  diff: string;
}

export interface Notification {
  id: string;
  version: string;
  resource: {
    id: string;
    name: string;
    version?: string;
    type: 'event' | 'service';
    owners: any[];
  };
  consumer: {
    id: string;
    name: string;
    version: string;
    type: string;
    owners: any[];
  };
  metadata: {
    timestamp: string;
    environment?: string;
    catalog_path: string;
  };
}

export interface NotifierConfig {
  version: string;
  eventcatalog_url: string;
  owners: {
    [key: string]: {
      events: string[];
      channels: {
        type: string;
        webhook: string;
        headers?: { [key: string]: string };
      }[];
    };
  };
}

export type Stage = 'draft' | 'active';

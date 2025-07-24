import { Event } from './Event';
import { Notification, NotifierConfig, Stage, SubscribedSchemaChanged } from '../types';
import utils from '@eventcatalog/sdk';
import path from 'path';
import { Logger } from '../utils/logger';
import { getFileAtCommit } from '../utils/git';
import { diffLines } from 'diff';
import { CLIOptions } from '../types';

const logger = new Logger();

function generateSchemaDiff(schema1: string, schema2: string) {
  const changes = diffLines(schema1, schema2);

  let diffOutput = '```diff\n';

  changes.forEach((part) => {
    if (part.added) {
      const lines = part.value.split('\n').filter((line) => line.trim() !== '');
      lines.forEach((line) => {
        diffOutput += `+${line}\n`;
      });
    } else if (part.removed) {
      const lines = part.value.split('\n').filter((line) => line.trim() !== '');
      lines.forEach((line) => {
        diffOutput += `-${line}\n`;
      });
    }
  });

  diffOutput += '```';

  return diffOutput;
}

// TODO: Move to SDK?
const isSchema = (file: string) => {
  return file.endsWith('.json') || file.endsWith('.avro') || file.endsWith('.proto');
};

export class SubscribedSchemaChangedEvent extends Event {
  public eventId: string = 'subscribed-schema-changed';

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
    super({ catalogPath, changedFiles, commitRange, options });
  }

  async process(): Promise<SubscribedSchemaChanged[]> {
    const { getMessageBySchemaPath, getConsumersOfSchema } = utils(this.catalogPath);
    const consumers = [] as any;
    let message = null as any;
    let schemaBefore = null as any;
    let schemaAfter = null as any;

    // Get any service that has been changed
    for (const file of this.changedFiles) {
      // isSchema?
      const isChangedFileASchema = isSchema(file);
      if (isChangedFileASchema) {
        try {
          const [beforeRange, afterRange] = this.parseCommitRange(this.commitRange);
          schemaBefore = getFileAtCommit(this.catalogPath, file, beforeRange);
          schemaAfter = getFileAtCommit(this.catalogPath, file, afterRange);

          message = await getMessageBySchemaPath(path.relative(this.catalogPath, file));
          const consumersOfMessage = await getConsumersOfSchema(path.relative(this.catalogPath, file));
          consumers.push(...consumersOfMessage);
        } catch (error) {
          logger.warn(`Failed to find message for schema, skipping: ${file}`);
        }
      }
    }

    // no schemas to compare
    if (!schemaBefore || !schemaAfter) {
      return [];
    }

    const diff = generateSchemaDiff(schemaBefore, schemaAfter);

    const notifications: SubscribedSchemaChanged[] = [];

    for (const consumer of consumers) {
      notifications.push({
        id: this.eventId,
        version: '1.0.0',
        resource: {
          id: message.id,
          name: message.name,
          version: message.version,
          // TODO: Get type of resource, SDK function, getResourceType(resource)?
          type: 'event',
          owners: message.owners,
        },
        consumer: {
          id: consumer.id,
          name: consumer.name,
          version: consumer.version,
          type: 'service',
          owners: consumer.owners,
        },
        before: schemaBefore.trim(),
        after: schemaAfter.trim(),
        diff: diff,
        metadata: {
          timestamp: new Date().toISOString(),
          catalog_path: this.catalogPath,
        },
      });
    }

    return notifications;
  }

  static getSlackMessage(config: NotifierConfig, notification: Notification, lifecycle: Stage, actionUrl?: string): any {
    const eventOwners = notification.resource.owners
      .map((owner) => {
        const id = owner.id || owner;
        return `<${config.eventcatalog_url}/docs/teams/${id}|${id}>`;
      })
      .join(', ');
    const consumerOwners = notification.consumer.owners
      .map((owner) => {
        const id = owner.id || owner;
        return `<${config.eventcatalog_url}/docs/teams/${id}|${id}>`;
      })
      .join(', ');
    const timestamp = new Date(notification.metadata.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isDraft = lifecycle === 'draft';
    const text = isDraft
      ? `🔄 Proposed Schema Change: ${notification.resource.name}`
      : `⚠️ Schema Change Detected: ${notification.resource.name}`;

    const pretext = isDraft
      ? `The producer service ${notification.consumer.name} is proposing to modify the schema of ${notification.resource.name}. This change may impact downstream consumers. Please review the proposed update and validate compatibility before it goes live.`
      : `The producer service ${notification.consumer.name} has modified the schema of ${notification.resource.name}. This change is now live and may impact downstream consumers. Please review the update and validate compatibility.`;

    return {
      text,
      attachments: [
        {
          color: 'warning',
          pretext,
          fields: [
            {
              title: '📧 Event Affected',
              value: `<${config.eventcatalog_url}/docs/events/${notification.resource.id}/${notification.resource.version}|${notification.resource.name}> (v${notification.resource.version})`,
              short: true,
            },
            {
              title: '🏭 Producer Service',
              value: `<${config.eventcatalog_url}/docs/services/${notification.consumer.id}/${notification.consumer.version}|${notification.consumer.name}> (v${notification.consumer.version})`,
              short: true,
            },
            {
              title: '👥 Impacted Consumers',
              value: consumerOwners || 'No consumers found',
              short: true,
            },
            {
              title: '👤 Event Owners',
              value: eventOwners || 'No owners assigned',
              short: true,
            },
            {
              title: '📅 Changed At',
              value: timestamp,
              short: true,
            },
            {
              title: '📋 Summary of Change',
              value:
                'The schema for ' +
                notification.resource.name +
                (isDraft ? ' is proposed to be updated' : ' has been updated') +
                ' to support richer metadata. This may require updates in consumers that rely on strict typing or validation.',
              short: false,
            },
            {
              title: '📄 Schema Diff',
              value: (notification as any).diff || 'No changes detected',
              short: false,
            },
            // only if actionUrl is provided
            actionUrl && {
              title: '🔗 View Schema Changes',
              value: `<${actionUrl}|View Schema Changes>`,
              short: true,
            },
          ],
          footer: 'EventCatalog Notifier • eventcatalog.dev',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }

  private parseCommitRange(commitRange: string): [string, string] {
    // Handle both .. (two-dot) and ... (three-dot) git range syntax
    if (commitRange.includes('...')) {
      // Three-dot syntax: A...B
      const parts = commitRange.split('...');
      return [parts[0], parts[1]];
    } else {
      // Two-dot syntax: A..B
      const parts = commitRange.split('..');
      return [parts[0], parts[1]];
    }
  }

  private findRemovedReceives(beforeReceives: { id: string }[], afterReceives: { id: string }[]): { id: string }[] {
    const afterIds = new Set(afterReceives.map((r) => r.id));
    return beforeReceives.filter((r) => !afterIds.has(r.id));
  }
}

import { Event } from './Event';
import { Notification, NotifierConfig, Stage, CLIOptions } from '../types';
import utils from '@eventcatalog/sdk';
import { getFileAtCommit } from '../utils/git';

export class ConsumerRemovedEvent extends Event {
  public eventId: string = 'consumer-removed';

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

  async process(): Promise<Notification[]> {
    const { getServiceByPath, getOwnersForResource, getEvent, isService, toService } = utils(this.catalogPath);
    const changedServices = [];

    // Get any service that has been changed
    for (const file of this.changedFiles) {
      const isChangedFileAService = await isService(file);
      if (isChangedFileAService) {
        const service = await getServiceByPath(file);
        if (service) {
          changedServices.push({
            ...service,
            absolutePath: file,
          });
        }
      }
    }

    const notifications: Notification[] = [];

    // Process each service
    for (const service of changedServices) {
      // Handle both .. and ... git range syntax
      const [beforeRange, afterRange] = this.parseCommitRange(this.commitRange);
      const fileBefore = getFileAtCommit(this.catalogPath, service.absolutePath, beforeRange);
      const fileAfter = getFileAtCommit(this.catalogPath, service.absolutePath, afterRange);

      const serviceBefore = await toService(fileBefore);
      const serviceAfter = await toService(fileAfter);

      // If we have two versions of the service, then we can compare the consumers
      if (serviceBefore && serviceAfter) {
        const removedReceives = this.findRemovedReceives(serviceBefore.receives || [], serviceAfter.receives || []);

        // Get the owners of any event change
        for (const receive of removedReceives) {
          const ownersForMessage = await getOwnersForResource(receive.id);
          const resource = await getEvent(receive.id);
          const ownersForConsumer = await getOwnersForResource(serviceAfter.id);
          notifications.push({
            id: this.eventId,
            version: '1.0.0',
            resource: {
              id: resource.id,
              name: resource.name,
              version: resource.version,
              // TODO: Get type of resource, SDK function, getResourceType(resource)?
              type: 'event',
              owners: ownersForMessage,
            },
            consumer: {
              id: serviceAfter.id,
              name: serviceAfter.name,
              version: serviceAfter.version,
              type: 'service',
              owners: ownersForConsumer,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              catalog_path: this.catalogPath,
            },
          });
        }
      }
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
        return `<https://eventcatalog.dev/docs/teams/${id}|${id}>`;
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
      ? `🔄 EventCatalog - 🗑️ Request to Remove Event Consumer`
      : `🗑️ EventCatalog - ✉️ Event Consumer Removed`;

    const pretext = isDraft
      ? `A request has been made to remove an event consumer in your architecture`
      : `A service has stopped consuming an event in your architecture`;

    return {
      text,
      attachments: [
        {
          color: 'warning',
          pretext,
          fields: [
            {
              title: '📡 Event No Longer Consumed',
              value: `<${config.eventcatalog_url}/docs/events/${notification.resource.id}/${notification.resource.version}|*${notification.resource.name}*> (v${notification.resource.version})`,
              short: true,
            },
            {
              title: '⚙️ Service That Removed Consumption',
              value: `<${config.eventcatalog_url}/docs/services/${notification.consumer.id}/${notification.consumer.version}|*${notification.consumer.name}*> (v${notification.consumer.version})`,
              short: true,
            },
            {
              title: '👥 Event Owners (Need to Know)',
              value: eventOwners || 'No owners assigned',
              short: true,
            },
            {
              title: '👥 Service Team',
              value: consumerOwners || 'No owners assigned',
              short: true,
            },
            {
              title: '📅 When',
              value: timestamp,
              short: true,
            },
            {
              title: '💼 Impact',
              value: `The *${notification.consumer.name}* service is no longer dependent on the *${notification.resource.name}* event. This may affect downstream processing.`,
              short: false,
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

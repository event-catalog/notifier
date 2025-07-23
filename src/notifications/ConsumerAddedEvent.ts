import { Event } from './Event';
import { Notification, NotifierConfig } from '../types';
import utils from '@eventcatalog/sdk';
import { getFileAtCommit } from '../utils/git';

export class ConsumerAddedEvent extends Event {
  public eventId: string = 'consumer-added';

  constructor({ catalogPath, changedFiles, commitRange }: { catalogPath: string; changedFiles: string[]; commitRange?: string }) {
    super({ catalogPath, changedFiles, commitRange });
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
        const newReceives = this.findNewReceives(serviceBefore.receives || [], serviceAfter.receives || []);

        // Get the owners of any event change
        for (const receive of newReceives) {
          const ownersForMessage = await getOwnersForResource(receive.id);
          const resource = await getEvent(receive.id);
          const ownersForConsumer = await getOwnersForResource(serviceAfter.id);
          notifications.push({
            id: this.eventId,
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

  static getSlackMessage(config: NotifierConfig, notification: Notification): any {
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

    return {
      text: `🆕 EventCatalog - ✉️ New Event Consumer Added`,
      attachments: [
        {
          color: 'good',
          pretext: `A new service has started consuming an event in your architecture`,
          fields: [
            {
              title: '📡 Event Being Consumed',
              value: `<${config.eventcatalog_url}/docs/events/${notification.resource.id}/${notification.resource.version}|*${notification.resource.name}*> (v${notification.resource.version})`,
              short: true,
            },
            {
              title: '⚙️ New Consumer Service',
              value: `<${config.eventcatalog_url}/docs/services/${notification.consumer.id}/${notification.consumer.version}|*${notification.consumer.name}*> (v${notification.consumer.version})`,
              short: true,
            },
            {
              title: '👥 Event Owners (Need to Know)',
              value: eventOwners || 'No owners assigned',
              short: true,
            },
            {
              title: '👥 Consumer Team',
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
              value: `The *${notification.consumer.name}* service is now dependent on the *${notification.resource.name}* event. `,
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

  private findNewReceives(beforeReceives: { id: string }[], afterReceives: { id: string }[]): { id: string }[] {
    const beforeIds = new Set(beforeReceives.map((r) => r.id));
    return afterReceives.filter((r) => !beforeIds.has(r.id));
  }
}

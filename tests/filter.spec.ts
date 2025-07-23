import { filterNotifications } from '../src/filter';
import { NotifierConfig, Notification } from '../src/types';
import { expect, describe, it } from 'vitest';
import yaml from 'js-yaml';

describe('filterNotifications', () => {
  it('takes a list of notifications and filters them based on the notifier.yml configuration', () => {
    const notifications = [
      {
        id: 'consumer-added',
        resource: {
          id: 'PaymentComplete',
          name: 'Payment Complete',
          version: '0.0.2',
          type: 'event',
          owners: [
            {
              id: 'dboyne',
            },
          ],
        },
        consumer: {
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          type: 'service',
          owners: [
            {
              id: 'dboyne',
            },
          ],
        },
        metadata: {
          timestamp: '2025-07-23T09:49:01.605Z',
          catalog_path: '/Users/dboyne/dev/eventcatalog/eventcatalog-notifier/catalog-example',
        },
      },
    ] as Notification[];

    const CONFIGURATION = `
        version: 1.0.0
        owners:
          payments-team:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    const filteredNotifications = filterNotifications(config, notifications);
    expect(filteredNotifications).toEqual(notifications);
  });

  it('filters out notifications with no owners', () => {
    const notifications = [
      {
        id: 'consumer-added',
        resource: {
          id: 'PaymentComplete',
          name: 'Payment Complete',
          version: '0.0.2',
          type: 'event',
          owners: [], // No owners
        },
        consumer: {
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          type: 'service',
          owners: [
            {
              id: 'dboyne',
            },
          ],
        },
        metadata: {
          timestamp: '2025-07-23T09:49:01.605Z',
          catalog_path: '/Users/dboyne/dev/eventcatalog/eventcatalog-notifier/catalog-example',
        },
      },
    ] as Notification[];

    const CONFIGURATION = `
        version: 1.0.0
        owners:
          payments-team:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    const filteredNotifications = filterNotifications(config, notifications);
    expect(filteredNotifications).toEqual([]);
  });

  it('filters out notifications with no matching teams', () => {
    const notifications = [
      {
        id: 'order-created', // Different event type
        resource: {
          id: 'OrderCreated',
          name: 'Order Created',
          version: '0.0.1',
          type: 'event',
          owners: [
            {
              id: 'dboyne',
            },
          ],
        },
        consumer: {
          id: 'OrderService',
          name: 'Order Service',
          version: '0.0.1',
          type: 'service',
          owners: [
            {
              id: 'dboyne',
            },
          ],
        },
        metadata: {
          timestamp: '2025-07-23T09:49:01.605Z',
          catalog_path: '/Users/dboyne/dev/eventcatalog/eventcatalog-notifier/catalog-example',
        },
      },
    ] as Notification[];

    const CONFIGURATION = `
        version: 1.0.0
        owners:
          payments-team:
            events:
              - consumer-added # Only interested in consumer-added events
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    const filteredNotifications = filterNotifications(config, notifications);
    expect(filteredNotifications).toEqual([]);
  });

  it('includes notifications when any owner matches team interest', () => {
    const notifications = [
      {
        id: 'consumer-added',
        resource: {
          id: 'PaymentComplete',
          name: 'Payment Complete',
          version: '0.0.2',
          type: 'event',
          owners: [
            {
              id: 'alice',
            },
            {
              id: 'bob',
            },
          ],
        },
        consumer: {
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          type: 'service',
          owners: [
            {
              id: 'charlie',
            },
          ],
        },
        metadata: {
          timestamp: '2025-07-23T09:49:01.605Z',
          catalog_path: '/Users/dboyne/dev/eventcatalog/eventcatalog-notifier/catalog-example',
        },
      },
    ] as Notification[];

    const CONFIGURATION = `
        version: 1.0.0
        owners:
          payments-team:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    const filteredNotifications = filterNotifications(config, notifications);
    expect(filteredNotifications).toEqual(notifications);
  });
});

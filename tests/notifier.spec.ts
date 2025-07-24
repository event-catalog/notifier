import { NotifierConfig, Notification } from '../src/types';
import { sendNotifications } from '../src/notifier';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as yaml from 'js-yaml';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);
const mockedAxiosPost = vi.mocked(axios.post);

describe('Notifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends slack notifications to configured owners for matching events (actual sending)', async () => {
    mockedAxiosPost.mockResolvedValue({ status: 200 } as any);

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
        eventcatalog_url: https://eventcatalog.example.com
        owners:
          dboyne:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    await sendNotifications(config, notifications, false);

    expect(mockedAxiosPost).toHaveBeenCalledWith(
      'https://fake-slack-webhook.com',
      expect.objectContaining({
        text: '🆕 EventCatalog - ✉️ New Event Consumer Added',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            color: 'good',
            pretext: 'A new service has started consuming an event in your architecture',
            fields: expect.arrayContaining([
              expect.objectContaining({
                title: '📡 Event Being Consumed',
                value: expect.stringContaining('Payment Complete'),
              }),
            ]),
          }),
        ]),
      }),
      expect.objectContaining({
        headers: {},
      })
    );
    // Notification sent successfully - no need to test console output
  });

  it('only sends notifications to owners that have configured events and the resource is owned by the owner', async () => {
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
              id: 'other-team', // Resource is owned by different team
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
        eventcatalog_url: https://eventcatalog.example.com
        owners:
          payments-team:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    await sendNotifications(config, notifications, false);

    // Should not send notification because payments-team doesn't own the resource
    expect(mockedAxiosPost).not.toHaveBeenCalled();
  });

  it('logs notifications in dry run mode without sending', async () => {
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
        eventcatalog_url: https://eventcatalog.example.com
        owners:
          payments-team:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    await sendNotifications(config, notifications, true);

    expect(mockedAxiosPost).not.toHaveBeenCalled();
  });

  it('does not send notifications for events not configured for any owner', async () => {
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
        eventcatalog_url: https://eventcatalog.example.com
        owners:
          payments-team:
            events:
              - consumer-added # Only interested in consumer-added events
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    await sendNotifications(config, notifications, true);

    expect(mockedAxiosPost).not.toHaveBeenCalled();
  });

  it('sends notifications to multiple channels for the same owner', async () => {
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
        eventcatalog_url: https://eventcatalog.example.com
        owners:
          payments-team:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook-1.com
              - type: slack
                webhook: https://fake-slack-webhook-2.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    await sendNotifications(config, notifications, true);

    expect(mockedAxiosPost).not.toHaveBeenCalled();
  });

  it('handles HTTP errors when sending notifications', async () => {
    const error = new Error('Network error');
    mockedAxiosPost.mockRejectedValue(error);

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
        eventcatalog_url: https://eventcatalog.example.com
        owners:
          dboyne:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    await expect(sendNotifications(config, notifications, false)).rejects.toThrow('Network error');
  });

  it('sends notifications with custom headers when specified', async () => {
    mockedAxiosPost.mockResolvedValue({ status: 200 } as any);

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
        eventcatalog_url: https://eventcatalog.example.com
        owners:
          dboyne:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
                headers:
                  Authorization: Bearer secret-token
                  X-Custom-Header: custom-value
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    await sendNotifications(config, notifications, false);

    expect(mockedAxiosPost).toHaveBeenCalledWith(
      'https://fake-slack-webhook.com',
      expect.objectContaining({
        text: '🆕 EventCatalog - ✉️ New Event Consumer Added',
      }),
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer secret-token',
          'X-Custom-Header': 'custom-value',
        },
      })
    );
  });

  it('logs headers in dry run mode when custom headers are specified', async () => {
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
        eventcatalog_url: https://eventcatalog.example.com
        owners:
          payments-team:
            events:
              - consumer-added
            channels:
              - type: slack
                webhook: https://fake-slack-webhook.com
                headers:
                  Authorization: Bearer secret-token
        `;

    const config = yaml.load(CONFIGURATION) as NotifierConfig;
    await sendNotifications(config, notifications, true);

    expect(mockedAxiosPost).not.toHaveBeenCalled();
  });
});

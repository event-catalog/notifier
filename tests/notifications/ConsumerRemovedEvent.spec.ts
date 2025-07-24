import { describe, it, expect } from 'vitest';
import { ConsumerRemovedEvent } from '../../src/notifications/ConsumerRemovedEvent';
import { vi } from 'vitest';
import path from 'path';
import fs from 'fs';
const GIT_DIFF_EXAMPLES_PATH = path.join(__dirname, '../git-diff-examples');

// Need to mock execSync for git show, returning different content for each file
vi.mock('child_process', () => ({
  execSync: vi.fn().mockImplementation((command) => {
    if (command.includes('git show HEAD~1')) {
      return 'This is the content of the file at the commit before';
    } else if (command.includes('git show HEAD')) {
      return 'This is the content of the file at the commit after';
    }
    return '';
  }),
}));

describe('ConsumerRemovedEvent', () => {
  it('when a consumer has been removed from an event, it will return a notification', async () => {
    vi.mock('child_process', () => ({
      execSync: vi.fn().mockImplementation((command) => {
        return command.includes('git show HEAD~1')
          ? fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'ConsumerRemovedEvent/before.md'), 'utf8')
          : fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'ConsumerRemovedEvent/after.md'), 'utf8');
      }),
    }));

    const changedFiles = ['tests/catalog/services/PaymentGatewayService/index.mdx'];

    const configMock = {
      version: '1.0.0',
      eventcatalog_url: 'https://example.eventcatalog.dev',
      owners: {},
    };
    const event = new ConsumerRemovedEvent({
      catalogPath: 'tests/catalog',
      changedFiles,
      options: { dryRun: false, lifecycle: 'active', actionUrl: 'https://example.com' },
    });
    const result = await event.process();

    expect(result).toEqual([
      {
        id: 'consumer-removed',
        version: '1.0.0',
        resource: {
          id: 'GetInventoryList',
          name: 'List inventory list',
          version: '0.0.1',
          type: 'event',
          owners: [
            {
              id: 'dboyne',
              name: 'David Boyne',
              avatarUrl: expect.any(String),
              role: 'Lead developer',
              email: 'test@test.com',
              slackDirectMessageUrl: 'https://yourteam.slack.com/channels/boyney123',
              msTeamsDirectMessageUrl: 'https://teams.microsoft.com/l/chat/0/0?users=test@test.com',
              markdown: expect.any(String),
            },
          ],
        },
        consumer: {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.2',
          type: 'service',
          owners: [],
        },
        metadata: {
          timestamp: expect.any(String),
          catalog_path: 'tests/catalog',
        },
      },
    ]);
  });

  it('when no consumers have been removed from a service, it should return an empty array', async () => {
    const changedFiles = ['tests/catalog/services/RandomServiceThatDoesntExist/index.mdx'];
    const event = new ConsumerRemovedEvent({
      catalogPath: 'tests/catalog',
      changedFiles,
      options: { dryRun: false, lifecycle: 'active', actionUrl: 'https://example.com' },
    });
    const result = await event.process();
    expect(result).toEqual([]);
  });

  describe('getSlackMessage', () => {
    const mockConfig = {
      version: '1.0.0',
      eventcatalog_url: 'https://example.eventcatalog.dev',
      owners: {},
    };

    const mockNotification = {
      id: 'consumer-removed',
      version: '1.0.0',
      resource: {
        id: 'TestEvent',
        name: 'Test Event',
        version: '1.0.0',
        type: 'event' as const,
        owners: [{ id: 'team1', name: 'Team 1' }],
      },
      consumer: {
        id: 'TestService',
        name: 'Test Service',
        version: '1.0.0',
        type: 'service',
        owners: [{ id: 'team2', name: 'Team 2' }],
      },
      metadata: {
        timestamp: '2023-01-01T00:00:00.000Z',
        catalog_path: '/test/catalog',
      },
    };

    it('should return active stage message when stage is active', () => {
      const result = ConsumerRemovedEvent.getSlackMessage(mockConfig, mockNotification, 'active');

      expect(result.text).toBe('🗑️ EventCatalog - ✉️ Event Consumer Removed');
      expect(result.attachments[0].pretext).toBe('A service has stopped consuming an event in your architecture');
    });

    it('should return draft stage message when stage is draft', () => {
      const result = ConsumerRemovedEvent.getSlackMessage(mockConfig, mockNotification, 'draft');

      expect(result.text).toBe('🔄 EventCatalog - 🗑️ Request to Remove Event Consumer');
      expect(result.attachments[0].pretext).toBe('A request has been made to remove an event consumer in your architecture');
    });

    it('should contain all required fields for both stages', () => {
      const activeResult = ConsumerRemovedEvent.getSlackMessage(mockConfig, mockNotification, 'active');
      const draftResult = ConsumerRemovedEvent.getSlackMessage(mockConfig, mockNotification, 'draft');

      [activeResult, draftResult].forEach((result) => {
        expect(result.attachments[0].fields).toHaveLength(6);
        expect(result.attachments[0].fields.find((f) => f.title === '📡 Event No Longer Consumed')).toBeDefined();
        expect(result.attachments[0].fields.find((f) => f.title === '⚙️ Service That Removed Consumption')).toBeDefined();
        expect(result.attachments[0].fields.find((f) => f.title === '👥 Event Owners (Need to Know)')).toBeDefined();
        expect(result.attachments[0].fields.find((f) => f.title === '👥 Service Team')).toBeDefined();
        expect(result.attachments[0].fields.find((f) => f.title === '📅 When')).toBeDefined();
        expect(result.attachments[0].fields.find((f) => f.title === '💼 Impact')).toBeDefined();
      });
    });
  });
});

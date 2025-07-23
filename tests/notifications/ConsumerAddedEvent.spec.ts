import { describe, it, expect } from 'vitest';
import { ConsumerAddedEvent } from '../../src/notifications/ConsumerAddedEvent';
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

describe('ConsumerAddedEvent', () => {
  it('when a new consumer has been added for an event, it will return a notification', async () => {
    vi.mock('child_process', () => ({
      execSync: vi.fn().mockImplementation((command) => {
        return command.includes('git show HEAD~1')
          ? fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'ConsumerAddedEvent/before.md'), 'utf8')
          : fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'ConsumerAddedEvent/after.md'), 'utf8');
      }),
    }));

    const changedFiles = ['tests/catalog/services/PaymentGatewayService/index.mdx'];

    const event = new ConsumerAddedEvent({ catalogPath: 'tests/catalog', changedFiles });
    const result = await event.process();

    expect(result).toEqual([
      {
        id: 'consumer-added',
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

  it('when no consumers have been added, to a service, it should return an empty array', async () => {
    const changedFiles = ['tests/catalog/services/RandomServiceThatDoesntExist/index.mdx'];
    const event = new ConsumerAddedEvent({ catalogPath: 'tests/catalog', changedFiles });
    const result = await event.process();
    expect(result).toEqual([]);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SubscribedSchemaChangedEvent } from '../../src/notifications/SubscribedSchemaChangedEvent';
import { vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import utils from '@eventcatalog/sdk';
import { execSync } from 'child_process';
const GIT_DIFF_EXAMPLES_PATH = path.join(__dirname, '../git-diff-examples');

const CATALOG_DIR = path.join(__dirname, '../catalog-tmp');

// Mock child_process module
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('SubscribedSchemaChangedEvent', () => {
  const mockExecSync = vi.mocked(execSync);

  beforeEach(() => {
    fs.mkdirSync(CATALOG_DIR, { recursive: true });
    mockExecSync.mockClear();
  });

  afterEach(() => {
    fs.rmSync(CATALOG_DIR, { recursive: true });
  });

  it('when a message schema (json) has been changed, the consumers will be notified if they are subscribed to the event', async () => {
    mockExecSync.mockImplementation((command) => {
      return command.includes('git show HEAD~1')
        ? fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/json/before.json'), 'utf8')
        : fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/json/after.json'), 'utf8');
    });

    const { writeEvent, addSchemaToEvent, writeService } = utils(CATALOG_DIR);

    await writeEvent({
      id: 'GetInventoryList',
      name: 'List inventory list',
      version: '0.0.1',
      owners: ['dboyne'],
      markdown: 'This is a test event',
      schemaPath: 'schema.json',
    });

    await addSchemaToEvent('GetInventoryList', {
      schema: fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/json/before.json'), 'utf8'),
      fileName: 'schema.json',
    });

    // The consumer of the event is the PaymentGatewayService
    await writeService({
      id: 'PaymentGatewayService',
      name: 'Payment Gateway Service',
      version: '0.0.1',
      owners: ['dboyne'],
      markdown: 'This is a test service',
      receives: [
        {
          id: 'GetInventoryList',
        },
      ],
    });

    // Mock the schema has changed
    const changedFiles = [path.resolve(CATALOG_DIR, 'events/GetInventoryList/schema.json')];
    const event = new SubscribedSchemaChangedEvent({ catalogPath: CATALOG_DIR, changedFiles });
    const result = await event.process();

    expect(result).toEqual([
      {
        id: 'subscribed-schema-changed',
        version: '1.0.0',
        resource: {
          id: 'GetInventoryList',
          name: 'List inventory list',
          version: '0.0.1',
          type: 'event',
          owners: ['dboyne'],
        },
        consumer: {
          id: 'PaymentGatewayService',
          name: 'Payment Gateway Service',
          version: '0.0.1',
          type: 'service',
          owners: ['dboyne'],
        },
        before: fs
          .readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/json/before.json'), 'utf8')
          .trim(),
        after: fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/json/after.json'), 'utf8').trim(),
        diff: expect.stringContaining('```diff'),
        metadata: {
          timestamp: expect.any(String),
          catalog_path: CATALOG_DIR,
        },
      },
    ]);
  });

  it('when a message schema (avro) has been changed, the consumers will be notified if they are subscribed to the event', async () => {
    mockExecSync.mockImplementation((command) => {
      return command.includes('git show HEAD~1')
        ? fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/avro/before.avro'), 'utf8')
        : fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/avro/after.avro'), 'utf8');
    });

    const { writeEvent, addSchemaToEvent, writeService } = utils(CATALOG_DIR);

    await writeEvent({
      id: 'GetInventoryList',
      name: 'List inventory list',
      version: '0.0.1',
      owners: ['dboyne'],
      markdown: 'This is a test event',
      schemaPath: 'schema.avro',
    });

    await addSchemaToEvent('GetInventoryList', {
      schema: fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/avro/before.avro'), 'utf8'),
      fileName: 'schema.avro',
    });

    // The consumer of the event is the PaymentGatewayService
    await writeService({
      id: 'PaymentGatewayService',
      name: 'Payment Gateway Service',
      version: '0.0.1',
      owners: ['dboyne'],
      markdown: 'This is a test service',
      receives: [
        {
          id: 'GetInventoryList',
        },
      ],
    });

    // Mock the schema has changed
    const changedFiles = [path.resolve(CATALOG_DIR, 'events/GetInventoryList/schema.avro')];
    const event = new SubscribedSchemaChangedEvent({ catalogPath: CATALOG_DIR, changedFiles });
    const result = await event.process();

    expect(result).toEqual([
      {
        id: 'subscribed-schema-changed',
        version: '1.0.0',
        resource: {
          id: 'GetInventoryList',
          name: 'List inventory list',
          version: '0.0.1',
          type: 'event',
          owners: ['dboyne'],
        },
        consumer: {
          id: 'PaymentGatewayService',
          name: 'Payment Gateway Service',
          version: '0.0.1',
          type: 'service',
          owners: ['dboyne'],
        },
        before: fs
          .readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/avro/before.avro'), 'utf8')
          .trim(),
        after: fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/avro/after.avro'), 'utf8').trim(),
        diff: expect.stringContaining('```diff'),
        metadata: {
          timestamp: expect.any(String),
          catalog_path: CATALOG_DIR,
        },
      },
    ]);
  });

  it('when a message schema (proto) has been changed, the consumers will be notified if they are subscribed to the event', async () => {
    mockExecSync.mockImplementation((command) => {
      return command.includes('git show HEAD~1')
        ? fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/proto/before.proto'), 'utf8')
        : fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/proto/after.proto'), 'utf8');
    });

    const { writeEvent, addSchemaToEvent, writeService } = utils(CATALOG_DIR);

    await writeEvent({
      id: 'GetInventoryList',
      name: 'List inventory list',
      version: '0.0.1',
      owners: ['dboyne'],
      markdown: 'This is a test event',
      schemaPath: 'schema.proto',
    });

    await addSchemaToEvent('GetInventoryList', {
      schema: fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/proto/before.proto'), 'utf8'),
      fileName: 'schema.proto',
    });

    // The consumer of the event is the PaymentGatewayService
    await writeService({
      id: 'PaymentGatewayService',
      name: 'Payment Gateway Service',
      version: '0.0.1',
      owners: ['dboyne'],
      markdown: 'This is a test service',
      receives: [
        {
          id: 'GetInventoryList',
        },
      ],
    });

    // Mock the schema has changed
    const changedFiles = [path.resolve(CATALOG_DIR, 'events/GetInventoryList/schema.proto')];
    const event = new SubscribedSchemaChangedEvent({ catalogPath: CATALOG_DIR, changedFiles });
    const result = await event.process();

    expect(result).toEqual([
      {
        id: 'subscribed-schema-changed',
        version: '1.0.0',
        resource: {
          id: 'GetInventoryList',
          name: 'List inventory list',
          version: '0.0.1',
          type: 'event',
          owners: ['dboyne'],
        },
        consumer: {
          id: 'PaymentGatewayService',
          name: 'Payment Gateway Service',
          version: '0.0.1',
          type: 'service',
          owners: ['dboyne'],
        },
        before: fs
          .readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/proto/before.proto'), 'utf8')
          .trim(),
        after: fs
          .readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/proto/after.proto'), 'utf8')
          .trim(),
        diff: expect.stringContaining('```diff'),
        metadata: {
          timestamp: expect.any(String),
          catalog_path: CATALOG_DIR,
        },
      },
    ]);
  });

  it('when a message schema has changed, but no previous version exists, the consumers will not be notified', async () => {
    // @ts-ignore
    mockExecSync.mockImplementation((command: string) => {
      return command.includes('git show HEAD~1')
        ? null
        : fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/avro/after.avro'), 'utf8');
    });

    const { writeEvent, addSchemaToEvent, writeService } = utils(CATALOG_DIR);

    await writeEvent({
      id: 'GetInventoryList',
      name: 'List inventory list',
      version: '0.0.1',
      owners: ['dboyne'],
      markdown: 'This is a test event',
      schemaPath: 'schema.avro',
    });

    await addSchemaToEvent('GetInventoryList', {
      schema: fs.readFileSync(path.join(GIT_DIFF_EXAMPLES_PATH, 'SubscribedSchemaChangedEvent/avro/before.avro'), 'utf8'),
      fileName: 'schema.avro',
    });

    // The consumer of the event is the PaymentGatewayService
    await writeService({
      id: 'PaymentGatewayService',
      name: 'Payment Gateway Service',
      version: '0.0.1',
      owners: ['dboyne'],
      markdown: 'This is a test service',
      receives: [
        {
          id: 'GetInventoryList',
        },
      ],
    });

    // Mock the schema has changed
    const changedFiles = [path.resolve(CATALOG_DIR, 'events/GetInventoryList/schema.avro')];
    const event = new SubscribedSchemaChangedEvent({ catalogPath: CATALOG_DIR, changedFiles });
    const result = await event.process();

    expect(result).toEqual([]);
  });

  it('when a message schema has been changed, the consumers will not be notified if they are not subscribed to the event', async () => {
    const changedFiles = [path.resolve(CATALOG_DIR, 'events/InventoryAdjusted/schema.json')];
    const event = new SubscribedSchemaChangedEvent({ catalogPath: CATALOG_DIR, changedFiles });
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
      id: 'subscribed-schema-changed',
      version: '1.0.0',
      resource: {
        id: 'UserCreatedEvent',
        name: 'User Created Event',
        version: '2.0.0',
        type: 'event' as const,
        owners: ['alice@example.com', 'schema-team@example.com'],
      },
      consumer: {
        id: 'IdentityService',
        name: 'Identity Service',
        version: '3.4.0',
        type: 'service',
        owners: ['UserService', 'AuditService'],
      },
      diff: '```diff\n-  "email": "string",\n-  "username": "string",\n+  "email": {\n+    "type": "string",\n+    "format": "email"\n+  },\n+  "user_name": {\n+    "type": "string",\n+    "minLength": 3\n+  }\n```',
      metadata: {
        timestamp: '2025-07-24T14:10:00.000Z',
        catalog_path: '/test/catalog',
      },
    };

    it('should return active stage message when stage is active', () => {
      const result = SubscribedSchemaChangedEvent.getSlackMessage(mockConfig, mockNotification, 'active');

      expect(result.text).toBe('⚠️ Schema Change Detected: User Created Event');
      expect(result.attachments[0].pretext).toBe(
        'The producer service Identity Service has modified the schema of User Created Event. This change is now live and may impact downstream consumers. Please review the update and validate compatibility.'
      );
      expect(result.attachments[0].color).toBe('warning');

      const summaryField = result.attachments[0].fields.find((f) => f.title === '📋 Summary of Change');
      expect(summaryField?.value).toBe(
        'The schema for User Created Event has been updated to support richer metadata. This may require updates in consumers that rely on strict typing or validation.'
      );
    });

    it('should return draft stage message when stage is draft', () => {
      const result = SubscribedSchemaChangedEvent.getSlackMessage(mockConfig, mockNotification, 'draft');

      expect(result.text).toBe('🔄 Proposed Schema Change: User Created Event');
      expect(result.attachments[0].pretext).toBe(
        'The producer service Identity Service is proposing to modify the schema of User Created Event. This change may impact downstream consumers. Please review the proposed update and validate compatibility before it goes live.'
      );
      expect(result.attachments[0].color).toBe('warning');

      const summaryField = result.attachments[0].fields.find((f) => f.title === '📋 Summary of Change');
      expect(summaryField?.value).toBe(
        'The schema for User Created Event is proposed to be updated to support richer metadata. This may require updates in consumers that rely on strict typing or validation.'
      );
    });

    it('should contain all required fields for both stages', () => {
      const activeResult = SubscribedSchemaChangedEvent.getSlackMessage(
        mockConfig,
        mockNotification,
        'active',
        'https://example.com'
      );
      const draftResult = SubscribedSchemaChangedEvent.getSlackMessage(
        mockConfig,
        mockNotification,
        'draft',
        'https://example.com'
      );

      for (const result of [activeResult, draftResult]) {
        expect(result.attachments[0].fields).toHaveLength(8);

        expect(result.attachments[0].fields.find((f) => f.title === '📧 Event Affected')).toBeTruthy();
        expect(result.attachments[0].fields.find((f) => f.title === '🏭 Producer Service')).toBeTruthy();
        expect(result.attachments[0].fields.find((f) => f.title === '👥 Impacted Consumers')).toBeTruthy();
        expect(result.attachments[0].fields.find((f) => f.title === '👤 Event Owners')).toBeTruthy();
        expect(result.attachments[0].fields.find((f) => f.title === '📅 Changed At')).toBeTruthy();
        expect(result.attachments[0].fields.find((f) => f.title === '📋 Summary of Change')).toBeTruthy();
        expect(result.attachments[0].fields.find((f) => f.title === '📄 Schema Diff')).toBeTruthy();

        expect(result.attachments[0].footer).toBe('EventCatalog Notifier • eventcatalog.dev');
        expect(result.attachments[0].ts).toBeTypeOf('number');
      }
    });

    it('should include schema diff in the message', () => {
      const result = SubscribedSchemaChangedEvent.getSlackMessage(mockConfig, mockNotification, 'active');

      const diffField = result.attachments[0].fields.find((f) => f.title === '📄 Schema Diff');
      expect(diffField?.value).toBe(mockNotification.diff);
    });
  });
});

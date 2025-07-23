# @eventcatalog/notifier

A powerful CLI tool that monitors your EventCatalog for changes and sends notifications (e.g. Slack, MS Teams, etc) when catalog changes are detected. Perfect for keeping teams informed about new dependencies in your event-driven architecture.

## ✨ Features

- 🔍 **Smart Detection**: Automatically detects when services add new event consumers
- 💬 **Rich Slack Notifications**: Beautiful, informative messages with EventCatalog links
- 🎯 **Targeted Notifications**: Only notifies relevant event owners
- 🧪 **Dry Run Mode**: Preview notifications before sending
- 🔧 **Flexible Configuration**: Support for multiple teams, channels, and custom headers
- ⚡ **CI/CD Ready**: Perfect for GitHub Actions and other CI systems

## 🚀 Quick Start

### Installation

```bash
npm install -g @eventcatalog/notifier
```

### Basic Usage

```bash
# Preview what notifications would be sent
eventcatalog-notifier --catalog ./my-eventcatalog --dry-run

# Send actual notifications
eventcatalog-notifier --catalog ./my-eventcatalog --config ./notifier.yml
```

## 📋 Configuration

Create a `notifier.yml` file to configure your notifications:

```yaml
# Version of the notifier config
version: 1.0.0

# The base URL for your EventCatalog
eventcatalog_url: https://eventcatalog.mycompany.com

owners:
  # Team configuration
  payments-team:
    events:
      - consumer-added # Get notified when services consume payment events
      - consumer-removed # Get notified when services stop consuming events
    channels:
      - type: slack
        webhook: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
        headers:
          Authorization: 'Bearer xoxb-your-bot-token' # Optional custom headers

  platform-team:
    events:
      - consumer-added
    channels:
      - type: slack
        webhook: https://hooks.slack.com/services/T00000000/B00000001/YYYYYYYYYYYYYYYYYYYYYYYY
      - type: slack # Multiple channels supported
        webhook: https://hooks.slack.com/services/T00000000/B00000002/ZZZZZZZZZZZZZZZZZZZZZZZZ
```

## 🛠️ CLI Options

| Option                   | Description                           | Example                       |
| ------------------------ | ------------------------------------- | ----------------------------- |
| `--catalog <path>`       | Path to your EventCatalog             | `--catalog ./eventcatalog`    |
| `--config <path>`        | Path to notifier configuration        | `--config ./notifier.yml`     |
| `--commit-range <range>` | Git commit range to analyze           | `--commit-range HEAD~2..HEAD` |
| `--dry-run`              | Preview notifications without sending | `--dry-run`                   |
| `--verbose`              | Enable detailed logging for debugging | `--verbose`                   |

## 📋 Supported Events

The notifier currently supports the following event types:

| Event ID           | Description                                | When It Triggers                                                       |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| `consumer-added`   | **New Event Consumer**                     | When a service starts consuming an event (adds to `receives` list)     |
| `consumer-removed` | **Event Consumer Removed** _(Coming Soon)_ | When a service stops consuming an event (removes from `receives` list) |

### Event Details

#### `consumer-added`

- **Triggers when**: A service adds a new event to its `receives` array
- **Notification includes**: Event details, new consumer service, event owners, consumer team, impact description
- **Use case**: Keep event owners informed when new services start depending on their events
- **Slack message**: Rich formatted message with EventCatalog links and emoji indicators

_More event types coming soon! We're working on support for schema changes, ownership changes, deprecations, and more._

## 🔧 How It Works

The EventCatalog Notifier uses **GitOps principles** to detect and notify about changes in your EventCatalog. Here's the step-by-step process:

### 1. 📊 Git-Based Change Detection

- Uses Git commit history to compare versions of your EventCatalog
- Analyzes the difference between two commits (default: `HEAD~1..HEAD`)
- Only examines service files that have actually changed
- Leverages Git's built-in diff capabilities for accuracy

### 2. 🔍 Smart Service Analysis

```bash
# The tool compares service definitions like this:
git diff HEAD~1..HEAD -- eventcatalog/services/
```

**Before** (Previous commit):

```yaml
---
id: EmailService
receives:
  - id: UserRegistered
    version: 1.0.0
---
```

**After** (Current commit):

```yaml
---
id: EmailService
receives:
  - id: UserRegistered
    version: 1.0.0
  - id: PaymentProcessed # ← NEW!
    version: 2.1.0
---
```

### 3. 🎯 Event Processing & Filtering

- **Detects Changes**: Identifies new/removed items in `receives` arrays
- **Enriches Data**: Fetches event details and owner information using EventCatalog SDK
- **Filters Notifications**: Only processes events that teams have configured to receive
- **Avoids Spam**: No notifications for events without owners or unmatched configurations

### 4. 📬 Intelligent Notification Delivery

- **Target Resolution**: Maps event changes to interested teams via configuration
- **Message Generation**: Creates rich, contextual notifications with EventCatalog links
- **Multi-Channel**: Sends to all configured channels (Slack, Teams, etc.)
- **Error Handling**: Gracefully handles failures and provides clear feedback

### 5. 🔄 GitOps Integration Benefits

- **Version Control**: All changes are tracked and auditable
- **Branch Awareness**: Can analyze any commit range or branch
- **CI/CD Native**: Perfect for automated workflows
- **Historical Analysis**: Can replay changes from any point in history
- **Rollback Detection**: Future support for detecting reverted changes

```mermaid
graph LR
    A[Git Commit] --> B[File Changes]
    B --> C[Service Analysis]
    C --> D[Event Detection]
    D --> E[Owner Lookup]
    E --> F[Filter Config]
    F --> G[Generate Message]
    G --> H[Send Notification]
```

This approach ensures **zero configuration drift** - your notifications are always in sync with your actual EventCatalog changes, not dependent on external webhooks or manual triggers.

## 🚨 Troubleshooting

### Git Commit Range Errors

If you see errors like `"unknown revision or path not in the working tree"`, this usually means:

- **New repository**: You need at least 2 commits for `HEAD~1..HEAD` to work
- **Insufficient history**: Try a different commit range or check `git log --oneline`
- **Wrong directory**: Make sure you're in a Git repository

Use `--verbose` flag to see detailed debugging information:

```bash
eventcatalog-notifier --catalog ./eventcatalog --verbose --dry-run
```

The tool will provide user-friendly error messages and suggestions to help you resolve issues quickly.

## 🔄 GitHub Actions Integration

Add this workflow to `.github/workflows/eventcatalog-notifier.yml`:

```yaml
name: EventCatalog Change Notifications

on:
  push:
    branches: [main, master]
    paths: ['eventcatalog/services/**']
  pull_request:
    paths: ['eventcatalog/services/**']

jobs:
  notify-changes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Need full history for git diff

      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install EventCatalog Notifier
        run: npm install -g @eventcatalog/notifier

      - name: Send Notifications
        run: |
          if [ "${{ github.event_name }}" == "pull_request" ]; then
            eventcatalog-notifier --catalog ./eventcatalog --config ./notifier.yml --dry-run
          else
            eventcatalog-notifier --catalog ./eventcatalog --config ./notifier.yml
          fi
```

## 🧪 Development

```bash
# Clone and install
git clone https://github.com/eventcatalog/notifier
cd notifier
npm install

# Run in development
npm run dev -- --catalog ./example-catalog --dry-run

# Run tests
npm test

# Build for production
npm run build
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

MIT © EventCatalog

## 🆘 Support

- 📖 [EventCatalog Documentation](https://eventcatalog.dev)
- 🐛 [Report Issues](https://github.com/eventcatalog/notifier/issues)
- 💬 [Discord Community](https://discord.gg/eventcatalog)

---

Made with ❤️ by the EventCatalog team.

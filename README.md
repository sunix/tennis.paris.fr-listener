# tennis.paris.fr-listener

Help me to get notified once a tennis court is available

## Features

- 🎾 Checks tennis court availability on tennis.paris.fr
- ⏰ Runs automatically every 5 minutes via GitHub Actions
- 🔔 Sends notifications to Google Chat when availability changes
- ⚙️ Configurable via environment variables
- 🛡️ Smart change detection to avoid duplicate notifications

## Configuration

### Local Usage

1. Copy the example configuration file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to customize your settings:

   ```bash
   # List of courts to monitor (comma-separated)
   COURTS="Philippe Auguste,Candie,Thiéré,La Faluère"

   # Time range for checking availability (hours)
   HOUR_RANGE_START=9
   HOUR_RANGE_END=22

   # Date to check (DD/MM/YYYY format)
   WHEN_DAY=23
   WHEN_MONTH=05
   WHEN_YEAR=2021

   # Pushover notification credentials (optional)
   PUSHOVER_APP_TOKEN=your_token_here
   PUSHOVER_USER_KEY=your_key_here
   ```

3. Run the listener:
   ```bash
   ./main.sh
   ```

### Configuration Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `COURTS` | Comma-separated list of court names to monitor | `Philippe Auguste,Candie,Thiéré,La Faluère` | `Philippe Auguste,Candie` |
| `HOUR_RANGE_START` | Start hour for availability check (24-hour format) | `9` | `9` (9 AM) |
| `HOUR_RANGE_END` | End hour for availability check (24-hour format) | `22` | `22` (10 PM) |
| `WHEN_DAY` | Day to check | `23` | `23` |
| `WHEN_MONTH` | Month to check | `05` | `05` (May) |
| `WHEN_YEAR` | Year to check | `2021` | `2021` |
| `PUSHOVER_APP_TOKEN` | Pushover app token (optional, for local notifications) | - | `azGDORePK8gMaC0QOYAMyEEuzJnyUi` |
| `PUSHOVER_USER_KEY` | Pushover user key (optional, for local notifications) | - | `uQiRzpo4DXghDmr9QzzfQu27cmVRsG` |
| `GOOGLE_CHAT_WEBHOOK` | Google Chat webhook URL (for GitHub Actions) | - | `https://chat.googleapis.com/v1/spaces/...` |

## GitHub Actions Setup

The repository includes a GitHub Action that automatically checks tennis court availability every 5 minutes.

### Setup Steps

1. **Create a Google Chat Incoming Webhook:**
   - Open your Google Chat space
   - Click on the space name → "Apps & integrations"
   - Click "Add webhooks"
   - Create a new webhook and copy the URL

2. **Add the webhook as a GitHub Secret:**
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `GOOGLE_CHAT_WEBHOOK`
   - Value: Paste your Google Chat webhook URL
   - Click "Add secret"

3. **Enable GitHub Actions:**
   - The workflow will automatically run every 5 minutes
   - You can also trigger it manually from the Actions tab

### How It Works

1. **Scheduled Execution**: The workflow runs every 5 minutes automatically
2. **Change Detection**: Compares current output with previous run using SHA256 hash
3. **State Persistence**: Uses GitHub Actions cache to store the state between runs
4. **Smart Notifications**: Only sends notifications when the availability changes
5. **Error Handling**: Fails with a clear error if the webhook secret is not configured

### Manual Trigger

You can manually trigger the workflow:
1. Go to the "Actions" tab in your GitHub repository
2. Select "Tennis availability check" workflow
3. Click "Run workflow"

## Requirements

- `bash`
- `curl`
- `jq` (JSON processor)
- `python3` (for GitHub Actions notifications)

## Testing

The project includes unit tests to verify the court list functionality. To run the tests:

```bash
./test_main.sh
```

The test suite includes:
- Default and custom court configuration
- JQ filter generation for single and multiple courts
- JQ filter syntax validation
- Court filtering logic
- Empty/non-empty array detection
- Special character handling (accents)
- Environment variable loading

All tests should pass before deploying changes.

## License

See [LICENSE](LICENSE) file for details.


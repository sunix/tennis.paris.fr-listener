# tennis.paris.fr-listener

Help me to get notified once a tennis court is available

## Important Limitation ⚠️

**Please read this carefully before using the listener:**

The tennis.paris.fr API only provides **facility-level availability**, not court-level availability. This means:

- When the listener reports courts, it means the **facility has SOME availability** during your requested time range
- It does **NOT** mean all listed courts are available at your specific requested time
- You **MUST verify** specific court and time availability on the [tennis.paris.fr website](https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche)

The listener is useful for:
- ✅ Getting notified when a facility has availability (so you can quickly check the website)
- ✅ Filtering by facility, court numbers, and covered/outdoor preferences
- ✅ Reducing the number of facilities you need to manually check

The listener is NOT:
- ❌ A guarantee that specific courts are available
- ❌ A replacement for checking the actual booking website
- ❌ Able to show per-court, per-timeslot availability

**Recommendation:** Use this listener as an alert system. When you receive a notification, immediately check the tennis.paris.fr website to see actual court-level availability and book your desired timeslot.

## Features

- 🎾 Checks tennis court availability on tennis.paris.fr
- ⏰ Runs automatically every 5 minutes via GitHub Actions
- 🔔 Sends notifications to Google Chat when availability changes
- ⚙️ Configurable via environment variables
- 🛡️ Smart change detection to avoid duplicate notifications
- 🎯 Filter by specific court numbers (e.g., courts 5-8, 17-21 at La Faluère)
- ☂️ Filter for covered courts only
- 🌐 **Web UI for easy configuration** - Configure your searches in a user-friendly web interface
- 🚀 **PR Preview Deployments** - Test changes with `/preview` command in pull requests
- 🔄 **CORS Proxy** - Quarkus-based proxy service for GitHub Pages frontend to communicate with tennis.paris.fr

## CORS Proxy Service

This repository includes a Quarkus-based HTTP proxy service that enables the GitHub Pages frontend to communicate with tennis.paris.fr without CORS restrictions.

📖 **[Read the full CORS Proxy documentation](docs/PROXY.md)**

The proxy service:
- Forwards requests from `/api/*` to `https://tennis.paris.fr/*`
- Handles CORS preflight requests
- Includes optional token-based authentication
- Deployable on Render (free tier)

## Web Configuration UI

Visit the [Tennis Paris Listener Configuration Page](https://sunix.github.io/tennis.paris.fr-listener/) to:
- Create and save multiple search configurations
- Select specific court numbers for each facility
- Filter for covered courts only
- Export configurations to `.env` format for use with the listener

The web app saves your configurations in your browser's local storage, so you can manage multiple search criteria and easily copy them to your `.env` file.

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
   
   # Optional: Filter by specific court numbers (JSON format)
   COURT_NUMBERS='{"La Faluère": [5,6,7,8,17,18,19,20,21], "Alain Mimoun": [1,2,3]}'
   
   # Optional: Filter for covered courts only
   COVERED_ONLY=true
   ```

3. Install Node.js dependencies:
   ```bash
   npm install
   ```

4. Run the listener:
   ```bash
   # Node.js version (recommended)
   ./main.js
   
   # Or Bash version (legacy, will be deprecated)
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
| `COURT_NUMBERS` | JSON object specifying court numbers per facility | - | `'{"La Faluère": [5,6,7,8], "Alain Mimoun": [1,2,3]}'` |
| `COVERED_ONLY` | Filter for covered courts only | `false` | `true` |
| `TWO_HOURS` | Look for 2 consecutive hours (future feature) | `false` | `true` |
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

- **Node.js 14+** (for main.js - recommended)
- `npm` (for installing Node.js dependencies)

**Legacy Bash version** (main.sh - being deprecated):
- `bash`
- `curl`
- `jq` (JSON processor)

**For notifications**:
- `python3` (for Google Chat notifications)

## Code Architecture

The project uses a shared JavaScript module for consistency:

- **`lib/tennis-api.js`**: Shared module for API requests and filtering logic
- **`main.js`**: Node.js CLI application (uses tennis-api.js)
- **`main.sh`**: Legacy Bash version (will be deprecated)
- **`docs/app.js`**: Web UI (can be updated to use tennis-api.js)

This architecture ensures that the same filtering logic is used across all interfaces.

## Testing

The project includes unit tests to verify the court list functionality. To run the tests:

```bash
./test_main.test.js  # Tests for main.js (Node.js version)
./test_main.sh       # Tests for main.sh (Bash version)
./test_scripts.sh    # Tests for workflow scripts
```

The test suite includes:
- Default and custom court configuration
- JQ filter generation for single and multiple courts
- JQ filter syntax validation
- Court filtering logic
- Empty/non-empty array detection
- Special character handling (accents)
- Environment variable loading
- Webhook validation
- Change detection logic
- Google Chat notification generation

All tests should pass before deploying changes.

## Scripts

The repository includes several utility scripts in the `scripts/` directory that are used by the GitHub Actions workflow and can also be used locally:

### `scripts/validate-webhook.sh`

Validates that a Google Chat webhook URL is configured.

```bash
# Usage with argument
./scripts/validate-webhook.sh <webhook_url>

# Or with environment variable
export GOOGLE_CHAT_WEBHOOK="https://chat.googleapis.com/..."
./scripts/validate-webhook.sh
```

### `scripts/detect-change.sh`

Detects changes in tennis court availability by computing and comparing SHA256 hashes.

```bash
# Usage
./scripts/detect-change.sh <output_file> <state_dir>

# Example
./scripts/detect-change.sh output.txt state
# Outputs: changed=true or changed=false
```

This script:
- Computes the hash of the output file
- Compares it with the previous hash stored in `<state_dir>/last_hash.txt`
- Saves the new hash for the next run
- Outputs whether the content has changed

### `scripts/notify-google-chat.sh`

Sends notifications to Google Chat with tennis court availability information.

```bash
# Usage
./scripts/notify-google-chat.sh <output_file> <webhook_url>

# Example
./scripts/notify-google-chat.sh output.txt "$GOOGLE_CHAT_WEBHOOK"
```

This script:
- Reads the output file with court availability
- Loads configuration from `.env` if available
- Builds a formatted message with search parameters
- Sends the notification to Google Chat via webhook

These scripts are designed to be:
- **Reusable**: Can be run locally or in CI/CD
- **Testable**: Unit tests are provided in `test_scripts.sh`
- **Modular**: Each script has a single responsibility

## PR Preview Deployments

The repository supports preview deployments for pull requests using [Surge.sh](https://surge.sh). This allows you to test changes to the web UI before merging them.

### How to Use

1. Open or navigate to a pull request
2. Comment `/preview` on the PR
3. The GitHub Action will automatically:
   - Build the docs site
   - Deploy it to `https://pr-{number}-tennis-paris-preview.surge.sh`
   - Comment back with the preview URL
4. Visit the preview URL to test your changes
   - A banner will appear at the top indicating it's a preview site
   - The banner includes a link back to the PR

### Setup (Repository Maintainers)

To enable preview deployments, you need to configure a `SURGE_TOKEN` secret:

1. Install Surge CLI: `npm install -g surge`
2. Login to Surge: `surge login`
3. Generate a token: `surge token`
4. Add the token as a GitHub secret:
   - Go to Repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SURGE_TOKEN`
   - Value: Paste the token from step 3
   - Click "Add secret"

Once configured, any contributor can use the `/preview` command on their pull requests.

## License

See [LICENSE](LICENSE) file for details.


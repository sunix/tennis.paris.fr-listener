# Tennis Paris Listener - Configuration Web App

This is a static web application to help you configure your tennis court search criteria in a user-friendly way.

## Features

- **Save Multiple Searches**: Create and manage multiple search configurations
- **Specific Court Selection**: Choose specific court numbers for each facility (e.g., courts 5-8, 17-21 at La Faluère)
- **Filter Options**: 
  - Filter for covered courts only
  - Look for 2 consecutive hours
- **Export to .env**: Copy your configuration directly to your `.env` file
- **Local Storage**: All data is saved in your browser's local storage - no server required

## Usage

1. Open the web app at: https://sunix.github.io/tennis.paris.fr-listener/
2. Fill in your search criteria:
   - Give your search a name (e.g., "Morning Covered Courts")
   - Select the date you want to search
   - Choose the time range
   - Add tennis facilities and specify which court numbers you want
   - Enable filters like "covered courts only" if needed
3. Click "Save Search" to store your configuration
4. Go to the "Export for Listener" section
5. Select a saved search and click "Copy .env Format"
6. Paste the output into your `.env` file in the listener repository

## Example Use Cases

### Example 1: Specific Courts at La Faluère
At La Faluère, you only want courts 5, 6, 7, 8, and 17-21:
- Tennis Facility: La Faluère
- Court numbers: 5,6,7,8,17,18,19,20,21

### Example 2: Covered Courts at Alain Mimoun
At Alain Mimoun, you only want covered courts (1, 2, 3):
- Tennis Facility: Alain Mimoun
- Court numbers: 1,2,3
- Enable "Covered courts only"

### Example 3: Multiple Facilities with Mixed Preferences
- La Faluère: courts 5-8, 17-21
- Alain Mimoun: courts 1-3
- Enable "Covered courts only" to further filter

## Technical Details

- Built with vanilla JavaScript - no frameworks required
- Uses browser's localStorage API for data persistence
- Fully static - can be hosted on GitHub Pages or any static hosting
- Exports to `.env` format compatible with the tennis.paris.fr-listener
- Uses `lib/tennis-api.js` from the main library (automatically copied during GitHub Pages deployment)

## Development

When developing locally, you'll need to manually copy `lib/tennis-api.js` to `docs/lib/` for the app to work:

```bash
mkdir -p docs/lib
cp lib/tennis-api.js docs/lib/tennis-api.js
```

Note: `docs/lib/tennis-api.js` is gitignored and automatically generated during GitHub Pages deployment, so you don't need to commit it.

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling
- `app.js` - Application logic and localStorage management

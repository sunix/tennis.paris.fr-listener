# Scripts

## fetch-facilities.js

Fetches the complete list of tennis facilities from tennis.paris.fr API, including court numbers and covered status.

### Usage

```bash
node scripts/fetch-facilities.js
```

This script will:
1. Connect to the tennis.paris.fr API (no CORS issues since it runs in Node.js)
2. Fetch all 43 tennis facilities with their court information
3. Display a summary showing each facility with court count and covered court count
4. Output JavaScript code to update the `FALLBACK_FACILITIES` constant in `docs/app.js`

### Example Output

```
Found 43 facilities

Jules Ladoumègue: 8 courts (8 covered)
Elisabeth: 9 courts (6 covered)
La Faluère: 21 courts (0 covered)
...

const FALLBACK_FACILITIES = {
    "Jules Ladoumègue": [
        {number: 1, covered: true},
        {number: 2, covered: true},
        ...
    ],
    ...
};
```

### When to Run

Run this script:
- When you notice facilities data is outdated
- Periodically (e.g., monthly) to keep the fallback data fresh
- After significant changes to tennis.paris.fr infrastructure

### Updating the App

After running the script:
1. Copy the generated JavaScript object
2. Replace the `FALLBACK_FACILITIES` constant in `docs/app.js`
3. Commit the updated file

This ensures the web UI works offline with accurate facility and court information.

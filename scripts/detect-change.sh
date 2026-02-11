#!/bin/bash
# Detect changes in tennis court availability by computing hash
# Usage: ./detect-change.sh <output_file> <state_dir>
#
# Arguments:
#   output_file: The file containing current output (default: output.txt)
#   state_dir: Directory to store state (default: state)
#
# Outputs:
#   Sets CHANGED environment variable to "true" or "false"
#   Saves new hash to state/last_hash.txt
#
# Exit codes:
#   0: Success (changed or unchanged)

set -e

OUTPUT_FILE="${1:-output.txt}"
STATE_DIR="${2:-state}"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

# Compute hash of current output
NEW_HASH=$(sha256sum "$OUTPUT_FILE" | awk '{print $1}')

# Read previous hash if it exists
OLD_HASH=""
if [ -f "$STATE_DIR/last_hash.txt" ]; then
  OLD_HASH=$(cat "$STATE_DIR/last_hash.txt")
fi

# Save new hash
echo "$NEW_HASH" > "$STATE_DIR/last_hash.txt"

# Determine if changed
if [ "$NEW_HASH" = "$OLD_HASH" ] && [ -n "$OLD_HASH" ]; then
  echo "changed=false"
  exit 0
else
  echo "changed=true"
  exit 0
fi

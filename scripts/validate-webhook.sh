#!/bin/bash
# Validate Google Chat webhook secret
# Usage: ./validate-webhook.sh <webhook_url>

set -e

WEBHOOK_URL="${1:-$GOOGLE_CHAT_WEBHOOK}"

if [ -z "$WEBHOOK_URL" ]; then
  echo "ERROR: GOOGLE_CHAT_WEBHOOK is not set or provided as argument." >&2
  echo "Usage: $0 <webhook_url>" >&2
  echo "Or set GOOGLE_CHAT_WEBHOOK environment variable" >&2
  exit 1
fi

echo "✓ Google Chat webhook is configured"
exit 0

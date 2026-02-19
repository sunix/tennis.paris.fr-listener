#!/bin/bash
# Send notification to Google Chat
# Usage: ./notify-google-chat.sh <output_file> <webhook_url>
#
# Arguments:
#   output_file: The file containing tennis court availability (default: output.txt)
#   webhook_url: Google Chat webhook URL (or use GOOGLE_CHAT_WEBHOOK env var)
#
# Environment variables used:
#   GOOGLE_CHAT_WEBHOOK: Webhook URL if not provided as argument
#   COURTS, HOUR_RANGE_START, HOUR_RANGE_END, WHEN_DAY, WHEN_MONTH, WHEN_YEAR
#     (loaded from .env if available)

set -e

OUTPUT_FILE="${1:-output.txt}"
WEBHOOK_URL="${2:-$GOOGLE_CHAT_WEBHOOK}"

if [ -z "$WEBHOOK_URL" ]; then
  echo "ERROR: GOOGLE_CHAT_WEBHOOK is not set or provided as argument." >&2
  echo "Usage: $0 <output_file> <webhook_url>" >&2
  exit 1
fi

if [ ! -f "$OUTPUT_FILE" ]; then
  echo "ERROR: Output file '$OUTPUT_FILE' not found." >&2
  exit 1
fi

TEXT=$(cat "$OUTPUT_FILE")
echo "=== Output content to send ==="
cat "$OUTPUT_FILE"
echo "=============================="

# Load .env file if it exists
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

# Extract search parameters from environment or defaults
COURTS="${COURTS:-Philippe Auguste,Candie,Thiéré,La Faluère}"
HOUR_RANGE_START="${HOUR_RANGE_START:-9}"
HOUR_RANGE_END="${HOUR_RANGE_END:-22}"
WHEN_DAY="${WHEN_DAY:-23}"
WHEN_MONTH="${WHEN_MONTH:-05}"
WHEN_YEAR="${WHEN_YEAR:-2021}"
COVERED_ONLY="${COVERED_ONLY:-false}"
COURT_NUMBERS="${COURT_NUMBERS:-}"

# Parse the JSON output to create a readable message
AVAILABLE_COURTS=""
if [ "$TEXT" != "[]" ] && [ -n "$TEXT" ]; then
  AVAILABLE_COURTS=$(echo "$TEXT" | jq -r '.[] | "• \(.facility): " + (.courts | map("Court \(.courtNumber)\(if .covered == "V" then " (covered)" else "" end)") | join(", "))')
fi

# Build additional filters info
FILTERS=""
if [ "$COVERED_ONLY" = "true" ]; then
  FILTERS="${FILTERS}• Covered courts only\n"
fi
if [ -n "$COURT_NUMBERS" ] && [ "$COURT_NUMBERS" != "{}" ]; then
  FILTERS="${FILTERS}• Specific court numbers filtered\n"
fi

# Build message with search details
read -r -d '' MESSAGE << EOF || true
🎾 Tennis listener update (changed)

📋 Search Parameters:
• Courts: ${COURTS}
• Date: ${WHEN_DAY}/${WHEN_MONTH}/${WHEN_YEAR}
• Time range: ${HOUR_RANGE_START}:00 - ${HOUR_RANGE_END}:00
${FILTERS}
🎾 Facilities with Availability:
${AVAILABLE_COURTS}

⚠️ IMPORTANT: These are facilities with SOME availability during the time range.
Specific court/time availability must be verified on https://tennis.paris.fr
EOF

# Build JSON payload properly using Python
PAYLOAD=$(python3 -c "import sys, json; text = sys.stdin.read()[:3500]; print(json.dumps({'text': text}))" <<< "$MESSAGE")
echo "=== JSON Payload to send ==="
echo "$PAYLOAD"
echo "============================"

# Send notification
curl -s -X POST -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$WEBHOOK_URL"

echo ""
echo "✓ Notification sent successfully"

#!/bin/bash

# Load .env file if it exists
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

# Configuration variables with defaults
hourRangeStart=${HOUR_RANGE_START:-9}
hourRangeEnd=${HOUR_RANGE_END:-22}
whenDay=${WHEN_DAY:-23}
whenMonth=${WHEN_MONTH:-05}
whenYear=${WHEN_YEAR:-2021}
courts=${COURTS:-"Philippe Auguste,Candie,Thiéré,La Faluère"}

# Check if the configured date is in the past
target_date="${whenYear}-${whenMonth}-${whenDay}"
current_date=$(date +%Y-%m-%d)

if [[ "$target_date" < "$current_date" ]]; then
  echo "[]"
  echo "Date ${whenDay}/${whenMonth}/${whenYear} is in the past. Skipping availability check." >&2
  exit 0
fi

# Build jq filter for court names
IFS=',' read -ra COURT_ARRAY <<< "$courts"
jq_filter='[.features[] | select(.properties.available and ('
first=true
for court in "${COURT_ARRAY[@]}"; do
  if [ "$first" = true ]; then
    jq_filter="${jq_filter}.properties.general._nomSrtm==\"${court}\""
    first=false
  else
    jq_filter="${jq_filter} or .properties.general._nomSrtm==\"${court}\""
  fi
done
jq_filter="${jq_filter})) | .properties.general | {nom: ._nomSrtm, id: ._id}]"

json=$(curl -s 'https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&action=ajax_disponibilite_map' \
  --data-raw "hourRange=${hourRangeStart}-${hourRangeEnd}&when=${whenDay}%2F${whenMonth}%2F${whenYear}"'&selCoating%5B%5D=96&selCoating%5B%5D=2095&selCoating%5B%5D=94&selCoating%5B%5D=1324&selCoating%5B%5D=2016&selCoating%5B%5D=92&selInOut%5B%5D=V&selInOut%5B%5D=F' \
| jq "$jq_filter")

if [[ "$json" != "$(cat /tmp/tennis.json 2>/dev/null)" ]]
then
  echo "$json" > /tmp/tennis.json
  echo "####################################################" >&2
  echo "########### New value:" >&2
  echo "$json" >&2
fi

# Always output the json to stdout for the GitHub Action workflow
echo "$json"

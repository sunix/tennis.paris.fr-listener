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
courtNumbers=${COURT_NUMBERS:-""}
coveredOnly=${COVERED_ONLY:-false}
twoHours=${TWO_HOURS:-false}

# Check if the configured date is in the past
target_date=$(printf "%04d-%02d-%02d" "$whenYear" "$whenMonth" "$whenDay")
current_date=$(date +%Y-%m-%d)

# Use timestamp comparison for reliable date comparison (comparing at midnight)
target_timestamp=$(date -d "$target_date" +%s 2>/dev/null)
if [ -z "$target_timestamp" ]; then
  echo "Error: Invalid date configuration: ${whenDay}/${whenMonth}/${whenYear}" >&2
  exit 1
fi
current_timestamp=$(date -d "$current_date" +%s)

if [[ $target_timestamp -lt $current_timestamp ]]; then
  echo "[]"
  echo "Date ${whenDay}/${whenMonth}/${whenYear} is in the past. Skipping availability check." >&2
  exit 0
fi

# Fetch data from API
raw_json=$(curl -s 'https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&action=ajax_disponibilite_map' \
  --data-raw "hourRange=${hourRangeStart}-${hourRangeEnd}&when=${whenDay}%2F${whenMonth}%2F${whenYear}"'&selCoating%5B%5D=96&selCoating%5B%5D=2095&selCoating%5B%5D=94&selCoating%5B%5D=1324&selCoating%5B%5D=2016&selCoating%5B%5D=92&selInOut%5B%5D=V&selInOut%5B%5D=F')

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
jq_filter="${jq_filter})) | {facility: .properties.general._nomSrtm, facilityId: .properties.general._id, courts: [.properties.courts[] | {courtNumber: ._formattedAirNum, courtName: ._airNom, covered: ._airCvt}]}]"

# Apply initial filter
json=$(echo "$raw_json" | jq "$jq_filter")

# Apply court number filter if specified
# Format: COURT_NUMBERS='{"La Faluère": [5,6,7,8,17,18,19,20,21], "Alain Mimoun": [1,2,3]}'
if [ -n "$courtNumbers" ] && [ "$courtNumbers" != "{}" ]; then
  # For each facility, filter courts to only include the specified court numbers
  # - Get the list of allowed court numbers for each facility from $filters
  # - If a facility has allowed numbers, keep only courts whose number is in that list
  # - If a facility has no allowed numbers specified, keep all courts for that facility
  # - Remove facilities that end up with no courts after filtering
  json=$(echo "$json" | jq --argjson filters "$courtNumbers" '[.[] | . as $facility | .courts |= map(select(
    ($filters[$facility.facility] // []) as $allowedNumbers |
    if ($allowedNumbers | length) > 0 then
      .courtNumber as $num | $allowedNumbers | index($num) != null
    else
      true
    end
  )) | select(.courts | length > 0)]')
fi

# Apply covered-only filter if specified
if [ "$coveredOnly" = "true" ]; then
  json=$(echo "$json" | jq '[.[] | .courts |= map(select(.covered == "V")) | select(.courts | length > 0)]')
fi

if [[ "$json" != "$(cat /tmp/tennis.json 2>/dev/null)" ]]
then
  echo "$json" > /tmp/tennis.json
  echo "####################################################" >&2
  echo "########### New value:" >&2
  echo "$json" >&2
fi

# Always output the json to stdout for the GitHub Action workflow
echo "$json"

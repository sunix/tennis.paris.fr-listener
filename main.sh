#!/bin/bash



json=$(curl 'https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&action=ajax_disponibilite_map' \
  --data-raw 'hourRange=12-14&when=21%2F05%2F2021&selCoating%5B%5D=96&selCoating%5B%5D=2095&selCoating%5B%5D=94&selCoating%5B%5D=1324&selCoating%5B%5D=2016&selCoating%5B%5D=92&selInOut%5B%5D=V&selInOut%5B%5D=F' \
| jq '.features[] | select(.properties.available and (.properties.general._nomSrtm=="Philippe Auguste" or .properties.general._nomSrtm=="Candie" or .properties.general._nomSrtm=="Thiéré")) | .properties.general | {nom: ."_nomSrtm", id: ."_id"}')

if [[ "$json" != "$(cat /tmp/tennis.json)" ]]
then
  echo "$json" > /tmp/tennis.json
  echo "####################################################\n########### New value: \n$json"
  curl -s \
  --form-string "token=$PUSHOVER_APP_TOKEN" \
  --form-string "user=$PUSHOVER_USER_KEY" \
  --form-string "message=Nouveau tennis dispo ! \n$json" \
  https://api.pushover.net/1/messages.json
fi

#!/bin/bash

hourRangeStart=9
hourRangeEnd=22
whenDay=23
whenMonth=05
whenYear=2021

json=$(curl 'https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&action=ajax_disponibilite_map' \
  --data-raw "hourRange=${hourRangeStart}-${hourRangeEnd}&when=${whenDay}%2F${whenMonth}%2F${whenYear}"'&selCoating%5B%5D=96&selCoating%5B%5D=2095&selCoating%5B%5D=94&selCoating%5B%5D=1324&selCoating%5B%5D=2016&selCoating%5B%5D=92&selInOut%5B%5D=V&selInOut%5B%5D=F' \
| jq '.features[] | select(.properties.available and (.properties.general._nomSrtm=="Philippe Auguste" or .properties.general._nomSrtm=="Candie" or .properties.general._nomSrtm=="Thiéré")) | .properties.general | {nom: ."_nomSrtm", id: ."_id"}')

if [[ "$json" != "$(cat /tmp/tennis.json)" ]]
then
  echo "$json" > /tmp/tennis.json
  echo "####################################################\n########### New value: \n$json"
  if [ -z "$json" ]
  then
	  message="🏠👿 Pas de court dispo le "$(date --date=${whenYear}-${whenMonth}-${whenDay} +%A\ %d\ %B\ %Y)
  else
    message="🎾🎉 Voici la liste des courts de tennis dispo le "$(date --date=${whenYear}-${whenMonth}-${whenDay} +%A\ %d\ %B\ %Y)
  fi
  curl -s \
  --form-string "token=$PUSHOVER_APP_TOKEN" \
  --form-string "user=$PUSHOVER_USER_KEY" \
  --form-string "message=${message} entre ${hourRangeStart}h et ${hourRangeEnd}h !
$json" \
  https://api.pushover.net/1/messages.json
fi

#!/bin/bash

if [ $# -lt 2 ]
then
        echo "Usage : $0 {import, export, etc.} {dev, experimonth}"
        exit
fi

APPID=app12860619
PORT=10089
HOST=linus.mongohq.com
PASSWORD=b22c046546e7e360f2885df0d45ad72e
USERNAME=heroku

case "$2" in
experimonth)
	APPID=app12860619
	PORT=10089
	HOST=linus.mongohq.com
	USERNAME=heroku
	PASSWORD=c40e91f65205ed699d253c42e73c176a
	;;
dev)
	echo "Dev is the default"
	;;
*)
	echo "Must specify a remote."
	;;
esac
	
	
case "$1" in
shell)
	mongo $HOST:$PORT/$APPID --username $USERNAME --password $PASSWORD
	;;
export)
	mongodump --host $HOST --port $PORT --username $USERNAME --password $PASSWORD --db $APPID --out bin/mongo.$2
	;;
import)
	echo "Importing from $2"
	DATE=`date "+%Y-%m-%d-%H-%M-%S"`
	OLD_NAME="dev_e_bluepane_com-$DATE"
	mongo dev_e_bluepane_com --eval "db.copyDatabase('dev_e_bluepane_com', '$OLD_NAME')"
	mongo dev_e_bluepane_com --eval "db.dropDatabase()"
	mongorestore --host localhost -d dev_e_bluepane_com "bin/mongo.$2/$APPID"
	;;
clear)
	echo "Clearing database..."
	DATE=`date "+%Y-%m-%d-%H-%M-%S"`
	OLD_NAME="dev_e_bluepane_com-$DATE"
	mongo dev_e_bluepane_com --eval "db.copyDatabase('dev_e_bluepane_com', '$OLD_NAME'); db.dropDatabase();"
	echo "Done."
	;;
esac

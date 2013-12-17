#!/bin/bash

if [ $# -lt 2 ]
then
        echo "Usage : $0 {import, export, etc.} {dev, experimonth}"
        exit
fi

#MONGO_URL:          mongodb://heroku:b22c046546e7e360f2885df0d45ad72e@linus.mongohq.com:10089/app12860619
#MONGOHQ_URL:        mongodb://heroku:myEb51rOB8pZovUUMdZLvO-8Zcz4qAKztkCSg6fI-WxVW8wc4fOotLNhSeg6KxOfYeh6ZBHyrcPn7hduT804lg@linus.mongohq.com:10089/app12860619
APPID=app12860619
PORT=10089
HOST=linus.mongohq.com
PASSWORD=myEb51rOB8pZovUUMdZLvO-8Zcz4qAKztkCSg6fI-WxVW8wc4fOotLNhSeg6KxOfYeh6ZBHyrcPn7hduT804lg
USERNAME=heroku

case "$2" in
mls-experimonth)
	APPID=app12860143
	PORT=10004
	HOST=linus.mongohq.com
	USERNAME=heroku
	PASSWORD=V5cjPqgjBqJm8cQjYOWB-FuUGBNQs41p1TkHem9QHGjoFwAS72yWmEl9V_B-aitby0FU-TnkmUVCPQcpgCZiNg
	# mongodb://heroku:V5cjPqgjBqJm8cQjYOWB-FuUGBNQs41p1TkHem9QHGjoFwAS72yWmEl9V_B-aitby0FU-TnkmUVCPQcpgCZiNg@linus.mongohq.com:10004/app12860143
	;;
mls-testing-experimonth)
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
importToLocal)
	echo "Importing from $2"
	DATE=`date "+%Y-%m-%d-%H-%M-%S"`
	OLD_NAME="experimonth-$DATE"
	mongo experimonth --eval "db.copyDatabase('experimonth', '$OLD_NAME')"
	# mongo experimonth --eval "db.collection.remove()"
	mongo experimonth --eval "var collectionNames = db.getCollectionNames(); for(var i = 0, len = collectionNames.length; i < len ; i++){ var collectionName = collectionNames[i]; if(collectionName.indexOf('system') == -1){ db[collectionName].drop(); } }"
	mongorestore --host localhost -d experimonth "bin/mongo.$2/$APPID"
	;;
importToRemote)
	echo "Importing into $2 from bin/mongo.$3/$4 in 15s..."
	echo "THIS WILL DESTROY ALL DATA ON $2!!!"
	sleep 15s
	echo "Removing all collections except user on $HOST:$PORT/$APPID in 5s"
	sleep 5s
	# mongo $HOST:$PORT/$APPID --username $USERNAME --password $PASSWORD --eval "db.collection.remove()"
	mongo $HOST:$PORT/$APPID --username $USERNAME --password $PASSWORD --eval "var collectionNames = db.getCollectionNames(); for(var i = 0, len = collectionNames.length; i < len ; i++){ var collectionName = collectionNames[i]; if(collectionName.indexOf('system') == -1){ db[collectionName].drop(); } }"

	echo "Executing mongorestore on $HOST:$PORT/$APPID from bin/mongo.$3/$4 in 5s"
	echo "mongorestore --drop --host $HOST --port $PORT -d $APPID -u $USERNAME -p $PASSWORD bin/mongo.$3/$4"
	sleep 5s
	mongorestore --drop --host $HOST --port $PORT -d $APPID -u $USERNAME -p $PASSWORD "bin/mongo.$3/$4"
	;;
clear)
	echo "Clearing database..."
	DATE=`date "+%Y-%m-%d-%H-%M-%S"`
	OLD_NAME="experimonth-$DATE"
	mongo experimonth --eval "db.copyDatabase('experimonth', '$OLD_NAME'); db.dropDatabase();"
	echo "Done."
	;;
esac

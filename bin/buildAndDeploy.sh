#!/bin/bash

if [ $# -lt 1 ]
then
	APPS=`heroku apps | tail -n +2 | tr "\n" " "`
        echo "Usage : $0 {$APPS}"
        exit
fi

#bin/build.sh
heroku push -b https://github.com/heroku/heroku-buildpack-nodejs.git\#diet --app $1

#!/bin/bash

if [ $# -lt 1 ]
then
	APPS=`heroku apps | tail -n +2 | tr "\n" " "`
        echo "Usage : $0 {$APPS}"
        exit
fi

#bin/build.sh
#heroku push -b https://github.com/heroku/heroku-buildpack-nodejs.git\#diet --app $1
#heroku push -b https://github.com/heroku/heroku-buildpack-nodejs.git\#legacy --app $1
heroku push -b https://github.com/BluePaneLabs/heroku-buildpack-nodejs.git\#diet+bower+grunt --app $1
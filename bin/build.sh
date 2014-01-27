#!/bin/bash 

set -e

echo "Running 'bower install'"
./node_modules/.bin/bower cache clean
./node_modules/.bin/bower update
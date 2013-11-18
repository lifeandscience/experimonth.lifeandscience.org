#!/bin/bash 

set -e

echo "Running 'bower install'"
bower install

if [ -f ./public/lib/tinymce/.gitignore ]; then
	echo "Removing public/lib/tinymce/.gitignore"
	rm public/lib/tinymce/.gitignore
fi

if [ ! -f ./public/lib/tinymce/js/tinymce/jquery.tinymce.min.js ]; then
	echo "Running 'jake -C public/lib/tinymce -f public/lib/tinymce/Jakefile.js'"
	jake -C public/lib/tinymce -f public/lib/tinymce/Jakefile.js
fi

echo "Running lessc on style.less"
lessc public/css/style.less > public/css/style.css

echo "Running the requirejs optimizer"
cd public && r.js -o build.js && cd ..

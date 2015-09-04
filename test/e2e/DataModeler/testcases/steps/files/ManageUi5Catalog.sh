#!/bin/bash

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

cd $DIR

echo deleting zip file
echo 
echo 

rm -v *.zip

echo
echo
echo Downloading latest version
echo
echo

node downloadUi5Catalog.js

echo
echo Download phase finished
echo
echo

echo Importing phase
echo
echo 

if ls ./sapui5-dist-*-opt-static.zip 1> /dev/null 2>&1; then
	FILE="$(ls *.zip)"
	echo "$FILE will be imported" 
	node importUI5Catalog.js --filePath $FILE
else
    echo "No UI5 Catalog to import" 
fi
echo 
echo 
echo Importing phase finished

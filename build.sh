#!/bin/sh

echo "Start building"
mkdir -p dist
cp -r images inject.css inject.js manifest.json dist
echo "Compressing"
zip -r dist/out.zip dist
#!/bin/bash
echo 'Get node version'
nodev=`node -v`
node=`echo ${nodev:1}`
sed -i "s/REPLACE_ME/${node}/g" package.bkp.json
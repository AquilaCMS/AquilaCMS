#!/bin/bash
echo 'rm package.json'
rm -f /var/app/current/package.json
rm -f /var/app/current/package-lock.json

echo 'cp package.bkp.json'
cp /var/app/current/package.bkp.json /var/app/current/package.json
chown -R webapp:webapp /var/app/current/package.json
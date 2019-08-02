#!/bin/bash

echo $MONGODB_STORAGE

echo "RESTART MONGOD SERVICE: sudo service mongod restart!"
sudo service mongod restart

echo "WAIT 30 seconds after restart!!!"
sleep 30

#echo "CHECK SERVICE STATUS"
#sudo service mongod status

echo "Kill mobile devices controller if it already started!"
lsof -i tcp:8700 | grep -v grep | grep -v PID | awk '{print $2}' | xargs kill -9 || true

echo "START: ns-server 2>&1 > $HOME/logs/server.log &"
ns-server
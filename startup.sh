#!/bin/bash
echo "Starting Quanta Portal..."
cd /home/site/wwwroot
export HOSTNAME=0.0.0.0
export PORT=8080
exec node server.js

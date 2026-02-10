#!/bin/bash
echo "Starting Quanta Portal..."
cd /home/site/wwwroot
exec node .next/standalone/server.js

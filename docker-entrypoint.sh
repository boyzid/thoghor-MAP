#!/bin/sh
set -e

echo "Applying database migrations (prisma migrate deploy)..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Starting application..."
exec "$@"

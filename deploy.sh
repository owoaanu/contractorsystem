#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo " Edo State University Contractor Registration Portal"
echo " Production Release & Deployment Script"
echo " Target Subpath: /contractor"
echo "=========================================================="

# 1. Verify Node and NPM
echo "--> Checking Node.js and NPM..."
node -v
npm -v

# 2. Backend Dependencies & Database Initialization
echo "--> Installing backend dependencies and initializing database..."
cd "$SCRIPT_DIR/backend"
npm install
npm run init-db

# 3. Frontend Production Build
echo "--> Building frontend with subpath base /contractor/..."
cd "$SCRIPT_DIR/frontend"
npm install
npm run build

echo "=========================================================="
echo " Production build completed successfully!"
echo " Frontend distribution is ready in: $SCRIPT_DIR/frontend/dist"
echo ""
echo " Next steps:"
echo " 1. Start/Reload Node.js with PM2:"
echo "    cd backend && pm2 start ecosystem.config.js --env production"
echo "    (or: pm2 reload ecosystem.config.js --env production)"
echo ""
echo " 2. Add the Apache Reverse Proxy configuration block for /contractor"
echo "    (before the root ASP.NET Core 'ProxyPass /' rule) and reload Apache:"
echo "    sudo systemctl reload apache2"
echo "=========================================================="

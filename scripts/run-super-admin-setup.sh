#!/bin/bash

echo "🔧 Setting up Super Admin for KG Components..."
echo ""

# Load environment variables if .env.local exists
if [ -f .env.local ]; then
  echo "📁 Loading environment variables from .env.local"
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Run the setup script
echo "🚀 Running super admin setup script..."
pnpm tsx scripts/setup-super-admin.ts

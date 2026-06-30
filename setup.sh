#!/bin/bash

if [ -f ".env" ]; then
  echo "Root .env file exists. ✅"
else
  echo "Root .env file does not exist. Creating from .env.example..."
  cp .env.example .env
  echo ".env created. ✅"
fi

echo "Syncing .env to all workspaces..."
for dir in apps/* packages/*; do
  if [ -d "$dir" ]; then
    target="$dir/.env"
    # Forcefully create a symlink to the root .env (overwriting any existing divergent file)
    ln -sf ../../.env "$target"
    echo "  Synced $target"
  fi
done

echo "Environment setup complete! 🚀"
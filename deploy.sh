#!/bin/bash
set -e

REPO="git@github.com:jvm985/test.git"
SERVER="irishof.cloud"
DEST="/opt/irishof/9-test"

echo "🚀 Committing and pushing to GitHub..."
git add .
git commit -m "Deploy update $(date)" || true
git push origin main

echo "🌐 Deploying to $SERVER..."
ssh $SERVER "mkdir -p $DEST && cd $DEST && \
    if [ ! -d .git ]; then git clone $REPO .; else git pull origin main; fi && \
    sudo docker compose up -d --build"

echo "✅ Deployment voltooid!"
echo "Check de app op https://test.irishof.cloud"

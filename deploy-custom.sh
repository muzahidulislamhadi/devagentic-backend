#!/bin/bash

# DevAgentic Custom Deployment Script
# This script builds and deploys your custom DevAgentic version with your logo changes

set -e

echo "🚀 Building and deploying custom DevAgentic version..."

# Stop existing containers if running
echo "📦 Stopping existing containers..."
cd docker
docker-compose -f docker-compose.custom.yaml down

# Build and start the custom version
echo "🔨 Building custom images (this may take a few minutes)..."
docker-compose -f docker-compose.custom.yaml build --no-cache

echo "🌟 Starting DevAgentic with your custom branding..."
docker-compose -f docker-compose.custom.yaml up -d

echo "✅ Custom DevAgentic deployment complete!"
echo "🌐 Your app should be available at: http://localhost"
echo "📊 Check status: docker-compose -f docker/docker-compose.custom.yaml ps"
echo "📋 View logs: docker-compose -f docker/docker-compose.custom.yaml logs -f"

# Wait for services to be healthy
echo "⏱️  Waiting for services to be ready..."
sleep 15

# Check if services are running
if docker-compose -f docker-compose.custom.yaml ps | grep -q "Up"; then
    echo "✅ Services are running successfully!"
    echo "🎉 Your custom DevAgentic is now live with your logo changes!"
else
    echo "❌ Some services may not be running. Check logs:"
    echo "docker-compose -f docker/docker-compose.custom.yaml logs"
fi

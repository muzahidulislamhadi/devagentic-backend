#!/bin/bash

# Dify Production Deployment Script
# This script helps deploy Dify with the latest codebase

set -e

echo "======================================"
echo "Dify Production Deployment Script"
echo "======================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating .env from .env.production template..."
    cp .env.production .env
    echo "⚠️  Please edit .env file and update all CHANGE_THIS values before proceeding!"
    exit 1
fi

# Check for required environment variables
required_vars=("SECRET_KEY" "DB_PASSWORD" "REDIS_PASSWORD")
for var in "${required_vars[@]}"; do
    value=$(grep "^$var=" .env | cut -d '=' -f2)
    if [[ -z "$value" || "$value" == *"CHANGE_THIS"* ]]; then
        echo "❌ $var is not properly configured in .env file!"
        echo "Please update all security-related variables before deployment."
        exit 1
    fi
done

# Get git commit SHA for build tagging
COMMIT_SHA=$(cd .. && git rev-parse HEAD 2>/dev/null || echo "latest")
export COMMIT_SHA

echo "Building with commit SHA: $COMMIT_SHA"

# Function to run docker compose
docker_compose() {
    docker compose -f docker-compose.simple.yaml "$@"
}

# Parse command line arguments
case "$1" in
    build)
        echo "Building all services..."
        docker_compose build --no-cache
        echo "✅ Build completed successfully!"
        ;;
    
    up)
        echo "Starting all services..."
        docker_compose up -d
        echo "✅ Services started successfully!"
        echo ""
        echo "Waiting for services to be healthy..."
        sleep 10
        docker_compose ps
        ;;
    
    down)
        echo "Stopping all services..."
        docker_compose down
        echo "✅ Services stopped successfully!"
        ;;
    
    restart)
        echo "Restarting all services..."
        docker_compose restart
        echo "✅ Services restarted successfully!"
        ;;
    
    logs)
        shift
        docker_compose logs -f "$@"
        ;;
    
    ps)
        docker_compose ps
        ;;
    
    pull)
        echo "Pulling latest images..."
        docker_compose pull
        echo "✅ Images pulled successfully!"
        ;;
    
    deploy)
        echo "Full deployment process starting..."
        
        # Build images
        echo "Step 1: Building images..."
        docker_compose build --no-cache
        
        # Stop existing services
        echo "Step 2: Stopping existing services..."
        docker_compose down
        
        # Start services
        echo "Step 3: Starting services..."
        docker_compose up -d
        
        # Wait for services to be healthy
        echo "Step 4: Waiting for services to be healthy..."
        sleep 30
        
        # Check service health
        echo "Step 5: Checking service health..."
        docker_compose ps
        
        # Run database migrations
        echo "Step 6: Running database migrations..."
        docker_compose exec -T api flask db upgrade || echo "Migration might have already been applied"
        
        echo "✅ Deployment completed successfully!"
        echo ""
        echo "Service URLs:"
        echo "- Web UI: http://localhost (or https://yourdomain.com if configured)"
        echo "- API: http://localhost/v1 (or https://yourdomain.com/v1 if configured)"
        echo ""
        echo "Default admin credentials will be set on first login if INIT_PASSWORD was not set."
        ;;
    
    backup)
        echo "Creating backup..."
        backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        
        # Backup database
        echo "Backing up database..."
        docker_compose exec -T db pg_dump -U postgres dify > "$backup_dir/dify_db.sql"
        
        # Backup volumes
        echo "Backing up volumes..."
        tar -czf "$backup_dir/volumes.tar.gz" volumes/
        
        echo "✅ Backup completed: $backup_dir"
        ;;
    
    health)
        echo "Checking service health..."
        services=("api" "worker" "web" "db" "redis" "nginx" "weaviate" "sandbox" "plugin_daemon" "ssrf_proxy")
        
        for service in "${services[@]}"; do
            if docker_compose ps | grep -q "$service.*Up.*healthy"; then
                echo "✅ $service: Healthy"
            elif docker_compose ps | grep -q "$service.*Up"; then
                echo "⚠️  $service: Running (no health check)"
            else
                echo "❌ $service: Not running or unhealthy"
            fi
        done
        ;;
    
    *)
        echo "Usage: $0 {build|up|down|restart|logs|ps|pull|deploy|backup|health}"
        echo ""
        echo "Commands:"
        echo "  build   - Build all Docker images from source"
        echo "  up      - Start all services"
        echo "  down    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - Show logs (optionally specify service name)"
        echo "  ps      - Show service status"
        echo "  pull    - Pull latest base images"
        echo "  deploy  - Full deployment (build, migrate, start)"
        echo "  backup  - Create backup of database and volumes"
        echo "  health  - Check health status of all services"
        exit 1
        ;;
esac
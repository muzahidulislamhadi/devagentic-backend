# Dify Production Deployment Guide

This guide provides instructions for deploying Dify in production using the latest codebase.

## Overview

The production deployment uses:
- `docker-compose.simple.yaml` - Simplified production-ready configuration
- `.env.production` - Production environment template
- `deploy-production.sh` - Deployment helper script

## Prerequisites

- Docker and Docker Compose installed
- Git (for tracking commit SHA)
- Sufficient server resources (minimum 4GB RAM, 2 CPU cores)
- Domain name (for HTTPS configuration)

## Quick Start

### 1. Prepare Environment

```bash
cd docker

# Copy the production environment template
cp .env.production .env

# Edit .env and update all CHANGE_THIS values
nano .env
```

### 2. Configure Security

**IMPORTANT**: You MUST change these values in `.env`:

```env
# Generate strong keys
SECRET_KEY=$(openssl rand -base64 42)
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
SANDBOX_API_KEY=$(openssl rand -base64 32)
PLUGIN_DAEMON_KEY=$(openssl rand -base64 32)
WEAVIATE_API_KEY=$(openssl rand -base64 32)
```

### 3. Configure Domain

Update these URLs with your actual domain:

```env
CONSOLE_API_URL=https://api.yourdomain.com
CONSOLE_WEB_URL=https://console.yourdomain.com
SERVICE_API_URL=https://api.yourdomain.com
APP_API_URL=https://api.yourdomain.com
APP_WEB_URL=https://app.yourdomain.com
FILES_URL=https://files.yourdomain.com
```

### 4. Deploy

```bash
# Make deployment script executable
chmod +x deploy-production.sh

# Full deployment (build, migrate, start)
./deploy-production.sh deploy
```

## Services Architecture

The production deployment includes:

| Service | Purpose | Port |
|---------|---------|------|
| API | Backend API service | 5001 |
| Worker | Celery worker for async tasks | - |
| Web | Frontend web application | 3000 |
| PostgreSQL | Main database | 5432 |
| Redis | Cache and message broker | 6379 |
| Nginx | Reverse proxy | 80/443 |
| Weaviate | Vector database | 8080 |
| Sandbox | Code execution environment | 8194 |
| Plugin Daemon | Plugin management | 5002 |
| SSRF Proxy | Security proxy | 3128 |

## Configuration Guide

### SSL/HTTPS Setup

1. **Using existing certificates**:
   ```env
   NGINX_HTTPS_ENABLED=true
   NGINX_SERVER_NAME=yourdomain.com
   NGINX_SSL_CERT_FILENAME=yourdomain.crt
   NGINX_SSL_CERT_KEY_FILENAME=yourdomain.key
   ```
   Place certificates in `./nginx/ssl/`

2. **Using Let's Encrypt (Certbot)**:
   ```env
   CERTBOT_EMAIL=admin@yourdomain.com
   CERTBOT_DOMAIN=yourdomain.com
   NGINX_ENABLE_CERTBOT_CHALLENGE=true
   ```

### Performance Tuning

1. **PostgreSQL** (adjust based on available RAM):
   ```env
   POSTGRES_MAX_CONNECTIONS=200
   POSTGRES_SHARED_BUFFERS=512MB      # 25% of RAM
   POSTGRES_WORK_MEM=8MB
   POSTGRES_MAINTENANCE_WORK_MEM=128MB
   POSTGRES_EFFECTIVE_CACHE_SIZE=8GB  # 50-75% of RAM
   ```

2. **Application Workers** (based on CPU cores):
   ```env
   SERVER_WORKER_AMOUNT=4      # 2 * CPU cores + 1
   CELERY_WORKER_AMOUNT=2
   CELERY_AUTO_SCALE=true
   CELERY_MAX_WORKERS=8
   CELERY_MIN_WORKERS=2
   ```

3. **Connection Pools**:
   ```env
   SQLALCHEMY_POOL_SIZE=50
   SQLALCHEMY_POOL_RECYCLE=3600
   ```

### File Upload Limits

```env
UPLOAD_FILE_SIZE_LIMIT=50          # MB
UPLOAD_FILE_BATCH_LIMIT=10
UPLOAD_IMAGE_FILE_SIZE_LIMIT=20    # MB
UPLOAD_VIDEO_FILE_SIZE_LIMIT=200   # MB
UPLOAD_AUDIO_FILE_SIZE_LIMIT=100   # MB
```

## Deployment Commands

```bash
# Build images from source
./deploy-production.sh build

# Start all services
./deploy-production.sh up

# Stop all services
./deploy-production.sh down

# Restart services
./deploy-production.sh restart

# View logs
./deploy-production.sh logs
./deploy-production.sh logs api    # Specific service

# Check service health
./deploy-production.sh health

# Create backup
./deploy-production.sh backup
```

## Monitoring

### Health Checks

All services include built-in health checks:

```bash
./deploy-production.sh health
```

### Logs

Monitor logs for issues:

```bash
# All services
./deploy-production.sh logs -f

# Specific service
./deploy-production.sh logs api -f
./deploy-production.sh logs worker -f
```

### Resource Usage

```bash
docker stats
```

### Optional: Sentry Integration

For production error tracking:

```env
API_SENTRY_DSN=https://xxx@sentry.io/xxx
WEB_SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Backup & Recovery

### Automated Backup

```bash
# Create backup
./deploy-production.sh backup
```

This creates a timestamped backup in `backups/` containing:
- PostgreSQL database dump
- All volume data

### Backup Schedule (Cron)

```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * cd /path/to/docker && ./deploy-production.sh backup
```

### Recovery Process

```bash
# 1. Stop services
./deploy-production.sh down

# 2. Restore database
docker compose -f docker-compose.simple.yaml run --rm db \
  psql -U postgres -d dify < backups/[timestamp]/dify_db.sql

# 3. Restore volumes
tar -xzf backups/[timestamp]/volumes.tar.gz

# 4. Start services
./deploy-production.sh up
```

## Troubleshooting

### Common Issues

1. **Service won't start**
   - Check logs: `./deploy-production.sh logs [service]`
   - Verify .env configuration
   - Check disk space: `df -h`
   - Check port conflicts: `netstat -tulpn | grep -E '80|443|5432|6379'`

2. **Database connection issues**
   - Ensure PostgreSQL is healthy: `./deploy-production.sh health`
   - Verify credentials match in .env
   - Check network: `docker network ls`

3. **Performance issues**
   - Monitor resources: `docker stats`
   - Check logs for errors
   - Adjust worker counts and PostgreSQL settings

4. **SSL/HTTPS issues**
   - Verify certificate files exist in `./nginx/ssl/`
   - Check Nginx logs: `./deploy-production.sh logs nginx`
   - Ensure domain DNS points to server

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=DEBUG
DEBUG=true
FLASK_DEBUG=true
ENABLE_REQUEST_LOGGING=true
```

## Security Best Practices

1. **Change all default passwords** in .env
2. **Use HTTPS** in production (configure SSL)
3. **Firewall configuration**:
   - Only expose ports 80/443
   - Restrict database access
4. **Regular updates**:
   ```bash
   git pull
   ./deploy-production.sh build
   ./deploy-production.sh deploy
   ```
5. **Backup regularly** and test recovery
6. **Monitor logs** for suspicious activity
7. **Use strong passwords** (minimum 32 characters)
8. **Enable rate limiting** in Nginx

## Scaling Considerations

### Horizontal Scaling

For high-load environments:

1. **Database**: Use managed PostgreSQL with read replicas
2. **Redis**: Use Redis Cluster or managed Redis
3. **Application**: Deploy multiple API/Worker instances
4. **Load Balancer**: Use external load balancer for multiple Nginx instances

### Vertical Scaling

Adjust based on load:

```env
# Increase for high load
SERVER_WORKER_AMOUNT=8
CELERY_WORKER_AMOUNT=4
POSTGRES_MAX_CONNECTIONS=400
SQLALCHEMY_POOL_SIZE=100
```

## Email Configuration

For production email support:

```env
MAIL_TYPE=smtp
SMTP_SERVER=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USERNAME=noreply@yourdomain.com
SMTP_PASSWORD=your_smtp_password
SMTP_USE_TLS=true
MAIL_DEFAULT_SEND_FROM=noreply@yourdomain.com
```

## Support

- Documentation: https://docs.dify.ai
- Issues: https://github.com/langgenius/dify/issues
- Community: https://discord.gg/dify

## Notes

- The deployment uses build context to ensure latest code is used
- All services include health checks for reliability
- Volumes are persisted in `./volumes/` directory
- Logs are available via Docker Compose
- The setup is optimized for production use with proper restart policies
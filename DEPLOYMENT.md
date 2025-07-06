# DevAgentic Custom Deployment Guide

## 🎯 Problem & Solution

**Problem**: When using `docker-compose up`, you get the old Dify logos because Docker Compose pulls pre-built images from Docker Hub (version 1.5.1) that don't contain your custom DevAgentic branding.

**Solution**: Build your own custom Docker images with your logo changes included.

## 🚀 Quick Deployment (Recommended)

### Option 1: One-Command Deployment
```bash
./deploy-custom.sh
```

This script will:
- Stop any existing containers
- Build custom images with your DevAgentic branding
- Start the application with your custom logos
- Verify everything is working

### Option 2: Manual Deployment
```bash
# Navigate to docker directory
cd docker

# Build and start custom images
docker-compose -f docker-compose.custom.yaml build --no-cache
docker-compose -f docker-compose.custom.yaml up -d

# Check status
docker-compose -f docker-compose.custom.yaml ps
```

## 📋 What's Different?

### Original docker-compose.yaml
```yaml
web:
  image: langgenius/dify-web:1.5.1  # Pre-built image from Docker Hub
api:
  image: langgenius/dify-api:1.5.1  # Pre-built image from Docker Hub
```

### Custom docker-compose.custom.yaml
```yaml
web:
  build:
    context: ../web
    dockerfile: Dockerfile  # Builds YOUR code with YOUR logos
api:
  build:
    context: ../api
    dockerfile: Dockerfile  # Builds YOUR code with YOUR changes
```

## 🔍 Troubleshooting

### If you still see old logos:
1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Force rebuild**: `docker-compose -f docker/docker-compose.custom.yaml build --no-cache`
3. **Check container logs**: `docker-compose -f docker/docker-compose.custom.yaml logs web`

### If build fails:
1. **Clean Docker cache**: `docker system prune -a`
2. **Check Docker space**: `docker system df`
3. **Rebuild from scratch**: `docker-compose -f docker/docker-compose.custom.yaml build --no-cache`

## ⚡ Development Mode (Alternative)

For development, you can also run locally:
```bash
# Start API
cd api && python -m flask run --host=0.0.0.0 --port=5001

# Start Web (in another terminal)
cd web && npm run dev
```

## 🎉 Result

After deployment, you'll see:
- ✅ DevAgentic logo everywhere (not Dify)
- ✅ Dark mode by default
- ✅ Billing always enabled
- ✅ All DevAgentic branding and URLs
- ✅ No community/GitHub references

## 🔧 Maintenance

### Update your custom version:
1. Make your code changes
2. Run `./deploy-custom.sh` again
3. That's it!

### Check what's running:
```bash
docker-compose -f docker/docker-compose.custom.yaml ps
```

### View logs:
```bash
docker-compose -f docker/docker-compose.custom.yaml logs -f
```

### Stop everything:
```bash
docker-compose -f docker/docker-compose.custom.yaml down
```

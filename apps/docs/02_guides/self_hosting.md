# Self-Hosting Guide

Run your own Envkit instance for complete control over your environment variable management. This guide covers deploying and maintaining a self-hosted Envkit installation.

## Architecture Overview

A self-hosted Envkit deployment consists of:

- **Database**: Convex for data storage and real-time sync
- **Web Application**: Next.js frontend for user interface
- **API**: Hono-based API endpoints
- **CLI**: Node.js client for command-line operations

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or later
- **Database**: Convex (hosted or self-hosted)
- **Web Server**: Support for Node.js applications
- **SSL Certificate**: For secure HTTPS connections
- **Domain**: Custom domain for your instance

### Infrastructure

- **Cloud Provider**: AWS, GCP, Azure, or DigitalOcean
- **Container Runtime**: Docker/Podman support
- **Reverse Proxy**: Nginx or Traefik recommended
- **Monitoring**: Logging and metrics collection

## Quick Start with Docker

### Using Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  envkit-web:
    image: envkit/web:latest
    ports:
      - "3000:3000"
    environment:
      - CONVEX_URL=your-convex-deployment-url
      - NEXTAUTH_SECRET=your-secret-key
      - NEXTAUTH_URL=https://envkit.yourdomain.com
    depends_on:
      - convex

  envkit-convex:
    image: envkit/convex:latest
    environment:
      - CONVEX_SELF_HOST=true
      - DATABASE_URL=your-database-connection-string
```

### Environment Configuration

Create `.env.local` for the web application:

```bash
# Convex Configuration
CONVEX_URL=https://your-convex-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# Authentication
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=https://envkit.yourdomain.com

# Encryption
ENCRYPTION_PEPPER=your-server-side-encryption-pepper

# Custom Domain
PUBLIC_WEB_APP_URL=https://envkit.yourdomain.com
```

## Manual Installation

### 1. Clone the Repository

```bash
git clone https://github.com/envkit/envkit.git
cd envkit
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install CLI
cd apps/cli && npm install && npm run build

# Install Web App
cd ../web && npm install && npm run build

# Install Database Schema
cd ../db && npm install
```

### 3. Set Up Convex

```bash
# Initialize Convex project
npx convex dev --once

# Deploy schema
npx convex deploy
```

### 4. Configure Environment

```bash
# Copy environment template
cp apps/web/.env.example apps/web/.env.local

# Edit with your values
nano apps/web/.env.local
```

### 5. Start Services

```bash
# Start web application
cd apps/web && npm run dev

# In another terminal, start Convex
npx convex dev
```

## Database Setup

### Convex Configuration

1. **Create Convex Account**: Sign up at [convex.dev](https://convex.dev)
2. **Create Project**: `npx convex dev --name my-envkit`
3. **Deploy Schema**:

```bash
cd packages/db
npx convex deploy
```

### Database Schema

The schema includes:
- **Users**: User accounts and authentication
- **Teams**: Team management and permissions
- **Projects**: Project definitions and metadata
- **Variables**: Encrypted environment variables
- **Devices**: Device registration and tokens
- **Audit Logs**: Activity tracking

## Web Application Deployment

### Build for Production

```bash
cd apps/web
npm run build
npm start
```

### Using PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name envkit.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## CLI Configuration

### Pointing CLI to Self-Hosted Instance

```bash
# Set custom web app URL
export PUBLIC_WEB_APP_URL=https://envkit.yourdomain.com

# Authenticate with your instance
envkit auth
```

### Custom CLI Builds

```bash
cd apps/cli
npm run build

# Install locally
npm link
```

## Security Considerations

### Encryption Keys

- **Server Pepper**: Generate a strong random key for `ENCRYPTION_PEPPER`
- **Auth Secrets**: Use cryptographically secure random strings
- **Database Encryption**: Ensure database connections use TLS

### Network Security

- **HTTPS Only**: Enforce SSL/TLS for all connections
- **Firewall**: Restrict access to necessary ports
- **API Rate Limiting**: Implement rate limiting on API endpoints

### Access Control

- **Team Isolation**: Ensure proper team-based access controls
- **Audit Logging**: Enable comprehensive audit trails
- **Regular Updates**: Keep all components updated

## Backup and Recovery

### Database Backups

```bash
# Convex provides automatic backups
# For additional backups:
npx convex export --path ./backups/$(date +%Y%m%d)
```

### Configuration Backup

```bash
# Backup environment files
tar -czf envkit-config-$(date +%Y%m%d).tar.gz \
  apps/web/.env.local \
  ~/.envkit/
```

### Disaster Recovery

1. **Restore Database**: Import from Convex backup
2. **Restore Configuration**: Deploy environment files
3. **Rebuild Applications**: Rebuild and redeploy services
4. **Update DNS**: Ensure domain points to new instance

## Monitoring and Maintenance

### Health Checks

```bash
# Web application health
curl https://envkit.yourdomain.com/api/health

# Database connectivity
npx convex run health:check
```

### Logs

```bash
# Application logs
pm2 logs envkit-web

# Convex logs
npx convex logs

# System logs
journalctl -u envkit
```

### Updates

```bash
# Update all components
git pull origin main
npm install
npm run build

# Deploy updates
pm2 restart all
```

## Scaling

### Horizontal Scaling

- **Web Application**: Use load balancer with multiple instances
- **Database**: Convex handles scaling automatically
- **File Storage**: Use external storage for large deployments

### Performance Optimization

```bash
# Enable caching
# Configure CDN for static assets
# Optimize database queries
# Implement connection pooling
```

## Troubleshooting

### Common Issues

**Authentication Failures:**
- Check `NEXTAUTH_URL` matches your domain
- Verify SSL certificate validity
- Ensure Convex URL is correct

**Database Connection Errors:**
- Confirm Convex deployment is active
- Check network connectivity
- Verify database credentials

**CLI Connection Issues:**
- Ensure `PUBLIC_WEB_APP_URL` is set correctly
- Check firewall rules
- Verify SSL certificates

### Debug Mode

Enable debug logging:

```bash
# Web application
DEBUG=* npm run dev

# CLI
DEBUG=envkit:* envkit command
```

## Support and Community

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Contribute to self-hosting guides
- **Community Forum**: Discuss deployments and best practices

## Migration from Cloud

### Data Export

```bash
# Export from cloud instance
npx convex export --path ./migration-data
```

### Import to Self-Hosted

```bash
# Import to new instance
npx convex import --path ./migration-data
```

### Update Client Configurations

```bash
# Update CLI configuration
export PUBLIC_WEB_APP_URL=https://selfhosted.envkit.com
envkit auth  # Re-authenticate
```

## Cost Considerations

### Infrastructure Costs

- **Compute**: Web application hosting ($10-50/month)
- **Database**: Convex pricing (varies by usage)
- **Domain/SSL**: Certificate and DNS costs
- **Monitoring**: Logging and alerting services

### Operational Costs

- **Maintenance**: Developer time for updates
- **Support**: Internal team support
- **Backup**: Storage costs for backups

Self-hosting typically costs $50-200/month depending on scale and requirements.
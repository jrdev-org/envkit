# CLI Setup Guide

This guide covers installing, configuring, and troubleshooting the Envkit CLI. Learn how to set up the CLI for different environments and customize its behavior.

## Installation

### System Requirements

- **Node.js**: Version 18.0.0 or later
- **Operating System**: Linux, macOS, or Windows
- **Network**: Internet access for cloud synchronization

### Installing via npm

Install globally for system-wide access:

```bash
npm install -g @envkit/cli
```

Install locally in a project:

```bash
npm install --save-dev @envkit/cli
```

### Installing via Yarn

```bash
yarn global add @envkit/cli
```

### Installing via pnpm

```bash
pnpm add -g @envkit/cli
```

### Verifying Installation

Check the installation:

```bash
envkit --version
# Output: 0.1.0

envkit --help
# Shows available commands
```

## Configuration

### Configuration Directory

Envkit stores configuration in `~/.envkit/`:

```
~/.envkit/
├── auth-token      # Authentication token
├── device-info     # Device registration data
└── projects/       # Linked project metadata
```

### Environment Variables

Configure Envkit behavior with environment variables:

```bash
# Custom web app URL (for self-hosted instances)
export PUBLIC_WEB_APP_URL=https://envkit.mycompany.com

# Debug logging
export DEBUG=envkit:*

# Custom config directory
export ENVKIT_CONFIG_DIR=/path/to/custom/config
```

### Device Registration

Envkit automatically registers your device during authentication. Device information includes:

- Operating system and version
- Device hostname
- Unique device identifier
- User agent string

## Authentication Setup

### Browser-Based Authentication

```bash
envkit auth
```

This opens your browser and guides you through:
1. Account creation/login
2. Device authorization
3. Token generation and storage

### Token Management

View current authentication status:

```bash
envkit whoami
```

Logout and clear tokens:

```bash
envkit logout
```

### Multiple Accounts

For multiple Envkit accounts:

```bash
# Use different config directories
ENVKIT_CONFIG_DIR=~/.envkit-work envkit auth
ENVKIT_CONFIG_DIR=~/.envkit-personal envkit auth
```

## Project Setup

### Initializing Projects

```bash
cd my-project
envkit init
```

This creates:
- `.env.local` file (if it doesn't exist)
- Project link in `~/.envkit/projects/`
- `.gitignore` entry for `.env.local`

### Migrating Existing Projects

If you have existing `.env` files:

```bash
# Envkit automatically detects and offers migration
envkit init

# Or manually consolidate files
cp .env .env.local
```

### Multiple Environments

Manage different stages:

```bash
# Development
envkit init  # Creates project-stage link

# Production
envkit push production
envkit pull production
```

## Advanced Configuration

### Custom Environment File

By default, Envkit uses `.env.local`. Change this:

```bash
# Envkit doesn't support custom filenames yet
# Use symlinks as workaround
ln -s .env.production .env.local
```

### Git Integration

Ensure sensitive files are ignored:

```bash
echo ".env.local" >> .gitignore
echo ".envkit/" >> .gitignore
```

### CI/CD Integration

For automated environments:

```bash
# Login with token (if supported)
echo $ENVKIT_TOKEN | envkit auth

# Or use share tokens
envkit link $SHARE_TOKEN
envkit pull
```

## Troubleshooting

### Installation Issues

**Command not found after installation:**

```bash
# Check PATH
which envkit

# Reinstall with verbose output
npm install -g @envkit/cli --verbose

# Check npm global bin directory
npm config get prefix
```

**Permission errors:**

```bash
# Use sudo (not recommended)
sudo npm install -g @envkit/cli

# Or install locally
npm install @envkit/cli
./node_modules/.bin/envkit --version
```

### Authentication Problems

**Browser doesn't open:**

```bash
# Manual authentication
# Copy the URL from the error message
# Or set BROWSER environment variable
export BROWSER=chromium
envkit auth
```

**Token storage fails:**

```bash
# Check permissions on config directory
ls -la ~/.envkit/

# Recreate config directory
rm -rf ~/.envkit
mkdir -p ~/.envkit
```

### Network Issues

**Connection timeouts:**

```bash
# Check network connectivity
curl -I https://envkit.cloud

# Configure proxy (if needed)
export HTTPS_PROXY=http://proxy.company.com:8080
```

**SSL certificate errors:**

```bash
# Disable SSL verification (not recommended for production)
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Project Linking Issues

**"No linked projects found":**

```bash
# Check if project is initialized
ls ~/.envkit/projects/

# Reinitialize
envkit init
```

**Hash mismatches:**

```bash
# Force resync
envkit pull --force
# Note: --force may not be implemented, check status first
envkit status
```

### Sync Conflicts

**Resolve merge conflicts:**

```bash
# Check differences
envkit diff

# Choose resolution strategy
envkit sync  # Interactive conflict resolution
```

## Performance Optimization

### Large Projects

For projects with many variables:

```bash
# Use selective operations
envkit get SPECIFIC_VAR
envkit set ANOTHER_VAR value
```

### Slow Syncs

```bash
# Check network latency
ping envkit.cloud

# Use compression (if supported)
# Currently not configurable
```

## Development Setup

### Building from Source

```bash
git clone https://github.com/envkit/cli.git
cd cli
npm install
npm run build
npm link  # For local development
```

### Debug Mode

Enable detailed logging:

```bash
DEBUG=envkit:* envkit command

# Or set globally
export DEBUG=envkit:*
```

### Testing

Run the test suite:

```bash
npm test
```

## Uninstallation

Remove Envkit completely:

```bash
# Remove globally
npm uninstall -g @envkit/cli

# Clean config directory
rm -rf ~/.envkit

# Remove local installations
rm -rf node_modules/@envkit/cli
```

## Support

For additional help:

- Check the [CLI Reference](03_reference/cli-reference.md)
- View debug logs with `DEBUG=envkit:*`
- Report issues on GitHub
- Contact support for account-specific issues
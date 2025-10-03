# Sharing Guide

Envkit enables secure collaboration through share tokens and project linking. This guide covers how to share projects with team members and external collaborators while maintaining security and access control.

## Share Tokens

Share tokens are time-limited, permission-controlled access credentials that allow others to link to your projects without becoming full team members.

### Creating Share Tokens

Generate a share token for your current project:

```bash
envkit share
```

This creates a token with default settings (1 hour expiration, single-use, no persistent linking).

### Token Options

Customize token behavior with options:

```bash
# Single-use token (default)
envkit share --single-use

# Allow persistent linking for ongoing collaboration
envkit share --allow-link

# Custom time-to-live (TTL)
envkit share --ttl 24h
envkit share --ttl 7d
envkit share --ttl 30m

# Combine options
envkit share --allow-link --ttl 168h --single-use
```

### TTL Format

Time-to-live supports multiple units:
- `s` - seconds
- `m` - minutes
- `h` - hours
- `d` - days

Examples:
- `30s` - 30 seconds
- `15m` - 15 minutes
- `24h` - 24 hours
- `7d` - 7 days

## Linking to Shared Projects

Recipients use the share token to link to your project:

```bash
envkit link <share-token>
```

### Link Behavior

Depending on token permissions:

**Single-use tokens (default)**:
- One-time access to pull variables
- No persistent connection to the project
- Variables are copied locally but not synced

**Persistent linking tokens** (`--allow-link`):
- Creates ongoing connection to the project
- Enables future `pull` and `sync` operations
- Recipients become collaborators on the project

## Permission Levels

### Team Members
Full access to all projects in the team:
- Create, modify, and delete variables
- Manage project settings
- Generate share tokens
- View audit logs

### Linked Collaborators
Limited access through persistent links:
- Pull and sync variables
- View project variables (read-only)
- Cannot modify or delete variables
- Cannot generate share tokens

### Token Recipients (Single-use)
Temporary access:
- One-time pull of variables
- No ongoing access
- Cannot sync or modify

## Managing Collaborators

### Viewing Linked Projects

Check which projects are linked locally:

```bash
# Projects are tracked in ~/.envkit/projects/
ls ~/.envkit/projects/
```

### Unlinking Projects

Remove local connection to a shared project:

```bash
envkit unlink
```

Options:
- Remove local link only (default)
- Delete project entirely (`--force`)

## Security Considerations

### Token Lifecycle
- Tokens expire automatically based on TTL
- Single-use tokens become invalid after first use
- Expired tokens cannot be reused

### Access Control
- Share tokens don't grant team membership
- Recipients cannot access other team projects
- Audit logs track all token usage

### Best Practices
- Use short TTLs for sensitive projects
- Prefer single-use tokens for one-time sharing
- Use persistent linking only for trusted collaborators
- Regularly audit linked projects

## Collaboration Workflows

### Development Team Sharing
```bash
# Developer shares staging environment
envkit share --allow-link --ttl 168h
# Team members link and sync
envkit link <token>
envkit sync
```

### Contractor Access
```bash
# Limited, time-bound access
envkit share --single-use --ttl 8h
# Contractor gets one-time variable dump
envkit link <token>
```

### CI/CD Integration
```bash
# Generate deployment token
envkit share --allow-link --ttl 720h
# CI system links and pulls for builds
envkit link <token>
envkit pull production
```

## Troubleshooting

### Invalid Token Errors
- Verify token hasn't expired
- Check for typos in token string
- Ensure single-use token hasn't been used

### Permission Denied
- Confirm token allows the requested operation
- Check if you're already linked to the project
- Verify project still exists

### Sync Issues with Linked Projects
- Ensure `--allow-link` was used when creating token
- Check token hasn't expired
- Verify you have network access

## Advanced Usage

### Multiple Environments
Share different stages separately:

```bash
# Share development environment
envkit share --stage development --allow-link

# Share production (more restrictive)
envkit share --stage production --single-use --ttl 1h
```

### Batch Sharing
For multiple collaborators:

```bash
# Generate multiple tokens as needed
for collaborator in alice bob charlie; do
  echo "Token for $collaborator:"
  envkit share --allow-link --ttl 24h
done
```

## Audit and Monitoring

All sharing activities are logged:
- Token creation with permissions and TTL
- Token usage and recipient information
- Link operations and collaborator access

Monitor sharing activity through the web dashboard or audit logs.
# CLI Reference

Complete reference for all Envkit CLI commands, options, and usage examples.

## Global Options

Options available for all commands:

- `--help, -h`: Display help information
- `--version, -V`: Display version number

## Authentication Commands

### `envkit auth`

Authenticate with Envkit using browser-based OAuth.

```bash
envkit auth
```

**Description**: Initiates authentication flow by opening your default browser and guiding you through login and device registration.

**Options**: None

**Examples**:
```bash
envkit auth  # Start authentication
```

### `envkit logout`

Log out of the current session.

```bash
envkit logout
```

**Description**: Revokes the current authentication token and clears local session data.

**Aliases**: `bye`

**Examples**:
```bash
envkit logout
```

### `envkit whoami`

Display information about the current user.

```bash
envkit whoami
```

**Description**: Shows the name of the currently authenticated user.

**Examples**:
```bash
envkit whoami
# Output: Logged in as john.doe@example.com
```

## Project Management Commands

### `envkit init`

Initialize a new project or link an existing one.

```bash
envkit init [options]
```

**Description**: Sets up a new Envkit project or links to an existing project. Creates `.env.local` file and establishes project linkage.

**Options**:
- `--link`: Force link mode (skip interactive prompt)
- `--create`: Force create mode (skip interactive prompt)

**Examples**:
```bash
envkit init                    # Interactive mode
envkit init --create          # Create new project
envkit init --link            # Link existing project
```

### `envkit unlink`

Remove the link between local project and Envkit.

```bash
envkit unlink [options]
```

**Description**: Disconnects the current project from Envkit. Optionally deletes the project entirely.

**Aliases**: `delete-all`

**Options**:
- `-f, --force`: Delete project and all variables from database

**Examples**:
```bash
envkit unlink              # Remove local link only
envkit unlink --force      # Delete project entirely
```

## Variable Management Commands

### `envkit push`

Upload local environment variables to the cloud.

```bash
envkit push [stage]
```

**Description**: Encrypts and uploads local `.env.local` variables to the cloud. Compares with existing variables and shows changes.

**Arguments**:
- `stage`: Target stage (e.g., "production", "staging")

**Examples**:
```bash
envkit push                    # Push to default stage
envkit push production         # Push to production stage
```

### `envkit pull`

Download environment variables from the cloud.

```bash
envkit pull [stage]
```

**Description**: Downloads and decrypts variables from the cloud, updating the local `.env.local` file.

**Arguments**:
- `stage`: Source stage to pull from

**Examples**:
```bash
envkit pull                    # Pull from default stage
envkit pull staging            # Pull from staging
```

### `envkit sync`

Synchronize local and cloud variables with conflict resolution.

```bash
envkit sync [stage]
```

**Description**: Intelligently syncs variables between local and cloud. Handles conflicts interactively when both sides have changes.

**Arguments**:
- `stage`: Stage to sync

**Examples**:
```bash
envkit sync                    # Sync default stage
envkit sync production         # Sync production stage
```

### `envkit get`

Retrieve the value of a specific variable.

```bash
envkit get <key> [stage]
```

**Description**: Displays the value of a variable. Pulls from cloud if not available locally.

**Arguments**:
- `key`: Variable name (required)
- `stage`: Stage to get from

**Examples**:
```bash
envkit get DATABASE_URL
envkit get API_KEY production
```

### `envkit set`

Create or update a single environment variable.

```bash
envkit set <key> <value>
```

**Description**: Sets a variable locally and pushes the change to the cloud.

**Arguments**:
- `key`: Variable name (required)
- `value`: Variable value (required)

**Examples**:
```bash
envkit set DEBUG true
envkit set API_URL https://api.example.com
```

### `envkit delete`

Remove a single environment variable.

```bash
envkit delete <key> [stage] [options]
```

**Description**: Deletes a variable from both local and cloud storage.

**Arguments**:
- `key`: Variable name (required)
- `stage`: Stage to delete from

**Options**:
- `-a, --allow-override`: Skip confirmation prompt

**Examples**:
```bash
envkit delete OLD_VAR
envkit delete TEMP_KEY --allow-override
```

## Status and Debugging Commands

### `envkit status`

Show synchronization status between local and cloud.

```bash
envkit status [stage]
```

**Description**: Displays hash comparison between local and cloud variables.

**Arguments**:
- `stage`: Stage to check

**Examples**:
```bash
envkit status
# Output:
# Project: myapp (development)
# Local hash: abc123...
# Server hash: def456...
# Local and cloud are out of sync. Run `envkit diff` for details.
```

### `envkit diff`

Show differences between local and cloud variables.

```bash
envkit diff [stage]
```

**Description**: Lists variables that differ between local and cloud storage.

**Arguments**:
- `stage`: Stage to compare

**Examples**:
```bash
envkit diff
# Output:
# Locally added: NEW_VAR
# Removed locally: OLD_VAR
# Changed values: UPDATED_VAR
```

## Sharing Commands

### `envkit share`

Generate a share token for project collaboration.

```bash
envkit share [options]
```

**Description**: Creates a time-limited token that others can use to link to your project.

**Options**:
- `-s, --single-use`: Token can only be used once
- `-a, --allow-link`: Allow persistent linking (not just one-time pull)
- `-t, --ttl <string>`: Token time-to-live (default: "1h")

**Examples**:
```bash
envkit share                                    # Basic share token
envkit share --single-use --ttl 30m            # 30-minute single-use
envkit share --allow-link --ttl 24h            # 24-hour persistent link
```

### `envkit link`

Link to a project using a share token.

```bash
envkit link <token>
```

**Description**: Uses a share token to connect to a shared project and download its variables.

**Arguments**:
- `token`: Share token (required)

**Examples**:
```bash
envkit link abc123def456
```

## Exit Codes

- `0`: Success
- `1`: General error
- `2`: Authentication required
- `3`: Network error
- `4`: Invalid arguments

## Environment Variables

The CLI respects these environment variables:

- `PUBLIC_WEB_APP_URL`: Custom Envkit instance URL (for self-hosting)
- `DEBUG`: Enable debug logging (`envkit:*`)
- `ENVKIT_CONFIG_DIR`: Custom configuration directory (default: `~/.envkit`)

## File Locations

### Configuration Files

- `~/.envkit/auth-token`: Authentication token storage
- `~/.envkit/device-info`: Device registration data
- `~/.envkit/projects/`: Linked project metadata

### Project Files

- `.env.local`: Local environment variables (created by `envkit init`)
- `.gitignore`: Automatically updated to exclude `.env.local`

## Error Messages

### Common Errors

**"No linked projects found"**
- Run `envkit init` to initialize or link a project

**"Authentication required"**
- Run `envkit auth` to authenticate

**"Network error"**
- Check internet connection
- Verify Envkit service availability

**"Invalid or expired token"**
- Request a new share token from the project owner

## Command Aliases

- `auth` → `login`
- `logout` → `bye`
- `unlink` → `delete-all`

## Examples

### Complete Workflow

```bash
# Set up new project
cd my-project
envkit auth
envkit init

# Add variables
echo "API_KEY=secret" >> .env.local
envkit push

# Collaborate
envkit share --allow-link --ttl 24h
# Share the generated token with team members

# Team member joins
envkit link <shared-token>
envkit pull

# Ongoing development
envkit sync  # Regular synchronization
```

### CI/CD Integration

```bash
# In CI pipeline
envkit link $ENVKIT_SHARE_TOKEN
envkit pull production
# Use variables in build process
```

### Environment Management

```bash
# Development
envkit sync development

# Staging deployment
envkit push staging

# Production deployment
envkit pull production
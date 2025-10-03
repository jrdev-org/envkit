# Configuration Schema Reference

Complete reference for Envkit configuration files, environment variable formats, and data schemas.

## Environment File Format

### `.env.local` Format

Envkit uses a standard dotenv format for local environment variables:

```bash
# Basic variables
DATABASE_URL=postgresql://localhost:5432/myapp
API_KEY=sk-1234567890abcdef
DEBUG=true

# Variables with special characters
SPECIAL_CHARS=Value with spaces and "quotes"
MULTILINE=Line1\nLine2\nLine3

# Project metadata (auto-generated)
PROJECT_NAME=my-application
PROJECT_STAGE=development
```

**Rules**:
- One variable per line: `KEY=VALUE`
- No spaces around `=`
- Values with spaces must be quoted: `KEY="value with spaces"`
- Comments start with `#`
- Empty lines are ignored
- Variables are case-sensitive
- UTF-8 encoding

### Escaping Special Characters

```bash
# Quotes in values
QUOTED="Value with \"quotes\" and spaces"

# Newlines
MULTILINE="Line 1\nLine 2\nLine 3"

# Backslashes
PATH="C:\\Program Files\\App"
```

## Configuration Files

### CLI Configuration (`~/.envkit/`)

#### `auth-token`

JSON format containing authentication data:

```json
{
  "token": "jwt-authentication-token",
  "userId": "user-id-string",
  "deviceId": "device-uuid",
  "sessionId": "session-id",
  "expiresAt": 1640995200000,
  "createdAt": 1640908800000
}
```

#### `device-info`

Device registration information:

```json
{
  "deviceId": "unique-device-identifier",
  "platform": "linux|darwin|win32",
  "arch": "x64|arm64",
  "hostname": "machine-hostname",
  "username": "system-username"
}
```

#### `projects/{projectName}-{stage}`

Linked project metadata:

```json
{
  "_id": "project-id",
  "name": "project-name",
  "stage": "development",
  "teamId": "team-id",
  "linkedAt": 1640908800000,
  "hash": "sha256-hash-of-env-file"
}
```

### Web Application Configuration

#### `.env.local` (Web App)

```bash
# Convex Configuration
CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Authentication
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=https://envkit.yourdomain.com

# Encryption
ENCRYPTION_PEPPER=server-side-encryption-key

# Custom URLs
PUBLIC_WEB_APP_URL=https://envkit.yourdomain.com
```

## Database Schema

### Users Table

```typescript
{
  _id: Id<"users">;
  authId: string; // from auth provider
  name: string;
  email: string;
  tier: "free" | "pro";
  updatedAt: number;
}
```

**Indexes**:
- `by_authId`: [authId]
- `by_email`: [email]

### Teams Table

```typescript
{
  _id: Id<"teams">;
  name: string;
  ownerId: Id<"users">;
  lastAction?: string;
  state: "active" | "deleted" | "suspended" | "full";
  deletedAt?: number;
  type: "personal" | "organization";
  maxMembers?: number;
  updatedAt: number;
}
```

**Indexes**:
- `by_owner`: [ownerId]
- `by_owner_and_name`: [ownerId, name]

### Salts Table

```typescript
{
  _id: Id<"salts">;
  teamId: Id<"teams">;
  salt: string;
}
```

**Indexes**:
- `by_team`: [teamId]

### Team Members Table

```typescript
{
  _id: Id<"teamMembers">;
  teamId: Id<"teams">;
  userId: Id<"users">;
  role: "admin" | "member" | "viewer";
  removedAt?: number;
  joinedAt: number;
  updatedAt: number;
}
```

**Indexes**:
- `by_team`: [teamId]
- `by_user`: [userId]
- `by_team_and_user`: [teamId, userId]

### Projects Table

```typescript
{
  _id: Id<"projects">;
  name: string;
  stage: string;
  teamId: Id<"teams">;
  variableSummary: Array<{
    name: string;
    updatedAt: number;
  }>;
  lastAction?: string;
  deletedAt?: number;
  updatedAt: number;
}
```

**Indexes**:
- `by_team`: [teamId]
- `by_team_and_name_and_stage`: [teamId, name, stage]

### Share Tokens Table

```typescript
{
  _id: Id<"shareTokens">;
  projectId: Id<"projects">;
  createdBy: Id<"users">;
  tokenHash: string;
  allowLink?: boolean;
  expiresAt: number;
  singleUse: boolean;
  usedAt?: number;
  consumedBy?: string;
  createdAt: number;
  lastAccessedAt?: number;
}
```

**Indexes**:
- `by_token_hash`: [tokenHash]
- `by_project`: [projectId]
- `by_creator`: [createdBy]

### Variables Table

```typescript
{
  _id: Id<"variables">;
  projectId: Id<"projects">;
  name: string;
  value: string; // encrypted
  branch?: string;
  deletedAt?: number;
  updatedBy?: Id<"users">;
  updatedAt: number;
}
```

**Indexes**:
- `by_project`: [projectId]
- `by_project_and_name`: [projectId, name]

### Devices Table

```typescript
{
  _id: Id<"devices">;
  userId: Id<"users">;
  deviceId: string;
  deviceName?: string;
  platform: string;
  arch: string;
  username: string;
  nodeVersion: string;
  cliVersion: string;
  lastUsedAt: number;
  lastAction?: string;
  deletedAt?: number;
}
```

**Indexes**:
- `by_user`: [userId]
- `by_user_and_deviceId`: [userId, deviceId]
- `by_deviceId`: [deviceId]

### CLI Sessions Table

```typescript
{
  _id: Id<"cliSessions">;
  userId: Id<"users">;
  deviceId: string;
  permanentToken?: string;
  tempToken?: string;
  status: "pending" | "authenticated" | "revoked";
  revokedAt?: number;
  expiresAt: number;
  lastUsedAt: number;
  lastAction?: string;
  userAgent?: string;
}
```

**Indexes**:
- `by_user`: [userId]
- `by_deviceId`: [deviceId]
- `by_temp_token`: [tempToken]
- `by_permanent_token`: [permanentToken]

## Environment Variables

### CLI Environment Variables

- `PUBLIC_WEB_APP_URL`: Custom Envkit web application URL (default: cloud instance)
- `DEBUG`: Enable debug logging (e.g., `envkit:*`)
- `ENVKIT_CONFIG_DIR`: Custom configuration directory (default: `~/.envkit`)

### Web Application Environment Variables

- `CONVEX_URL`: Convex backend deployment URL
- `NEXT_PUBLIC_CONVEX_URL`: Public Convex URL for client-side access
- `NEXTAUTH_SECRET`: NextAuth.js secret key
- `NEXTAUTH_URL`: NextAuth.js base URL
- `ENCRYPTION_PEPPER`: Server-side encryption pepper
- `PUBLIC_WEB_APP_URL`: Public web application URL

## API Response Schemas

### Authentication Response

```typescript
{
  userId: Id<"users">;
  sessionId: Id<"cliSessions">;
  expiresAt: number;
  createdAt: number;
}
```

### Project Variables Response

```typescript
{
  vars: Array<{
    name: string;
    value: string; // encrypted
  }>;
  hash: string;
  changed: boolean;
}
```

### Share Token Response

```typescript
{
  token: string;
  expiresAt: number;
  allowLink: boolean;
  singleUse: boolean;
}
```

## File Formats

### Audit Log Format

```json
{
  "timestamp": 1640908800000,
  "project": "project-name",
  "file": ".env.local",
  "vars": {
    "VARIABLE_NAME": {
      "action": "added|overridden|deleted",
      "value": "variable-value"
    }
  }
}
```

### Encrypted Variable Format

```json
{
  "v": "v1",
  "iv": "base64-encoded-iv",
  "ct": "base64-encoded-ciphertext",
  "tag": "base64-encoded-auth-tag"
}
```

## Validation Rules

### Variable Names

- Must be valid environment variable names
- Can contain letters, numbers, and underscores
- Cannot start with a number
- Case-sensitive
- Maximum length: 255 characters

### Project Names

- Can contain letters, numbers, hyphens, and underscores
- Case-sensitive
- Maximum length: 100 characters
- Must be unique within a team and stage

### Team Names

- Can contain letters, numbers, spaces, hyphens, and underscores
- Case-sensitive
- Maximum length: 50 characters
- Must be unique per owner

## Migration Guides

### From v0.x to v1.x

- Encryption format changed from simple base64 to AES-GCM
- Configuration directory moved from `~/.envkit-cli` to `~/.envkit`
- Project linking format updated to include hash verification

### Schema Updates

When the database schema is updated:

1. Deploy new schema to Convex
2. Run data migrations if needed
3. Update client applications
4. Test backward compatibility
# API Reference

Complete reference for Envkit's API endpoints, including Convex mutations/queries and REST API routes.

## Convex API

Envkit uses Convex as its backend database and API layer. All operations are performed through Convex mutations and queries.

### Authentication

#### `cli.init`

Initialize a CLI authentication session.

**Type**: Mutation

**Arguments**:
```typescript
{
  deviceId: string;
  userId: Id<"users">;
  userAgent?: string;
  tempToken: string;
}
```

**Returns**:
```typescript
{
  initialized: Doc<"cliSessions">;
  tempToken: string;
}
```

**Description**: Creates a pending CLI session for authentication. Called when starting the CLI auth process.

#### `cli.completeAuth`

Complete the authentication process.

**Type**: Mutation

**Arguments**:
```typescript
{
  sessionId: Id<"cliSessions">;
  userId: Id<"users">;
  tempToken: string;
  permanentToken: string;
}
```

**Returns**:
```typescript
{
  authenticated: Doc<"cliSessions">;
  permanentToken: string;
}
```

**Description**: Finalizes authentication after user signs in through the web interface.

#### `cli.validateToken`

Validate an authentication token.

**Type**: Mutation

**Arguments**:
```typescript
{
  permanentToken: string;
}
```

**Returns**:
```typescript
{
  valid: boolean;
  reason: "not_authenticated" | "expired" | "valid";
}
```

**Description**: Checks if a CLI token is valid and updates last-used timestamp.

#### `cli.revokeSession`

Revoke a CLI session (logout).

**Type**: Mutation

**Arguments**:
```typescript
{
  sessionId: Id<"cliSessions">;
  userId: Id<"users">;
}
```

**Returns**:
```typescript
{
  success: boolean;
}
```

**Description**: Marks a CLI session as revoked.

### Projects

#### `projects.getVars`

Get project variables with change detection.

**Type**: Query

**Arguments**:
```typescript
{
  projectId: Id<"projects">;
  localHash: string;
  callerId: Id<"users">;
  branch?: string;
}
```

**Returns**:
```typescript
{
  changed: boolean;
  hash: string;
  vars: Array<{
    name: string;
    value: string; // encrypted
  }>;
}
```

**Description**: Retrieves encrypted variables if local hash differs from server hash.

#### `projects.addVars`

Add or update multiple variables.

**Type**: Mutation

**Arguments**:
```typescript
{
  projectId: Id<"projects">;
  callerId: Id<"users">;
  vars: Array<{
    name: string;
    value: string; // encrypted
  }>;
}
```

**Returns**:
```typescript
{
  updatedProject: Doc<"projects">;
  additions: any[];
  removals: any[];
  conflicts: any[];
}
```

**Description**: Bulk update variables, handling additions, removals, and conflicts.

#### `projects.setVar`

Set a single variable.

**Type**: Mutation

**Arguments**:
```typescript
{
  projectId: Id<"projects">;
  callerId: Id<"users">;
  name: string;
  value: string; // encrypted
}
```

**Returns**:
```typescript
{
  updated: boolean;
  updatedProject: Doc<"projects">;
}
```

**Description**: Create or update a single variable.

#### `projects.deleteVar`

Delete a single variable.

**Type**: Mutation

**Arguments**:
```typescript
{
  projectId: Id<"projects">;
  callerId: Id<"users">;
  name: string;
}
```

**Returns**:
```typescript
updatedProject: Doc<"projects">;
```

**Description**: Soft-delete a variable.

#### `projects.create`

Create a new project.

**Type**: Mutation

**Arguments**:
```typescript
{
  name: string;
  stage: string;
  teamId: Id<"teams">;
}
```

**Returns**:
```typescript
project: Doc<"projects">;
```

**Description**: Creates a new project with default PROJECT_NAME and TEAM_NAME variables.

#### `projects.list`

List projects in a team.

**Type**: Query

**Arguments**:
```typescript
{
  teamId: Id<"teams">;
}
```

**Returns**:
```typescript
Doc<"projects">[];
```

**Description**: Returns all active projects in a team, sorted by name.

#### `projects.get`

Get a single project.

**Type**: Query

**Arguments**:
```typescript
{
  projectId: Id<"projects">;
}
```

**Returns**:
```typescript
project: Doc<"projects">;
```

**Description**: Retrieves project details if not deleted.

### Sharing

#### `projects.createShareToken`

Create a share token for project access.

**Type**: Mutation

**Arguments**:
```typescript
{
  projectId: Id<"projects">;
  callerId: Id<"users">;
  allowLink?: boolean;
  expiresAt: number;
  singleUse?: boolean;
}
```

**Returns**:
```typescript
{
  token: string;
  expiresAt: number;
}
```

**Description**: Generates a time-limited token for sharing project access.

#### `projects.consumeShareToken`

Consume a share token.

**Type**: Mutation

**Arguments**:
```typescript
{
  token: string;
  consumerDevice: string;
  consumerId?: Id<"users">;
}
```

**Returns**:
```typescript
{
  project: Doc<"projects">;
  allowLink: boolean;
  variables: Doc<"variables">[];
}
```

**Description**: Validates and consumes a share token, returning project and variables.

#### `projects.listShareTokens`

List active share tokens for a project.

**Type**: Query

**Arguments**:
```typescript
{
  projectId: Id<"projects">;
  userId: Id<"users">;
}
```

**Returns**:
```typescript
Array<{
  id: Id<"shareTokens">;
  tokenPreview: string;
  createdBy: Id<"users">;
  createdAt: number;
  expiresAt: number;
  isExpired: boolean;
  allowLink: boolean;
  usedAt?: number;
  consumedBy?: string;
}>;
```

**Description**: Lists share tokens with metadata.

#### `projects.revokeShareToken`

Revoke a share token.

**Type**: Mutation

**Arguments**:
```typescript
{
  tokenId: Id<"shareTokens">;
  userId: Id<"users">;
}
```

**Returns**:
```typescript
{
  success: boolean;
}
```

**Description**: Deletes a share token, preventing further use.

### Teams

#### `teams.get`

Get teams for a user.

**Type**: Query

**Arguments**:
```typescript
{
  id: Id<"users">;
}
```

**Returns**:
```typescript
Doc<"teams">[];
```

**Description**: Returns all teams where the user is a member.

### Users

#### `users.get`

Get user information.

**Type**: Query

**Arguments**:
```typescript
{
  id: Id<"users">;
}
```

**Returns**:
```typescript
user: Doc<"users">;
```

**Description**: Retrieves user profile information.

### Devices

#### `devices.register`

Register a new device.

**Type**: Mutation

**Arguments**:
```typescript
{
  userId: Id<"users">;
  deviceId: string;
  platform: string;
  arch: string;
  username: string;
  nodeVersion: string;
  cliVersion: string;
}
```

**Returns**:
```typescript
{
  updated: boolean;
}
```

**Description**: Registers or updates device information.

#### `devices.getById`

Get device by ID.

**Type**: Query

**Arguments**:
```typescript
{
  deviceId: string;
}
```

**Returns**:
```typescript
device: Doc<"devices"> | "not_found";
```

**Description**: Retrieves device information or "not_found" if not registered.

## REST API

Envkit provides REST API endpoints for specific operations.

### POST `/api/decrypt`

Decrypt encrypted variables.

**Request Body**:
```typescript
{
  teamId: Id<"teams">;
  callerid: Id<"users">;
  encryptedVariables: Array<{
    name: string;
    value: string;
  }>;
}
```

**Response**:
```typescript
Array<{
  name: string;
  value: string; // decrypted
}>;
```

**Description**: Decrypts variables using team encryption keys. Used internally by the CLI.

**Status Codes**:
- `200`: Success
- `400`: Invalid request or decryption failed

### GET `/api/hello`

Health check endpoint.

**Response**:
```json
{
  "message": "Hello from Next.js!"
}
```

**Description**: Simple health check for the web application.

## Error Handling

All API endpoints follow consistent error handling:

### Convex Errors

Convex operations throw errors with descriptive messages:

- `"Project not found"`
- `"You are not authorized to access this project"`
- `"Team not found"`
- `"User not found"`

### HTTP Errors

REST endpoints return standard HTTP status codes:

- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

API endpoints implement rate limiting to prevent abuse:

- CLI authentication: 10 requests per minute per device
- Variable operations: 100 requests per minute per user
- Share token creation: 20 requests per hour per user

## Authentication

All API calls require authentication:

### CLI Authentication

CLI operations use session-based authentication with permanent tokens stored locally.

### Web Authentication

Web operations use NextAuth.js with configurable providers.

## Data Types

### IDs

Envkit uses Convex's typed IDs:

```typescript
type Id<T extends TableNames> = string & { __tableName: T };
```

Example IDs:
- `Id<"users">`: User ID
- `Id<"projects">`: Project ID
- `Id<"teams">`: Team ID

### Timestamps

All timestamps are Unix epoch milliseconds (number).

### Enums

```typescript
// User tiers
type Tier = "free" | "pro";

// Team types
type TeamType = "personal" | "organization";

// Team states
type TeamState = "active" | "deleted" | "suspended" | "full";

// Member roles
type MemberRole = "admin" | "member" | "viewer";

// CLI session status
type SessionStatus = "pending" | "authenticated" | "revoked";
```

## Webhooks

Envkit currently does not support webhooks. All operations are synchronous.

## SDKs

Official SDKs are not yet available. Use the Convex client directly for programmatic access.

## Versioning

API versioning follows Convex's deployment model. Breaking changes are deployed as new Convex deployments with updated URLs.
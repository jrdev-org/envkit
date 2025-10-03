# Quickstart Guide

Get up and running with Envkit in minutes. This guide will walk you through installing the CLI, authenticating, and managing your first environment variables.

## Prerequisites

- Node.js 18.0.0 or later
- A web browser for authentication
- Access to the Envkit service (cloud or self-hosted instance)

## Installation

Install the Envkit CLI globally using npm:

```bash
npm install -g @envkit/cli
```

Or using yarn:

```bash
yarn global add @envkit/cli
```

Verify the installation:

```bash
envkit --version
```

## Authentication

Before using Envkit, you need to authenticate with your account:

```bash
envkit auth
```

This command will:
1. Open your default web browser
2. Redirect you to the Envkit authentication page
3. Generate and store an authentication token locally

Once authenticated, you can check your login status:

```bash
envkit whoami
```

## Creating Your First Project

Navigate to your project directory and initialize Envkit:

```bash
cd my-project
envkit init
```

The init command will prompt you to:
1. Choose whether to create a new project or link an existing one
2. Select a team (if you have multiple)
3. Specify a project name and stage (e.g., "development", "production")

This creates a `.env.local` file in your project directory and links it to your Envkit project.

## Adding Environment Variables

Add your first environment variables to the `.env.local` file:

```bash
# .env.local
DATABASE_URL=postgresql://localhost:5432/myapp
API_KEY=your-secret-api-key
DEBUG=true
```

## Pushing Variables to the Cloud

Upload your local variables to the secure cloud storage:

```bash
envkit push
```

This encrypts your variables and stores them securely. You'll see a summary of changes (added, modified, removed).

## Pulling Variables

To retrieve the latest variables from the cloud:

```bash
envkit pull
```

This downloads and decrypts variables, updating your local `.env.local` file.

## Synchronizing Changes

For ongoing development, keep your local and cloud environments in sync:

```bash
envkit sync
```

This command intelligently handles conflicts and ensures both sides are up-to-date.

## Managing Individual Variables

Set a specific variable:

```bash
envkit set API_KEY new-secret-key
```

Get the value of a variable:

```bash
envkit get API_KEY
```

Delete a variable:

```bash
envkit delete OLD_VAR
```

## Checking Status

View the synchronization status between local and cloud:

```bash
envkit status
```

See differences between local and cloud variables:

```bash
envkit diff
```

## Sharing with Team Members

Generate a share token for collaborators:

```bash
envkit share --ttl 24h
```

Team members can then link to your project using:

```bash
envkit link <share-token>
```

## Next Steps

Now that you have the basics, explore these advanced topics:

- [Encryption Guide](02_guides/encryption.md) - Learn about Envkit's security model
- [Sharing Guide](02_guides/sharing.md) - Advanced collaboration features
- [CLI Setup](02_guides/cli-setup.md) - Configuration and customization
- [Self-Hosting](02_guides/self_hosting.md) - Run your own Envkit instance

For detailed command reference, see the [CLI Reference](03_reference/cli-reference.md).
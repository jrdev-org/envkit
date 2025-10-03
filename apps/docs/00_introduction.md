# Introduction

Welcome to **Envkit** - a modern CLI tool for secure, collaborative environment variable management. Envkit simplifies the way development teams handle sensitive configuration across multiple projects and environments.

## What is Envkit?

Envkit is a command-line interface that provides encrypted, cloud-synchronized environment variable storage with team collaboration features. It replaces insecure practices like committing secrets to version control or sharing sensitive data through insecure channels.

## Key Features

- **End-to-End Encryption**: All environment variables are encrypted using AES-256-GCM before storage
- **Team Collaboration**: Share projects securely with team members and external collaborators
- **Multi-Environment Support**: Manage different stages (development, staging, production) for each project
- **Cloud Synchronization**: Keep local and remote environments in sync with intelligent conflict resolution
- **Audit Trail**: Track all changes to environment variables with detailed logging
- **Device Management**: Secure authentication with device-specific tokens
- **Share Tokens**: Generate time-limited, permission-controlled access tokens for project sharing

## Why Envkit?

Traditional environment variable management often leads to security vulnerabilities and operational inefficiencies:

- **Security Risks**: Secrets committed to git repositories or shared via email/chat
- **Inconsistent Environments**: Manual synchronization between team members and environments
- **Access Control Issues**: No granular permissions for who can access what variables
- **Audit Gaps**: No visibility into who changed what and when

Envkit addresses these challenges by providing a secure, collaborative platform that treats environment variables as first-class citizens in your development workflow.

## Architecture Overview

Envkit consists of three main components:

1. **CLI Tool**: The command-line interface you interact with locally
2. **Web Dashboard**: Browser-based interface for team management and project overview
3. **Cloud Backend**: Secure storage and synchronization service

The CLI handles local operations while maintaining synchronization with the cloud backend. All data is encrypted at rest and in transit, ensuring your sensitive configuration remains protected.

## Getting Started

Ready to get started? Head over to the [Quickstart Guide](01_quickstart.md) to set up your first project with Envkit.
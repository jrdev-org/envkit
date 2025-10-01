# EnvKit
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/jrdev-org/envkit?utm_source=oss&utm_medium=github&utm_campaign=jrdev-org%2Fenvkit&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

EnvKit is a command-line interface (CLI) tool designed to manage environment variables for your projects, providing secure storage and synchronization across different environments and teams.

## Key Features

*   **Secure Variable Management:** Store sensitive environment variables securely in the cloud.
*   **Project Linking:** Easily link your local projects to cloud-managed environments.
*   **Environment Synchronization:** Push local changes to the cloud and pull cloud variables to your local environment.
*   **Change Detection:** Automatically detects changes in your local `.env` files before pushing and prevents unnecessary pulls if your local environment is already up-to-date.

## Usage

### 1. Initialize a Project

To set up a new project or link an existing one:

```bash
envkit init
```

This command will guide you through creating a new project or linking to an existing one, and will set up your local `.env` file.

### 2. Push Variables

After making changes to your local `.env` file, push them to the cloud:

```bash
envkit push [environment]
```

If no changes are detected in your local `.env` file since the last sync, the push operation will be skipped.

### 3. Pull Variables

To retrieve the latest variables from the cloud:

```bash
envkit pull [environment]
```

If your local `.env` file is already up-to-date with the cloud, the pull operation will be skipped.

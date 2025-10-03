# Contributing Guide

Welcome! We're excited that you're interested in contributing to Envkit. This guide will help you get started with development, testing, and contributing to the project.

## Development Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or later
- **pnpm**: Package manager (recommended)
- **Git**: Version control

### Clone and Install

```bash
git clone https://github.com/envkit/envkit.git
cd envkit
pnpm install
```

### Environment Setup

Copy environment templates:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Configure your environment variables:

```bash
# apps/web/.env.local
CONVEX_URL=https://your-convex-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_PEPPER=your-server-side-encryption-pepper
```

### Database Setup

1. Create a Convex account at [convex.dev](https://convex.dev)
2. Create a new project: `npx convex dev --name envkit-dev`
3. Deploy the schema: `cd packages/db && npx convex deploy`

### Start Development

```bash
# Start all services
pnpm dev

# Or start individually:
pnpm --filter @envkit/web dev      # Web app
pnpm --filter @envkit/cli dev      # CLI (watch mode)
npx convex dev                     # Database
```

## Project Structure

```
envkit/
├── apps/
│   ├── cli/           # Command-line interface
│   ├── docs/          # Documentation
│   └── web/           # Web dashboard
├── packages/
│   ├── db/            # Database schema and API
│   └── utils/         # Shared utilities
└── tests/             # Test suites
```

### Key Directories

- `apps/cli/src/commands/`: CLI command implementations
- `packages/db/convex/`: Database mutations and queries
- `apps/web/src/app/`: Next.js app router pages
- `packages/db/src/`: Database utilities and encryption

## Development Workflow

### 1. Choose an Issue

- Check [GitHub Issues](https://github.com/envkit/envkit/issues) for open tasks
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes

Follow our coding standards:

- Use TypeScript for all new code
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation as needed

### 4. Test Your Changes

```bash
# Run all tests
pnpm test

# Run CLI tests
pnpm --filter @envkit/cli test

# Run database tests
pnpm --filter @envkit/db test

# Run web app tests
pnpm --filter @envkit/web test
```

### 5. Commit and Push

```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

- Open a PR against the `main` branch
- Fill out the PR template
- Request review from maintainers

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Avoid `any` types; use proper type definitions
- Use interfaces for object shapes
- Leverage utility types where appropriate

### Code Style

- Use Prettier for code formatting
- Follow ESLint rules
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Maintenance

### Testing

- Write unit tests for utilities and business logic
- Write integration tests for API endpoints
- Test CLI commands manually
- Ensure all tests pass before submitting PR

## Architecture Guidelines

### CLI Commands

- Commands should be stateless where possible
- Use the logger for user feedback
- Handle errors gracefully with helpful messages
- Support `--help` and `--version` flags

### Database Operations

- Use Convex's type-safe API
- Implement proper authorization checks
- Handle errors with descriptive messages
- Use indexes for performance-critical queries

### Web Application

- Use Next.js App Router
- Implement proper loading and error states
- Follow accessibility guidelines
- Use responsive design principles

### Security

- Never log sensitive information
- Validate all user inputs
- Use parameterized queries
- Implement proper authentication checks

## Testing

### Unit Tests

```typescript
// Example test in packages/db/src/encryption.test.ts
import { describe, it, expect } from "vitest";
import { VariableEncryption } from "./encryption.js";

describe("VariableEncryption", () => {
  it("should encrypt and decrypt variables correctly", () => {
    const salt = VariableEncryption.generateSalt();
    const original = "secret-value";

    const encrypted = VariableEncryption.encryptVariable(original, salt);
    const decrypted = VariableEncryption.decryptVariable(encrypted, salt);

    expect(decrypted).toBe(original);
  });
});
```

### Integration Tests

```typescript
// Example CLI integration test
import { describe, it, expect } from "vitest";
import { runInit } from "../commands/init.js";

describe("init command", () => {
  it("should create project files", async () => {
    // Test implementation
  });
});
```

### Manual Testing

Test CLI commands manually:

```bash
# Build CLI
cd apps/cli && pnpm build

# Test commands
node dist/src/cli.js --help
node dist/src/cli.js auth --help
```

## Documentation

### Code Documentation

- Add JSDoc comments to public functions
- Document complex algorithms
- Explain security considerations

### User Documentation

- Update docs for new features
- Keep examples current
- Test documentation steps

## Security Considerations

### Reporting Security Issues

- **DO NOT** create public GitHub issues for security vulnerabilities
- Email security@envkit.com with details
- Allow time for fixes before public disclosure

### Security Best Practices

- Use secure random generation for tokens
- Implement proper input validation
- Follow OWASP guidelines
- Regular dependency updates

## Community

### Communication

- Use GitHub Discussions for questions
- Join our Discord/Slack community
- Follow our blog for updates

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn
- Maintain professional discourse

## Recognition

Contributors are recognized through:
- GitHub contributor statistics
- Mention in release notes
- Community shoutouts
- Potential future contributor program

## Getting Help

- Check existing issues and documentation
- Ask in GitHub Discussions
- Reach out to maintainers
- Join community channels

Thank you for contributing to Envkit! Your efforts help make environment variable management more secure and collaborative for everyone.
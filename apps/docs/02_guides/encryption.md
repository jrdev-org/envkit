# Encryption Guide

Envkit employs industry-standard encryption to protect your environment variables both at rest and in transit. This guide explains how Envkit's encryption system works and the security measures in place.

## Overview

Envkit uses **end-to-end encryption** for all environment variables. Variables are encrypted on your local machine before being sent to the cloud and decrypted only when you retrieve them. The encryption keys never leave your device.

## Encryption Algorithm

Envkit uses **AES-256-GCM** (Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode) for symmetric encryption. This provides:

- **Authenticated encryption**: Ensures data integrity and authenticity
- **256-bit security**: Resistant to brute-force attacks
- **GCM mode**: Provides confidentiality and authenticity in a single operation

## Key Derivation

Keys are derived using **PBKDF2** (Password-Based Key Derivation Function 2) with:

- **Salt**: Unique per team, stored securely in the database
- **Pepper**: Server-side secret that adds additional entropy
- **Iterations**: 10,000 iterations (OWASP recommended for 2025)
- **Hash function**: SHA-256

```javascript
// Simplified key derivation process
const key = crypto.pbkdf2Sync(pepper, teamSalt, 10000, 32, 'sha256');
```

## Team-Based Encryption

Each team has its own unique salt, ensuring that:

- Variables from different teams are encrypted with different keys
- Compromising one team's encryption doesn't affect others
- Team ownership changes don't require re-encryption

## Encryption Process

When you push variables to the cloud:

1. **Local Encryption**: Variables are encrypted using the team's derived key
2. **Transmission**: Encrypted data is sent over HTTPS/TLS
3. **Storage**: Encrypted variables are stored in the database

When you pull variables:

1. **Retrieval**: Encrypted data is fetched from the database
2. **Transmission**: Data travels over HTTPS/TLS
3. **Local Decryption**: Variables are decrypted using the team's key

## Data Format

Encrypted variables are stored in a canonical JSON format, then base64-encoded:

```json
{
  "v": "v1",
  "iv": "initialization_vector_hex",
  "ct": "ciphertext_hex",
  "tag": "authentication_tag_hex"
}
```

This format includes:
- **Version**: For future encryption upgrades
- **IV**: Unique initialization vector per encryption
- **Ciphertext**: The encrypted data
- **Auth Tag**: GCM authentication tag

## Security Considerations

### Key Management
- Encryption keys are never stored or transmitted
- Keys are derived on-demand from team salts and server pepper
- No key escrow or recovery mechanisms

### Access Control
- Only authenticated team members can access variables
- Device-specific tokens prevent unauthorized access
- Audit logs track all access and modifications

### Data Integrity
- GCM mode ensures variables haven't been tampered with
- SHA-256 hashes verify file consistency
- Conflict resolution prevents accidental data loss

## Migration and Upgrades

Envkit supports encryption version upgrades:

- Current version: `v1` (AES-256-GCM)
- Future versions will maintain backward compatibility
- Migration happens transparently during sync operations

## Best Practices

### Local Security
- Keep your `.env.local` files secure (they contain decrypted variables)
- Use `.gitignore` to prevent committing sensitive files
- Regularly rotate authentication tokens

### Team Management
- Use descriptive team names for better organization
- Limit team membership to necessary personnel
- Regularly audit access logs

### Operational Security
- Use different stages (dev/staging/prod) for environment separation
- Implement least-privilege access
- Monitor audit logs for suspicious activity

## Troubleshooting

### Decryption Failures
If decryption fails, possible causes:
- Corrupted data during transmission
- Incorrect team membership
- Server-side key rotation (contact support)

### Key Derivation Issues
- Ensure your client is up-to-date
- Verify team membership hasn't changed
- Check network connectivity

## Compliance

Envkit's encryption meets common compliance requirements:

- **GDPR**: Data encrypted at rest and in transit
- **SOC 2**: Audit trails and access controls
- **ISO 27001**: Cryptographic controls and key management

For enterprise compliance needs, consider self-hosting with your own encryption keys.
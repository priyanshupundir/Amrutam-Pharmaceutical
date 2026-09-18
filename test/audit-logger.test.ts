import { describe, it, expect } from 'vitest';
import { AuditLoggerService } from '../src/infrastructure/audit-logger';

describe('Tamper-Evident Cryptographic Audit Logging', () => {
  it('computes deterministic HMAC-SHA256 hashes for identical inputs', () => {
    const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = '2026-09-18T10:00:00.000Z';
    const hash1 = AuditLoggerService.computeHash(
      prevHash,
      'user-123',
      'USER_LOGIN',
      'user',
      'user-123',
      '{}',
      timestamp
    );

    const hash2 = AuditLoggerService.computeHash(
      prevHash,
      'user-123',
      'USER_LOGIN',
      'user',
      'user-123',
      '{}',
      timestamp
    );

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('generates different hash if any field in the audit record is modified (anti-tampering)', () => {
    const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = '2026-09-18T10:00:00.000Z';

    const originalHash = AuditLoggerService.computeHash(
      prevHash,
      'user-123',
      'CONSULTATION_UPDATE',
      'consultation',
      'c-999',
      '{"status":"COMPLETED"}',
      timestamp
    );

    // Tampered action
    const tamperedActionHash = AuditLoggerService.computeHash(
      prevHash,
      'user-123',
      'CONSULTATION_CANCELLED',
      'consultation',
      'c-999',
      '{"status":"COMPLETED"}',
      timestamp
    );

    // Tampered payload diff
    const tamperedDiffHash = AuditLoggerService.computeHash(
      prevHash,
      'user-123',
      'CONSULTATION_UPDATE',
      'consultation',
      'c-999',
      '{"status":"CANCELLED"}',
      timestamp
    );

    expect(originalHash).not.toBe(tamperedActionHash);
    expect(originalHash).not.toBe(tamperedDiffHash);
  });
});

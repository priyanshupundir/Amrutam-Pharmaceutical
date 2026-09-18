import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../src/infrastructure/encryption';

describe('Field-Level AES-256-GCM Encryption (HIPAA / DISHA Compliance)', () => {
  it('encrypts and successfully decrypts sensitive medical PHI text', () => {
    const plainText = 'Patient diagnosed with Type-2 Diabetes and Mild Gastritis.';
    const cipherText = EncryptionService.encrypt(plainText);

    expect(cipherText).toBeDefined();
    expect(cipherText).not.toBe(plainText);
    expect(cipherText.split(':').length).toBe(3); // iv:authTag:ciphertext

    const decrypted = EncryptionService.decrypt(cipherText);
    expect(decrypted).toBe(plainText);
  });

  it('generates unique ciphertexts and IVs for the same plaintext (semantic security)', () => {
    const plainText = 'Identical Medical Record Note';
    const cipher1 = EncryptionService.encrypt(plainText);
    const cipher2 = EncryptionService.encrypt(plainText);

    expect(cipher1).not.toBe(cipher2);
    expect(EncryptionService.decrypt(cipher1)).toBe(plainText);
    expect(EncryptionService.decrypt(cipher2)).toBe(plainText);
  });

  it('detects tampering and throws an error when ciphertext or authTag is altered', () => {
    const plainText = 'Strictly Confidential Psychiatric Assessment';
    const cipherText = EncryptionService.encrypt(plainText);

    const [iv, authTag, data] = cipherText.split(':');
    // Alter last character of ciphertext
    const tamperedData = data.slice(0, -2) + (data.endsWith('0') ? '1' : '0');
    const tamperedPayload = `${iv}:${authTag}:${tamperedData}`;

    expect(() => EncryptionService.decrypt(tamperedPayload)).toThrow();
  });
});

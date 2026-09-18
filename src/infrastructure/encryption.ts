import crypto from 'crypto';
import { config } from '../config';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96 bits recommended for GCM
  private static readonly AUTH_TAG_LENGTH = 16; // 128 bits
  private static readonly KEY = Buffer.from(config.PHI_ENCRYPTION_KEY, 'hex');

  /**
   * Encrypts plaintext string using AES-256-GCM with authenticated tag
   * Returns formatted string: "iv:authTag:cipherText" in hex
   */
  public static encrypt(plainText: string): string {
    if (!plainText) return plainText;

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts ciphertext formatted as "iv:authTag:cipherText" in hex
   * Validates GCM authentication tag to detect tampering
   */
  public static decrypt(cipherText: string): string {
    if (!cipherText || !cipherText.includes(':')) return cipherText;

    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

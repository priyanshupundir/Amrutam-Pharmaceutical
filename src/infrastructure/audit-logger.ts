import crypto from 'crypto';
import { db } from '../database';
import { config } from '../config';
import { logger } from '../core/logger';
import { getRequestContext } from '../core/async-context';

export interface AuditEntryInput {
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  diff?: Record<string, unknown> | null;
  ipAddress?: string;
}

export interface AuditLogRecord {
  id: string;
  actor_id: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  diff: Record<string, unknown> | null;
  ip_address: string | null;
  previous_hash: string;
  hash: string;
  timestamp: Date;
}

export class AuditLoggerService {
  private static readonly GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Computes HMAC-SHA256 hash for an audit log entry chained to previous_hash
   */
  public static computeHash(
    previousHash: string,
    actorId: string | null,
    action: string,
    resource: string,
    resourceId: string | null,
    diffStr: string,
    timestampIso: string
  ): string {
    const payload = `${previousHash}|${actorId || ''}|${action}|${resource}|${resourceId || ''}|${diffStr}|${timestampIso}`;
    return crypto
      .createHmac('sha256', config.AUDIT_HMAC_SECRET)
      .update(payload)
      .digest('hex');
  }

  /**
   * Appends a tamper-evident audit record chained to the latest hash
   */
  public static async record(entry: AuditEntryInput): Promise<string> {
    const context = getRequestContext();
    const actorId = entry.actorId || context?.userId || null;
    const ipAddress = entry.ipAddress || context?.ip || null;
    const diffStr = entry.diff ? JSON.stringify(entry.diff) : '{}';
    const timestamp = new Date();
    const timestampIso = timestamp.toISOString();

    try {
      // Fetch latest hash to maintain chain integrity
      const latestQuery = await db.query<{ hash: string }>(
        'SELECT hash FROM audit_logs ORDER BY timestamp DESC, id DESC LIMIT 1'
      );

      const previousHash = latestQuery.rows.length > 0 ? latestQuery.rows[0].hash : this.GENESIS_HASH;
      const currentHash = this.computeHash(
        previousHash,
        actorId,
        entry.action,
        entry.resource,
        entry.resourceId || null,
        diffStr,
        timestampIso
      );

      const insertResult = await db.query<{ id: string }>(
        `INSERT INTO audit_logs 
         (actor_id, action, resource, resource_id, diff, ip_address, previous_hash, hash, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          actorId,
          entry.action,
          entry.resource,
          entry.resourceId || null,
          entry.diff ? JSON.stringify(entry.diff) : null,
          ipAddress,
          previousHash,
          currentHash,
          timestamp,
        ]
      );

      logger.info(
        {
          auditId: insertResult.rows[0]?.id,
          action: entry.action,
          resource: entry.resource,
          actorId,
        },
        'Audit log appended to tamper-evident chain'
      );

      return currentHash;
    } catch (err) {
      logger.error({ err, entry }, 'Failed to write cryptographic audit log');
      return '';
    }
  }

  /**
   * Verifies the entire audit trail chain integrity to detect any tampering
   */
  public static async verifyChainIntegrity(): Promise<{
    isValid: boolean;
    totalRecords: number;
    tamperedRecordId?: string;
  }> {
    const result = await db.query<AuditLogRecord>(
      'SELECT * FROM audit_logs ORDER BY timestamp ASC, id ASC'
    );

    const records = result.rows;
    let expectedPreviousHash = this.GENESIS_HASH;

    for (const record of records) {
      if (record.previous_hash !== expectedPreviousHash) {
        return {
          isValid: false,
          totalRecords: records.length,
          tamperedRecordId: record.id,
        };
      }

      const diffStr = record.diff ? JSON.stringify(record.diff) : '{}';
      const recalculatedHash = this.computeHash(
        record.previous_hash,
        record.actor_id,
        record.action,
        record.resource,
        record.resource_id,
        diffStr,
        new Date(record.timestamp).toISOString()
      );

      if (recalculatedHash !== record.hash) {
        return {
          isValid: false,
          totalRecords: records.length,
          tamperedRecordId: record.id,
        };
      }

      expectedPreviousHash = record.hash;
    }

    return {
      isValid: true,
      totalRecords: records.length,
    };
  }
}

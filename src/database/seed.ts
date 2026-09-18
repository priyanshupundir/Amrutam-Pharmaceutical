import bcrypt from 'bcryptjs';
import { db } from './index';
import { EncryptionService } from '../infrastructure/encryption';
import { AuditLoggerService } from '../infrastructure/audit-logger';
import { logger } from '../core/logger';

export async function seedDatabase(): Promise<void> {
  logger.info('🌱 Starting database seeding...');

  try {
    const passwordHash = await bcrypt.hash('Password@123456', 10);

    // 1. Seed Admin User
    const adminRes = await db.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, is_active, mfa_enabled)
       VALUES ($1, $2, 'ADMIN', true, false)
       ON CONFLICT (email) DO UPDATE SET is_active = true
       RETURNING id`,
      ['admin@amrutam.co.in', passwordHash]
    );
    const adminId = adminRes.rows[0].id;

    await db.query(
      `INSERT INTO profiles (user_id, full_name, phone, gender, emergency_contact)
       VALUES ($1, 'Amrutam Super Administrator', '+919876543210', 'Other', '+919876543211')
       ON CONFLICT (user_id) DO NOTHING`,
      [adminId]
    );

    // 2. Seed Doctor User
    const doctorUserRes = await db.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, is_active, mfa_enabled)
       VALUES ($1, $2, 'DOCTOR', true, false)
       ON CONFLICT (email) DO UPDATE SET is_active = true
       RETURNING id`,
      ['dr.sharma@amrutam.co.in', passwordHash]
    );
    const doctorUserId = doctorUserRes.rows[0].id;

    await db.query(
      `INSERT INTO profiles (user_id, full_name, phone, gender)
       VALUES ($1, 'Dr. Rajesh Sharma, BAMS, MD (Ayurveda)', '+919811223344', 'Male')
       ON CONFLICT (user_id) DO NOTHING`,
      [doctorUserId]
    );

    const doctorRes = await db.query<{ id: string }>(
      `INSERT INTO doctors (user_id, specialty, license_number, experience_years, consultation_fee, rating, total_reviews, bio, languages, is_verified)
       VALUES ($1, 'Ayurveda & Chronic Care', 'AYU-IND-2015-8841', 12, 600.00, 4.92, 142, 'Senior Ayurvedic practitioner specializing in Nadi Pariksha and chronic metabolic disorders.', ARRAY['English', 'Hindi', 'Sanskrit'], true)
       ON CONFLICT (license_number) DO UPDATE SET is_verified = true
       RETURNING id`,
      [doctorUserId]
    );
    const doctorId = doctorRes.rows[0].id;

    // 3. Seed Patient User
    const patientUserRes = await db.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, is_active, mfa_enabled)
       VALUES ($1, $2, 'PATIENT', true, false)
       ON CONFLICT (email) DO UPDATE SET is_active = true
       RETURNING id`,
      ['patient.rahul@example.com', passwordHash]
    );
    const patientUserId = patientUserRes.rows[0].id;

    const encryptedMedicalHistory = EncryptionService.encrypt(
      'Patient reports chronic acidity, sleep disturbance, and seasonal allergies since 2022.'
    );

    await db.query(
      `INSERT INTO profiles (user_id, full_name, phone, dob, gender, medical_history_enc, emergency_contact)
       VALUES ($1, 'Rahul Verma', '+919988776655', '1992-05-14', 'Male', $2, '+919988776600')
       ON CONFLICT (user_id) DO NOTHING`,
      [patientUserId, encryptedMedicalHistory]
    );

    // 4. Seed Availability Slots for the Doctor for the next 2 days
    const now = new Date();
    for (let dayOffset = 1; dayOffset <= 2; dayOffset++) {
      for (let hour = 10; hour <= 14; hour += 2) {
        const slotStart = new Date(now);
        slotStart.setDate(now.getDate() + dayOffset);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotStart.getMinutes() + 45);

        await db.query(
          `INSERT INTO availability_slots (doctor_id, start_time, end_time, status, version)
           VALUES ($1, $2, $3, 'AVAILABLE', 1)
           ON CONFLICT (doctor_id, start_time) DO NOTHING`,
          [doctorId, slotStart, slotEnd]
        );
      }
    }

    // 5. Seed Genesis Audit Log
    await AuditLoggerService.record({
      actorId: adminId,
      action: 'SYSTEM_SEED',
      resource: 'database',
      diff: { initialized: true, environment: 'development' },
    });

    logger.info('✅ Database seeded successfully with test records and encrypted PHI.');
  } catch (error) {
    logger.error({ error }, '❌ Database seeding failed.');
    throw error;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await db.close();
      process.exit(0);
    })
    .catch(async () => {
      await db.close();
      process.exit(1);
    });
}

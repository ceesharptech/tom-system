/**
 * DDITS database types (generated from docs/database-schema.md / Phase 1 migration).
 * Use with @supabase/supabase-js for typed client.
 */

export type UserRole = 'officer' | 'admin';
export type DriverStatus = 'Active' | 'Flagged' | 'Suspended';

export interface User {
  id: string;
  officer_id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  license_no: string;
  plate_no: string | null;
  contact: string | null;
  status: DriverStatus;
  face_embedding: unknown | null; // JSONB: array of floats or { embedding, model, enrolled_at }
  strike_count: number;
  created_at: string;
  updated_at: string;
}

export interface OffenceType {
  id: string;
  name: string;
  description: string | null;
  base_fine: number;
  strike_weight: number;
  severity: string;
  is_active: boolean;
  created_at: string;
}

export interface PenaltyRule {
  id: string;
  min_strikes: number;
  max_strikes: number;
  fine_multiplier: number;
  status_flag: string | null;
  created_at: string;
}

export interface Offence {
  id: string;
  driver_id: string;
  officer_id: string; // references users(id)
  offence_type_id: string;
  fine_amount: number;
  strike_delta: number;
  issued_at: string;
  notes: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  timestamp: string;
  metadata: unknown | null;
}

/** Insert types (omit id, created_at etc. where defaulted) */
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
export type DriverInsert = Omit<Driver, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
export type OffenceTypeInsert = Omit<OffenceType, 'id' | 'created_at'> & { id?: string; created_at?: string };
export type PenaltyRuleInsert = Omit<PenaltyRule, 'id' | 'created_at'> & { id?: string; created_at?: string };
export type OffenceInsert = Omit<Offence, 'id' | 'issued_at'> & { id?: string; issued_at?: string };
export type AuditLogInsert = Omit<AuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string };

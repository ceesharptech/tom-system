-- =============================================================================
-- DDITS Phase 1: Initial Schema, Indexes, RLS, and Seed Data
-- Run this migration in Supabase SQL Editor or via Supabase CLI.
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLES (dependency order: offence_types before offences; users before offences/audit_logs)
-- =============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id VARCHAR(6) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('officer', 'admin')),
  full_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  license_no VARCHAR(50) UNIQUE NOT NULL,
  plate_no VARCHAR(20),
  contact VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Flagged', 'Suspended')),
  face_embedding JSONB,
  strike_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE offence_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_fine DECIMAL(10,2) NOT NULL,
  strike_weight INTEGER NOT NULL,
  severity VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE penalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_strikes INTEGER NOT NULL,
  max_strikes INTEGER NOT NULL,
  fine_multiplier DECIMAL(3,2) NOT NULL,
  status_flag VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE offences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  officer_id UUID NOT NULL REFERENCES users(id),
  offence_type_id UUID NOT NULL REFERENCES offence_types(id),
  fine_amount DECIMAL(10,2) NOT NULL,
  strike_delta INTEGER NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- =============================================================================
-- INDEXES (drivers.license_no already has unique index via UNIQUE constraint)
-- =============================================================================

CREATE INDEX idx_drivers_plate_no ON drivers(plate_no);
CREATE INDEX idx_offences_driver_id ON offences(driver_id);
CREATE INDEX idx_offences_issued_at ON offences(issued_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offence_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalty_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE offences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: current user's role (assumes app sets request.jwt.claims with role, or use auth.uid() with users.id = auth.uid())
-- For Supabase: we use auth.uid() and look up role from users. Ensure users.id is linked to auth.users.id when using Supabase Auth.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- users: Officers SELECT own record only; Admins SELECT all
CREATE POLICY users_select_own_officer ON users
  FOR SELECT USING (
    auth.uid() = id AND public.current_user_role() = 'officer'
  );
CREATE POLICY users_select_all_admin ON users
  FOR SELECT USING (public.current_user_role() = 'admin');

-- drivers: Officers and Admins SELECT all; only Admins INSERT/UPDATE/DELETE
CREATE POLICY drivers_select_all ON drivers
  FOR SELECT USING (
    public.current_user_role() IN ('officer', 'admin')
  );
CREATE POLICY drivers_insert_admin ON drivers
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY drivers_update_admin ON drivers
  FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY drivers_delete_admin ON drivers
  FOR DELETE USING (public.current_user_role() = 'admin');

-- offences: Officers SELECT own issued offences; Admins SELECT all; Officers and Admins INSERT; nobody DELETE
CREATE POLICY offences_select_own_officer ON offences
  FOR SELECT USING (
    officer_id = auth.uid() AND public.current_user_role() = 'officer'
  );
CREATE POLICY offences_select_all_admin ON offences
  FOR SELECT USING (public.current_user_role() = 'admin');
CREATE POLICY offences_insert_officer_admin ON offences
  FOR INSERT WITH CHECK (
    public.current_user_role() IN ('officer', 'admin')
  );
-- No DELETE policy: nobody can delete offences (immutable audit trail)

-- offence_types: Everyone SELECT; only Admins INSERT/UPDATE/DELETE
CREATE POLICY offence_types_select_all ON offence_types
  FOR SELECT USING (true);
CREATE POLICY offence_types_insert_admin ON offence_types
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY offence_types_update_admin ON offence_types
  FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY offence_types_delete_admin ON offence_types
  FOR DELETE USING (public.current_user_role() = 'admin');

-- penalty_rules: Everyone SELECT; only Admins INSERT/UPDATE/DELETE
CREATE POLICY penalty_rules_select_all ON penalty_rules
  FOR SELECT USING (true);
CREATE POLICY penalty_rules_insert_admin ON penalty_rules
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY penalty_rules_update_admin ON penalty_rules
  FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY penalty_rules_delete_admin ON penalty_rules
  FOR DELETE USING (public.current_user_role() = 'admin');

-- audit_logs: All authenticated can INSERT and SELECT; nobody UPDATE or DELETE
CREATE POLICY audit_logs_insert_authenticated ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY audit_logs_select_authenticated ON audit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- No UPDATE or DELETE policies: immutable

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Users (passwords hashed with bcrypt via pgcrypto; test data only)
INSERT INTO users (officer_id, email, password_hash, role, full_name) VALUES
  ('000001', 'eniolaamusu6@gmail.com', crypt('Allowme2006!', gen_salt('bf', 10)), 'admin', 'System Administrator'),
  ('100001', 'officer@ddits.com', crypt('Officer123!', gen_salt('bf', 10)), 'officer', 'John Mensah'),
  ('100002', 'officer2@ddits.com', crypt('Officer123!', gen_salt('bf', 10)), 'officer', 'Amina Bello');

-- Drivers (contact stored as phone only to fit VARCHAR(100))
INSERT INTO drivers (full_name, license_no, plate_no, contact, status, strike_count) VALUES
  ('Chinedu Okafor', 'LAG-23-482731', 'ABC-1023', '+2348012345678', 'Active', 0),
  ('Aisha Bello', 'KAN-19-763452', 'KJA-4589', '+2348098765432', 'Active', 1),
  ('Tunde Adeyemi', 'OYO-21-654987', 'IBD-3345', '+2348034567890', 'Flagged', 4),
  ('Ngozi Nwankwo', 'ENU-18-345219', 'ENU-7781', '+2348067891234', 'Active', 0),
  ('Ibrahim Musa', 'KAD-20-918273', 'KAD-6622', '+2348123456789', 'Active', 2),
  ('Blessing Eze', 'IMO-22-774512', 'OWR-5544', '+2348145678901', 'Active', 0),
  ('Yusuf Abdullahi', 'KTS-17-129834', 'KTS-9901', '+2348176543210', 'Flagged', 5),
  ('Adaobi Okoye', 'ANM-24-564738', 'ANM-4432', '+2348187654321', 'Active', 0),
  ('Emeka Obi', 'RIV-16-837261', 'PHC-2247', '+2348091122334', 'Active', 3),
  ('Fatima Sani', 'SOK-15-998877', 'SOK-7712', '+2348023456781', 'Active', 0),
  ('Oluwaseun Adebayo', 'OND-23-221144', 'AKR-6678', '+2348135792468', 'Active', 0),
  ('Samuel Etim', 'CRS-18-556677', 'CAL-8821', '+2348167894501', 'Active', 0),
  ('Grace Onah', 'BEN-21-334455', 'BEN-1290', '+2348076543298', 'Flagged', 2),
  ('Hassan Garba', 'ZAM-19-778899', 'ZAM-4410', '+2348112233445', 'Active', 0),
  ('Victoria Udo', 'AKW-20-667788', 'UYO-3321', '+2348198765402', 'Active', 0),
  ('Daniel Ojo', 'EKI-22-112358', 'ADO-5577', '+2348031122445', 'Active', 0),
  ('Maryam Lawal', 'KWA-18-445566', 'ILR-9002', '+2348056677889', 'Active', 0),
  ('Chukwuemeka Nnamdi', 'ABJ-24-778812', 'ABJ-3210', '+2348102345678', 'Active', 0),
  ('Rukayat Ajibola', 'OGN-17-665544', 'ABK-7788', '+2348181122334', 'Active', 0),
  ('Peter Nwosu', 'EBN-16-990011', 'EBN-5543', '+2348045566778', 'Active', 0);

-- Offence types (from test-data/offence-types.json)
INSERT INTO offence_types (name, description, base_fine, strike_weight, severity) VALUES
  ('Speeding', 'Driving above the legally permitted speed limit on highways or urban roads. Increases the risk of accidents and reduces driver reaction time.', 20000, 2, 'Moderate'),
  ('Running a Red Light', 'Failing to stop at a traffic light when it shows red. This offence significantly endangers pedestrians and other motorists.', 30000, 3, 'Severe'),
  ('Driving Without Seatbelt', 'Operating a vehicle without wearing a seatbelt. This reduces personal safety in the event of a collision.', 10000, 1, 'Minor'),
  ('Using Phone While Driving', 'Using a handheld mobile device while operating a vehicle. Distracted driving greatly increases crash risk.', 15000, 2, 'Moderate'),
  ('Driving Without Valid License', 'Operating a vehicle without a valid driver''s license issued by the appropriate authority. Indicates non-compliance with driver certification laws.', 25000, 3, 'Severe'),
  ('Illegal Parking', 'Parking a vehicle in restricted or unauthorized areas such as intersections or pedestrian crossings. Causes traffic obstruction and safety hazards.', 5000, 1, 'Minor'),
  ('Driving Against Traffic', 'Driving in the opposite direction of designated traffic flow. This creates a high risk of head-on collisions.', 40000, 3, 'Severe'),
  ('Failure to Obey Traffic Signs', 'Ignoring regulatory or warning traffic signs on the road. Undermines road order and safety compliance.', 15000, 2, 'Moderate'),
  ('Overloading Passengers', 'Carrying more passengers than the vehicle is legally permitted to transport. Compromises vehicle stability and passenger safety.', 20000, 2, 'Moderate'),
  ('Driving Without Vehicle Registration', 'Operating a vehicle without valid registration documents. Violates regulatory compliance requirements.', 25000, 3, 'Severe'),
  ('Failure to Use Helmet (Motorcyclist)', 'Riding a motorcycle without wearing an approved safety helmet. Increases the likelihood of fatal head injuries.', 10000, 1, 'Minor'),
  ('Reckless Driving', 'Operating a vehicle in a manner that shows willful disregard for safety rules. Poses serious danger to road users.', 50000, 3, 'Severe'),
  ('Expired Vehicle Insurance', 'Driving a vehicle without valid third-party insurance coverage. Exposes other road users to financial risk in accidents.', 20000, 2, 'Moderate'),
  ('Obstructing Traffic', 'Stopping or parking a vehicle in a way that blocks the normal flow of traffic. Causes congestion and potential hazards.', 10000, 1, 'Minor'),
  ('Driving Under the Influence', 'Operating a vehicle while impaired by alcohol or drugs. Severely reduces judgment, coordination, and reaction time.', 45000, 3, 'Severe');

-- Penalty rules: 0-2 strikes (1.0x, Active), 3-5 (1.5x, Warning), 6+ (2.0x, Flagged)
INSERT INTO penalty_rules (min_strikes, max_strikes, fine_multiplier, status_flag) VALUES
  (0, 2, 1.00, 'Active'),
  (3, 5, 1.50, 'Warning'),
  (6, 9999, 2.00, 'Flagged');

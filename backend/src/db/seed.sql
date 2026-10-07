-- ====================================================================
-- DQBH INDUSTRIAL PLATFORM - PRODUCTION SEED SCRIPT
-- ====================================================================

-- 1. Sites
INSERT INTO sites (id, code, name, client_name, address, city, state, location, contact_name, contact_phone, contact_email)
VALUES 
('11111111-1111-1111-1111-111111111111', 'SITE-HOU-01', 'Houston Energy Complex A', 'Apex Energy Corp', '1000 Bayport Blvd', 'Houston', 'TX', ST_SetSRID(ST_MakePoint(-95.3698, 29.7604), 4326), 'Marcus Vance', '+1-713-555-0199', 'm.vance@apexenergy.com'),
('22222222-2222-2222-2222-222222222222', 'SITE-DET-02', 'Detroit Automation Plant 4', 'Vanguard Motors LLC', '450 Industrial Parkway', 'Detroit', 'MI', ST_SetSRID(ST_MakePoint(-83.0458, 42.3314), 4326), 'Elena Rostova', '+1-313-555-0142', 'e.rostova@vanguardmotors.com'),
('33333333-3333-3333-3333-333333333333', 'SITE-SJC-03', 'Silicon Valley Fab Beta', 'Aura Semi Systems', '880 Innovation Way', 'San Jose', 'CA', ST_SetSRID(ST_MakePoint(-121.8863, 37.3382), 4326), 'Dr. Kenji Sato', '+1-408-555-0188', 'k.sato@aurasemi.com');

-- 2. Machines
INSERT INTO machines (id, site_id, serial_number, asset_tag, model_name, manufacturer, category, criticality_tier, installation_date, warranty_expiration_date, operating_hours_total, health_score, telemetry_connected, status)
VALUES
('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'TURB-9HA-90812', 'EQ-APEX-098', '9HA.02 Heavy-Duty Gas Turbine', 'GE Vernova', 'Gas Turbine', 5, '2023-01-15', '2028-01-15', 14250.5, 82, TRUE, 'OPERATIONAL'),
('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'ROBO-FAN-44120', 'EQ-VANG-104', 'M-2000iA Heavy Payload Robot', 'FANUC Corp', 'Robotics Press', 4, '2022-06-10', '2027-06-10', 19800.0, 68, TRUE, 'DEGRADED'),
('aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'SEMI-EUV-00492', 'EQ-AURA-002', 'High-NA EUV Scanner Subsystem', 'ASML Lithography', 'EUV Lithography', 5, '2024-03-01', '2029-03-01', 5420.0, 94, TRUE, 'OPERATIONAL');

-- 3. Technicians
INSERT INTO technicians (id, employee_code, full_name, email, phone, current_status, current_location, certifications, active_job_count, service_rating, total_completed_jobs)
VALUES
('bbbb1111-1111-1111-1111-111111111111', 'TECH-TX-09', 'Sarah Jenkins', 's.jenkins@dqbh-field.io', '+1-832-555-8812', 'AVAILABLE', ST_SetSRID(ST_MakePoint(-95.3800, 29.7700), 4326), ARRAY['TURBINE_LVL3', 'HIGH_VOLTAGE', 'VIBRATION_ANALYSIS'], 0, 4.95, 142),
('bbbb2222-2222-2222-2222-222222222222', 'TECH-MI-14', 'David Chen', 'd.chen@dqbh-field.io', '+1-248-555-9321', 'AVAILABLE', ST_SetSRID(ST_MakePoint(-83.0500, 42.3400), 4326), ARRAY['ROBOTICS_ADV', 'HYDRAULICS_EXPERT', 'PLC_SIEMENS'], 1, 4.88, 98),
('bbbb3333-3333-3333-3333-333333333333', 'TECH-CA-03', 'Dr. Priya Nair', 'p.nair@dqbh-field.io', '+1-650-555-4422', 'AVAILABLE', ST_SetSRID(ST_MakePoint(-121.8900, 37.3400), 4326), ARRAY['EUV_VACUUM', 'OPTICS_CALIBRATION', 'CLEANROOM_CLASS1'], 0, 4.99, 210),
('bbbb4444-4444-4444-4444-444444444444', 'TECH-TX-22', 'Carlos Morales', 'c.morales@dqbh-field.io', '+1-832-555-1109', 'AVAILABLE', ST_SetSRID(ST_MakePoint(-95.4200, 29.8000), 4326), ARRAY['TURBINE_LVL3', 'MECHANICAL_FITTER'], 0, 4.75, 64);

-- 4. Spare Parts
INSERT INTO spare_parts (id, site_id, part_number, name, category, compatible_models, stock_quantity, reserved_quantity, minimum_threshold, unit_cost_cents, bin_location)
VALUES
('cccc1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'SP-TURB-BLADE-01', 'High-Temp Turbine First-Stage Blade', 'Thermal Core', ARRAY['9HA.02 Heavy-Duty Gas Turbine'], 12, 2, 4, 1850000, 'BAY-A1-BIN4'),
('cccc2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'SP-VALV-SOL-99', 'High-Pressure Fuel Solenoid Actuator', 'Valves & Actuators', ARRAY['9HA.02 Heavy-Duty Gas Turbine'], 8, 0, 2, 420000, 'BAY-A3-BIN1'),
('cccc3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'SP-ROBO-SEAL-88', 'Hydraulic Servo Cylinder Seal Kit', 'Hydraulics', ARRAY['M-2000iA Heavy Payload Robot'], 15, 1, 3, 125000, 'BAY-B2-BIN8'),
('cccc4444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'SP-EUV-GASK-09', 'Ultra-High Vacuum Flange Gasket Set', 'Vacuum / Optics', ARRAY['High-NA EUV Scanner Subsystem'], 24, 0, 5, 890000, 'BAY-C1-BIN2');

-- 5. API Keys (Live Demo Keys)
-- Key Plaintext: dqbh_live_sec_prod_9988aabb (SHA-256 hash stored below)
INSERT INTO api_keys (id, name, key_prefix, key_hash, role, scopes, rate_limit_rpm, is_active)
VALUES
('dddd1111-1111-1111-1111-111111111111', 'IoT Edge Ingestion Gateway - Houston', 'dqbh_live_9988', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', 'OPERATIONS_MANAGER', ARRAY['iot:telemetry:write', 'requests:read', 'requests:write'], 300, TRUE),
('dddd2222-2222-2222-2222-222222222222', 'ERP Integration Webhook Service', 'dqbh_live_4455', 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35', 'SYSTEM_ADMIN', ARRAY['requests:read', 'requests:write', 'technicians:read', 'dispatch:admin'], 600, TRUE);

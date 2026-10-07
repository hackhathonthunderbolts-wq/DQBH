-- ====================================================================
-- DQBH: NEXT-GENERATION INDUSTRIAL EQUIPMENT ACTIVITY MANAGEMENT PLATFORM
-- Production PostgreSQL + PostGIS Schema Definition
-- Version: 2.4.0 (Enterprise Architecture Edition)
-- ====================================================================

-- Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- ENUMS & TYPES
-- ====================================================================

CREATE TYPE request_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'EMERGENCY'
);

CREATE TYPE service_request_state AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'VALIDATED',
    'ASSIGNED',
    'IN_PROGRESS',
    'VERIFICATION_PENDING',
    'COMPLETED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE technician_status AS ENUM (
    'AVAILABLE',
    'DISPATCHED',
    'ON_JOB',
    'RESTING',
    'OFFLINE'
);

CREATE TYPE assignment_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DECLINED',
    'DROPOUT',
    'COMPLETED'
);

CREATE TYPE exception_type AS ENUM (
    'TECHNICIAN_DROPOUT',
    'PARTS_STOCKOUT',
    'SLA_BREACH',
    'HAZARD_SAFETY_HOLD',
    'ACCESS_DENIED',
    'EQUIPMENT_UNREACHABLE'
);

CREATE TYPE exception_severity AS ENUM (
    'INFO',
    'WARNING',
    'CRITICAL'
);

CREATE TYPE user_role AS ENUM (
    'SYSTEM_ADMIN',
    'OPERATIONS_MANAGER',
    'SITE_SUPERVISOR',
    'FIELD_TECHNICIAN',
    'CLIENT_AUDITOR'
);

-- ====================================================================
-- 1. SITES & FACILITIES
-- ====================================================================
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    postal_code VARCHAR(32),
    location GEOMETRY(Point, 4326) NOT NULL, -- Longitude / Latitude in WGS84
    contact_name VARCHAR(128),
    contact_phone VARCHAR(64),
    contact_email VARCHAR(128),
    operating_hours VARCHAR(128) DEFAULT '24/7',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sites_location ON sites USING GIST (location);
CREATE INDEX idx_sites_code ON sites(code);

-- ====================================================================
-- 2. INDUSTRIAL MACHINES & ASSETS
-- ====================================================================
CREATE TABLE machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    serial_number VARCHAR(128) UNIQUE NOT NULL,
    asset_tag VARCHAR(128) UNIQUE NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL, -- e.g., 'Gas Turbine', 'Hydraulic Press', 'CNC Milling'
    criticality_tier INT NOT NULL CHECK (criticality_tier BETWEEN 1 AND 5), -- 1: Routine, 5: Plant-Critical
    installation_date DATE NOT NULL,
    warranty_expiration_date DATE,
    sla_response_hours_default INT DEFAULT 4,
    operating_hours_total NUMERIC(10, 2) DEFAULT 0.0,
    health_score INT DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
    telemetry_connected BOOLEAN DEFAULT FALSE,
    last_service_date TIMESTAMPTZ,
    next_scheduled_service_date TIMESTAMPTZ,
    status VARCHAR(64) DEFAULT 'OPERATIONAL', -- 'OPERATIONAL', 'DEGRADED', 'OUT_OF_SERVICE'
    specifications JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_machines_site_id ON machines(site_id);
CREATE INDEX idx_machines_serial_number ON machines(serial_number);
CREATE INDEX idx_machines_category ON machines(category);
CREATE INDEX idx_machines_criticality ON machines(criticality_tier);

-- ====================================================================
-- 3. FIELD TECHNICIANS
-- ====================================================================
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE, -- Foreign key if mapped to users table
    employee_code VARCHAR(64) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(64) NOT NULL,
    current_status technician_status DEFAULT 'AVAILABLE',
    current_location GEOMETRY(Point, 4326),
    last_location_ping TIMESTAMPTZ,
    certifications TEXT[] NOT NULL DEFAULT '{}', -- e.g., ARRAY['TURBINE_LVL3', 'HIGH_VOLTAGE', 'HYDRAULICS_EXPERT']
    active_job_count INT DEFAULT 0,
    max_concurrent_jobs INT DEFAULT 2,
    service_rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (service_rating BETWEEN 1.00 AND 5.00),
    total_completed_jobs INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_technicians_location ON technicians USING GIST (current_location);
CREATE INDEX idx_technicians_status ON technicians(current_status);
CREATE INDEX idx_technicians_certs ON technicians USING GIN (certifications);

-- ====================================================================
-- 4. SPARE PARTS & INVENTORY
-- ====================================================================
CREATE TABLE spare_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL, -- Null if regional central depot
    part_number VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    compatible_models TEXT[] NOT NULL DEFAULT '{}',
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    minimum_threshold INT NOT NULL DEFAULT 2,
    unit_cost_cents BIGINT NOT NULL DEFAULT 0,
    bin_location VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spare_parts_part_number ON spare_parts(part_number);
CREATE INDEX idx_spare_parts_site_id ON spare_parts(site_id);
CREATE INDEX idx_spare_parts_compatible ON spare_parts USING GIN (compatible_models);

-- ====================================================================
-- 5. SERVICE REQUESTS (CORE ENTITY)
-- ====================================================================
CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(64) UNIQUE NOT NULL,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    requester_name VARCHAR(255) NOT NULL,
    requester_role VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority request_priority NOT NULL DEFAULT 'MEDIUM',
    state service_request_state NOT NULL DEFAULT 'DRAFT',
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    estimated_duration_minutes INT DEFAULT 120,
    sla_due_at TIMESTAMPTZ NOT NULL,
    sla_breached BOOLEAN DEFAULT FALSE,
    validation_status JSONB DEFAULT '{"passed": false, "rules_checked": []}'::JSONB,
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    exception_flagged BOOLEAN DEFAULT FALSE,
    active_exception_count INT DEFAULT 0,
    work_started_at TIMESTAMPTZ,
    work_completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by VARCHAR(255),
    blockchain_hash VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_requests_state ON service_requests(state);
CREATE INDEX idx_service_requests_priority ON service_requests(priority);
CREATE INDEX idx_service_requests_machine_id ON service_requests(machine_id);
CREATE INDEX idx_service_requests_site_id ON service_requests(site_id);
CREATE INDEX idx_service_requests_sla_due ON service_requests(sla_due_at);
CREATE INDEX idx_service_requests_tech_id ON service_requests(assigned_technician_id);

-- ====================================================================
-- 6. REQUEST PARTS RESERVATIONS
-- ====================================================================
CREATE TABLE request_parts_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
    quantity_requested INT NOT NULL DEFAULT 1 CHECK (quantity_requested > 0),
    quantity_consumed INT DEFAULT 0 CHECK (quantity_consumed >= 0),
    is_released BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parts_res_request_id ON request_parts_reservations(service_request_id);
CREATE INDEX idx_parts_res_part_id ON request_parts_reservations(spare_part_id);

-- ====================================================================
-- 7. ASSIGNMENTS & DISPATCH HISTORY
-- ====================================================================
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
    status assignment_status NOT NULL DEFAULT 'PENDING',
    dispatch_score NUMERIC(5, 2), -- Calculated routing algorithm score (0 - 100)
    distance_km NUMERIC(6, 2),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    reassignment_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments_request_id ON assignments(service_request_id);
CREATE INDEX idx_assignments_tech_id ON assignments(technician_id);
CREATE INDEX idx_assignments_status ON assignments(status);

-- ====================================================================
-- 8. WORK LOGS & EVIDENCE (PHOTO PROOFS, DOCS, SIGNATURES)
-- ====================================================================
CREATE TABLE work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
    tasks_performed TEXT[] NOT NULL DEFAULT '{}',
    diagnostic_summary TEXT NOT NULL,
    work_duration_minutes INT NOT NULL CHECK (work_duration_minutes > 0),
    parts_replaced JSONB DEFAULT '[]'::JSONB,
    photo_evidence_urls TEXT[] NOT NULL DEFAULT '{}',
    document_attachment_urls TEXT[] NOT NULL DEFAULT '{}',
    digital_signature_data TEXT,
    signer_name VARCHAR(255),
    signer_role VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_work_logs_request_id ON work_logs(service_request_id);

-- ====================================================================
-- 9. EXCEPTION LOGS & SLA ESCALATIONS
-- ====================================================================
CREATE TABLE exception_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    exception_type exception_type NOT NULL,
    severity exception_severity NOT NULL DEFAULT 'WARNING',
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    auto_rerouted BOOLEAN DEFAULT FALSE,
    previous_technician_id UUID REFERENCES technicians(id),
    replacement_technician_id UUID REFERENCES technicians(id),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    resolved_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exception_logs_request_id ON exception_logs(service_request_id);
CREATE INDEX idx_exception_logs_type ON exception_logs(exception_type);
CREATE INDEX idx_exception_logs_resolved ON exception_logs(is_resolved);

-- ====================================================================
-- 10. IMMUTABLE AUDIT TRAIL
-- ====================================================================
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name VARCHAR(128) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(64),
    client_user_agent TEXT,
    block_hash VARCHAR(128) NOT NULL,
    previous_block_hash VARCHAR(128),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_trail(entity_name, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_trail(timestamp);

-- ====================================================================
-- 11. API KEYS & EXTERNAL INTEGRATION SCOPES
-- ====================================================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(128) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'SITE_SUPERVISOR',
    scopes TEXT[] NOT NULL DEFAULT ARRAY['requests:read', 'requests:write', 'iot:telemetry:write'],
    rate_limit_rpm INT DEFAULT 120,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_by VARCHAR(255) DEFAULT 'System Admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

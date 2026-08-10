-- CivicAudit Initial Schema

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Geography Hierarchy Table
CREATE TABLE geography_hierarchy (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL, -- state, district, block, ward, constituency
    parent_id INTEGER REFERENCES geography_hierarchy(id),
    official_code VARCHAR(100),
    geometry GEOMETRY(MULTIPOLYGON, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(level, official_code)
);

CREATE INDEX ix_geography_level_name ON geography_hierarchy(level, name);
CREATE INDEX ix_geography_parent ON geography_hierarchy(parent_id);

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'citizen' NOT NULL,
    state_id INTEGER REFERENCES geography_hierarchy(id),
    location_point GEOMETRY(POINT, 4326),
    verification_status VARCHAR(50) DEFAULT 'unverified',
    bio TEXT,
    avatar_url VARCHAR(2000),
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP
);

CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_email_active ON users(email, is_active);
CREATE INDEX ix_users_role ON users(role);

-- Issues Table
CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' NOT NULL,
    resolution_confidence NUMERIC(5, 2) DEFAULT 0,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    state_id INTEGER NOT NULL REFERENCES geography_hierarchy(id),
    district_id INTEGER REFERENCES geography_hierarchy(id),
    block_id INTEGER REFERENCES geography_hierarchy(id),
    ward_id INTEGER REFERENCES geography_hierarchy(id),
    location_point GEOMETRY(POINT, 4326),
    estimated_affected_people INTEGER,
    visibility VARCHAR(50) DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    moderation_notes TEXT,
    moderated_by_id INTEGER REFERENCES users(id),
    moderated_at TIMESTAMP
);

CREATE INDEX ix_issues_status_created ON issues(status, created_at);
CREATE INDEX ix_issues_state_category ON issues(state_id, category);
CREATE INDEX ix_issues_created_by ON issues(created_by_id);
CREATE INDEX ix_issues_title ON issues USING GIN(to_tsvector('english', title));

-- Civic Evidence Table
CREATE TABLE civic_evidence (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    uploaded_by_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(500),
    description TEXT,
    evidence_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(2000),
    file_hash VARCHAR(255),
    file_size INTEGER,
    verification_state VARCHAR(50) DEFAULT 'submitted',
    verified_by_id INTEGER REFERENCES users(id),
    verification_notes TEXT,
    verified_at TIMESTAMP,
    visibility_level VARCHAR(50) DEFAULT 'public',
    is_sensitive_pii BOOLEAN DEFAULT FALSE,
    redaction_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    flagged_at TIMESTAMP,
    flag_reason TEXT
);

CREATE INDEX ix_evidence_issue ON civic_evidence(issue_id);
CREATE INDEX ix_evidence_issue_type ON civic_evidence(issue_id, evidence_type);
CREATE INDEX ix_evidence_verification ON civic_evidence(verification_state, verified_at);

-- Spending Evidence Table
CREATE TABLE spending_evidence (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issues(id) ON DELETE SET NULL,
    source_type VARCHAR(50) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_url VARCHAR(2000),
    source_document_id VARCHAR(255),
    scheme_id VARCHAR(255),
    scheme_name VARCHAR(500),
    scheme_aliases JSONB,
    financial_year VARCHAR(10) NOT NULL,
    amount_allocated BIGINT,
    amount_released BIGINT,
    amount_spent BIGINT,
    currency VARCHAR(3) DEFAULT 'INR',
    applicable_state_id INTEGER REFERENCES geography_hierarchy(id),
    applicable_district_id INTEGER REFERENCES geography_hierarchy(id),
    raw_data_hash VARCHAR(255),
    raw_data_path VARCHAR(2000),
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    government_published_at TIMESTAMP,
    last_verified_at TIMESTAMP,
    data_confidence NUMERIC(5, 2) DEFAULT 100,
    linked_at TIMESTAMP,
    link_confidence NUMERIC(5, 2) DEFAULT 0,
    linked_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_document_id, scheme_id, financial_year)
);

CREATE INDEX ix_spending_issue ON spending_evidence(issue_id);
CREATE INDEX ix_spending_scheme_year ON spending_evidence(scheme_id, financial_year);
CREATE INDEX ix_spending_state ON spending_evidence(applicable_state_id);

-- Confirmations Table
CREATE TABLE confirmations (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    confirmation_type VARCHAR(50) NOT NULL,
    description TEXT,
    verified_by_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(issue_id, user_id, confirmation_type)
);

CREATE INDEX ix_confirmations_issue ON confirmations(issue_id);
CREATE INDEX ix_confirmations_issue_type ON confirmations(issue_id, confirmation_type);

-- Government Claims Table
CREATE TABLE government_claims (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    claim_text TEXT NOT NULL,
    claim_date TIMESTAMP,
    claimed_by VARCHAR(255),
    source_document_id VARCHAR(255),
    source_url VARCHAR(2000),
    status VARCHAR(50) NOT NULL,
    verification_status TEXT,
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_claims_issue ON government_claims(issue_id);
CREATE INDEX ix_claims_status ON government_claims(status, issue_id);

-- Resolution Events Table
CREATE TABLE resolution_events (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_events_issue_created ON resolution_events(issue_id, created_at);

-- Comments Table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    is_expert_comment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    flagged_at TIMESTAMP,
    flag_reason TEXT
);

CREATE INDEX ix_comments_issue ON comments(issue_id);
CREATE INDEX ix_comments_issue_created ON comments(issue_id, created_at);

-- Audit Log Table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    changes JSONB,
    performed_by_id INTEGER REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)
);

CREATE INDEX ix_audit_entity ON audit_log(entity_type, entity_id, performed_at);
CREATE INDEX ix_audit_performed_at ON audit_log(performed_at);

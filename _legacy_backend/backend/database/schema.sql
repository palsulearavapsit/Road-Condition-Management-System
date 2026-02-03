-- CrackX PostgreSQL Database Schema
-- Version: 1.0
-- Created: 2026-01-31

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('citizen', 'rso', 'admin')),
    assigned_zone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_zone ON users(assigned_zone);
CREATE INDEX idx_users_email ON users(email);

-- ==========================================
-- REPORTS TABLE
-- ==========================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Location data
    zone VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    
    -- Damage information
    damage_type VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),
    description TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'rejected')),
    priority INTEGER DEFAULT 0,
    
    -- Images
    photo_uri TEXT,
    repair_proof_uri TEXT,
    
    -- AI Detection data (stored as JSONB for flexibility)
    ai_detection JSONB,
    
    -- Assignment
    assigned_rso_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    repair_started_at TIMESTAMP,
    repair_completed_at TIMESTAMP,
    
    -- Sync metadata
    synced_at TIMESTAMP,
    server_status VARCHAR(20) DEFAULT 'synced'
);

-- Indexes for performance
CREATE INDEX idx_reports_citizen ON reports(citizen_id);
CREATE INDEX idx_reports_zone ON reports(zone);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_severity ON reports(severity);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
CREATE INDEX idx_reports_assigned_rso ON reports(assigned_rso_id);

-- GiST index for geospatial queries
CREATE INDEX idx_reports_location ON reports USING GIST (
    ll_to_earth(latitude, longitude)
);

-- ==========================================
-- AI DETECTIONS TABLE (Detailed)
-- ==========================================
CREATE TABLE ai_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    
    -- Detection results
    damage_type VARCHAR(50),
    confidence DECIMAL(5, 2),
    class_id INTEGER,
    class_name VARCHAR(100),
    
    -- Bounding box (normalized coordinates)
    bbox_x DECIMAL(5, 4),
    bbox_y DECIMAL(5, 4),
    bbox_width DECIMAL(5, 4),
    bbox_height DECIMAL(5, 4),
    
    -- Model metadata
    model_version VARCHAR(50),
    inference_time_ms INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_detections_report ON ai_detections(report_id);

-- ==========================================
-- ANALYTICS TABLE (RHI and Stats)
-- ==========================================
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    
    -- RHI Score
    rhi_score INTEGER,
    rhi_grade VARCHAR(20),
    
    -- Metrics
    total_reports INTEGER DEFAULT 0,
    pending_reports INTEGER DEFAULT 0,
    in_progress_reports INTEGER DEFAULT 0,
    completed_reports INTEGER DEFAULT 0,
    
    high_severity INTEGER DEFAULT 0,
    medium_severity INTEGER DEFAULT 0,
    low_severity INTEGER DEFAULT 0,
    
    avg_repair_time_hours DECIMAL(10, 2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one entry per zone per date
    UNIQUE(zone, date)
);

CREATE INDEX idx_analytics_zone_date ON analytics(zone, date DESC);

-- ==========================================
-- NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_sent ON notifications(sent_at DESC);

-- ==========================================
-- WORK ORDERS TABLE (For Vendor Portal)
-- ==========================================
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    
    -- Work order details
    order_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Assignment
    vendor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    
    -- Timeline
    deadline TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'assigned', 'in-progress', 'completed', 'cancelled')
    ),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_orders_vendor ON work_orders(vendor_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_report ON work_orders(report_id);

-- ==========================================
-- PREDICTIVE MAINTENANCE TABLE
-- ==========================================
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone VARCHAR(20) NOT NULL,
    
    -- Prediction data
    predicted_damage_count INTEGER,
    confidence DECIMAL(5, 2),
    risk_level VARCHAR(20),
    
    -- Seasonal factors
    season VARCHAR(20),
    weather_factor VARCHAR(50),
    
    -- Timeline
    prediction_for_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Model metadata
    model_version VARCHAR(50),
    features JSONB
);

CREATE INDEX idx_predictions_zone_date ON predictions(zone, prediction_for_date);

-- ==========================================
-- AUDIT LOG TABLE
-- ==========================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    
    old_value JSONB,
    new_value JSONB,
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VIEWS FOR COMMON QUERIES
-- ==========================================

-- Zone Statistics View
CREATE VIEW zone_statistics AS
SELECT 
    zone,
    COUNT(*) as total_reports,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
    COUNT(*) FILTER (WHERE severity = 'low') as low_severity,
    AVG(EXTRACT(EPOCH FROM (repair_completed_at - created_at))/3600) as avg_repair_hours
FROM reports
GROUP BY zone;

-- Recent Reports View
CREATE VIEW recent_reports AS
SELECT 
    r.id,
    r.zone,
    r.damage_type,
    r.severity,
    r.status,
    r.created_at,
    u.full_name as citizen_name,
    rso.full_name as assigned_rso_name
FROM reports r
LEFT JOIN users u ON r.citizen_id = u.id
LEFT JOIN users rso ON r.assigned_rso_id = rso.id
ORDER BY r.created_at DESC
LIMIT 100;

-- ==========================================
-- SEED DATA (Demo Users)
-- ==========================================

-- Insert demo users
INSERT INTO users (username, email, password_hash, full_name, role, assigned_zone) VALUES
('demo', 'demo@crackx.com', '$2b$10$rBV2zcFJd5Vh0u9L8sFH8.F8JdxJKGZQE7YvPcKfMxDqVw8gYn7JO', 'Demo User', 'citizen', 'zone1'),
('rso_demo', 'rso@crackx.com', '$2b$10$rBV2zcFJd5Vh0u9L8sFH8.F8JdxJKGZQE7YvPcKfMxDqVw8gYn7JO', 'RSO Demo', 'rso', 'zone1'),
('admin_demo', 'admin@crackx.com', '$2b$10$rBV2zcFJd5Vh0u9L8sFH8.F8JdxJKGZQE7YvPcKfMxDqVw8gYn7JO', 'Admin Demo', 'admin', NULL);

COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE reports IS 'Citizen-submitted road damage reports';
COMMENT ON TABLE ai_detections IS 'AI model detection results for each report';
COMMENT ON TABLE analytics IS 'Daily zone-wise analytics and RHI scores';
COMMENT ON TABLE notifications IS 'Push notifications sent to users';
COMMENT ON TABLE work_orders IS 'Work orders for vendor management';
COMMENT ON TABLE predictions IS 'Predictive maintenance forecasts';
COMMENT ON TABLE audit_log IS 'Audit trail for all system actions';

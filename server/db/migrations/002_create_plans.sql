-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    data_json JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plans_user ON plans(user_id);
CREATE INDEX idx_plans_public ON plans(is_public);

-- Plan versions table (for history)
CREATE TABLE IF NOT EXISTS plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    version_num INTEGER NOT NULL,
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, version_num)
);

CREATE INDEX idx_plan_versions_plan ON plan_versions(plan_id);

-- Plan shares table (for public sharing)
CREATE TABLE IF NOT EXISTS plan_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    share_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    permissions VARCHAR(20) DEFAULT 'read',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shares_uuid ON plan_shares(share_uuid);
CREATE INDEX idx_shares_plan ON plan_shares(plan_id);

-- Sync queue table (for offline changes)
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    operation VARCHAR(20) NOT NULL,
    data_json JSONB NOT NULL,
    synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_plan ON sync_queue(plan_id, synced);
CREATE INDEX idx_sync_unsynced ON sync_queue(synced) WHERE synced = FALSE;

-- Add updated_at triggers
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

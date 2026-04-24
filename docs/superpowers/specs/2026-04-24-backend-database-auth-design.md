# Stage 3: Backend with PostgreSQL, Auth, and Cloud Persistence

**Date:** 2026-04-24  
**Status:** Approved for Implementation

---

## Overview

This stage implements a cloud backend for VastuPlan 2D, replacing the in-memory collaboration server with a persistent PostgreSQL database. It adds user authentication, plan persistence, public share links, and offline-first sync.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  - Plan editing, collaboration UI, auth forms                   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌─────────────────────────┐               ┌─────────────────────────┐
│   API Server (Express)  │               │  Socket Server (IO)   │
│  - REST endpoints       │               │  - Real-time updates  │
│  - Auth (JWT)           │               │  - Collab sessions    │
│  - Plan CRUD            │               │  - Cursor sharing     │
└─────────────────────────┘               └─────────────────────────┘
              │                                           │
              └───────────────────────────┘
                                          ▼
                                 ┌─────────────────────┐
                                 │   PostgreSQL        │
                                 │  - Users table      │
                                 │  - Plans table      │
                                 │  - Shares table     │
                                 │  - Sync queue       │
                                 └─────────────────────┘
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Plans Table
```sql
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    data_json JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_plans_user ON plans(user_id);
```

### Plan Versions Table
```sql
CREATE TABLE plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    version_num INTEGER NOT NULL,
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, version_num)
);
```

### Plan Shares Table
```sql
CREATE TABLE plan_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    share_uuid UUID UNIQUE NOT NULL,
    permissions VARCHAR(20) DEFAULT 'read',  -- 'read' or 'comment'
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_shares_uuid ON plan_shares(share_uuid);
```

### Sync Queue Table
```sql
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    operation VARCHAR(20) NOT NULL,  -- 'create', 'update', 'delete'
    data_json JSONB NOT NULL,
    synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sync_plan ON sync_queue(plan_id, synced);
```

---

## Authentication System

### JWT Tokens
- **Access token:** 15 minutes expiry
- **Refresh token:** 7 days expiry
- Tokens stored in HTTP-only cookies

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Email/password registration |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Revoke token |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/password/reset` | Request password reset |
| POST | `/api/auth/password/change` | Change password (auth required) |

### Google OAuth
- Users can link Google account to existing account
- Automatic user creation if email exists but no password

---

## REST API Endpoints

### Plan Operations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/plans` | User | List user's plans |
| GET | `/api/plans/:id` | User or Public | Get plan by ID |
| POST | `/api/plans` | User | Create new plan |
| PUT | `/api/plans/:id` | User | Update plan |
| DELETE | `/api/plans/:id` | User | Delete plan |
| POST | `/api/plans/:id/share` | User | Create share link |
| GET | `/api/share/:uuid` | Public | Get plan via share link |

### Sync Operations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sync/queue` | User | Add change to sync queue |
| POST | `/api/sync/batch` | User | Batch sync multiple changes |
| GET | `/api/sync/status` | User | Get sync status |

---

## Offline-First Sync Strategy

### Local Storage
- Plans stored in `localStorage` for immediate access
- `sync_queue` tracks pending changes
- Offline indicator in UI when changes unsynced

### Sync Flow
1. User makes change → saved locally + queued
2. Background sync attempts to push to server
3. On success → remove from queue
4. On failure → keep in queue, retry later

### Conflict Resolution
- **Last-write-wins:** Server timestamp determines winner
- Client notifies if local changes differ from server version

---

## Share Link Behavior

### Public Access
-Anyone with link can view plan (read-only)
- No authentication required
- URL format: `vastuplan.app/share/abc123`

### Share Management
- Plan owner can revoke share link
- Share links can expire (configurable)
- Plan owner sees who accessed via analytics

---

## File Structure

```
server/
├── index.ts                    # Socket.io server (real-time)
├── api/
│   ├── auth.ts                 # Auth endpoints (register, login, etc.)
│   ├── plans.ts                # Plan CRUD operations
│   ├── shares.ts               # Share link management
│   ├── sync.ts                 # Offline sync endpoints
│   └── index.ts                # API router
├── db/
│   ├── connection.ts           # PostgreSQL connection pool
│   ├── migrations/
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_plans.sql
│   │   ├── 003_create_plan_versions.sql
│   │   ├── 004_create_plan_shares.sql
│   │   └── 005_create_sync_queue.sql
│   └── queries.ts              # SQL query helpers
├── middleware/
│   ├── auth.ts                 # JWT verification
│   └── error.ts                # Error handler
└── utils/
    ├── jwt.ts                  # Token generation/verification
    └── validator.ts            # Input validation

frontend/
├── src/
│   ├── services/
│   │   ├── database.ts         # Cloud sync service
│   │   └── auth.ts             # Auth client
│   └── components/
│       └── OfflineIndicator.tsx # Offline sync status UI
```

---

## Deployment

### Development
- PostgreSQL running locally (Docker or native)
- `DATABASE_URL=postgres://localhost:5432/vastuplan`

### Production
- **Database:** Neon PostgreSQL or Railway.app
- **API Server:** Railway.app or Cloud Run
- **SSL/TLS:** Required for all connections

### Environment Variables
```env
DATABASE_URL=postgres://...
JWT_SECRET=your-secret-here
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CLIENT_URL=https://vastuplan.app
```

---

## Testing Strategy

### Unit Tests
- Database queries (Jest + pg-mock)
- Auth middleware (token generation/verification)
- Sync conflict resolution logic

### Integration Tests
- Full API workflow (create plan → share → view)
- Offline sync with simulated network failures

### E2E Tests (Playwright)
- User registration and login flow
- Plan creation and sync
- Share link access

---

## Implementation Steps

1. **Database Setup**
   - Create PostgreSQL schema
   - Write migrations
   - Test connection

2. **API Server**
   - Implement auth endpoints
   - Implement plan CRUD
   - Implement share link logic

3. **Frontend Integration**
   - Add database service
   - Implement offline indicator
   - Add auth UI (login/register)

4. **Testing**
   - Write tests
   - Test offline sync
   - Test share links

5. **Deployment**
   - Set up production database
   - Deploy API server
   - Update .env.example

---

## Success Criteria

- [ ] Plans persist across page reloads
- [ ] Users can register and login
- [ ] Share links work without auth
- [ ] Offline changes sync when online
- [ ] Collab server connects to database
- [ ] All tests passing

---

## Notes

- Google OAuth can be added in future iteration
- Plan analytics (views, edits) can be added later
- Consider soft deletes for user plans (restore from trash)

# Phase 2: Accounting Firm Access Feature - Implementation Plan

## Current State Analysis

### What Already Exists (Backend Ready)
- `accounting_firms` table with full CRUD support
- `firm_client_access` table linking firms to client companies
- User schema with `firmId` and `currentCompanyId` fields
- `accountant` role defined with appropriate permissions
- All firm API endpoints: `/api/firms`, `/api/firms/:id/clients`
- Permission middleware for firm access validation
- Invitation system supporting firm invitations

### What's Missing (Phase 2 Scope)
- Firm-specific login flow/landing page
- Firm dashboard UI
- Client company management interface
- Company switcher for accountants
- Firm settings page
- Firm user management (invite accountants)

---

## Implementation Tasks

### Task 1: Firm Login Detection & Routing
**Files to modify:**
- `client/src/contexts/AuthContext.tsx`
- `client/src/App.tsx`

**Changes:**
1. Detect if logged-in user is a firm user (`user.firmId` exists, `user.role === 'accountant'`)
2. Route firm users to `/firm/dashboard` instead of regular dashboard
3. Store firm context in AuthContext

**Acceptance criteria:**
- Accountant users are automatically redirected to firm dashboard after login
- Regular company users continue to see normal dashboard

---

### Task 2: Create Firm Dashboard Page
**New file:** `client/src/pages/firm/FirmDashboard.tsx`

**Features:**
1. Welcome header with firm name
2. Quick stats cards:
   - Total client companies
   - Active clients this month
   - Recent activity count
3. Client company list with quick access buttons
4. Recent activity feed across all clients

**API calls needed:**
- `GET /api/firms/:id` - Get firm details
- `GET /api/firms/:id/clients` - Get client list
- New: `GET /api/firms/:id/activity` - Get recent activity (to be created)

---

### Task 3: Create Client Company Management Page
**New file:** `client/src/pages/firm/ClientManagement.tsx`

**Features:**
1. Table of all client companies with:
   - Company name
   - Contact info
   - Status (active/inactive)
   - Date access granted
   - Action buttons (View, Remove access)
2. "Add Client" button to invite/link new companies
3. Search/filter functionality

**API calls needed:**
- `GET /api/firms/:id/clients`
- `DELETE /api/firms/clients/:accessId`
- New: Invitation flow for new clients

---

### Task 4: Create Company Switcher Component
**New file:** `client/src/components/firm/CompanySwitcher.tsx`

**Features:**
1. Dropdown in header showing current client company
2. List of all accessible client companies
3. Click to switch `currentCompanyId`
4. Visual indicator of currently selected company
5. "Back to Firm Dashboard" option

**API endpoint needed (new):**
```typescript
PUT /api/users/current-company
Body: { companyId: number }
```

**Changes to existing files:**
- `client/src/components/Header.tsx` - Add CompanySwitcher for accountant users

---

### Task 5: Create Firm Settings Page
**New file:** `client/src/pages/firm/FirmSettings.tsx`

**Features:**
1. Firm profile section:
   - Name, email, phone, address
   - Edit capability
2. Firm branding (future: logo upload)
3. Notification preferences

**API calls:**
- `GET /api/firms/:id`
- `PUT /api/firms/:id`

---

### Task 6: Firm User Management (Invite Accountants)
**New file:** `client/src/pages/firm/FirmUsers.tsx`

**Features:**
1. List of firm employees (other accountants)
2. Invite new accountant button
3. Deactivate/reactivate firm users
4. Role management within firm (future: senior accountant, junior, etc.)

**API calls:**
- `GET /api/users?firmId=X` (need to enhance)
- `POST /api/invitations` (with role='accountant')

---

### Task 7: Create Firm Navigation/Layout
**New file:** `client/src/layouts/FirmLayout.tsx`

**Features:**
1. Firm-specific sidebar with:
   - Dashboard
   - Clients
   - Users (firm team)
   - Settings
2. Company switcher in header (when viewing client data)
3. Different color scheme/branding to distinguish from company view

**Sidebar items:**
```
- Dashboard (firm overview)
- Clients (client company list)
- Team (firm users)
- Settings (firm settings)
---
When in client context:
- [Client Company Name] dropdown
- All regular accounting features
```

---

### Task 8: Backend Enhancements

**8a. Add current company switching endpoint:**
```typescript
// server/routes.ts
PUT /api/users/current-company
- Validates user is accountant
- Validates firm has access to target company
- Updates user.currentCompanyId
```

**8b. Add firm activity endpoint:**
```typescript
// server/routes.ts
GET /api/firms/:id/activity
- Returns recent activity across all firm's client companies
- Filters by date range (optional)
```

**8c. Enhance company context for firm users:**
```typescript
// server/middleware/company-context.ts
- When accountant user, use currentCompanyId for data scoping
- Allow switching without re-login
```

---

### Task 9: Client Invitation Flow for Firms
**New capability:** Allow firms to invite new client companies

**Two paths:**
1. **Firm creates new company** - Firm creates a new company and is auto-granted access
2. **Link existing company** - Company admin approves firm access request

**For Path 1 (MVP):**
- Firm can create a new company via form
- Company is auto-linked to firm in `firm_client_access`
- Firm can invite company admin user

**API endpoint:**
```typescript
POST /api/firms/:id/clients/create
Body: { companyName, adminEmail, adminFirstName, adminLastName }
- Creates company
- Creates firm_client_access record
- Sends invitation to admin
```

---

### Task 10: Update Permission Checks
**Files to modify:**
- `client/src/contexts/AuthContext.tsx`
- Various page components

**Changes:**
1. Add `isFirmUser` boolean to auth context
2. Add `currentClientCompany` to track selected client
3. Update permission checks to handle firm context
4. Hide certain features from firm users (e.g., company deletion)

---

## Route Structure

```
/firm                      -> Redirect to /firm/dashboard
/firm/dashboard            -> FirmDashboard.tsx
/firm/clients              -> ClientManagement.tsx
/firm/clients/:id          -> Redirect to company view with context
/firm/team                 -> FirmUsers.tsx
/firm/settings             -> FirmSettings.tsx

/company/:id/*             -> Regular company pages (with firm header showing switcher)
```

---

## Implementation Order

### Sprint 1: Core Infrastructure (Highest Priority)
1. Task 1: Firm Login Detection & Routing
2. Task 7: Firm Navigation/Layout
3. Task 4: Company Switcher Component
4. Task 8: Backend Enhancements

### Sprint 2: Firm Dashboard & Management
5. Task 2: Firm Dashboard Page
6. Task 3: Client Company Management Page
7. Task 5: Firm Settings Page

### Sprint 3: User & Client Management
8. Task 6: Firm User Management
9. Task 9: Client Invitation Flow
10. Task 10: Permission Updates

---

## Database Changes Required

**None** - All necessary tables already exist:
- `accounting_firms` ✓
- `firm_client_access` ✓
- `users.firmId` ✓
- `users.currentCompanyId` ✓
- `user_invitations.firmId` ✓

---

## Estimated Scope

| Task | Complexity | New Files | Modified Files |
|------|-----------|-----------|----------------|
| Task 1 | Low | 0 | 2 |
| Task 2 | Medium | 1 | 0 |
| Task 3 | Medium | 1 | 0 |
| Task 4 | Medium | 1 | 1 |
| Task 5 | Low | 1 | 0 |
| Task 6 | Medium | 1 | 0 |
| Task 7 | Medium | 1 | 1 |
| Task 8 | Medium | 0 | 2 |
| Task 9 | High | 0 | 2 |
| Task 10 | Low | 0 | 3 |

**Total new files:** 7
**Total modified files:** 11

---

## Questions for Approval

1. **Company Creation by Firm**: Should firms be able to create new client companies directly, or only link to existing companies?

2. **Billing Model**: Is billing handled outside this system, or do we need to track firm-pays vs client-pays?

3. **Permission Granularity**: Should all firm users have the same access to all clients, or should we support per-client permissions for firm team members?

4. **Branding**: Should firms see their own branding/logo in the firm dashboard?

5. **Reports**: Should there be a cross-client reporting feature for firms to see aggregated data across all clients?

---

## Ready to Start?

Once you approve this plan (and answer the questions above), I'll begin with **Sprint 1: Core Infrastructure**, starting with:
1. Firm login detection and routing
2. Firm layout component
3. Company switcher
4. Backend endpoints for company switching

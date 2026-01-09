# Phase 2: Accounting Firm Access Feature - Implementation Plan

## Confirmed Requirements

| Requirement | Decision |
|-------------|----------|
| Login Page | Single login (Option A) - auto-detect user type |
| Firm Registration | Self-service, no approval needed |
| Client Access | Companies invite firms (not vice versa) |
| Free Subscription | Firms get 1 FREE company for their own books |
| Permissions | Firm admin = full access, controls team member access |
| Billing | Track firm-pays vs client-pays |
| Branding | Yes - firm logo/branding |
| Cross-client Reports | No |

---

## User Flows

### 1. Accounting Firm Registration
```
/register → Select "Accounting Firm" option
                    ↓
    Fill: Firm Name, Admin Name, Email, Password
                    ↓
    Account created immediately (no approval)
                    ↓
    System auto-creates 1 FREE company for firm's own books
                    ↓
    Email verification sent
                    ↓
    Firm Admin lands on Firm Dashboard
```

### 2. Company Invites Firm (Client Access)
```
Company Admin → Settings → "Invite Accounting Firm"
                              ↓
              Enter firm's email address
                              ↓
              Firm receives invitation email
                              ↓
              Firm accepts invitation
                              ↓
              Client now appears in Firm's dashboard
```

### 3. Firm Dashboard View
```
┌─────────────────────────────────────────┐
│  [Firm Logo] ABC Accounting Firm        │
├─────────────────────────────────────────┤
│  MY FIRM BOOKS (Free)                   │
│  └─ ABC Accounting Firm ← (own company) │
│                                         │
│  CLIENT COMPANIES                       │
│  └─ XYZ Corp ← (client-pays)            │
│  └─ 123 Industries ← (firm-pays)        │
│                                         │
│  PENDING INVITATIONS                    │
│  └─ NewCo Inc ← [Accept] [Decline]      │
└─────────────────────────────────────────┘
```

---

## Implementation Tasks

### Sprint 1: Registration & Core Infrastructure

#### Task 1: Firm Registration Backend
**File:** `server/routes.ts`

Create endpoint: `POST /api/auth/register-firm`
- Accept: firmName, adminFirstName, adminLastName, email, password
- Create accounting_firm record
- Create user with role='accountant' and firmId set
- Create FREE company for firm's own books
- Link firm to company via firm_client_access (special flag: is_own_company)
- Send verification email
- Return success with redirect URL

#### Task 2: Update Register Page UI
**File:** `client/src/pages/auth-page.tsx`

- Add toggle/tabs: "Business" | "Accounting Firm"
- When "Accounting Firm" selected:
  - Show: Firm Name, Your Name, Email, Password fields
  - Submit to `/api/auth/register-firm`
- After success: redirect to `/firm/dashboard`

#### Task 3: Firm Login Detection & Routing
**Files:**
- `client/src/contexts/AuthContext.tsx`
- `client/src/App.tsx`

- Add `isFirmUser` computed property to auth context
- After login, check if `user.firmId` exists
- If firm user → redirect to `/firm/dashboard`
- If company user → redirect to `/dashboard`

#### Task 4: Create Firm Layout
**New file:** `client/src/layouts/FirmLayout.tsx`

- Firm-specific sidebar:
  - Dashboard
  - My Firm Books
  - Clients
  - Team
  - Settings
- Header with firm name/logo
- Different accent color (e.g., purple vs blue)

#### Task 5: Create Firm Dashboard Page
**New file:** `client/src/pages/firm/FirmDashboard.tsx`

- Welcome header with firm name
- "My Firm Books" card (link to own company)
- "Client Companies" list with status badges
- "Pending Invitations" section with Accept/Decline buttons

---

### Sprint 2: Client Invitation Flow

#### Task 6: Company Settings - Invite Firm
**Modify:** `client/src/pages/settings.tsx`

Add new section: "Accounting Firm Access"
- "Invite Accounting Firm" button
- Dialog: Enter firm email
- Show currently linked firm (if any)
- "Remove Access" option

#### Task 7: Firm Invitation Backend
**File:** `server/routes.ts`

Create endpoints:
- `POST /api/companies/:id/invite-firm` - Company invites a firm
- `GET /api/firms/invitations` - Get pending invitations for firm
- `POST /api/firms/invitations/:id/accept` - Accept invitation
- `POST /api/firms/invitations/:id/decline` - Decline invitation

#### Task 8: Firm Invitation Email
**New file:** `server/services/firm-invitation-email.ts`

- Styled email template
- "Company X has invited you to access their books"
- Accept button linking to firm dashboard

---

### Sprint 3: Company Switching & Team Management

#### Task 9: Company Switcher Component
**New file:** `client/src/components/firm/CompanySwitcher.tsx`

- Dropdown showing current company context
- List all accessible companies (own + clients)
- Click to switch `currentCompanyId`
- Visual indicator of current selection

#### Task 10: Company Switch Backend
**File:** `server/routes.ts`

- `PUT /api/users/current-company` - Switch current company context
- Validate firm has access to target company
- Update user.currentCompanyId

#### Task 11: Firm Team Management
**New file:** `client/src/pages/firm/FirmTeam.tsx`

- List firm team members (other accountants)
- Invite new accountant to firm
- Set per-client access for team members
- Deactivate team members

#### Task 12: Firm Settings Page
**New file:** `client/src/pages/firm/FirmSettings.tsx`

- Firm profile (name, email, phone, address)
- Logo upload
- Billing preferences

---

## Database Changes

### New Column Needed
Add to `firm_client_access` table:
```sql
is_own_company BOOLEAN DEFAULT false  -- TRUE for firm's free company
billing_type VARCHAR(20) DEFAULT 'client_pays'  -- 'firm_pays' or 'client_pays'
```

### New Table (Optional - for team permissions)
```sql
CREATE TABLE firm_user_client_access (
  id SERIAL PRIMARY KEY,
  firm_id INTEGER REFERENCES accounting_firms(id),
  user_id INTEGER REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id),
  access_level VARCHAR(20) DEFAULT 'full',  -- 'full', 'read_only', 'none'
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Route Structure

```
/register                  → Register page with Business/Firm toggle
/login                     → Single login page

# Firm Routes (after login as firm user)
/firm                      → Redirect to /firm/dashboard
/firm/dashboard            → FirmDashboard.tsx
/firm/books                → Own company books (redirect to company view)
/firm/clients              → Client list
/firm/clients/:id          → View client (switch context + redirect)
/firm/team                 → FirmTeam.tsx
/firm/settings             → FirmSettings.tsx

# Company Routes (with company switcher for firm users)
/dashboard                 → Company dashboard (with switcher if firm user)
/invoices                  → etc.
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `client/src/layouts/FirmLayout.tsx` | Firm-specific layout |
| `client/src/pages/firm/FirmDashboard.tsx` | Firm dashboard |
| `client/src/pages/firm/FirmTeam.tsx` | Team management |
| `client/src/pages/firm/FirmSettings.tsx` | Firm settings |
| `client/src/pages/firm/FirmClients.tsx` | Client list |
| `client/src/components/firm/CompanySwitcher.tsx` | Company switcher |
| `server/services/firm-invitation-email.ts` | Firm invite email |

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/auth-page.tsx` | Add firm registration |
| `client/src/contexts/AuthContext.tsx` | Add firm detection |
| `client/src/App.tsx` | Add firm routes |
| `client/src/pages/settings.tsx` | Add invite firm section |
| `server/routes.ts` | Firm registration & invitation endpoints |
| `shared/schema.ts` | Add new columns |

---

## Implementation Order

Starting with Sprint 1:
1. ✅ Plan confirmed
2. 🔄 Firm registration backend
3. 🔄 Firm registration UI
4. 🔄 Firm login detection & routing
5. 🔄 Firm layout
6. 🔄 Firm dashboard

Ready to implement!

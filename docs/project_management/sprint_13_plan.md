# Sprint 13 Plan: Admin Dashboard & Workshop Management

**Sprint Duration:** 2-3 weeks  
**Priority:** High (Core Admin Functionality)  
**Focus:** US11 (Admin Features) - Dashboard, Workshop Management, User Management  
**Status:** 📋 Planned

---

## 🎯 Sprint Goals

1. **Create comprehensive Admin Dashboard** with system-wide oversight
2. **Implement workshop management** (view all, approve/reject, delete)
3. **Enable multi-facilitator assignment** per workshop
4. **Add user management capabilities** for admins
5. **Improve dashboard layout** with admin-specific features

---

## 📋 User Stories Addressed

### Primary
- **US11 - Admin Options:** Admin dashboard, workshop CRUD operations, facilitator management
- **US11 - Facilitator Flow:** Improved workshop navigation post-login

### Secondary
- **US01 - Workshop Initialization:** Enhanced workshop creation with facilitator assignment
- **US06 - Access Control:** Extended to include admin approvals

---

## 🏗️ Architecture Overview

### New Components
```
Backend:
├── app/api/admin.py (new)           # Admin-only endpoints
├── app/middleware/admin_auth.py (new) # Admin permission middleware
└── app/schemas/admin.py (new)       # Admin-specific schemas

Frontend:
├── src/pages/AdminPanel.tsx (new)   # System admin dashboard
├── src/pages/UserManagement.tsx (new) # User CRUD
├── src/components/WorkshopTable.tsx (new) # Workshop list view
└── src/components/FacilitatorSelector.tsx (new) # Multi-select
```

---

## 📝 Detailed Task Breakdown

### Phase 1: Backend Foundation (Week 1)

#### 1.1 Admin Middleware & Authorization
**Estimated Time:** 4 hours

**Tasks:**
- [ ] Create `admin_auth.py` middleware
- [ ] Implement `require_admin` dependency decorator
- [ ] Add permission checks for admin-only routes
- [ ] Write unit tests for authorization

**Acceptance Criteria:**
- Non-admin users receive 403 Forbidden on admin routes
- Admin users can access admin routes
- Clear error messages for permission denied

**Technical Notes:**
```python
# app/middleware/admin_auth.py
async def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

---

#### 1.2 Admin API Endpoints
**Estimated Time:** 8 hours

**Endpoints to Create:**

1. **GET /api/admin/workshops**
   - List all workshops in system (paginated)
   - Filters: status, date range, facilitator
   - Include participant count, use case count, status

2. **PUT /api/admin/workshops/{id}/status**
   - Approve or reject workshop
   - Update status field
   - Send notification to facilitator

3. **DELETE /api/admin/workshops/{id}**
   - Soft delete workshop
   - Archive related data (participants, use cases, votes)
   - Maintain data integrity

4. **GET /api/admin/users**
   - List all users (facilitators)
   - Include workshop count, last login
   - Pagination support

5. **POST /api/admin/users**
   - Create new facilitator account (admin-initiated)
   - Send invitation email (future enhancement)
   - Set temporary password

6. **DELETE /api/admin/users/{id}**
   - Deactivate user account
   - Transfer/archive their workshops

7. **GET /api/admin/stats**
   - System statistics dashboard
   - Total workshops, users, participants
   - Activity metrics (daily/weekly/monthly)

**Acceptance Criteria:**
- All endpoints require admin authentication
- Proper error handling and validation
- Swagger documentation auto-generated
- Response models defined in schemas

---

#### 1.3 Multi-Facilitator Support
**Estimated Time:** 6 hours

**Database Changes:**
- [ ] Create `workshop_facilitators` junction table
  - `workshop_id` (FK)
  - `user_id` (FK)
  - `role` (owner, co-facilitator)
  - `assigned_at` (timestamp)

**API Updates:**
- [ ] `POST /api/workshops/{id}/facilitators` - Add facilitator
- [ ] `DELETE /api/workshops/{id}/facilitators/{user_id}` - Remove
- [ ] `GET /api/workshops/{id}/facilitators` - List all

**Acceptance Criteria:**
- Multiple facilitators can access same workshop
- Owner has full permissions
- Co-facilitators have limited permissions (configurable)

---

### Phase 2: Frontend Admin Dashboard (Week 2)

#### 2.1 Admin Panel Layout
**Estimated Time:** 8 hours

**Components:**
```tsx
// AdminPanel.tsx structure
- Header with admin badge
- Sidebar navigation
  - Dashboard (stats)
  - Workshops
  - Users
  - Settings
- Main content area with routing
```

**Features:**
- [ ] Stat cards (total workshops, active users, etc.)
- [ ] Recent activity feed
- [ ] Quick actions (create user, view pending approvals)
- [ ] Responsive design (desktop-first, mobile-friendly)

**Design System:**
- Card-based layout
- Dark theme consistency
- Admin-specific color accents (amber/orange)
- Data tables with sorting/filtering

---

#### 2.2 Workshop Management Table
**Estimated Time:** 10 hours

**Features:**
- [ ] **Table Columns:**
  - Title
  - Facilitator(s)
  - Status (Draft/Open/In Progress/Completed)
  - Phase (Intake/Scoring/Analysis)
  - Participants
  - Use Cases
  - Created Date
  - Actions

- [ ] **Filters:**
  - Status dropdown
  - Date range picker
  - Search by title/facilitator
  - Sort by any column

- [ ] **Actions per Row:**
  - View/Edit (navigate to workshop detail)
  - Approve/Reject (status change)
  - Delete (with confirmation modal)
  - Assign Facilitators (modal)

- [ ] **Bulk Actions:**
  - Select multiple workshops
  - Bulk approve/reject
  - Bulk export

**Acceptance Criteria:**
- Paginated results (20 per page)
- Real-time updates when workshop status changes
- Smooth animations for row actions
- Accessible keyboard navigation

---

#### 2.3 User Management Interface
**Estimated Time:** 8 hours

**Features:**
- [ ] User list table
  - Email, Name, Role (Admin/Facilitator)
  - Workshops Created, Last Login
  - Status (Active/Inactive)
  - Actions

- [ ] Create New User Form
  - Email (required, validated)
  - Full Name (required)
  - Role selection (Admin/Facilitator)
  - Auto-generate temporary password
  - Send credentials via email (future)

- [ ] Edit User Modal
  - Update name, role
  - Reset password (admin-initiated)
  - Deactivate account

- [ ] User Detail View
  - All workshops created by user
  - Activity history
  - Statistics

**Acceptance Criteria:**
- Form validation with clear error messages
- Confirmation dialogs for destructive actions
- Success/error toast notifications
- Loading states for async operations

---

#### 2.4 Facilitator Assignment UI
**Estimated Time:** 6 hours

**Component: FacilitatorSelector**
```tsx
Features:
- Multi-select dropdown
- Search/filter facilitators
- Display selected facilitators with badges
- Primary facilitator designation
- Remove facilitator button
```

**Acceptance Criteria:**
- Can assign multiple facilitators to workshop
- Owner/primary facilitator clearly indicated
- Real-time update when facilitators added/removed
- Prevents duplicate assignments

---

### Phase 3: Integration & Polish (Week 3)

#### 3.1 Dashboard Routing & Navigation
**Estimated Time:** 4 hours

**Tasks:**
- [ ] Update App.tsx routing
- [ ] Add `/admin` route with nested routes
  - `/admin/dashboard`
  - `/admin/workshops`
  - `/admin/users`
- [ ] Add navigation guard (admin-only)
- [ ] Update AdminDashboard to link to AdminPanel for admins
- [ ] Add "Back to Admin Panel" breadcrumb in workshop views

---

#### 3.2 Notifications & Feedback
**Estimated Time:** 4 hours

**Tasks:**
- [ ] Toast notifications for all admin actions
- [ ] Confirmation modals for destructive actions
- [ ] Success animations (checkmarks, etc.)
- [ ] Error state UI (empty states, error boundaries)

---

#### 3.3 Testing & QA
**Estimated Time:** 8 hours

**Test Coverage:**
- [ ] Admin permission checks (403 for non-admins)
- [ ] Workshop CRUD operations
- [ ] User management operations
- [ ] Multi-facilitator assignment
- [ ] Search and filter functionality
- [ ] Pagination edge cases
- [ ] Concurrent user operations
- [ ] Mobile responsiveness

---

## 🎨 UI/UX Mockup Description

### Admin Panel Dashboard
```
┌─────────────────────────────────────────────────────┐
│ 🔷 Qbrain AI Labs - Admin Panel    [👤 Admin] │
├──────────────┬──────────────────────────────────────┤
│              │  📊 Statistics                       │
│ • Dashboard  │  ┌────────┬────────┬────────┬──────┐│
│ • Workshops  │  │   45   │  128   │  892   │  12  ││
│ • Users      │  │Workshop│ Users  │Particip│Active││
│ • Settings   │  └────────┴────────┴────────┴──────┘│
│              │                                       │
│              │  📋 Recent Workshops                 │
│              │  ┌──────────────────────────────────┐│
│              │  │ Title  │ Facilitator│Status│...  ││
│              │  ├──────────────────────────────────┤│
│              │  │ Q1 AI  │ John Doe   │ Open │...  ││
│              │  │ Sprint │ Jane Smith │Active│...  ││
│              │  └──────────────────────────────────┘│
└──────────────┴──────────────────────────────────────┘
```

---

## 📊 Success Metrics

### Functional Metrics
- [ ] Admin can view all workshops (100% visibility)
- [ ] Admin can approve/reject workshops (< 2 clicks)
- [ ] Admin can create/manage users (< 5 clicks per user)
- [ ] Admin can assign multiple facilitators (< 3 clicks)

### Performance Metrics
- [ ] Workshop list loads in < 1 second (up to 1000 workshops)
- [ ] User management operations complete in < 500ms
- [ ] No frontend lag when filtering/sorting tables

### UX Metrics
- [ ] Clear visual distinction between admin and facilitator views
- [ ] All admin actions have confirmation dialogs
- [ ] Zero data loss during operations
- [ ] Intuitive navigation (user testing required)

---

## 🔒 Security Considerations

### Authorization
- [ ] All admin routes protected by `require_admin` middleware
- [ ] Frontend route guards for `/admin` paths
- [ ] Session validation on every admin action
- [ ] Audit logging for sensitive operations (delete, user changes)

### Data Protection
- [ ] Soft deletes for workshops (retain for audit)
- [ ] Prevent accidental data loss (confirmation dialogs)
- [ ] Admin actions logged with timestamps and user ID

---

## 🚀 Deployment Checklist

### Database Migrations
- [ ] Create `workshop_facilitators` table
- [ ] Add indexes for performance
- [ ] Migrate existing workshop ownership to new model

### Environment Variables
- [ ] Add admin panel feature flag (if using gradual rollout)
- [ ] Configure email service for user invitations (future)

### Documentation
- [ ] Update README with admin features
- [ ] Create admin user guide
- [ ] API documentation for admin endpoints
- [ ] Video walkthrough (optional)

---

## 📈 Future Enhancements (Post-Sprint 13)

### Sprint 14 Candidates
- [ ] Email notifications for admin actions
- [ ] Workshop templates (clone functionality)
- [ ] Bulk import users from CSV
- [ ] Advanced analytics dashboard
- [ ] Audit log viewer
- [ ] Scheduled workshops
- [ ] Workshop archival automation

### Long-term Vision
- [ ] Role-based permissions (custom roles beyond admin/facilitator)
- [ ] Multi-tenancy (organizations, departments)
- [ ] Integration with SSO (SAML, OAuth2)
- [ ] API rate limiting per user
- [ ] Webhook support for external integrations

---

## 🧪 Testing Strategy

### Unit Tests
```python
# Backend
test_admin_middleware.py
test_admin_api.py
test_workshop_facilitators.py

# Frontend
AdminPanel.test.tsx
WorkshopTable.test.tsx
UserManagement.test.tsx
```

### Integration Tests
- [ ] Admin workflow: Create user → User creates workshop → Admin approves
- [ ] Multi-facilitator workflow: Assign → Access → Collaborate
- [ ] Permission denial scenarios

### E2E Tests (Playwright/Cypress)
- [ ] Admin login → View dashboard → Manage workshop
- [ ] Non-admin attempts admin access → Blocked
- [ ] Workshop approval flow end-to-end

---

## 🎓 Learning Objectives

### Team Skills Development
- Advanced FastAPI middleware patterns
- Complex data table implementation in React
- Permission-based routing strategies
- Database schema design for many-to-many relationships

---

## 📅 Sprint Schedule

### Week 1: Backend (Jan 27 - Feb 2)
- Days 1-2: Admin middleware & authorization
- Days 3-4: Admin API endpoints
- Day 5: Multi-facilitator database & APIs

### Week 2: Frontend (Feb 3 - Feb 9)
- Days 1-2: Admin panel layout & dashboard
- Days 3-4: Workshop management table
- Day 5: User management interface

### Week 3: Integration (Feb 10 - Feb 16)
- Days 1-2: Facilitator assignment UI
- Day 3: Routing & navigation
- Days 4-5: Testing, bug fixes, polish

---

## ✅ Definition of Done

A task is complete when:
- [ ] Code written and peer-reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] No linter errors
- [ ] Responsive design verified
- [ ] Admin permissions verified
- [ ] Deployed to staging environment
- [ ] Product owner approval

---

## 🏆 Sprint Success Criteria

Sprint 13 is successful when:
1. ✅ Admin can view and manage ALL workshops in the system
2. ✅ Admin can create, edit, and deactivate user accounts
3. ✅ Multiple facilitators can be assigned to a single workshop
4. ✅ Workshop approval/rejection workflow is functional
5. ✅ All admin features are secure and permission-protected
6. ✅ UI is polished and intuitive for admin users
7. ✅ Zero critical bugs in production
8. ✅ Performance metrics met (< 1 second load times)

---

**Estimated Total Effort:** 60-70 hours  
**Team Size:** 1-2 developers  
**Risk Level:** Medium (new permissions model, data integrity)  
**Dependencies:** Sprints 11-12 (Authentication, Admin User)

**Next Sprint Preview:** Sprint 14 will focus on AI Knowledge Base and insights generation from US11.

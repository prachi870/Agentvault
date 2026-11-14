# ESAKIP System Testing Checklist

## Test Session Information
- **Date**: 2026-09-28
- **Tester**: _____________
- **Environment**: Development (localhost)
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000

---

## Pre-Test Setup

### ✅ Services Running
- [ ] Backend is running on port 8000
- [ ] Frontend is running on port 3000
- [ ] Database connection is working
- [ ] Redis connection is working
- [ ] Qdrant connection is working

### ✅ Test Accounts
- [ ] Admin account: admin@esakip.local / Admin@123456
- [ ] Employee account: jane.smith@example.com / TestPass456!

### ✅ Test Data
- [ ] Test documents uploaded (4 files with different classifications)

---

## Test Suite 1: Authentication & Authorization

### 1.1 Login Tests
- [ ] **Test**: Navigate to http://localhost:3000/login
- [ ] **Test**: Login with admin credentials
  - Email: admin@esakip.local
  - Password: Admin@123456
  - **Expected**: Redirected to /dashboard
  - **Result**: ____________
- [ ] **Test**: Logout and verify session cleared
  - **Expected**: Redirected to /login
  - **Result**: ____________
- [ ] **Test**: Login with employee credentials
  - Email: jane.smith@example.com
  - Password: TestPass456!
  - **Expected**: Redirected to /dashboard
  - **Result**: ____________
- [ ] **Test**: Invalid credentials
  - **Expected**: Error message displayed
  - **Result**: ____________

### 1.2 Signup Tests
- [ ] **Test**: Navigate to http://localhost:3000/signup
- [ ] **Test**: Create new account
  - Full Name: Test User
  - Email: test.user@example.com
  - Password: TestPass123!
  - **Expected**: Account created, role=employee, clearance=0
  - **Result**: ____________
- [ ] **Test**: Login with new account
  - **Expected**: Successful login
  - **Result**: ____________

### 1.3 Protected Routes
- [ ] **Test**: Access /chat without login
  - **Expected**: Redirected to /login
  - **Result**: ____________
- [ ] **Test**: Access /users as employee
  - **Expected**: Access denied or hidden from nav
  - **Result**: ____________
- [ ] **Test**: Access /users as admin
  - **Expected**: Full access to user management
  - **Result**: ____________

---

## Test Suite 2: User Interface Components

### 2.1 Dashboard
- [ ] **Test**: Dashboard loads correctly
- [ ] **Test**: All cards are visible
- [ ] **Test**: Navigation sidebar shows correct options
- [ ] **Test**: User info displays in sidebar
  - **Expected**: Shows name, email, role
  - **Result**: ____________

### 2.2 Sidebar Navigation (Admin)
- [ ] **Test**: Dashboard link works
- [ ] **Test**: Chat link works
- [ ] **Test**: Receipts link works
- [ ] **Test**: User Management link visible (admin only)
- [ ] **Test**: Profile link works
- [ ] **Test**: Logout button works

### 2.3 Sidebar Navigation (Employee)
- [ ] **Test**: User Management link NOT visible
- [ ] **Test**: All other links work correctly
- [ ] **Test**: Profile link accessible

---

## Test Suite 3: User Profile Page

### 3.1 Viewing Profile
- [ ] **Test**: Navigate to /profile
- [ ] **Test**: User information displays correctly:
  - [ ] Full Name
  - [ ] Email
  - [ ] Role (admin or employee)
  - [ ] Clearance Level (0-3)
  - [ ] Account Status
  - [ ] Created Date
- [ ] **Test**: Page styling and layout correct
- [ ] **Result**: ____________

### 3.2 Different Users
- [ ] **Test**: Admin profile shows role=admin, clearance=3
- [ ] **Test**: Employee profile shows role=employee, clearance=1
- [ ] **Result**: ____________

---

## Test Suite 4: User Management (Admin Only)

### 4.1 Viewing Users
- [ ] **Test**: Navigate to /users as admin
- [ ] **Test**: User table displays correctly
- [ ] **Test**: All users are listed:
  - [ ] admin@esakip.local
  - [ ] jane.smith@example.com
  - [ ] test.user@example.com (if created)
- [ ] **Test**: Table shows: Email, Name, Role, Clearance, Status
- [ ] **Result**: ____________

### 4.2 Editing Users
- [ ] **Test**: Click "Edit" on jane.smith@example.com
- [ ] **Test**: Edit modal opens
- [ ] **Test**: Change clearance from 1 to 2
- [ ] **Test**: Save changes
  - **Expected**: Success message, table updates
  - **Result**: ____________
- [ ] **Test**: Verify change persisted (refresh page)
- [ ] **Result**: ____________

### 4.3 User Status Management
- [ ] **Test**: Click "Deactivate" on test.user@example.com
- [ ] **Test**: Status changes to "Inactive"
- [ ] **Test**: Try to login with deactivated account
  - **Expected**: Login fails
  - **Result**: ____________
- [ ] **Test**: Reactivate the account
- [ ] **Test**: Login should work again
  - **Result**: ____________

### 4.4 Search and Filter
- [ ] **Test**: Search for "jane"
  - **Expected**: Only jane.smith appears
  - **Result**: ____________
- [ ] **Test**: Clear search
  - **Expected**: All users visible again
  - **Result**: ____________

---

## Test Suite 5: Chat Functionality

### 5.1 Chat Interface
- [ ] **Test**: Navigate to /chat
- [ ] **Test**: Welcome message displays
- [ ] **Test**: Chat features listed (retrieval, verification, citations, RBAC)
- [ ] **Test**: Input field is functional
- [ ] **Test**: Help button (?) visible in header
- [ ] **Result**: ____________

### 5.2 Help System
- [ ] **Test**: Click help button (?)
- [ ] **Test**: Help modal opens
- [ ] **Test**: Chat help content displays
- [ ] **Test**: All sections visible:
  - [ ] Asking Questions
  - [ ] Understanding Responses
  - [ ] Response Status
  - [ ] Tips for Better Results
- [ ] **Test**: Close modal with X button
- [ ] **Test**: Close modal with Escape key
- [ ] **Result**: ____________

### 5.3 Asking Questions (With Test Documents)

**Prerequisites**: Upload test documents first (see Document Upload section below)

- [ ] **Test**: Ask a simple question
  - Question: "What is ESAKIP?"
  - **Expected**: Progress stages display, then answer appears
  - **Result**: ____________
- [ ] **Test**: Verify progress stages show:
  - [ ] 🔍 Retrieving
  - [ ] 📋 Planning
  - [ ] ✅ Verifying
  - [ ] ✍️ Generating
- [ ] **Result**: ____________

### 5.4 Response Components
- [ ] **Test**: Answer text is readable
- [ ] **Test**: Confidence score displays (high/medium/low)
- [ ] **Test**: Grounding percentage shown
- [ ] **Test**: Citations are present
- [ ] **Test**: Receipt ID is shown
- [ ] **Test**: Click receipt ID links to receipt details
- [ ] **Result**: ____________

### 5.5 Multiple Questions
- [ ] **Test**: Ask 3-4 different questions
- [ ] **Test**: All messages display in order
- [ ] **Test**: Scroll works correctly
- [ ] **Test**: Auto-scroll to latest message
- [ ] **Result**: ____________

### 5.6 Error Handling
- [ ] **Test**: Ask a question with no documents uploaded
  - **Expected**: Error message (not "[object Object]")
  - **Result**: ____________
- [ ] **Test**: Error message is readable and helpful
- [ ] **Result**: ____________

---

## Test Suite 6: RBAC & Clearance Levels

### 6.1 Admin Access (Clearance 3)
Login as admin@esakip.local

- [ ] **Test**: Ask about PUBLIC document
  - **Expected**: ANSWERED
  - **Result**: ____________
- [ ] **Test**: Ask about INTERNAL document
  - **Expected**: ANSWERED
  - **Result**: ____________
- [ ] **Test**: Ask about CONFIDENTIAL document
  - **Expected**: ANSWERED
  - **Result**: ____________
- [ ] **Test**: Ask about RESTRICTED document
  - **Expected**: ANSWERED
  - **Result**: ____________

### 6.2 Employee Access (Clearance 1)
Login as jane.smith@example.com (now has clearance 2 if you edited it, otherwise clearance 1)

- [ ] **Test**: Ask about PUBLIC document
  - **Expected**: ANSWERED
  - **Result**: ____________
- [ ] **Test**: Ask about INTERNAL document
  - **Expected**: ANSWERED
  - **Result**: ____________
- [ ] **Test**: Ask about CONFIDENTIAL document (if clearance >= 2)
  - **Expected**: ANSWERED if clearance=2, BLOCKED if clearance=1
  - **Result**: ____________
- [ ] **Test**: Ask about RESTRICTED document
  - **Expected**: BLOCKED (insufficient clearance)
  - **Result**: ____________

### 6.3 New User Access (Clearance 0)
Login as test.user@example.com (clearance 0)

- [ ] **Test**: Ask about PUBLIC document
  - **Expected**: ANSWERED
  - **Result**: ____________
- [ ] **Test**: Ask about INTERNAL document
  - **Expected**: BLOCKED
  - **Result**: ____________

---

## Test Suite 7: Receipts Page

### 7.1 Viewing Receipts
- [ ] **Test**: Navigate to /receipts
- [ ] **Test**: Past queries are listed
- [ ] **Test**: Each receipt shows:
  - [ ] Receipt ID
  - [ ] Date/time
  - [ ] Question
  - [ ] Status
  - [ ] Confidence
- [ ] **Result**: ____________

### 7.2 Receipt Details
- [ ] **Test**: Click on a receipt
- [ ] **Test**: Full details display:
  - [ ] Complete question
  - [ ] Full answer
  - [ ] All citations
  - [ ] Metadata (confidence, grounding, latency)
  - [ ] Signature hash
- [ ] **Result**: ____________

### 7.3 Filtering (if implemented)
- [ ] **Test**: Filter by date range
- [ ] **Test**: Filter by status
- [ ] **Test**: Filter by confidence level
- [ ] **Result**: ____________

---

## Test Suite 8: Document Upload & Indexing

### 8.1 Test Documents

We created 4 test documents in `backend/test_docs/`:
1. **public_info.txt** - Clearance 0
2. **internal_memo.txt** - Clearance 1
3. **confidential_report.txt** - Clearance 2
4. **restricted_data.txt** - Clearance 3

### 8.2 Upload Methods

**Method 1: Copy to data directory**
```bash
# Copy test documents to the data directory
cp backend/test_docs/*.txt backend/data/
```

**Method 2: API Upload** (if endpoint exists)
```bash
# Upload via API
curl -X POST http://localhost:8000/api/v1/admin/upload \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@backend/test_docs/public_info.txt" \
  -F "classification=public" \
  -F "clearance_required=0"
```

**Method 3: Manual Indexing Script**
```bash
cd backend
.venv\Scripts\Activate
python -m app.scripts.index_documents
```

### 8.3 Verify Documents Indexed
- [ ] **Test**: Check Qdrant collection
- [ ] **Test**: Verify 4 documents present
- [ ] **Test**: Check metadata (classification, clearance)
- [ ] **Result**: ____________

---

## Test Suite 9: API Health & Connectivity

### 9.1 Health Check
```bash
curl http://localhost:8000/api/v1/health
```
- [ ] **Expected**: Returns healthy status with all services connected
- [ ] **Result**: ____________

### 9.2 Database Connection
- [ ] **Test**: PostgreSQL connection working
- [ ] **Test**: Can query users table
- [ ] **Result**: ____________

### 9.3 Redis Connection
- [ ] **Test**: Redis connection working
- [ ] **Test**: Can set/get cache values
- [ ] **Result**: ____________

### 9.4 Qdrant Connection
- [ ] **Test**: Qdrant connection working
- [ ] **Test**: Collection exists
- [ ] **Test**: Can perform vector search
- [ ] **Result**: ____________

---

## Test Suite 10: Performance & Reliability

### 10.1 Response Times
- [ ] **Test**: Login response < 2 seconds
- [ ] **Test**: Page load < 3 seconds
- [ ] **Test**: Query response < 10 seconds (with local LLM)
- [ ] **Result**: ____________

### 10.2 Concurrent Users
- [ ] **Test**: Open 2 browser windows with different users
- [ ] **Test**: Both can query simultaneously
- [ ] **Test**: No cross-contamination of sessions
- [ ] **Result**: ____________

### 10.3 Error Recovery
- [ ] **Test**: Refresh page mid-query
  - **Expected**: New session starts cleanly
  - **Result**: ____________
- [ ] **Test**: Back button after logout
  - **Expected**: Redirected to login
  - **Result**: ____________

---

## Test Suite 11: UI/UX Quality

### 11.1 Responsive Design
- [ ] **Test**: Resize browser window
- [ ] **Test**: Mobile view (< 768px)
- [ ] **Test**: Tablet view (768px - 1024px)
- [ ] **Test**: Desktop view (> 1024px)
- [ ] **Result**: ____________

### 11.2 Accessibility
- [ ] **Test**: Tab navigation works
- [ ] **Test**: Focus indicators visible
- [ ] **Test**: Form labels present
- [ ] **Test**: Color contrast sufficient
- [ ] **Result**: ____________

### 11.3 Visual Polish
- [ ] **Test**: No visual glitches
- [ ] **Test**: Animations smooth
- [ ] **Test**: Colors consistent with theme
- [ ] **Test**: Typography readable
- [ ] **Result**: ____________

---

## Test Suite 12: Security

### 12.1 Authentication Security
- [ ] **Test**: JWT token stored securely
- [ ] **Test**: Token expires after configured time
- [ ] **Test**: Can't access API without valid token
- [ ] **Result**: ____________

### 12.2 Authorization Security
- [ ] **Test**: Employee can't access admin endpoints
- [ ] **Test**: Deactivated user can't login
- [ ] **Test**: RBAC enforced on all queries
- [ ] **Result**: ____________

### 12.3 Input Validation
- [ ] **Test**: SQL injection prevention
- [ ] **Test**: XSS prevention
- [ ] **Test**: Password requirements enforced
- [ ] **Result**: ____________

---

## Issues Found

### Critical Issues (Blocks Core Functionality)
1. _____________________________________________
2. _____________________________________________

### Major Issues (Degrades Experience)
1. _____________________________________________
2. _____________________________________________

### Minor Issues (Polish/Enhancement)
1. _____________________________________________
2. _____________________________________________

---

## Test Summary

**Total Tests**: _____ / _____
**Passed**: _____
**Failed**: _____
**Blocked**: _____
**Pass Rate**: _____%

### Overall Status
- [ ] ✅ PASS - System ready for use
- [ ] ⚠️ PASS WITH ISSUES - Usable but needs fixes
- [ ] ❌ FAIL - Critical issues found

### Recommendations
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

## Next Steps

### Immediate Actions
- [ ] Fix critical issues
- [ ] Re-test failed scenarios
- [ ] Document known limitations

### Short-term Improvements
- [ ] Address major issues
- [ ] Improve error messages
- [ ] Add missing features

### Long-term Enhancements
- [ ] Implement remaining tasks (ACL mirroring, webhooks, multi-tenancy)
- [ ] Performance optimization
- [ ] Additional testing (load testing, security audit)

---

*Test completed by: _____________ on _____________*

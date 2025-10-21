# Delete Confirmation Modal - Testing Guide

## Overview

This guide provides a comprehensive manual testing checklist for the delete confirmation modal system implemented across all 18 table components.

**Test Environment:**
- Development Server: http://localhost:3000/
- Test User Credentials:
  - Email: elber@impactus.ai
  - Password: Senha@123

## Pre-Testing Setup

1. **Start Development Server**
   ```bash
   pnpm dev
   ```
   Verify server is running at http://localhost:3000/

2. **Login to Application**
   - Navigate to http://localhost:3000/
   - Enter credentials:
     - Email: elber@impactus.ai
     - Password: Senha@123
   - Verify successful login

## Test Cases

### 1. Single Delete Confirmation - Cities Table

**Location:** `/cities` or Cities management page

**Test Steps:**
1. Navigate to Cities table
2. Locate any city record
3. Click the delete button (trash icon) in the row actions
4. **Expected:** Delete confirmation dialog appears with:
   - Title: "Confirm Deletion" (EN) or "Confirmar Exclusão" (PT)
   - Description: "Are you sure you want to delete this city?" (EN) or "Tem certeza de que deseja excluir esta cidade?" (PT)
   - Warning: "This action cannot be undone."
   - Two buttons: "Cancel" and "Delete"
   - AlertTriangle danger icon
5. Click "Cancel"
6. **Expected:** Dialog closes, city not deleted
7. Click delete button again
8. Click "Delete" button
9. **Expected:**
   - Button shows "Deleting..." with spinner
   - Dialog cannot be closed during operation
   - On success: Toast notification "Successfully deleted"
   - Dialog closes
   - City removed from table

**Success Criteria:**
- ✅ Dialog appears with correct text
- ✅ Cancel works properly
- ✅ Delete executes successfully
- ✅ Loading state shows properly
- ✅ Toast notification appears
- ✅ Data refreshes

---

### 2. Bulk Delete Confirmation - Cities Table

**Test Steps:**
1. In Cities table, enable row selection (checkbox column)
2. Select 3-5 cities using checkboxes
3. **Expected:** Bulk actions button appears showing selected count
4. Click bulk actions dropdown
5. Click "Delete Selected"
6. **Expected:** Bulk delete confirmation dialog appears with:
   - Title: "Confirm Bulk Deletion" (EN) or "Confirmar Exclusão em Massa" (PT)
   - Description: "Are you sure you want to delete 3 items?" (or actual count)
   - Warning: "This action cannot be undone."
   - Two buttons: "Cancel" and "Delete"
7. Click "Cancel"
8. **Expected:** Dialog closes, no cities deleted, selection maintained
9. Click "Delete Selected" again
10. Click "Delete" button
11. **Expected:**
    - Button shows "Deleting..." with spinner
    - All selected cities deleted sequentially
    - Toast: "3 items deleted successfully"
    - Row selection reset
    - Table refreshes

**Success Criteria:**
- ✅ Bulk dialog shows correct count
- ✅ Cancel preserves selection
- ✅ All items deleted successfully
- ✅ Success message shows correct count
- ✅ Selection reset after deletion

---

### 3. Error Handling - Network Failure Scenario

**Test Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Enable "Offline" mode
4. In any table, attempt to delete a record
5. **Expected:**
   - Dialog appears normally
   - Click "Delete"
   - Error toast appears: "Failed to delete"
   - Dialog remains open showing error state
6. Disable offline mode
7. Click "Delete" again
8. **Expected:** Deletion succeeds

**Success Criteria:**
- ✅ Error handled gracefully
- ✅ User notified of failure
- ✅ Can retry after error

---

### 4. Cross-Module Testing

Test single delete confirmation on all 18 tables:

#### Support Data Module (8 tables)
- [ ] Cities (`/cities`)
- [ ] Countries (`/countries`)
- [ ] States (`/states`)
- [ ] Process Types (`/process-types`)
- [ ] Legal Frameworks (`/legal-frameworks`)
- [ ] Document Types (`/document-types`)
- [ ] CBO Codes (`/cbo-codes`)
- [ ] Consulates (`/consulates`)

#### CRM Module (4 tables)
- [ ] Companies (`/companies`)
- [ ] People (`/people`)
- [ ] Passports (`/passports`)
- [ ] People-Companies (`/people-companies`)

#### Process Management Module (2 tables)
- [ ] Main Processes (`/processes`)
- [ ] Individual Processes (`/individual-processes`)

#### Other Modules (3 tables - Activity Logs excluded)
- [ ] Documents (`/documents`)
- [ ] Tasks (`/tasks`)
- [ ] Notifications (`/notifications`)

**For Each Table:**
1. Navigate to table
2. Click delete on any record
3. Verify dialog appears with correct entity name
4. Test cancel functionality
5. Test delete functionality
6. Verify toast notification

**Note:** Activity Logs table does NOT have delete functionality (audit trail integrity).

---

### 5. Internationalization Testing

**Test Steps:**
1. Login to application
2. Locate language switcher (if available in UI)
3. Switch to Portuguese (pt)
4. Navigate to Cities table
5. Click delete on a city
6. **Expected:** Dialog text in Portuguese:
   - Title: "Confirmar Exclusão"
   - Description: "Tem certeza de que deseja excluir esta cidade?"
   - Warning: "Esta ação não pode ser desfeita."
   - Buttons: "Cancelar" and "Excluir"
7. Click "Cancelar"
8. Switch to English (en)
9. Click delete again
10. **Expected:** Dialog text in English:
    - Title: "Confirm Deletion"
    - Description: "Are you sure you want to delete this city?"
    - Warning: "This action cannot be undone."
    - Buttons: "Cancel" and "Delete"

**Success Criteria:**
- ✅ All text properly translated
- ✅ Entity names localized correctly
- ✅ No hardcoded strings
- ✅ Buttons properly labeled

---

### 6. Mobile Responsiveness Testing

**Test Steps:**
1. Open browser DevTools (F12)
2. Enable device emulation (iPhone 14 Pro or similar)
3. Navigate to Cities table
4. Tap delete button
5. **Expected:**
   - Dialog appears centered
   - All text readable
   - Buttons minimum 44x44px (easily tappable)
   - Adequate spacing between Cancel and Delete
   - No horizontal scrolling required
6. Test on various screen sizes:
   - 320px (iPhone SE)
   - 375px (iPhone 12/13/14)
   - 414px (iPhone Plus models)
   - 768px (iPad)

**Success Criteria:**
- ✅ Dialog fully visible on all sizes
- ✅ Touch targets adequate
- ✅ Text not truncated
- ✅ Buttons accessible
- ✅ No layout breaks

---

### 7. Accessibility Testing

#### Keyboard Navigation
**Test Steps:**
1. Navigate to Cities table using Tab key
2. Tab to delete button in a row
3. Press Enter
4. **Expected:** Dialog opens
5. Press Tab
6. **Expected:** Focus moves to Cancel button
7. Press Tab again
8. **Expected:** Focus moves to Delete button
9. Press Shift+Tab
10. **Expected:** Focus returns to Cancel
11. Press Escape
12. **Expected:** Dialog closes

**Success Criteria:**
- ✅ All interactive elements keyboard accessible
- ✅ Logical tab order
- ✅ Enter key opens dialog
- ✅ Escape key closes dialog
- ✅ Focus trapped within dialog

#### Screen Reader Testing (if available)
**Test Steps:**
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to delete button
3. **Expected:** Button announced as "Delete button"
4. Activate delete
5. **Expected:** Dialog role announced
6. **Expected:** Title and description read aloud
7. Navigate buttons
8. **Expected:** "Cancel button", "Delete button" announced

**Success Criteria:**
- ✅ All elements properly labeled
- ✅ Dialog role announced
- ✅ Content read in correct order
- ✅ Button purposes clear

---

### 8. Performance Testing

**Test Steps:**
1. Navigate to Cities table
2. Open browser DevTools Performance tab
3. Start recording
4. Click delete button
5. Click confirm
6. Stop recording
7. **Expected:**
   - Dialog renders in <100ms
   - No layout shifts
   - Smooth animations
8. Test with 100+ items in table
9. **Expected:** No performance degradation

**Success Criteria:**
- ✅ Fast dialog rendering
- ✅ No jank or freezing
- ✅ Smooth under load

---

### 9. Edge Cases

#### Empty Selection Bulk Delete
**Test Steps:**
1. In Cities table, ensure no rows selected
2. **Expected:** Bulk actions button not visible or disabled
3. Cannot trigger bulk delete dialog

#### Single Item Bulk Delete
**Test Steps:**
1. Select only 1 city
2. Click bulk delete
3. **Expected:** Dialog shows "1 items" (or handle singular properly)
4. Delete works correctly

#### Rapid Clicking
**Test Steps:**
1. Click delete button
2. Rapidly click Delete confirmation multiple times
3. **Expected:**
   - Only one delete operation executes
   - No duplicate toasts
   - Button disabled during operation

#### Partial Bulk Delete Failure
**Test Steps:**
1. Select 5 cities
2. Use DevTools to simulate failure on 3rd item
3. Execute bulk delete
4. **Expected:**
   - Deletes items 1-2 successfully
   - Fails on item 3
   - Shows error: "Failed to delete some items"
   - Items 4-5 may or may not delete (depends on error handling)

**Success Criteria:**
- ✅ Edge cases handled gracefully
- ✅ No crashes or errors
- ✅ User informed of all scenarios

---

## Regression Testing

Verify existing functionality still works:

1. **Table Sorting**
   - Sort by various columns
   - Verify delete still works after sorting

2. **Table Filtering**
   - Apply search filter
   - Delete filtered item
   - Verify filter maintained

3. **Pagination**
   - Navigate to page 2
   - Delete item
   - Verify pagination updates

4. **Column Visibility**
   - Hide some columns
   - Delete still accessible and works

5. **Other Row Actions**
   - Edit action still works
   - View action still works
   - All actions coexist properly

---

## Known Limitations

1. **Activity Logs Table**
   - No delete functionality (intentional - audit trail)
   - Should not have any delete buttons

2. **CBO Codes Table**
   - Uses `removeCboCode` mutation (table-specific)
   - Verify deletion works with special mutation

---

## Bug Reporting Template

If issues found during testing:

```markdown
### Bug Report

**Table:** [Name of table]
**Test Case:** [Which test case]
**Browser:** [Chrome/Firefox/Safari + version]
**Device:** [Desktop/Mobile + details]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Screenshots:**
[Attach if applicable]

**Console Errors:**
[Any errors from browser console]
```

---

## Sign-Off Checklist

Before marking testing complete, verify:

- [ ] All 17 tables with delete functionality tested (excluding Activity Logs)
- [ ] Single delete works on all tables
- [ ] Bulk delete works on tables with multi-select
- [ ] Both languages (EN/PT) tested
- [ ] Mobile responsive on 3+ screen sizes
- [ ] Keyboard navigation fully functional
- [ ] Error scenarios handled properly
- [ ] Performance acceptable
- [ ] No console errors
- [ ] All edge cases covered
- [ ] No regressions in existing features

---

## Test Results Template

Use this to document test results:

```markdown
## Test Execution Results

**Tester:** [Name]
**Date:** [Date]
**Environment:** [Production/Staging/Dev]

### Summary
- Total Test Cases: 9
- Passed: __
- Failed: __
- Blocked: __

### Detailed Results

#### Test Case 1: Single Delete - Cities
- Status: [Pass/Fail]
- Notes:

#### Test Case 2: Bulk Delete - Cities
- Status: [Pass/Fail]
- Notes:

[... continue for all test cases ...]

### Bugs Found
1. [Bug description]
2. [Bug description]

### Recommendations
- [Any improvements needed]
```

---

## Automation Opportunities

For future CI/CD integration, consider automating:
1. Screenshot regression testing (Percy, Chromatic)
2. Accessibility testing (axe-core, Pa11y)
3. Visual regression (BackstopJS)
4. E2E flows (Playwright, Cypress)

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-20
**Maintained By:** Development Team

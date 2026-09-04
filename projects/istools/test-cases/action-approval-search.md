# Test cases: Conversion Approval

---

**ID**: TC-CVA-01

- **Title**: Verify default search when accessing Conversion Approval
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Navigate to Conversion > Conversion Approval.
  2. Observe the default filter settings and result list:
     - Status: New and Hold are selected.
     - Duration: Smart Duration → This month.
     - Find by Date: Occur date.
- **Expected result**: The list automatically loads and displays the correct current-month New/Hold conversions, matching the existing DB data.
- **Automated**: yes — [find-action-approval-list.spec.ts](../../api/automation/find-action-approval-list.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-CVA-02

- **Title**: Verify search by Seq No for single and multiple values
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Enter a valid Seq No (e.g. 291195247) and click Search.
  2. Enter multiple valid Seq Nos and search again.
- **Expected result**: For a single Seq No, only the matching conversion is displayed. For multiple Seq Nos, all corresponding records are displayed correctly. No Gurkha/Hussar API errors occur.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-03

- **Title**: Verify bulk Approve, Hold, and Reject actions
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Search for conversions.
  2. Select 3 records with New/Hold status.
  3. Click Approve, Hold, or Reject.
  4. Confirm the action if a confirmation popup appears.
- **Expected result**: The selected records are updated to the corresponding status. Gurkha/Hussar APIs are called successfully and the database is updated correctly.
- **Automated**: no
- **Status**: ⏭️ Skipped

---

**ID**: TC-CVA-04

- **Title**: Verify search using multiple filters
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Select a Merchant ID from Merchant Acc No.
  2. Select a Campaign ID from Campaign No.
  3. Click Search.
- **Expected result**: The grid displays only conversions matching all selected filter conditions. Displayed data matches the database accurately.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-05

- **Title**: Verify Status filter functionality
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Select Rejected and Approved.
  2. Deselect New and Hold.
  3. Click Search.
- **Expected result**: The grid displays only conversions with Rejected or Approved status. Related fields such as Confirmed Date and ApprovedName are displayed correctly.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-06

- **Title**: Verify pagination and sorting
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Click Occurred Date to sort ascending/descending.
  2. Change Show entries from 10 to 50.
  3. Navigate between pages.
- **Expected result**: Records are sorted correctly by Occurred Date. Up to 50 records are displayed per page. Pagination works correctly without duplicated or missing records.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-07

- **Title**: Verify search by Custom Duration
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Select Custom Duration.
  2. Set the date range, e.g. 2026/07 to 2026/08.
  3. Select Occur date/Confirmed Date.
  4. Click Search.
- **Expected result**: Only conversions with Occurred Date from 2026/07 through 2026/08 are displayed.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-08

- **Title**: Verify CSV and Excel export
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Perform a search and display results.
  2. Click CSV or Excel.
- **Expected result**: The file is downloaded successfully. The exported data, row count, and formatting match the data displayed in the grid.
- **Automated**: no
- **Status**: ⏭️ Skipped

---

**ID**: TC-CVA-09

- **Title**: Verify search with non-existing Seq No / Identifier
- **Priority**: Low
- **Preconditions**: None
- **Steps**:
  1. Enter a non-existing Seq No, e.g. 9999999999.
  2. Click Search.
- **Expected result**: The grid displays no matching records with a user-friendly message such as "No data available in table". The page does not crash or display a blank error page.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-10

- **Title**: Verify search with Seq No exceeding API payload limit
- **Priority**: Low
- **Preconditions**: None
- **Steps**:
  1. Prepare more than 2,000 Seq Nos.
  2. Paste them into the Seq No field.
  3. Click Search.
- **Expected result**: The grid displays no matching records with a user-friendly message such as "No data available in table". The page does not crash or display a blank error page.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-11

- **Title**: Verify invalid Custom Duration range
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Select Custom Duration.
  2. Set the From Month later than the To Month.
  3. Click Search.
- **Expected result**: The system prevents the invalid date range or displays an appropriate validation message, such as "To Month must not be less than From Month."
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-12

- **Title**: Verify input security against SQL Injection and XSS
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Enter SQL/XSS payloads such as `SELECT * FROM conversion` or `<script>alert(1)</script>` into searchable fields.
  2. Click Search.
- **Expected result**: Inputs are handled safely. No script is executed, no SQL error is exposed, and no unexpected system behavior occurs.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-13

- **Title**: Verify error handling when Gurkha/Hussar API is unavailable or times out
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Simulate API connection failure or a response timeout exceeding the configured limit.
  2. Click Search.
- **Expected result**: A loading state is displayed while processing. After timeout, a clear error message is shown, such as "Unable to connect to the server. Please try again later." The UI must not remain stuck or expose raw Java stack traces.
- **Automated**: no
- **Status**: ⏭️ Skipped

---

**ID**: TC-CVA-14

- **Title**: Verify behavior when clicking Search multiple times
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Enter valid search criteria.
  2. Click Search twice consecutively.
- **Expected result**: System handles repeated clicks correctly without duplicate requests, duplicated records, UI errors, or inconsistent search results.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-CVA-15

- **Title**: Verify performance with a large dataset
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Load Affiliation List without filters with approximately 1 million records.
  2. Monitor API response and UI performance.
- **Expected result**: Server-side pagination handles the large dataset efficiently. The browser remains responsive without 504 Gateway Timeout or similar errors.
- **Automated**: no
- **Status**: ⏭️ Skipped

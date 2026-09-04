# Test cases: Affiliation List

---

**ID**: TC-AFL-01

- **Title**: Verify default search when accessing Affiliation List
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Navigate to Affiliation > Affiliation List.
  2. Check the default filters and loaded data.
- **Expected result**: Default filters are displayed correctly: Keyword is empty, Status/Country are Unspecified, and Applied Dates are empty or set to the default period. The latest Affiliation data is loaded correctly.
- **Automated**: yes [find-affiliation-list.spec.ts](../../api/automation/find-affiliation-list.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-AFL-02

- **Title**: Verify bulk approval of Applying requests
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Filter records by Applying status.
  2. Select multiple records.
  3. Click Approve and confirm if required.
- **Expected result**: Selected records are changed to Approved. Approved Date is updated and Updated by shows the correct user.
- **Automated**: no
- **Status**: ⏭️ Skipped

---

**ID**: TC-AFL-03

- **Title**: Verify bulk rejection of Applying requests
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Filter records by Applying status.
  2. Select one or more records.
  3. Click Reject and confirm the action.
- **Expected result**: Selected records are changed to Rejected. Reject Date and Updated by are updated correctly.
- **Automated**: no
- **Status**: ⏭️ Skipped

---

**ID**: TC-AFL-04

- **Title**: Verify search using multiple filters
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Enter/select Partner Site No.
  2. Enter/select Campaign No.
  3. Enter/select Partner Acc No.
  4. Click Search.
- **Expected result**: The Grid displays only records matching all selected filter conditions. Data is displayed accurately without mismatched information between columns.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-05

- **Title**: Verify pagination with a large dataset
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Load the Affiliation List with a large number of records.
  2. Navigate through multiple pages.
  3. Change page size to 20, 50, and 100.
- **Expected result**: Pagination and page-size selection work correctly. The API returns the correct offset/limit data without duplicated or missing records.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-06

- **Title**: Verify bulk Rank and Next Month Rank editing
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Select one or more Affiliation records.
  2. Click Edit Rank or Next Month Edit Rank.
  3. Enter a new Rank and save.
- **Expected result**: The selected records are updated with the new Rank/Next Month Rank. The updated values are correctly persisted in the database.
- **Automated**: no
- **Status**: ⏭️ Skipped

---

**ID**: TC-AFL-07

- **Title**: Verify Applied Date shortcut filters
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Select This month, 1 month, 3 months, 6 months, and 1 year shortcuts.
  2. Click Search for each option.
- **Expected result**: Applied Dates are populated with the correct date range, and the results contain only records within the selected period.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-08

- **Title**: Verify CSV and Excel export
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Perform a search with valid criteria.
  2. Click CSV or Excel.
- **Expected result**: The file is downloaded successfully. Column names, record count, and data content match the search results displayed in the Grid.
- **Automated**: no
- **Status**: ⏭️ Skipped

---

**ID**: TC-AFL-09

- **Title**: Verify bulk actions without selecting any records
- **Priority**: Low
- **Preconditions**: None
- **Steps**:
  1. Ensure no records are selected.
  2. Click Approve, Reject, or Delete.
- **Expected result**: The system displays an appropriate warning such as "Please select at least one item to perform this action" and does not execute an invalid API request.
- **Automated**: no
- **Status**: ⏭️ Skipped

---

**ID**: TC-AFL-10

- **Title**: Verify Approve/Reject action on already processed records
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Select a record with Approved or Rejected status.
  2. Attempt to Approve or Reject the record.
- **Expected result**: The system prevents the invalid operation and displays an appropriate validation message, or safely ignores the invalid record.
- **Automated**: no
- **Status**: ⏭️ Skipped

---

**ID**: TC-AFL-11

- **Title**: Verify Keyword input security
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Enter special characters, SQL Injection, or XSS payloads into Keyword.
  2. Click Search.
- **Expected result**: Input is handled safely. No SQL error or script execution occurs, and the UI remains stable.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-12

- **Title**: Verify performance with a large dataset
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Load the Affiliation List without filters with approximately 1 million records.
  2. Monitor API response and UI performance.
- **Expected result**: Server-side pagination handles the large dataset efficiently. The browser remains responsive and no 504 Gateway Timeout or similar error occurs.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-13

- **Title**: Verify search by Country Code
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Execute the search request.
- **Expected result**: The API returns only Affiliation records associated with country code `ID`. The response data is displayed correctly on the Grid.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-14

- **Title**: Verify search by Affiliation Status and Country Code
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `affiliationStatus` to `APPLYING`.
  2. Set `countryCode` to `ID`.
  3. Execute the search request.
- **Expected result**: The API returns only records with APPLYING status and country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-15

- **Title**: Verify search by Keyword and Country Code
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `keyword` to `test`.
  2. Set `countryCode` to `ID`.
  3. Execute the search request.
- **Expected result**: The API returns only records matching keyword `test` and country code `ID`.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-16

- **Title**: Verify search by Approved Date range
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `affiliationStatus` to `APPROVED`.
  2. Set Approved Date From to `2026-06-01`.
  3. Set Approved Date To to `2026-08-26`.
  4. Set `countryCode` to `ID`.
  5. Execute the search request.
- **Expected result**: The API returns only APPROVED records from 2026-06-01 through 2026-08-26 for country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-17

- **Title**: Verify search by Publisher Site No
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Set `publisherSiteNo` to `102253`.
  3. Execute the search request.
- **Expected result**: The API returns only records matching Publisher Site No 102253 and country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-18

- **Title**: Verify search by multiple Campaign Nos
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Set `campaignNo` to `7998` and `8019`.
  3. Execute the search request.
- **Expected result**: The API returns records associated with Campaign Nos 7998 or 8019 under country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-19

- **Title**: Verify search by multiple Partner Account Nos
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Set `partnerAccountNos` to `8425` and `999`.
  3. Execute the search request.
- **Expected result**: The API returns records associated with Partner Account Nos 8425 or 999 under country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-20

- **Title**: Verify search by multiple Ranks
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Set `ranks` to `5`, `6`, `7`, and `8`.
  3. Execute the search request.
- **Expected result**: The API returns only records with Rank 5, 6, 7, or 8 for country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-21

- **Title**: Verify Applied Date filter - This Month
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Select This month.
  3. Execute the search request.
- **Expected result**: The API returns only records with Applied Date within the current month for country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-22

- **Title**: Verify Applied Date filter - 1 Month
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Select 1 month.
  3. Execute the search request.
- **Expected result**: The API returns only records with Applied Date within the selected 1-month period for country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-23

- **Title**: Verify Applied Date filter - 3 Months
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Select 3 months.
  3. Execute the search request.
- **Expected result**: The API returns only records with Applied Date within the selected 3-month period for country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-24

- **Title**: Verify Applied Date filter - 6 Months
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Select 6 months.
  3. Execute the search request.
- **Expected result**: The API returns only records with Applied Date within the selected 6-month period for country code ID.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-AFL-25

- **Title**: Verify Applied Date filter - 1 Year
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Set `countryCode` to `ID`.
  2. Select 1 year.
  3. Execute the search request.
- **Expected result**: The API returns only records with Applied Date within the selected 1-year period for country code ID.
- **Automated**: no
- **Status**: ✅ Passed

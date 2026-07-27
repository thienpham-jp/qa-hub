# Test Cases: Publisher Click Trend

**ID**: TC-PCT-01

- **Title**: Verify Top 50 logic in SQL/Table
- **Priority**: High
- **Preconditions**: site_summary table available with click data for publishers.
- **Steps**:
  1. Open Top Publishers report.
  2. Inspect SQL/query used to populate the table.
  3. Compare displayed rows with SQL result.
- **Expected result**: SQL uses FROM site_summary ORDER BY total_clicks DESC LIMIT 50 and table displays exactly 50 publishers with highest total_clicks.
- **Automated**: no — link to spec file in `project/cfd/automation/cfd-page-id.spec.ts` if yes

**ID**: TC-PCT-02

- **Title**: Verify DoD% calculation (Positive)
- **Priority**: High
- **Preconditions**: Two consecutive days' click values available (C1 previous day, C2 current day).
- **Steps**:
  1. Select publisher row.
  2. Take clicks of Jun 7 (C1) and Jun 8 (C2).
  3. Compute ((C2-C1)/C1)\*100 and round to 2 decimals.
  4. Compare computed value with "DOD %" column.
- **Expected result**: DOD % matches computed formula exactly (2 decimal places).
- **Automated**: no

**ID**: TC-PCT-03

- **Title**: Verify Status mapping logic
- **Priority**: High
- **Preconditions**: Publishers with DoD values across >10%, <-10%, and between.
- **Steps**:
  1. Identify a publisher with DoD > +10%.
  2. Identify a publisher with DoD < -10%.
  3. Identify a publisher with -10% <= DoD <= +10%.
- **Expected result**: Status shows "Surge" (Green) for >+10%, "Drop" (Red) for <-10%, and "Stable" (Grey) for within -10%.
- **Automated**: no

**ID**: TC-PCT-04

- **Title**: Verify "Latest Day" summary card
- **Priority**: High
- **Preconditions**: Dataset contains multiple dates including the latest date.
- **Steps**:
  1. Identify the latest date in range (e.g., Jul 6).
  2. Sum all clicks for that date.
  3. Compare sum with "Latest Day" summary card value.
- **Expected result**: Summary card shows correct aggregate for the latest date.
- **Automated**: no

**ID**: TC-PCT-05

- **Title**: Verify "Drops > 10%" counter
- **Priority**: High
- **Preconditions**: Table includes DoD% column for Top 50.
- **Steps**:
  1. Count publishers in table with DoD < -10%.
  2. Check value shown in "Drops" summary card.
- **Expected result**: Drops card count matches the table count.
- **Automated**: no

**ID**: TC-PCT-06

- **Title**: Verify "Surges > 10%" counter
- **Priority**: High
- **Preconditions**: Table includes DoD% column for Top 50.
- **Steps**:
  1. Count publishers in table with DoD > +10%.
  2. Check value shown in "Surges" summary card.
- **Expected result**: Surges card count matches the table count.
- **Automated**: no

**ID**: TC-PCT-07

- **Title**: Boundary: DoD exactly 10.0%
- **Priority**: Low
- **Preconditions**: Ability to inject test data where DoD == 10.0% or -10.0%.
- **Steps**:
  1. Inject publisher rows with DoD exactly 10.0% and -10.0%.
  2. Refresh dashboard.
  3. Observe status mapping for those rows.
- **Expected result**: System handles boundary per spec (Stable if <=10% or Surge if >10% depending on spec).
- **Automated**: no

**ID**: TC-PCT-08

- **Title**: Edge Case: Division by zero (DoD)
- **Priority**: High
- **Preconditions**: Test data can set previous day clicks = 0.
- **Steps**:
  1. Set previous day clicks to 0 and current day clicks > 0.
  2. Refresh dashboard.
  3. Check DoD % column.
- **Expected result**: DoD % shows "N/A" or "∞" and system does not error (handled by NULLIF or similar).
- **Automated**: no

**ID**: TC-PCT-09

- **Title**: Verify Publisher Alerts – Drops >10%
- **Priority**: Medium
- **Preconditions**: Alerts panel accessible and Top Publishers table visible.
- **Steps**:
  1. Open Drops >10% alert panel.
  2. Cross-check listed publishers with table DoD% values.
  3. Verify total count matches table.
- **Expected result**: Panel lists only publishers with DoD < -10% and count matches.
- **Automated**: no

**ID**: TC-PCT-10

- **Title**: Verify Publisher Alerts – Surges >10%
- **Priority**: Medium
- **Preconditions**: Alerts panel accessible and Top Publishers table visible.
- **Steps**:
  1. Open Surges >10% alert panel.
  2. Cross-check listed publishers with table DoD% values.
  3. Verify total count matches table.
- **Expected result**: Panel lists only publishers with DoD > +10% and count matches.
- **Automated**: no

**ID**: TC-PCT-11

- **Title**: Verify Top Publishers – Click Trend Table
- **Priority**: Medium
- **Preconditions**: Source data accessible for verification.
- **Steps**:
  1. Select a publisher row.
  2. Validate daily click values, total clicks, DoD%, status, and sparkline against source.
  3. Verify table sort matches selected criteria.
- **Expected result**: All displayed values accurate and calculations correct; table sorted correctly.
- **Automated**: no

**ID**: TC-PCT-12

- **Title**: Daily Click Volume Chart (All Top 50)
- **Priority**: Medium
- **Preconditions**: Chart aggregates available.
- **Steps**:
  1. Sum clicks of all 50 publishers for Jun 7 from source.
  2. Compare with aggregate chart data point for Jun 7.
- **Expected result**: Chart point equals the sum of 50 rows for each day.
- **Automated**: no

**ID**: TC-PCT-13

- **Title**: DoD Distribution Chart Bucketing
- **Priority**: Medium
- **Preconditions**: Distribution chart data and bucketing rules available.
- **Steps**:
  1. Count publishers that fall into +10% bucket for Jun 7 -> Jun 8.
  2. Compare with histogram bucket count.
- **Expected result**: Histogram reflects accurate counts for each bucket.
- **Automated**: no

**ID**: TC-PCT-14

- **Title**: Missing Days List Accuracy
- **Priority**: Medium
- **Preconditions**: Ability to delete data for specific days.
- **Steps**:
  1. Delete data for two specific days (e.g., Jun 5, Jun 6).
  2. Refresh dashboard.
  3. Observe error message listing missing days.
- **Expected result**: Error lists only the two missing dates, not all days.
- **Automated**: no

**ID**: TC-PCT-15

- **Title**: Sync Script Notification (Missing Data)
- **Priority**: Low
- **Preconditions**: Data sync script available and unsynced range exists.
- **Steps**:
  1. Set date range where data is not synced.
  2. Open dashboard to trigger warning.
  3. Note the python command shown.
- **Expected result**: Red warning appears with exact python command to run.
- **Automated**: no

**ID**: TC-PCT-16

- **Title**: Date Range Filter (Positive)
- **Priority**: Medium
- **Preconditions**: Dashboard supports date range selection.
- **Steps**:
  1. Change date range from Jun 23 - Jul 06 to another 14-day window.
  2. Observe table, columns, and trend lines.
- **Expected result**: Data updates to reflect new date range.
- **Automated**: no

**ID**: TC-PCT-17

- **Title**: Date Range Filter (Negative)
- **Priority**: Medium
- **Preconditions**: Date picker control present.
- **Steps**:
  1. Set "From" date later than "To" date.
  2. Observe UI response.
- **Expected result**: Error shown ("Start date cannot be after end date") or auto-correct behavior.
- **Automated**: no

**ID**: TC-PCT-18

- **Title**: Search Publisher ID in Table
- **Priority**: Medium
- **Preconditions**: Search box above table functional.
- **Steps**:
  1. Enter a specific Publisher ID in search box.
  2. Verify table filters to show only that row.
- **Expected result**: Table shows only the searched Publisher row.
- **Automated**: no

**ID**: TC-PCT-19

- **Title**: Sparkline Chart rendering
- **Priority**: Medium
- **Preconditions**: Sparkline column available with 14-day data.
- **Steps**:
  1. Inspect SPARKLINE for several publishers.
  2. Compare visual trend with source 14-day values.
- **Expected result**: Sparkline correctly represents 14-day trend.
- **Automated**: no

**ID**: TC-PCT-20

- **Title**: Trend Lines Chart Toggles
- **Priority**: Medium
- **Preconditions**: Top N toggle buttons available.
- **Steps**:
  1. Switch between "Top 10", "Top 20", and "Top 50".
  2. Observe chart lines added/removed.
- **Expected result**: Chart updates lines according to selection.
- **Automated**: no

**ID**: TC-PCT-21

- **Title**: Table Pagination/Scrolling
- **Priority**: Medium
- **Preconditions**: Large table with scrolling/pagination.
- **Steps**:
  1. Scroll down main table.
  2. Observe header behavior.
- **Expected result**: Header remains fixed (sticky) for better UX.
- **Automated**: no

**ID**: TC-PCT-22

- **Title**: Column Sorting
- **Priority**: Medium
- **Preconditions**: TOTAL column sortable.
- **Steps**:
  1. Click TOTAL column header.
  2. Observe sort order toggling.
- **Expected result**: Table sorts descending/ascending by total clicks.
- **Automated**: no

**ID**: TC-PCT-23

- **Title**: Responsive UI (Resolution)
- **Priority**: Medium
- **Preconditions**: Dashboard responsive design enabled.
- **Steps**:
  1. View dashboard at 1366x768 and 1920x1080.
  2. Check for overlaps and chart legibility.
- **Expected result**: Elements do not overlap; charts legible.
- **Automated**: no

**ID**: TC-PCT-24

- **Title**: Multiple Tabs Performance
- **Priority**: Medium
- **Preconditions**: System can open multiple dashboard tabs.
- **Steps**:
  1. Open 5 dashboard tabs with different filters.
  2. Perform basic interactions in each.
- **Expected result**: System handles multiple requests without significant lag.
- **Automated**: no

**ID**: TC-PCT-25

- **Title**: Zero Data State
- **Priority**: Medium
- **Preconditions**: Filters available to produce no-data result.
- **Steps**:
  1. Select filter combination that yields no data.
  2. Observe UI response.
- **Expected result**: Shows "No data found for this selection" instead of blank screen.
- **Automated**: no

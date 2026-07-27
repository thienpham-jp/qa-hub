# Test cases: Exchange Rate Update API

---

**ID**: TC-EXR-01

- **Title**: Verify authentication failure with an invalid token
- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Send a request with an invalid or expired access token.
- **Expected result**: API returns 401 Unauthorized and authentication fails.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-02

- **Title**: Verify authorization failure for a restricted user
- **Priority**: High
- **Preconditions**: A user account without the required permission exists.
- **Steps**:
  1. Send a request using a user account without the required permission.
- **Expected result**: API returns 401 Unauthorized and authentication fails.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-03

- **Title**: Verify validation when currency is missing
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Send a request without the `currency` field.
- **Expected result**: API returns 404 Not Found with an appropriate validation message.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-04

- **Title**: Verify validation when quoteCurrency is missing
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Send a request without the `quoteCurrency` field.
- **Expected result**: API returns 404 Not Found with an appropriate validation message.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-05

- **Title**: Verify validation when targetMonth is missing
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Send a request without the `targetMonth` field.
- **Expected result**: API returns 404 Not Found with an appropriate validation message.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-06

- **Title**: Verify invalid targetMonth format
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Send a request with `targetMonth` not following the `YYYY-MM` format.
- **Expected result**: API returns 404 Not Found with an appropriate validation message.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-07

- **Title**: Verify validation when rate is null
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Send a request with `rate = null`.
- **Expected result**: API returns 404 Not Found with an appropriate validation message.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-08

- **Title**: Verify validation when rate is zero or negative
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Send a request with `rate = 0` or a negative value.
- **Expected result**: API returns 404 Not Found with an appropriate validation message.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-09

- **Title**: Verify validation when rate is non-numeric
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Send a request with a non-numeric value for `rate`.
- **Expected result**: API returns 404 Not Found with an appropriate validation message.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-10

- **Title**: Verify validation when currency equals quoteCurrency
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Send a request where `currency` and `quoteCurrency` have the same value.
- **Expected result**: API returns 404 Not Found with an appropriate validation message.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-11

- **Title**: Verify validation when campaignIds contains a non-existing campaign ID
- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Send a request containing at least one invalid campaign ID in `campaignIds`.
- **Expected result**: API returns 404 Not Found with an appropriate validation message.
- **Automated**: yes — [update-exchange-rate.spec.ts](../../api/automation/update-exchange-rate.spec.ts)
- **Status**: ✅ Passed

---

**ID**: TC-EXR-12

- **Title**: Verify request with an empty campaignIds array
- **Priority**: High
- **Preconditions**: User has permission
- **Steps**:
  1. Log in to isTools
  2. Navigate to the Currency Exchange Rate menu > Exchange Rate List
  3. Choose the current month for an exchange rate that needs to be updated (e.g., USD) > go to detail
  4. Edit exchange rate with `campaignIds` as an empty array.
  5. Click **Update** button
- **Expected result**: API returns 200 OK and updates the current month's exchange rate successfully.
- **Automated**: no
- **Status**: ⏭️ Skipped (Verified in UI)

---

**ID**: TC-EXR-13

- **Title**: Verify successful update with valid payload
- **Priority**: High
- **Preconditions**: User has permission
- **Steps**:
  1. Log in to isTools
  2. Navigate to the Currency Exchange Rate menu > Exchange Rate List
  3. Choose the current month for an exchange rate that needs to be updated (e.g., USD) > go to detail
  4. Edit exchange rate and input specified `campaignIds`
  5. Click **Update** button
- **Expected result**: API returns 200 OK and updates the current month's exchange rate successfully.
- **Automated**: no
- **Status**: ⏭️ Skipped (Verified in UI)

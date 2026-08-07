# Test Cases: Branch Code Setting Screen

---

**ID**: TC-BCR-01

- **Title**: Verify screen loads correctly
- **Priority**: High
- **Preconditions**: User has access to the Branch Code Setting screen
- **Steps**:
  1. Open the Branch Code Setting screen.
- **Expected result**: The screen loads successfully with the title, Start Position and Length input fields, and Save Setting / Remove Setting buttons displayed correctly.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-BCR-02

- **Title**: Verify default values
- **Priority**: Medium
- **Preconditions**: No existing configuration is saved
- **Steps**:
  1. Open the screen without an existing configuration.
- **Expected result**: Default values are displayed correctly (e.g., 1 for Start Position and Length, or as defined by the specification).
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-BCR-03

- **Title**: Verify Save Setting with valid input
- **Priority**: High
- **Preconditions**: User is on the Branch Code Setting screen
- **Steps**:
  1. Enter valid numeric values for Start Position and Length.
  2. Click Save Setting.
- **Expected result**: Settings are saved successfully, and a success message is displayed (if applicable).
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-BCR-04

- **Title**: Verify validation for invalid Start Position
- **Priority**: High
- **Preconditions**: User is on the Branch Code Setting screen
- **Steps**:
  1. Submit empty, non-numeric, negative, or out-of-range values for Start Position.
- **Expected result**: Validation message is displayed, and the setting is not saved.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-BCR-05

- **Title**: Verify validation for invalid Length
- **Priority**: High
- **Preconditions**: User is on the Branch Code Setting screen
- **Steps**:
  1. Submit empty, non-numeric, zero, negative, or out-of-range values for Length.
- **Expected result**: Validation message is displayed, and the setting is not saved.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-BCR-06

- **Title**: Verify boundary values for Start Position and Length
- **Priority**: Medium
- **Preconditions**: User is on the Branch Code Setting screen
- **Steps**:
  1. Save settings using minimum, maximum, and boundary values.
- **Expected result**: Boundary values are processed according to the specification without unexpected errors.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-BCR-07

- **Title**: Verify Remove Setting functionality
- **Priority**: High
- **Preconditions**: A valid configuration is already saved
- **Steps**:
  1. Save a valid configuration.
  2. Click Remove Setting.
- **Expected result**: Existing configuration is removed successfully, and the default state is restored.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-BCR-08

- **Title**: Verify data persistence after reload
- **Priority**: Medium
- **Preconditions**: A valid configuration is already saved
- **Steps**:
  1. Save a valid configuration.
  2. Refresh or reopen the screen.
- **Expected result**: Previously saved values are displayed correctly after reload.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-BCR-09

- **Title**: Verify button states when no setting exists
- **Priority**: Low
- **Preconditions**: No existing configuration is saved
- **Steps**:
  1. Open the screen with no existing configuration.
  2. Observe the button behavior.
- **Expected result**: Buttons are enabled/disabled appropriately, and actions follow the expected behavior.
- **Automated**: no
- **Status**: ✅ Passed

---

**ID**: TC-BCR-10

- **Title**: Verify error handling for invalid input
- **Priority**: High
- **Preconditions**: User is on the Branch Code Setting screen
- **Steps**:
  1. Submit invalid values.
  2. Attempt to save.
- **Expected result**: The system displays appropriate error messages, prevents invalid data from being saved, and remains stable.
- **Automated**: no
- **Status**: ✅ Passed

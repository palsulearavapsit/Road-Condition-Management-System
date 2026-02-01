---
title: Admin Points Logic Update
description: Updated points system: Citizens get fixed 10 points for approved reports, RSOs get logic verification only (0 points).
---

# Admin Points Logic Update

## Overview
The Admin Points Management system has been simplified based on new requirements.

## Rules
1.  **Citizen Reports**:
    -   When an Admin approves a report, the citizen is awarded **10 points**.
    -   Button: "Approve & Award 10 Pts".
2.  **RSO Repairs**:
    -   When an Admin verifies a completed repair, the RSO receives **0 points**. The action acts purely as a content verification/closure of the ticket.
    -   Button: "Verify Repair".
3.  **Disapproval**:
    -   Admins can disapprove both reports and repairs, which marks them as processed but awards no points.

## Changes

### `AdminPointsManagementScreen.tsx`

-   **Removed**: Flexible points modal and input logic.
-   **Updated**: `awardPoints(reportId, userId, points, type)` calls.
    -   Citizen approval passes `10` as points.
    -   RSO verification passes `0` as points.
-   **UI**:
    -   Updated button labels to be explicit about the action and point value.
    -   Success alert now distinguishes between "Awarding points" (for > 0) and "Verifying work" (for 0).

## How to Test
1.  Login as Admin.
2.  Navigate to "Points Management" -> "Approvals".
3.  **For a Citizen Report**:
    -   Click "Approve & Award 10 Pts".
    -   Verify the Citizen's point balance increases by 10.
4.  **For an RSO Repair**:
    -   Click "Verify Repair".
    -   Verify the RSO's point balance does **not** change.
    -   Verify the repair marks as verified/closed.

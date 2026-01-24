# User Story: Workshop Access Control & Facilitator Queue

**As a** Workshop Organizer/Facilitator,
**I want to** Secure my workshop with a unique PIN and manage a queue for approving incoming co-facilitators,
**So that** I can prevent unauthorized access and explicitly control who has administrative privileges in the session.

## Acceptance Criteria

### 1. Unique Workshop PIN
* **Generation:** Upon workshop creation, the system must generate a unique, random 6-character PIN code.
* **Visibility:** The PIN code is prominently displayed on the Organizer's header/dashboard.
* **Scope:** The PIN is specific to the individual workshop instance.

### 2. PIN Entry & Joining
* **Entry:** All users (Participants and Facilitators) must enter the correct PIN to enter the session lobby.
* **Validation:** Incorrect PINs return an error message; correct PINs proceed to role selection or direct entry (depending on configuration).

### 3. Facilitator Approval Queue
* **Request Flow:** If a user attempts to join with the "Facilitator" role (or converts from Participant to Facilitator via link/action):
    * They are placed in a **"Pending Approval"** state.
    * They see a "Waiting for Organizer approval..." screen.
* **Organizer View:**
    * Active Organizers receive a real-time notification (toast or sidebar badge) of the request.
    * Organizers can view the "Facilitator Queue" list.
* **Actions:**
    * **Accept:** The pending user is upgraded to Facilitator role and redirected to the Facilitator Dashboard.
    * **Deny:** The user is rejected (optionally demoted to Participant or disconnected).

## Scenarios

### Scenario A: Co-Host Joining
1. Main Organizer creates workshop. PIN is `8821AF`.
2. Co-Host opens app, enters PIN `8821AF`, and selects "Join as Facilitator".
3. Co-Host sees spinner: "Waiting for host admission...".
4. Main Organizer sees alert: "Bob is requesting Facilitator access."
5. Main Organizer clicks **Accept**.
6. Co-Host screen refreshes to show the scoring controls and admin view.

### Scenario B: Unauthorized Attempt
1. Stranger guesses PIN `8821AF`.
2. Tries to join as Facilitator.
3. Organizer sees request from "UnknownUser".
4. Organizer clicks **Deny**.
5. Stranger receives "Access Denied" message and is returned to home.

## Technical Notes
* **Backend:** Add `pending_facilitators` list to the Workshop/Session model.
* **Real-time:** Use WebSockets to broadcast `facilitator_request` events to existing admins.
* **Security:** Ensure the PIN logic checks against active sessions in the persistence layer (Redis/DB).

# User Story: Workshop Usability Improvements (Epic)

**Epic:** User Experience Improvements
**Module:** Live Workshop — Capture & Prioritization (Facilitator + Participant)
**Story Type:** Epic (13 child stories)
**Priority:** High
**Story Points:** 86 (sum of child stories)
**Status:** 📋 Backlog

**As a** facilitator running a live AI workshop with business and IT stakeholders,
**I want** the session to run smoothly: people join in seconds, know what to do at every step, capture ideas without losing work, score them reliably, and see trustworthy results,
**So that** the room's time goes on the conversation about which AI use cases matter, not on fighting the tool.

**As a** workshop participant (often a first-time, non-technical business user on a phone),
**I want** plain-language guidance, forms that never lose my input, and scoring I understand,
**So that** I can contribute my use cases and my judgement with confidence.

---

## Background & Research

This epic comes from a code-level usability review of the three journeys that matter for the app's core purpose: capturing AI use cases and prioritizing them in a live workshop.

1. **Facilitator journey:** sign-in, creating a workshop, running the phases (intake → scoring → analysis) and the results / hand-off.
2. **Participant journey:** join, dashboard, use case capture, scoring / matrix, engagement features.
3. **Cross-cutting:** navigation, error feedback, consistency, accessibility, i18n, theming, responsiveness and onboarding.

About 80 findings were collected and the high-severity ones were re-checked against the source. They are consolidated below into 13 child stories, grouped by when they bite in a real workshop.

### What already works well (keep and build on)
- The PIN is pre-filled from `?pin=` (QR-friendly), and the QR modal combines the PIN, QR code and Copy Link.
- Duplicate detection runs before submit and offers a clear "Cancel & Edit / Submit Anyway" choice.
- The matrix has a strong mobile pattern: tap-to-rate bottom sheet, an explicit "Unsure" option, per-criterion completion and server reload of existing votes.
- Analytics already computes consensus (High / Moderate / Needs Discussion), distributions and a heatmap.
- The facilitator dashboard has role-aware empty states and a dedicated "pending approval" screen.
- The theme tokens are WCAG-labelled, the axios interceptor gives clear network and proxy diagnostics, and one toast library is used throughout.
- `ConfirmationModal`, `ui/Modal`, `LanguageSwitcher` and `ThemeToggle` are good accessible bases to standardize on.

### The biggest problems in a live room
| # | Problem | Evidence |
|---|---|---|
| 1 | A slider the participant never moves **submits no score**, even though it shows 50 | `components/ScoringCard.tsx:17,22-27` |
| 2 | Refreshing or rejoining during scoring shows "Wait for the facilitator" while a card is live; the active card is never fetched | `pages/ScoringPhase.tsx:46-48` |
| 3 | A failed use case submission fails silently, and a phase change mid-typing discards the draft | `components/UseCaseCanvas.tsx:17-23`, `pages/ParticipantDashboard.tsx:118-123` |
| 4 | Scanning a new workshop's QR redirects to the **previous** workshop if an old session exists | `pages/JoinWorkshop.tsx:31-35` |
| 5 | The socket gives up after 5 reconnect attempts and there is no offline indicator; a "LIVE" dot always pulses | `lib/socket.ts:14`, `pages/IntakePhase.tsx:44-47` |
| 6 | The server returns `{error:{message}}`, but 30 frontend call sites read `.detail`, so users see generic errors | `server/app/middleware/error_handler.py:104-172` |
| 7 | Phase changes are one click with no confirm, no "back" and no "complete workshop" | `pages/WorkshopDetail.tsx:176-189,351-370` |
| 8 | The facilitator has no live progress view: the participant count is hard-coded `--` and the activity panel appears only after scoring ends | `pages/WorkshopDetail.tsx:842,374` |
| 9 | "Browse Templates" can create the workshop by accident (the shared `Button` defaults to `type="submit"` inside the form) | `components/ui/Button.tsx:26`, `pages/CreateWorkshop.tsx:130,144` |
| 10 | The roadmap hand-off reads only the hard-coded "Business Value" / "Feasibility" scores, so other templates show N/A | `pages/WorkshopDetail.tsx:1061-1067` |

---

## Child Stories

Priority key: **P0** = fix before the next live workshop · **P1** = next 1–2 sprints · **P2** = planned improvement.

### P0 — Live-session reliability

#### US48.1 Participants never lose work or get stuck (8 pts)
**As a** participant, **I want** my input and my place in the workshop to survive network blips, refreshes and phase changes, **so that** I never have to retype an idea or wonder why my screen is frozen.

**Acceptance criteria**
- The use case form autosaves a draft locally (per workshop and participant) and restores it when reopened. The draft is cleared after a successful submit.
- If the facilitator changes phase while the form has unsaved input, the participant sees a non-blocking banner ("The facilitator moved to scoring — finish and submit or discard") instead of being navigated away immediately.
- Closing the form or the edit modal with unsaved changes asks for confirmation; a backdrop tap does not discard silently.
- A failed submission shows the server's reason and keeps the form contents.
- The socket retries indefinitely with backoff. Every participant screen shows a "Reconnecting…" banner tied to the real connection state and refetches workshop state (phase, active card, own votes) on reconnect. The "LIVE" indicator reflects the actual state.
- The scoring page fetches the current active card on mount and on reconnect.
- Opening `/join?pin=X` while holding a session for a different workshop shows "Leave *Workshop A* and join *Workshop B*?" instead of redirecting to the old workshop.
- Rejoining the same workshop under the same name on the same device restores the participant identity, so ownership of submitted use cases and votes is kept.

**Evidence:** `UseCaseForm.tsx:41,104-107`, `UseCaseCanvas.tsx:17-23`, `ParticipantDashboard.tsx:118-123,437-443`, `ui/Modal.tsx:29`, `lib/socket.ts:14`, `ScoringPhase.tsx:46-48`, `JoinWorkshop.tsx:17,31-35`, `server/app/api/participants.py:50-58`

#### US48.2 Scores are recorded exactly as shown (5 pts)
**As a** facilitator, **I want** every rating a participant sees on screen to be the rating that is saved, **so that** the prioritization results can be trusted.

**Acceptance criteria**
- Live scoring either submits the displayed default for untouched criteria, or shows each criterion as "Not rated" until touched and blocks submit until all are rated. Pick one and apply it consistently.
- A failed vote shows an error and lets the participant retry. While the card is still active, a "Change my vote" option is available.
- "Unsure" is displayed as "Unsure", never as `-1`.
- The matrix uses one save model: autosave with a visible "All changes saved / Saving… / Not saved — retry" status. The redundant "Submit (n)" button and the "please click Submit manually" fallback are removed.
- Items already placed on the matrix can be tapped to re-rate. The remove target is at least 44×44 px.

**Evidence:** `ScoringCard.tsx:17,26,57-61,82-84,95-102`, `ParticipantMatrix.tsx:238-241,275,356-371,593,665`, `PrioritizationScale.tsx:105-116`

#### US48.3 Errors are visible, specific and recoverable (5 pts)
**As a** user, **I want** to see what went wrong and how to recover, **so that** I am never left on a blank or frozen screen.

**Acceptance criteria**
- One `getErrorMessage(err)` helper, or the axios interceptor, reads the server envelope (`error.message`, `error.details`). All `.detail` reads are replaced.
- A 401 anywhere logs the user out and redirects to sign-in with a return URL. Participants are sent back to Join.
- `ErrorBoundary` wraps the app or each route, so a render error shows a friendly "Something went wrong — Reload" panel.
- Pages that can fail to load (WorkshopDetail, ScoringPhase, AnalyticsDashboard) show an error panel with **Retry** instead of "Loading…" forever or blank sections.
- Unknown URLs show a 404 page with a link home. A forbidden route shows a "You don't have access" message rather than a silent redirect.
- **Bug fix:** cancelling the rejection-reason prompt no longer rejects the facilitator (`FacilitatorManagement.tsx:291`).

**Evidence:** `lib/api.ts:41-83`, `components/ErrorBoundary.tsx` (unused), `WorkshopDetail.tsx:170-173,308`, `ScoringPhase.tsx:44-54`, `AnalyticsDashboard.tsx:83-86`, `App.tsx:46-62,155`

---

### P1 — Facilitator run-of-show

#### US48.4 Guided phase control (5 pts)
**As a** facilitator, **I want** a clear, reversible phase stepper, **so that** I can move the room forward (or back) confidently in front of an audience.

**Acceptance criteria**
- A stepper shows **Capture ideas → Score → Results → Complete**, with the current step highlighted.
- Moving forward asks for confirmation and shows readiness ("12 ideas captured from 9 of 14 participants"). Moving back is allowed with confirmation.
- A **Complete workshop** action sets COMPLETED. The dashboard then shows the real completion date, not `created_at`.
- Phases use friendly, translated labels everywhere; raw `INTAKE` / `SCORING` / `ANALYSIS` are never shown (header badge, toasts, waiting room, participant pill).
- Tabs (Use Cases, Polls, Challenges, Rooms & Surveys, Insights) stay available in every phase.

**Evidence:** `WorkshopDetail.tsx:101,176-189,331,351-370,374-606,850`, `FacilitatorDashboard.tsx:392,415`, `WaitingRoom.tsx:136`

#### US48.5 Live progress and card control (8 pts)
**As a** facilitator, **I want** to see who has joined, submitted and scored, and to step through cards quickly, **so that** I can pace the session and nudge the room.

**Acceptance criteria**
- During capture and scoring, a live panel shows **joined / submitted / scored / remaining** counts. The scoring view also shows per-card vote progress ("7 of 14 voted").
- The hard-coded "Participants: --" is replaced with the live count, and the "Pending" count in the activity panel is computed correctly.
- Active-card controls: **Previous / Next / Stop voting**, a live vote count and an optional countdown timer. Keyboard shortcuts (← → for previous/next, Space to stop) are documented in a "?" overlay.
- Per-submission toasts are replaced with a counter badge ("+3 new ideas"). The facilitator does not get socket toasts for their own actions.

**Evidence:** `WorkshopDetail.tsx:85-93,126-134,191-200,716-748,842`, `MatrixActivityDashboard.tsx:118-121,363`

#### US48.6 Presenter mode for the projector (5 pts)
**As a** facilitator presenting on a big screen, **I want** large, distraction-free join and results views, **so that** everyone in the room can read them.

**Acceptance criteria**
- A full-screen **Join** view shows a large QR code, a short join URL and the PIN in at least 72 px type. `F` toggles full screen and `Esc` exits.
- A full-screen **Results** view shows the matrix and the top-N ranking with the facilitator controls hidden.
- Copy Link handles clipboard denial by showing the URL to copy manually.

**Evidence:** `WorkshopDetail.tsx:873-903`, `ui/Modal.tsx` (no Escape handling)

#### US48.7 Fast, safe workshop setup (8 pts)
**As a** facilitator, **I want** to set up a workshop in a couple of minutes without surprises, **so that** I can focus on the agenda rather than the tool.

**Acceptance criteria**
- **Bug fix:** the shared `Button` defaults to `type="button"`, so "Browse Templates" and the template cards can no longer submit the create form.
- Approved facilitators can create workshops (behind a setting if needed). Otherwise the dashboard explains how to get one assigned. Today the route is admin-only.
- Criteria weights get a **Distribute evenly** action, and adding a criterion rebalances the weights. Empty criterion names and a missing title show inline errors.
- An explicit **X axis / Y axis** picker replaces keyword matching. Template labels are plain language; the internal "(US10)" suffix is removed.
- Switching templates or picking a library template asks before overwriting the title or edited criteria.
- After creation, the facilitator lands on the new workshop's console with a "Workshop created — share this PIN" panel.
- Criteria, weights and axes can be edited while the workshop is in Draft or intake.
- Workshop Settings puts the AI model selection under a collapsed **Advanced** section, so title, description and criteria come first.

**Evidence:** `ui/Button.tsx:26`, `templates/TemplateSelector.tsx:109`, `CreateWorkshop.tsx:38,51-61,86-87,130-149,182-224`, `App.tsx:137`, `FacilitatorDashboard.tsx:194-201`, `WorkshopDetail.tsx:465-474`, `WorkshopSettingsModal.tsx`

---

### P1 — Participant guidance

#### US48.8 Participants always know what to do next (5 pts)
**As a** participant, **I want** to be told exactly what is expected of me right now, **so that** I don't wander between tiles or wait without knowing why.

**Acceptance criteria**
- Each phase has a "What to do now" banner on the participant dashboard, for example "Step 1 of 2: Add your AI ideas — about 10 minutes". The one relevant tile is highlighted and irrelevant tiles are de-emphasized.
- There is one participant shell. The unreachable `/lobby` (WaitingRoom) and `/intake` routes are removed or redirected to the dashboard.
- The scoring page has a back-to-dashboard link. "Leave workshop" is a labelled secondary action with an in-app confirmation.
- In the Results phase, participants see a read-only **Top ideas** view (the ranking and the matrix).
- The use case list marks the participant's own items with a "Mine" badge, a filter and an Edit action.
- Join screen fields have visible labels ("Workshop PIN — 6 characters", "Your name"). The facilitator-access request is moved behind a small "Are you the host?" link.

**Evidence:** `ParticipantDashboard.tsx:159-165,191-194,230-232,396-412`, `App.tsx:129-133`, `WaitingRoom.tsx:92`, `ScoringPhase.tsx:58-67`, `JoinWorkshop.tsx:183-272`

#### US48.9 Business-friendly use case capture (8 pts)
**As a** business participant, **I want** a short, plain-language form with examples and helpful AI that doesn't overwrite me, **so that** I can describe my idea well without knowing AI jargon.

**Acceptance criteria**
- Fields are relabelled in plain language: "Who has this problem?", "What's the problem today?", "How could AI help? (optional)", "How would we measure success?". "AI Technique" becomes optional, with a "Not sure" option.
- Required fields are marked with `*`. Validation is inline and friendly; the browser's native popups are not used. Create and edit share the same rules.
- Each long field has a "See an example" helper and a character counter, with matching limits enforced server-side (`schemas/usecase.py`).
- **AI Enhance** shows its suggestion next to the original with **Use suggestion / Keep mine** per field, plus Undo. It never overwrites silently.
- Technical analysis ("Check Feasibility", "Deep Dive", tech stack, complexity score) moves under a collapsed **For IT reviewers** section. The "Mock mode" notice is never shown to participants.
- All labels are associated with their inputs (`htmlFor`/`id`). AI buttons are at least 44 px tall on mobile.
- Owners can withdraw their own use case, with confirmation.

**Evidence:** `UseCaseForm.tsx:126-132,180-182,223-304,337-469,479`, `ui/Input.tsx:14-21`, `UseCaseDetailModal.tsx:79,340-345`, `server/app/schemas/usecase.py:6-12`

#### US48.10 Scoring that everyone understands (5 pts)
**As a** participant, **I want** to understand each criterion and the scale, and see my progress, **so that** my ratings mean what I intend.

**Acceptance criteria**
- Criterion descriptions are shown inline or behind a tap. Hover-only tooltips are not used.
- One scale is used across live scoring and the matrix, with anchored labels at each end (for example 1 = "Minimal impact", 10 = "Transformational").
- Progress is visible ("Card 3 of 12", "5 of 8 rated").
- One glossary is used across all screens. **Use case** replaces "idea", "node" and "challenge" for the same object, **Score** replaces "vote" and "rating", and **Prioritization matrix** replaces "Hotspot", "Strategic Prioritization" and "Voting Heatmap". The categories that are really criteria are called criteria. All labels go through i18n keys.

**Evidence:** `ScoringCard.tsx:22-26,99,129,145-152`, `PrioritizationScale.tsx:41,101`, `ParticipantDashboard.tsx:313,341`, `ParticipantMatrix.tsx:347,382,427`, `ScoringPhase.tsx:60-62`, `UseCaseCanvas.tsx:64`

---

### P2 — Trustworthy outcomes

#### US48.11 Clear, consistent prioritization results and exports (8 pts)
**As a** facilitator handing results to sponsors, **I want** ranked, consistent results and a real report, **so that** the workshop output can be shared without rework.

**Acceptance criteria**
- Result cards show a rank (#1, #2…, with ties handled), a consistent score scale (no silent ×10 rescaling) and a consensus badge (High / Moderate / Needs discussion).
- Quadrant names are identical across the matrix, Analytics and the activity feed. Axis labels use the workshop's actual X/Y criteria names, not fixed "V:" / "F:" prefixes.
- The roadmap and ROI hand-off use the same X/Y criteria as the matrix.
- One **Export** menu with one data source offers CSV, a real **PDF**, and optionally PPTX. Today "PDF Report" downloads an `.html` file.
- One view switcher (Matrix / Scale / Analytics / ROI) and one aggregation selector replace the duplicated toggles.

**Evidence:** `WorkshopDetail.tsx:281-306,380-447,465-474,567-588,1061-1067`, `AnalyticsDashboard.tsx:91-132,223,269`, `ResultsChart.tsx:99`, `MatrixActivityDashboard.tsx:293-309,413`, `server/app/api/export.py:218`

---

### P2 — Foundation (consistency, accessibility, localization)

#### US48.12 Accessible, consistent UI building blocks (8 pts)
**As a** user on any device, with any ability, **I want** dialogs, buttons and forms that behave the same everywhere, **so that** the app is predictable and accessible.

**Acceptance criteria**
- One accessible Modal (`role="dialog"`, `aria-modal`, focus trap and restore, Escape, a labelled close button) replaces the ~26 custom overlays as they are touched.
- All `window.confirm` and `prompt` calls (10 files) are replaced with `ConfirmationModal`, including a variant with a reason field.
- Icon-only buttons have `aria-label`s. A global `:focus-visible` style is added, and `ui/Button` gets a focus ring.
- Theme: Tailwind `dark:` variants follow the in-app theme toggle (`@custom-variant dark` bound to `data-theme`). The participant Intake and Scoring pages stop hard-coding dark colours.
- The admin sidebar collapses to a drawer below `md`, and table containers scroll horizontally instead of clipping.
- `<MotionConfig reducedMotion="user">` is enabled and CSS animations stop under `prefers-reduced-motion`.
- Engagement features stay out of the way: reactions collapse into one floating button, poll cards can be dismissed and appear on every participant page, reward feedback is merged into a single toast, the leaderboard is off by default, and polling intervals (3–10 s) are replaced by socket events with a slow fallback.
- New code uses the `api` client instead of raw `fetch` (33 files today) so all screens share token, timeout and error handling.

**Evidence:** `ui/Modal.tsx:43-48`, `ui/Button.tsx:16`, `Header.tsx:175-193`, `index.css:126`, `AdminLayout.tsx:55,84`, `FacilitatorManagement.tsx:531,543`, `polls/ReactionBar.tsx:33-47`, `polls/PollResponder.tsx:28-31,278-292`, `ParticipantDashboard.tsx:98`, `gamification/Leaderboard.tsx:32`

#### US48.13 Participant journey fully localized (8 pts)
**As a** participant in a non-English workshop, **I want** the whole journey in my language, **so that** I can take part fully.

**Acceptance criteria**
- Every participant-facing screen (Join, Dashboard, Use case form, Scoring, Matrix, Polls, Gamification) uses i18n keys. Today only 17 of 129 `.tsx` files use `useTranslation`.
- `en/translation.json` becomes the complete source of truth: it has 114 keys versus 222 in es/fr/de. A CI check enforces key parity across locales.
- An ESLint rule (for example `i18next/no-literal-string`) prevents new hard-coded strings in participant pages.
- The facilitator console (WorkshopDetail, CreateWorkshop, Login/Register) follows in a second pass.

**Evidence:** `client/public/locales/*/translation.json`, `client/src/i18n.ts:93-134`, `JoinWorkshop.tsx`, `UseCaseForm.tsx`, `ScoringCard.tsx`, `ParticipantMatrix.tsx`

---

## Suggested Sequencing

| Release | Stories | Outcome |
|---|---|---|
| **Before next live workshop** | US48.1, US48.2, US48.3, plus the `Button type="button"` fix from US48.7 | No lost input, no lost scores, no silent failures |
| **Sprint +1** | US48.4, US48.5, US48.6, US48.8 | Facilitator controls the room with confidence; participants always know the next step |
| **Sprint +2** | US48.7, US48.9, US48.10 | Faster setup; better-quality use cases from business users; consistent scoring |
| **Sprint +3** | US48.11, US48.12, US48.13 | Shareable outputs; accessible, consistent, localized UI |

## Success Measures

These need lightweight instrumentation, which is part of US48.5.
- Median time from QR scan to "joined": **< 30 s**.
- Use case submissions that fail or are abandoned after starting: **< 2%**.
- Criteria submitted without an explicit rating: **0** (US48.2).
- Facilitator phase reversals caused by mistakes: tracked; target near 0 once confirmations are in place.
- Post-workshop participant survey "The tool was easy to use": **≥ 4.2 / 5**.

## Scenarios

### Scenario A: Participant loses Wi-Fi while writing a use case
1. A participant is halfway through the form when the venue Wi-Fi drops.
2. A "Reconnecting…" banner appears and the draft is autosaved locally.
3. The connection returns and the banner clears; the participant submits with nothing retyped.

### Scenario B: Facilitator moves to scoring
1. The facilitator clicks **Next: Score**. A confirmation shows "14 use cases from 11 of 12 participants; 1 participant has an unsaved draft".
2. The facilitator confirms. The participant with the draft sees "The facilitator moved to scoring — finish and submit or discard" and submits.
3. The facilitator presents the cards with → / ← and watches "9 of 12 scored" before moving to the next card.

### Scenario C: Results shared with sponsors
1. In the Results phase the facilitator opens presenter mode. The room sees a ranked top-10 with consensus badges, and the matrix axes are labelled with the workshop's real criteria.
2. The facilitator exports a PDF. Participants see the same Top ideas view on their phones.

## Relationship to Other Stories
- **US35** (participant theme consistency) and **US39** (redundant leave button) are subsumed by US48.12 and US48.8 respectively.
- **US43** (enhanced matrix activity dashboard) overlaps with US48.5. Deliver US48.5's live counts first, then extend.
- **US38** (participant language selection) depends on US48.13 for the selected language to have any effect.
- **US40** (use case detail popup) should adopt the US48.9 form rules and the US48.12 Modal.

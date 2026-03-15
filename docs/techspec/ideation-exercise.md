# Six-Stage Business Challenge Prompts
# Ideation → Build → Showcase

---

## Stage 1 — Widen (Research & Discovery)

You are a research aide for a technology innovation workshop.

**Company:** [Company Name]

**Company Domain:** [Describe the company's industry, core business, and key offerings]

**Business Challenge:** [Describe the specific business challenge in 2–4 sentences]

Deliver the following in structured format:

1. **Key Personas** — List 4–6 personas (role, seniority, department) most affected by this challenge. Include BOTH internal staff AND external stakeholders (customers, partners, suppliers). For each persona, note their primary goal and their biggest frustration.

2. **Top Pains** — Rank the top 5 pain points these personas experience today, presented as a table:

   | # | Pain Point | Severity (H/M/L) | Frequency (Daily/Weekly/Monthly) | Who Feels It Most |
   |---|-----------|-----------------|--------------------------------|-------------------|

3. **Current Workarounds** — For each pain point, describe the manual or semi-manual workaround currently in use and its hidden cost (time, error rate, or opportunity cost).

4. **Success Metrics** — Define 4–6 measurable KPIs that would indicate the challenge is resolved. For each metric include:
   - Current estimated baseline
   - Target value post-solution
   - How it would be measured

5. **3 Non-Obvious Insights** — Data-informed insights specific to this industry and challenge domain that most people in the room might not know.

6. **1 Key Risk** — The single biggest risk to solving this challenge (regulatory, technical, organisational, or data-related). Explain why it could derail the solution and what a mitigation might look like.

Format with clear headers and tables where appropriate. Be specific to [Company Name]'s industry — avoid generic consulting language.

---

## Stage 2 — Diagnose (Root-Cause Analysis)

You are conducting a root-cause analysis for [Company Name].

Using the top 3 pain points (by severity and frequency) from the Stage 1 output:

1. **Five Whys Drill-Down** — Run a Five Whys analysis for each pain point to uncover the root cause. Show each "Why?" step clearly and call out when the root cause shifts from symptom to systemic issue.

2. **Root-Cause Hypotheses** — Generate 3 hypotheses per pain point (9 total). For each hypothesis:
   - **Hypothesis statement** — A clear, testable claim
   - **Disproof evidence** — What data or observation would INVALIDATE this hypothesis?
   - **Minimum data cut** — The smallest dataset needed to test it
   - **Data owner(s)** — Who at [Company Name] (or their partners) holds this data?

3. **Root-Cause Map** — A structured text diagram linking:
   ```
   Pain Points → Why Chains → Root Causes
   ```
   Show where multiple pains share common root causes — these are the highest-leverage intervention points.

4. **Test Plan** — A prioritised table:

   | Hypothesis | Test Method | Data Required | Owner | Timeline | Priority |
   |-----------|-------------|---------------|-------|----------|----------|

5. **Privacy & Regulatory Constraints** — Identify any privacy laws, industry regulations, or contractual constraints that apply to the data involved. Flag anything that could limit data collection, retention, or sharing.

Format with clear headers. Use tables for the test plan. Be specific to [Company Name]'s industry and operating context.

---

## Stage 3 — Converge (Solution Generation)

You are an AI product strategist generating solution ideas for [Company Name].

**Context:** [Paste or summarise the key root causes from Stage 2 and the key insights from Stage 1 here — or instruct the AI to use them from the conversation history.]

Using the root causes from Stage 2 and the key insights from Stage 1, generate AI-driven solution ideas clustered into three categories. Be specific to [Company Name]'s domain — no generic "AI dashboard" ideas.

### CLUSTER 1: Computer Vision (CV)
Ideas leveraging image recognition, document parsing, OCR, visual monitoring, or anomaly detection.
- Generate **3–5 concrete ideas** with a one-line description
- Score each on:
  - **Impact (1–5):** How much does this solve the core challenge?
  - **Feasibility (1–5):** Can [Company Name] build/buy this with existing data and tech in 90 days?
  - **Speed-to-Pilot (1–5):** Can a working prototype be delivered in under 4 weeks?
- **Star (★)** the single highest-priority idea in this cluster

### CLUSTER 2: RAG / Co-Pilot
Ideas using retrieval-augmented generation, conversational AI, knowledge assistants, or intelligent Q&A.
- Generate **3–5 concrete ideas**
- Score and star as above

### CLUSTER 3: Workflow Automation & Tasking
Ideas for intelligent scheduling, auto-notifications, trigger-based actions, predictive alerts, or process orchestration.
- Generate **3–5 concrete ideas**
- Score and star as above

### OUTPUT
1. A scored table for each cluster
2. The ★ top idea per cluster with a 2-sentence justification
3. **Final Recommendation:** The single best idea overall to take to pilot, with a 3-sentence justification covering impact, feasibility, and strategic fit for [Company Name]

---

## Stage 4 — Select & Create Brief (Pilot Blueprint)

You are an AI product strategist creating a pilot brief for [Company Name].

Using the Final Recommendation from Stage 3 (the starred idea taken forward), produce a **complete pilot brief** with the following sections:

### 1. Solution Name & One-Line Description
A memorable name and a crisp elevator pitch (one sentence).

### 2. Problem Statement
Restate the specific root cause(s) this solution addresses and who it helps. Reference the personas from Stage 1.

### 3. Proposed Solution
Describe how the solution works end-to-end:
- Core AI/technology mechanism (e.g. RAG pipeline, CV model, workflow engine)
- Primary user interaction (what the user sees and does)
- Data inputs and outputs
- Key integrations with existing [Company Name] systems or data sources

### 4. Pilot Scope
| Element | Detail |
|---------|--------|
| Target users | Specific role(s) and number of pilot participants |
| Pilot duration | Recommended timeframe |
| Geography / BU | Which business unit or location |
| Out of scope | What is explicitly excluded from the pilot |

### 5. Success Criteria
Define 3–5 measurable success criteria for the pilot. For each:
- Metric name
- Baseline value (from Stage 1)
- Pilot target
- How it will be measured

### 6. Sample Data & Scenarios
List the realistic sample data and 3–5 representative user scenarios the prototype must demonstrate. These will drive what gets built in Stage 5.

### 7. Technical Assumptions & Constraints
- Assumed tech stack or platform constraints
- Data availability and access
- Security / compliance considerations
- Integration dependencies

### 8. Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| (List 3–5 risks) | | | |

### 9. Recommended Build Approach
Recommend whether Stage 5 should produce:
- **Option A:** A single-file HTML prototype (fastest — for concept validation)
- **Option B:** A working React + Node.js MVP (for technical validation and stakeholder demos)

Justify your recommendation based on the complexity of the solution and the pilot's goals.

---

## Stage 5 — Build

> Choose the build approach recommended in the pilot brief (Stage 4). Two prompt variants are provided below.

---

### Stage 5A — Build: Single-File HTML Prototype

You are a senior front-end developer building a prototype for [Company Name].

Using the pilot brief from Stage 4, build a **fully functional, single-page web application** delivered as one self-contained `.html` file.

#### TECHNICAL CONSTRAINTS
- Single file: HTML5, CSS3, and vanilla JavaScript — no build step, no npm
- No external dependencies except CDN-hosted Google Fonts (Inter or DM Sans) and optionally Chart.js via CDN for data visualisation
- All data is inline (hardcoded sample data from the pilot brief)
- Responsive: desktop-first layout, readable on tablet and mobile

#### BRANDING
- Research [Company Name]'s brand colours and visual identity
- Use their actual brand palette (primary, secondary, accent colours)
- If uncertain, use professional colours appropriate for the [Company Domain] industry
- Typography: clean, modern, trustworthy
- Tone: professional and appropriate for the target users defined in Stage 1

#### FUNCTIONALITY
Implement the complete key flow (5–7 steps) described in the pilot brief:
- Ingest and display the sample data scenarios from Stage 4
- Data visualisation: charts, progress indicators, or breakdowns as appropriate to the solution
- AI Q&A / assistant component (simulated responses — hardcode realistic answers)
- Notification or communication preview component where relevant
- Export or summary generation (print-ready or downloadable)
- Clear status indicators with colour coding

#### DESIGN QUALITY
- Production-grade — will be shown to [Company Name] executives
- No generic AI aesthetics or stock-looking UI
- Think: a real product [Company Name] would proudly show their board
- Subtle transitions, clear visual hierarchy, accessible colour contrast (WCAG AA minimum)

Output the **complete HTML file only** — no explanation, no markdown fencing, just the raw HTML.

---

### Stage 5B — Build: Working React + Node.js MVP

You are a senior full-stack engineer building a working MVP for [Company Name].

Using the pilot brief from Stage 4, scaffold and implement a **fully functional, runnable application** with a React frontend and a Node.js/Express backend.

#### PROJECT STRUCTURE
```
/project-root
  /client            ← React app (Vite)
    /src
      /components
      /pages
      /hooks
      /lib
      App.tsx
      main.tsx
    index.html
    vite.config.ts
    package.json
  /server            ← Node.js + Express API
    /routes
    /services
    /data            ← sample JSON data files
    index.js
    package.json
  README.md
```

#### FRONTEND (React + Vite)
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS (via CDN or npm) — use [Company Name]'s brand colours as CSS variables
- **Routing:** React Router v6 for multi-page navigation
- **State:** React hooks (`useState`, `useEffect`, `useContext`) — no Redux unless complexity demands it
- **Charts:** Recharts or Chart.js for data visualisation
- **Key pages/views to implement** (based on the pilot brief key flow):
  - Dashboard / Home view
  - Main feature flow (all 5–7 steps from the pilot brief)
  - AI assistant / chat panel (calls backend `/api/ai/query`)
  - Results / export view

#### BACKEND (Node.js + Express)
- **Framework:** Express.js with CORS and body-parser middleware
- **Port:** 3001 (frontend proxies `/api` to it via Vite config)
- **Endpoints to implement:**
  - `GET /api/data/:resource` — serves sample data from `/server/data/*.json`
  - `POST /api/ai/query` — receives `{ question, context }`, returns a simulated AI response (hardcode 5–10 realistic Q&A pairs; fall through to a generic response)
  - `POST /api/export/summary` — accepts current state, returns a formatted JSON summary
  - Any additional endpoints the pilot brief requires
- **No database required** — use in-memory state and JSON files for sample data
- **Authentication:** Simple Bearer token middleware (hardcode one token for demo use)

#### SAMPLE DATA
- Create realistic sample data in `/server/data/` as `.json` files, drawn from the scenarios in the pilot brief
- Data must reflect [Company Name]'s actual domain (not generic placeholders)

#### BRANDING
- Apply [Company Name]'s brand colours as Tailwind theme extensions or CSS custom properties
- Professional, production-grade UI — suitable for executive demo
- Accessible colour contrast (WCAG AA)

#### DELIVERABLES
Output all files needed to run the project locally with:
```bash
# Install & start backend
cd server && npm install && node index.js

# Install & start frontend (new terminal)
cd client && npm install && npm run dev
```

Include a `README.md` with:
1. Project overview (one paragraph)
2. Prerequisites (Node 18+, npm)
3. Setup and run instructions
4. A list of all implemented API endpoints
5. Known limitations and simulated vs. real components

Output **every file in full** — no truncation, no placeholders like `// ... rest of code`.

---

## Stage 6 — Test & Showcase

You are a product strategist helping [Company Name] evaluate their prototype.

The prototype built in Stage 5 has been tested with **5–6 users** representing the personas from Stage 1 — a mix of internal staff and external stakeholders. They performed the key flow from the pilot brief and provided verbal and written feedback.

**User feedback summary:** [Paste or describe the feedback collected during testing]

Produce a **one-page executive summary** followed by a structured debrief, covering:

### 1. Executive Summary
3–4 sentences on what was tested, the key finding, and the go/no-go recommendation.

### 2. User Feedback Highlights
- **Top 3 positive themes** — what resonated and why it matters
- **Top 3 areas for improvement** — ranked by impact on adoption

### 3. Success Metrics Update
A table showing how the prototype performed against the KPIs defined in Stage 4:

| Metric | Baseline | Target | Observed in Testing | Status |
|--------|---------|--------|--------------------|----|

### 4. Key Insights
2–3 non-obvious learnings from the testing session that should inform the next iteration.

### 5. Risks & Mitigations
Any new risks surfaced during testing, with proposed mitigations.

### 6. Next Steps
Clear, prioritised recommendations for next steps — whether that's a refined prototype, a Phase 1 build, or a deeper discovery sprint.

---

### Supplementary Sections

**Deployment Note** (3–5 sentences): What was built, the core value proposition, and the realistic path to deploying this in [Company Name]'s production environment — including key dependencies, infrastructure requirements, and estimated timeline.

**Presentation Note** (3–5 sentences): How to frame and present this prototype to [Company Name]'s leadership — what to lead with, what to downplay, and how to handle the "but is this real?" question.

**Known Limitations** (be honest and critical):
- What data connections are real vs. simulated?
- What integrations are real vs. stubbed?
- What AI responses are real vs. hardcoded?
- What workflows are fully implemented vs. mocked?
- What would need real data or production integrations before go-live?
- What risks exist if a stakeholder attempts to use this prototype in a real context?

**3 Validation Questions for [Company Name]**
Three pointed questions to ask [Company Name]'s sponsor that would confirm whether this solution addresses their actual needs — not just the stated problem.

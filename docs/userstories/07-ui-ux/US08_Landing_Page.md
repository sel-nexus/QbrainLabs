# User Story: Landing Page & User Acquisition

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** User Acquisition & Onboarding  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 5  
**Status:** ✅ IMPLEMENTED  
**Implementation Date:** January 24, 2026

### Implementation Summary
- ✅ Hero section with value proposition
- ✅ Dual CTA (Facilitator Login / Join Workshop)
- ✅ Feature highlights with icons
- ✅ "How It Works" 3-step flow
- ✅ Responsive design (mobile & desktop)
- ✅ Footer with copyright

---

**As a** Prospective User or Workshop Facilitator,
**I want to** visit a compelling, informative landing page,
**So that** I can immediately understand the value of the platform and either create a new workshop or join an existing one seamlessly.

## Acceptance Criteria

### 1. Hero Section
*   **Headline:** "Map AI Use Cases with Your Team" (or adaptable marketing copy).
*   **Subheadline:** Clear value proposition about collaboration, identification, and prioritization of AI opportunities.
*   **Dual Call-to-Action (CTA):**
    *   **Facilitator Login Card:** distinct visual weight. Includes description ("Access your dashboard to lead workshops...") and a primary button "Facilitator Login".
    *   **Join Workshop Card:** distinct visual weight. Includes description ("Enter a workshop PIN...") and a secondary/primary button "Join Now".
    *   **Visual Separation:** Clear distinction between the two paths (Facilitator vs. Participant).

### 2. Feature Highlights (Enhanced)
*   **Three Pillars:** Display key benefits with icons:
    *   **AI-Powered Scoring:** "Intelligent evaluation of ideas across multiple dimensions with customizable criteria."
    *   **Real-time Collaboration:** "Live interaction with team members as ideas are submitted and evaluated."
    *   **Customizable Prompts/Context:** "Tailor evaluation criteria to match your specific business context and goals."
*   **Visual Polish:** Use modern iconography, soft shadows, and succinct copy.

### 3. Trust & Social Proof (Research Enhancement)
*   **Testimonial:** A rotating or static featured testimonial highlighting the efficiency or clarity gained using the tool.

### 4. "How It Works" Visual (Research Enhancement)
*   **Step-by-Step Flow:** A simple 3-step visual guide:
    1.  **Create:** Facilitator defines criteria.
    2.  **Collaborate:** Team votes and submits ideas interactively.
    3.  **Synthesize:** AI generates the ranked heatmap and report.

### 5. Technical & Engagement
*   **Responsiveness:** Fully responsive design that works perfectly on mobile (for participants joining via phone) and desktop.
*   **SEO Optimization:** Proper meta title ("AI Hotspot - Collaborative AI Strategy Workshops"), description, and semantic HTML tags.
*   **Performance:** Fast loading time (Lighthouse Score > 90) to ensure low bounce rate.

### 6. Footer
*   **Content:** Must display exactly: "2026 hotspotmatrix.ai, All Rights Reserved."

## Scenarios

### Scenario A: New Facilitator Arrives
1.  User lands on `https://hotspotmatrix.ai`.
2.  Reads the "Map AI Use Cases" headline.
3.  Scrolls to see "Powerful Workshop Features".
4.  Clicks "Facilitator Login" on the specific card.
5.  Is redirected to the Authentication/Sign-up flow.

### Scenario B: Participant Joining a Session
1.  User receives a PIN "X9Y8Z7" from their team lead.
2.  Opens the landing page on their mobile device.
3.  Immediately sees the "Join Workshop" card.
4.  Clicks "Join Now" (or enters PIN directly if an input field is exposed on the card).
5.  Is redirected to the "Lobby" or "Enter Name" screen for that specific session.

### Scenario C: Market Research Validation
1.  User enters search term "AI workshop tool" in Google.
2.  Lands on the page.
3.  Sees "How it works" steps.
4.  Gains confidence in the tool's legitimacy and ease of use.
5.  Proceeds to create an account.

## Technical Notes:
*   **Route:** `/` (Public, unauthenticated).
*   **Framework:** React/Next.js (if applicable) or static HTML depending on architecture.
*   **Styling:** Use the project's Design System tokens for consistency (colors, typography).
*   **Assets:** Optimize images/icons for web (WebP/SVG).

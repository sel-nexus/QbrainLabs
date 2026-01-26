# Qbrain AI Labs - Design System Specification

**Version:** 1.0
**Philosophy:** "Futuristic Strategic Intelligence"
**Aesthetic:** Premium, Dark Mode-First, Glassmorphism, Vibrant Gradients.

---

## 1. Design Philosophy
The application handles high-stakes strategic data but essentially functions as a collaborative "game." The interface must feel **alive, responsive, and exhilarating**. We serve "Intelligence," so the vibe is sleek, data-driven, and futuristic.

*   **Dark Mode Default:** Reduces eye strain in dim workshop rooms and makes data colors pop.
*   **Glassmorphism:** Use translucent layers to create depth and context.
*   **Motion:** Everything arrives with a purpose. No hard cuts.

---

## 2. Color System (HSL & Tailwind)

We use a curated HSL palette for maximum vibrance.

### Primary Brand (The "Hotspot" Gradient)
Used for primary actions, active states, and "High Value" indicators.
*   **Primary:** `hsl(250, 100%, 65%)` (Electric Violet)
*   **Secondary:** `hsl(320, 100%, 60%)` (Neon Magenta)
*   **Gradient:** `bg-gradient-to-r from-violet-600 to-fuchsia-500`

### Backgrounds (Deep Space)
Avoid pure black. Use rich, cool-toned darks.
*   **Surface-900:** `hsl(225, 25%, 10%)` (Deep Navy - Main BG)
*   **Surface-800:** `hsl(225, 20%, 15%)` (Card BG)
*   **Surface-Glass:** `hsla(225, 25%, 15%, 0.6)` + `backdrop-blur-md`

### Semantic Colors
*   **Success (Quick Wins):** `hsl(150, 100%, 45%)` (Cyber Mint)
*   **Warning (Wait):** `hsl(35, 100%, 55%)` (Amber Glow)
*   **Danger (Stop/Delete):** `hsl(0, 90%, 60%)` (Coral Red)
*   **Neutral:** `hsl(220, 15%, 60%)` (Slate Text)

---

## 3. Typography

Fonts selected for readability and geometric modernity.

### Headings: **Outfit** or **Plus Jakarta Sans**
Geometric, bold, and authoritative.
*   **H1 (Page Title):** Bold (700), Tracking-tight.
*   **H2 (Section):** Semi-Bold (600).

### Body: **Inter** or **DM Sans**
Clean, neutral, and highly legible at small sizes.
*   **Body:** Regular (400).
*   **Mono (Code/Data):** **JetBrains Mono** (for PINs and Raw Scores).

---

## 4. UI Components

### 4.1 Buttons
**Primary Button:**
*   Background: Brand Gradient.
*   Border: None.
*   Shape: Pill (Full rounded).
*   Shadow: `shadow-[0_0_20px_rgba(124,58,237,0.5)]` (Glow effect).
*   *Interaction:* `Hover: Scale 1.05`, `Tap: Scale 0.95`.

**Secondary Button:**
*   Background: Transparent.
*   Border: `1px solid rgba(255,255,255,0.2)`.
*   Text: White.
*   *Interaction:* `Hover: bg-white/10`.

### 4.2 Cards (The Glass Effect)
All containers (Workshop Cards, Intake Forms) use the **Glassmorphism** depth stack.
*   **Base:** `bg-slate-900/60` (60% opacity).
*   **Texture:** `backdrop-filter: blur(12px)`.
*   **Border:** `border border-white/10` (Subtle top-light edge).
*   **Shadow:** `shadow-xl`.

### 4.3 Inputs
*   **Style:** Filled, dark background (`bg-black/20`).
*   **Border:** Bottom border `border-b-2 border-white/20`.
*   **Active:** Border animates to **Primary Violet**.
*   **Label:** Floating label animation.

---

## 5. Visualization (D3.js Matrix)

The core artifact—the 2x2 Matrix—must look premium.

### Quadrants
*   **Grid Lines:** Dotted lines, `stroke-white/10`.
*   **Backgrounds:** Subtle gradients for each quadrant to subconsciously guide meaning.
    *   *Quick Wins (Top Right):* Very faint Green glow.
    *   *Time Sinks (Bottom Left):* Faint Red glow.

### Bubbles (Nodes)
*   **Fill:** Semi-transparent Category color (e.g., Blue for Generative AI).
*   **Stroke:** White/80, 2px width.
*   **Glow:** Drop shadow matching the fill color.
*   **Animation:** Physics-based entry (elastic bounce).
*   **Hover:** Expands 1.2x, shows sleek tooltip.

---

## 6. Motion & Animation (Framer Motion)

### Page Transitions
*   **Enter:** `opacity: 0, y: 20` -> `opacity: 1, y: 0` (Simple fade-up).
*   **Exit:** `opacity: 0, scale: 0.95`.

### Micro-interactions
*   **Success Toast:** Slide in from bottom, "Confetti" burst effect.
*   **Scoring Slider:** As user drags, the numerical value "pops" and grows.
*   **Waiting Room:** A "breathing" logo pulsing animation (Sine wave opacity).

---

## 7. Responsiveness
*   **Mobile Experience (Participant):** Focused on large touch targets. Thumb-friendly zones (bottom navigation).
*   **Desktop Experience (Facilitator):** "Command Center" density. Dashboard layout with sidebars.

---
**Implementation Note:**
This design system should be implemented using a shared `tailwind.config.js` with custom color tokens and a set of React components in `client/src/components/ui/` (e.g., `GlassCard.tsx`, `GlowButton.tsx`).

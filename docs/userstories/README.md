# User Stories Index

**Last Updated:** January 25, 2026  
**Total User Stories:** 34  
**Status:** Organized by logical feature groups

---

## Table of Contents

- [Overview](#overview)
- [Story Groups](#story-groups)
- [Status Legend](#status-legend)
- [Dependencies Map](#dependencies-map)
- [Quick Reference](#quick-reference)

---

## Overview

User stories are organized into 11 logical groups based on feature domains. Each group represents a cohesive set of related functionality.

### Story Status Distribution

- ✅ **Implemented:** 12 stories
- 📋 **Backlog/Planned:** 19 stories
- ⚠️ **Superseded:** 1 story (US00)
- 🔄 **In Progress:** 2 stories

---

## Story Groups

### [00-Foundation](./00-foundation/) - Platform Foundation

**Epic:** Platform Foundation  
**Purpose:** Core infrastructure and database setup

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US00 | Infrastructure MongoDB | ⚠️ Superseded | 8 | [US00_Infrastructure_MongoDB.md](./00-foundation/US00_Infrastructure_MongoDB.md) |
| US29 | Supabase MCP Integration | ✅ Implemented | 8 | [US29_supabase_mcp_integration.md](./00-foundation/US29_supabase_mcp_integration.md) |
| US33 | Database-Driven Configuration | 📋 Planned | 13 | [US33_Database_Driven_Configuration.md](./00-foundation/US33_Database_Driven_Configuration.md) |

**Notes:**
- US00 describes MongoDB setup but system migrated to PostgreSQL/Supabase (see US29)
- US33 enables dynamic configuration management without code deployments

---

### [01-Authentication](./01-authentication/) - Security & User Management

**Epic:** Security & User Management  
**Purpose:** User roles, authentication, and access management

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US02 | PIN-Based Entry | ✅ Implemented | 5 | [US02_PIN_Based_Entry.md](./01-authentication/US02_PIN_Based_Entry.md) |
| US06 | Workshop Access Control | ✅ Implemented | 8 | [US06_Workshop_Access_Control.md](./01-authentication/US06_Workshop_Access_Control.md) |
| US30 | User Roles & Access Control | ✅ Implemented | 13 | [US30_User_Roles_Access_Control.md](./01-authentication/US30_User_Roles_Access_Control.md) |
| US32 | Facilitator Approval & Rate Limiting | ✅ Implemented | 8 | [US32_Facilitator_Approval_Rate_Limiting.md](./01-authentication/US32_Facilitator_Approval_Rate_Limiting.md) |

**Notes:**
- US06 and US30 have overlapping concerns - US06 focuses on workshop-level permissions, US30 on system-wide roles
- US32 adds registration controls and approval workflows

---

### [02-Workshop-Management](./02-workshop-management/) - Workshop Administration

**Epic:** Workshop Administration  
**Purpose:** Creating, configuring, and managing workshops

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US01 | Workshop Initialization | ✅ Implemented | 8 | [US01_Workshop_Initialization.md](./02-workshop-management/US01_Workshop_Initialization.md) |
| US10 | Prioritization Matrix Criteria | ✅ Implemented | 8 | [US10_Prioritization_Matrix_Criteria.md](./02-workshop-management/US10_Prioritization_Matrix_Criteria.md) |
| US22 | Workshop Templates & Industry Packages | 📋 Backlog | 13 | [US22_workshop_templates_industry.md](./02-workshop-management/US22_workshop_templates_industry.md) |
| US28 | Home Page Tile Carousel | 📋 Backlog | 13 | [US28_home_page_tile_carousel.md](./02-workshop-management/US28_home_page_tile_carousel.md) |
| US34 | Challenge Cards for Workshops | 📋 Backlog | 13 | [US34_Challenge_Cards.md](./02-workshop-management/US34_Challenge_Cards.md) |

**Notes:**
- US01 and US10 are closely related - US01 creates workshops, US10 configures scoring criteria
- US22 enables reusable workshop templates
- US28 enhances workshop discovery on landing page
- US34 enables facilitators to define high-value business/technology problems with success criteria

---

### [03-Participant-Workflow](./03-participant-workflow/) - Participant Journey

**Epic:** Participant Journey  
**Purpose:** Core participant activities in workshops

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US03 | Digital Use Case Canvas | ✅ Implemented | 8 | [US03_Digital_Use_Case_Canvas.md](./03-participant-workflow/US03_Digital_Use_Case_Canvas.md) |
| US04 | Live Scoring Interface | ✅ Implemented | 8 | [US04_Live_Scoring_Interface.md](./03-participant-workflow/US04_Live_Scoring_Interface.md) |
| US05 | Interactive Hotspot Matrix | ✅ Implemented | 13 | [US05_Interactive_Hotspot_Matrix.md](./03-participant-workflow/US05_Interactive_Hotspot_Matrix.md) |
| US31 | Participant Landing Dashboard | ✅ Implemented | 13 | [US31_Participant_Landing_Dashboard.md](./03-participant-workflow/US31_Participant_Landing_Dashboard.md) |

**Notes:**
- These form the core participant workflow: US03 → US04 → US05
- US31 provides the participant's home dashboard
- US05 includes drag-and-drop scoring capabilities

---

### [04-AI-Intelligence](./04-ai-intelligence/) - AI-Powered Capabilities

**Epic:** AI-Powered Capabilities  
**Purpose:** AI assistance, knowledge base, and intelligent features

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US07 | AI Intelligence RAG | ✅ Implemented | 13 | [US07_AI_Intelligence_RAG.md](./04-ai-intelligence/US07_AI_Intelligence_RAG.md) |
| US16 | AI Copilot Assistant | 📋 Backlog | 34 | [US16_ai_copilot_assistant.md](./04-ai-intelligence/US16_ai_copilot_assistant.md) |
| US19 | AI Demo Sandbox | 📋 Backlog | 34 | [US19_ai_demo_sandbox.md](./04-ai-intelligence/US19_ai_demo_sandbox.md) |
| US26 | Knowledge Base Research Refresh | ✅ Implemented | 8 | [US26_knowledge_base_research_refresh.md](./04-ai-intelligence/US26_knowledge_base_research_refresh.md) |

**Notes:**
- US07 provides RAG-powered use case enhancement (implemented)
- US16 is comprehensive AI copilot for workshop facilitation (future)
- US19 enables hands-on AI experimentation (future)
- US26 maintains knowledge base content (maintenance task)

**Relationship:** US07 focuses on use case enhancement, US16 provides broader workshop assistance

---

### [05-Engagement](./05-engagement/) - Participant Engagement

**Epic:** Participant Engagement  
**Purpose:** Gamification, collaboration, and interactive features

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US15 | Gamification & Engagement | 📋 Backlog | 21 | [US15_gamification_engagement.md](./05-engagement/US15_gamification_engagement.md) |
| US18 | Breakout Rooms & Collaboration | 📋 Backlog | 21 | [US18_breakout_rooms_collaboration.md](./05-engagement/US18_breakout_rooms_collaboration.md) |
| US21 | Live Polling & Reactions | 📋 Backlog | 13 | [US21_live_polling_reactions.md](./05-engagement/US21_live_polling_reactions.md) |

**Notes:**
- All three enhance engagement but serve different purposes
- US15: Points, badges, leaderboards
- US18: Team collaboration and breakout sessions
- US21: Real-time polling and audience reactions

---

### [06-Business-Intelligence](./06-business-intelligence/) - Business Value Tools

**Epic:** Business Value Tools  
**Purpose:** ROI, analytics, and strategic planning

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US17 | ROI Calculator & Business Case | 📋 Backlog | 21 | [US17_roi_calculator_business_case.md](./06-business-intelligence/US17_roi_calculator_business_case.md) |
| US20 | Implementation Roadmap Generator | 📋 Backlog | 21 | [US20_implementation_roadmap_generator.md](./06-business-intelligence/US20_implementation_roadmap_generator.md) |
| US25 | Advanced Analytics & Insights | ✅ Implemented | 21 | [US25_analytics_insights_dashboard.md](./06-business-intelligence/US25_analytics_insights_dashboard.md) |

**Notes:**
- US17 and US20 are complementary - financial analysis and planning tools
- US25 provides cross-workshop analytics that feed into US17/US20
- Consider "Business Intelligence Suite" as umbrella term

---

### [07-UI-UX](./07-ui-ux/) - User Experience Improvements

**Epic:** User Experience Improvements  
**Purpose:** Interface improvements and branding

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US08 | Landing Page | ✅ Implemented | 8 | [US08_Landing_Page.md](./07-ui-ux/US08_Landing_Page.md) |
| US11 | Platform Enhancements | ✅ Implemented | 8 | [US11_Enhancements.md](./07-ui-ux/US11_Enhancements.md) |
| US12 | Participant Dashboard & Survey Management | ✅ Implemented | 13 | [US12_users_enhancements.md](./07-ui-ux/US12_users_enhancements.md) |
| US13 | Facilitator Survey Management | ✅ Implemented | 21 | [US13_facilitator_enhancements.md](./07-ui-ux/US13_facilitator_enhancements.md) |
| US14 | Theme Switching | 📋 Backlog | 5 | [US14_theme_switching.md](./07-ui-ux/US14_theme_switching.md) |
| US27 | Application Icon & Branding | ✅ Implemented | 2 | [US27_application_icon_branding.md](./07-ui-ux/US27_application_icon_branding.md) |

**Notes:**
- US11 is a catch-all for initial enhancements (now covered by other stories)
- US12 and US13 are comprehensive and well-structured
- US14 and US27 are foundational UI features

---

### [08-Globalization](./08-globalization/) - Internationalization

**Epic:** Internationalization  
**Purpose:** Multi-language and accessibility support

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US24 | Multi-Language Support (i18n) | ✅ Implemented (Phase 1) | 21 | [US24_multi_language_support.md](./08-globalization/US24_multi_language_support.md) |

**Notes:**
- Phase 1 implemented: English, Spanish, French, German
- Phase 2 planned: Additional languages, RTL support
- Phase 3 future: Real-time translation, multilingual workshops

---

### [09-Content](./09-content/) - Content Management

**Epic:** Content Management  
**Purpose:** Recording, templates, and knowledge sharing

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US23 | Video Recording & Replay | 📋 Backlog | 21 | [US23_video_recording_replay.md](./09-content/US23_video_recording_replay.md) |

**Notes:**
- Documentation-focused feature for workshop replay
- Enables asynchronous participation

---

### [10-Mobile](./10-mobile/) - Platform Expansion

**Epic:** Platform Expansion  
**Purpose:** Mobile apps and platform extensions

| ID | Title | Status | Points | File |
|----|-------|--------|--------|------|
| US09 | QR Mobile App | 📋 Backlog | 13 | [US09_QR_Mobile_App.md](./10-mobile/US09_QR_Mobile_App.md) |

**Notes:**
- Mobile companion app
- QR code-based workshop access

---

## Status Legend

- ✅ **Implemented** - Feature is complete and in production
- 📋 **Backlog** - Planned for future implementation
- 🔄 **In Progress** - Currently being developed
- ⚠️ **Superseded** - Replaced by another story or deprecated
- 📋 **Planned** - Scheduled for specific sprint/phase

---

## Dependencies Map

```
Foundation (US00, US29, US33)
    ↓
Authentication (US02, US30, US32)
    ↓
Workshop Management (US01, US10)
    ↓
Participant Workflow (US03 → US04 → US05)
    ↓
AI Features (US07, US16, US26)
    ↓
Engagement (US15, US18, US21)
    ↓
Business Intelligence (US17, US20, US25)
```

### Key Dependencies

**Foundation Layer:**
- US29 (Supabase) depends on: None (foundational)
- US33 depends on: US30 (User Roles)

**Authentication Layer:**
- US30 depends on: US29 (Database)
- US32 depends on: US30 (User Roles)

**Workshop Layer:**
- US01 depends on: US30 (User Roles), US29 (Database)
- US10 depends on: US01 (Workshop Creation)
- US34 depends on: US01 (Workshop Creation), US30 (User Roles), US06 (Workshop Access)

**Participant Layer:**
- US03 depends on: US01 (Workshop), US02 (PIN Entry)
- US04 depends on: US03 (Use Cases), US10 (Criteria)
- US05 depends on: US03 (Use Cases), US04 (Scores)
- US31 depends on: US02 (PIN Entry), US03 (Use Cases)

**AI Layer:**
- US07 depends on: US03 (Use Cases), US26 (Knowledge Base)
- US16 depends on: US07 (RAG Foundation)
- US26 depends on: US29 (Database)

**Business Intelligence:**
- US17 depends on: US05 (Prioritized Use Cases)
- US20 depends on: US17 (ROI Analysis)
- US25 depends on: US01 (Workshops), US05 (Results)

---

## Quick Reference

### By Status

**Implemented (12):**
- US02, US06, US07, US08, US11, US12, US13, US25, US26, US27, US29, US30, US31, US32

**Backlog/Planned (19):**
- US09, US10, US14, US15, US16, US17, US18, US19, US20, US21, US22, US23, US24 (Phase 2+), US28, US33, US34

**Superseded (1):**
- US00

### By Priority

**Critical/High Priority:**
- US01, US02, US03, US04, US05, US06, US07, US12, US13, US25, US29, US30, US31, US32

**Medium Priority:**
- US10, US15, US16, US17, US18, US20, US21, US22, US25, US26, US28, US33, US34

**Low Priority:**
- US09, US14, US19, US23, US24 (Phase 2+)

### By Story Points

**Small (≤8 points):**
- US02 (5), US08 (8), US10 (8), US14 (5), US26 (8), US27 (2), US29 (8), US32 (8), US33 (13)

**Medium (9-20 points):**
- US01 (8), US03 (8), US04 (8), US06 (8), US07 (13), US11 (8), US12 (13), US15 (21), US17 (21), US18 (21), US20 (21), US21 (13), US22 (13), US23 (21), US24 (21), US25 (21), US28 (13), US30 (13), US31 (13), US34 (13)

**Large (≥21 points):**
- US05 (13), US13 (21), US16 (34), US19 (34)

---

## Related Documentation

- [Epic Overview](./archive/epic_01.md) (archived)
- [Advanced Features Backlog](./archive/BACKLOG_ADVANCED_FEATURES.md) (archived)
- [Sprint Progress](../../project_management/sprint_progress.md)
- [Product Roadmap](../../PRODUCT_ROADMAP.md)

---

## Maintenance Notes

### Recent Changes (January 25, 2026)

1. **Organized into logical groups** - Stories grouped by feature domain
2. **Resolved US24 duplicate** - Merged comprehensive features into implemented version
3. **Updated US00** - Added migration note (MongoDB → PostgreSQL)
4. **Clarified US11** - Marked as completed catch-all for initial enhancements
5. **Created directory structure** - 11 groups + archive folder

### Future Improvements

- [ ] Add cross-references between related stories
- [ ] Standardize format across all stories
- [ ] Document overlapping story boundaries (US06/US30, US07/US16, US01/US10)
- [ ] Create dependency visualization diagram
- [ ] Add implementation timeline view

---

**Document Owner:** Product Team  
**Last Review:** January 25, 2026  
**Next Review:** February 1, 2026

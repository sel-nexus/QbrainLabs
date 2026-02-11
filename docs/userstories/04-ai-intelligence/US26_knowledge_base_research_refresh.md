# US26: Knowledge Base Public Research Refresh

**User Story ID:** US26  
**Title:** Knowledge Base Public Research Refresh  
**Epic:** Knowledge Base Enhancement  
**Priority:** Medium  
**Story Points:** 8  
**Status:** ✅ Implemented  
**Created:** January 24, 2026

---

## 📋 User Story

**As a** workshop facilitator or participant,  
**I want to** refresh the list of use cases on the Knowledge Base page using public research sources (Perplexity/Google),  
**So that** I can discover new and trending AI use cases relevant to my industry or domain without leaving the platform.

---

## 🎯 Acceptance Criteria

### AC1: Public Research Provider Selection
- [x] User can select a research provider (Perplexity or Google)
- [x] Provider selection is persisted per user preference
- [x] Clear visual indication of which provider is currently active

### AC2: Refresh Action
- [x] "Refresh Use Cases" button is prominently displayed on the Knowledge Base page
- [x] Button triggers a search based on current industry/domain context
- [x] Loading state is shown while fetching results
- [x] Error handling with user-friendly messages if API fails

### AC3: Search Context
- [x] Search automatically includes current workshop industry context
- [x] Search includes relevant keywords from existing use cases
- [ ] User can optionally add custom search terms *(Enhancement in progress)*

### AC4: Results Integration
- [x] New use cases are displayed in a preview panel before adding
- [x] User can select which use cases to add to the Knowledge Base
- [ ] Duplicate detection prevents adding existing use cases *(Enhancement in progress)*
- [x] Source attribution (Perplexity/Google) is displayed for each result

### AC5: API Integration
- [x] Secure API key management for Perplexity/Google APIs
- [x] Rate limiting to prevent excessive API calls
- [x] Graceful degradation if API quota is exceeded

---

## 🚀 Enhancement: Editable Scope & Smart Filtering

**Status:** Planned  
**Date:** February 11, 2026

### Enhancement Goals

1. **Editable Scope Field**: Allow users to enter free-form text to customize research queries
2. **Smart Filtering**: Display only use cases that:
   - Don't exist in the knowledge base (new use cases)
   - Can refine existing use cases with additional details

### Enhanced Acceptance Criteria

#### AC6: Editable Scope
- [ ] Scope field is editable (textarea instead of read-only text)
- [ ] Pre-filled with industry-based default text
- [ ] Supports custom free-form search queries
- [ ] Character limit: 500 characters with counter
- [ ] Placeholder text provides guidance

#### AC7: Smart Result Filtering
- [ ] Results are compared against existing knowledge base
- [ ] "New" use cases are identified (similarity < 60%)
- [ ] "Refinable" use cases are identified (similarity 60-85%)
- [ ] Exact duplicates are filtered out (similarity > 85%)
- [ ] Visual badges distinguish "New" vs "Refinable" results

#### AC8: Refinement Suggestions
- [ ] Refinable use cases show which existing use case they relate to
- [ ] Suggested improvements are displayed
- [ ] User can preview changes before applying
- [ ] Refinements update existing use cases instead of creating duplicates

### Technical Implementation

**Frontend Changes:**
- Add `customScope` state to `KnowledgeBase.tsx`
- Replace Scope `<p>` with `<textarea>` (lines 339-346)
- Add visual indicators for result types
- Display refinement suggestions

**Backend Changes:**
- Update `RefreshRequest` schema with `custom_scope` field
- Implement similarity matching in `/refresh` endpoint
- Add filtering logic for new vs refinable use cases
- Update `find_trending_use_cases` in RAG service

**Schema Updates:**
- Add fields to `UseCaseSearchResult`:
  - `is_new: Optional[bool]`
  - `is_refinable: Optional[bool]`
  - `existing_usecase_id: Optional[str]`
  - `refinement_suggestions: Optional[str]`

---

## 🔧 Technical Requirements

### Frontend
- Add refresh button component to Knowledge Base page
- Provider dropdown/toggle for Perplexity vs Google selection
- Preview modal for reviewing fetched use cases
- Loading and error states

### Backend
- `/api/knowledge-base/refresh` endpoint
- Integration with Perplexity API (primary)
- Integration with Google Custom Search API (secondary)
- Result parsing and normalization
- Duplicate detection logic

### Configuration
- Environment variables for API keys
- Rate limit configuration
- Search template customization

---

## 📊 Story Breakdown

| Task | Estimate |
|------|----------|
| UI: Refresh button and provider selector | 1 pt |
| UI: Preview modal for results | 1 pt |
| Backend: Perplexity API integration | 2 pts |
| Backend: Google Search API integration | 2 pts |
| Backend: Result parsing and normalization | 1 pt |
| Testing and error handling | 1 pt |
| **Enhancement: Editable Scope** | **2 pts** |
| **Enhancement: Smart Filtering** | **3 pts** |
| **Total** | **13 pts** |

---

## 🔗 Dependencies

- Perplexity API access and key
- Google Custom Search API access and key
- Existing Knowledge Base page infrastructure

---

## 📝 Notes

- Consider caching results to reduce API calls
- May want to add "trending" indicator for recently discovered use cases
- Future enhancement: scheduled automatic refresh option
- Similarity threshold tuning may be needed based on real-world usage

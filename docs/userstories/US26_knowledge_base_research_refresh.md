# US26: Knowledge Base Public Research Refresh

**User Story ID:** US26  
**Title:** Knowledge Base Public Research Refresh  
**Epic:** Knowledge Base Enhancement  
**Priority:** Medium  
**Story Points:** 8  
**Created:** January 24, 2026

---

## 📋 User Story

**As a** workshop facilitator or participant,  
**I want to** refresh the list of use cases on the Knowledge Base page using public research sources (Perplexity/Google),  
**So that** I can discover new and trending AI use cases relevant to my industry or domain without leaving the platform.

---

## 🎯 Acceptance Criteria

### AC1: Public Research Provider Selection
- [ ] User can select a research provider (Perplexity or Google)
- [ ] Provider selection is persisted per user preference
- [ ] Clear visual indication of which provider is currently active

### AC2: Refresh Action
- [ ] "Refresh Use Cases" button is prominently displayed on the Knowledge Base page
- [ ] Button triggers a search based on current industry/domain context
- [ ] Loading state is shown while fetching results
- [ ] Error handling with user-friendly messages if API fails

### AC3: Search Context
- [ ] Search automatically includes current workshop industry context
- [ ] Search includes relevant keywords from existing use cases
- [ ] User can optionally add custom search terms

### AC4: Results Integration
- [ ] New use cases are displayed in a preview panel before adding
- [ ] User can select which use cases to add to the Knowledge Base
- [ ] Duplicate detection prevents adding existing use cases
- [ ] Source attribution (Perplexity/Google) is displayed for each result

### AC5: API Integration
- [ ] Secure API key management for Perplexity/Google APIs
- [ ] Rate limiting to prevent excessive API calls
- [ ] Graceful degradation if API quota is exceeded

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
| **Total** | **8 pts** |

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

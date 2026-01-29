# US38: Participant Language Selection and Application Translation

**Epic:** AI Hotspot Flow - Global Expansion  
**Module:** Internationalization (i18n)  
**Story Type:** Enhancement  
**Priority:** High  
**Story Points:** 8  
**Status:** 📋 BACKLOG

---

## User Story

**As a** Workshop Participant,  
**I want to** select my preferred language and have the entire application translate immediately,  
**So that** I can use the platform in my native language without language barriers.

---

## Description

When a participant selects a different language from the language switcher, the entire application interface should translate to the selected language in real-time. This enhances the existing US24 (Multi-Language Support) to ensure participant-specific language selection works correctly across all participant-facing views.

---

## Requirements

### Functional Requirements

1. **Language Selection**
   - Language switcher accessible to participants
   - Immediate translation on language change
   - No page reload required
   - Language preference persists across sessions

2. **Translation Coverage**
   - All participant-facing UI elements translate
   - Navigation menus and buttons
   - Form labels and placeholders
   - Error messages and notifications
   - Survey questions and options
   - Use case canvas labels
   - Poll questions and options
   - Dashboard tiles and sections

3. **Real-Time Updates**
   - Translation applies immediately on selection
   - No flickering or partial translations
   - Smooth transition between languages
   - Context-aware translations

4. **Persistence**
   - Language preference saved in localStorage
   - Preference persists across browser sessions
   - Preference applies on application load
   - Optional: Server-side preference for logged-in users

### Non-Functional Requirements

- Translation should be instant (< 100ms)
- No performance degradation with translations
- Fallback to English for missing translations
- Support for all languages in US24 (English, Spanish, French, German)

---

## Acceptance Criteria

### Scenario 1: Language Selection
**Given** a participant is viewing the application in English  
**When** they select Spanish from the language switcher  
**Then** the entire interface immediately translates to Spanish  
**And** all text elements are translated  
**And** the language preference is saved

### Scenario 2: Persistent Preference
**Given** a participant has selected French  
**When** they close and reopen the application  
**Then** the application loads in French  
**And** the language switcher shows French as selected

### Scenario 3: Complete Translation Coverage
**Given** a participant selects German  
**When** they navigate through all participant views  
**Then** all UI elements are translated  
**And** no English text appears (except for user-generated content)  
**And** form labels, buttons, and messages are in German

### Scenario 4: Survey Translation
**Given** a participant has selected Spanish  
**When** they open a survey  
**Then** all survey questions are in Spanish  
**And** answer options are translated  
**And** instructions and help text are in Spanish

---

## Technical Implementation

### Files to Modify

- `client/src/components/common/LanguageSwitcher.tsx` - Ensure it works for participants
- `client/src/i18n.ts` - Verify configuration for participants
- `client/public/locales/{lang}/translation.json` - Ensure complete translations for all languages
- All participant-facing components - Verify `useTranslation` hook usage

### Component Updates

#### LanguageSwitcher Component

```typescript
// LanguageSwitcher.tsx should be accessible to participants
export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const { theme } = useTheme();
    
    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('preferredLanguage', lng);
        // Update document attributes
        document.documentElement.lang = lng;
    };
    
    // ... rest of component
};
```

#### Participant Components Using Translation

```typescript
// Example: ParticipantDashboard.tsx
import { useTranslation } from 'react-i18next';

export function ParticipantDashboard() {
    const { t } = useTranslation();
    
    return (
        <div>
            <h1>{t('participant.dashboard.title')}</h1>
            <button>{t('participant.dashboard.newUseCase')}</button>
            {/* ... */}
        </div>
    );
}
```

### Translation Files Structure

Ensure all translation files include participant-specific keys:

```json
{
  "participant": {
    "dashboard": {
      "title": "My Dashboard",
      "newUseCase": "Add New Use Case",
      "surveys": "Surveys",
      "prioritization": "Prioritization"
    },
    "usecase": {
      "title": "Use Case Title",
      "problem": "Problem Description",
      "submit": "Submit Use Case"
    },
    "survey": {
      "complete": "Complete Survey",
      "next": "Next",
      "previous": "Previous"
    }
  }
}
```

### i18n Configuration

```typescript
// i18n.ts - Ensure proper configuration
i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        supportedLngs: ['en', 'es', 'fr', 'de'],
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            lookupLocalStorage: 'preferredLanguage',
            caches: ['localStorage'],
        },
        react: {
            useSuspense: true,
        },
    });
```

---

## Dependencies

- US24: Multi-Language Support - Phase 1 implemented
- i18next and react-i18next libraries
- Translation files for all supported languages

---

## Translation Coverage Checklist

### Participant Views to Translate

- [ ] Participant Dashboard
- [ ] Use Case Canvas
- [ ] Survey Interface
- [ ] Poll Popup
- [ ] Q&A Panel
- [ ] Participant Matrix
- [ ] Navigation Menu
- [ ] Error Messages
- [ ] Success Messages
- [ ] Form Validation Messages
- [ ] Help Text and Tooltips

### Content Types

- [ ] Static UI text
- [ ] Dynamic messages
- [ ] Form labels
- [ ] Button labels
- [ ] Error messages
- [ ] Survey questions (if facilitator allows)
- [ ] Poll questions (if facilitator allows)

---

## Testing Requirements

### Unit Tests
- Language switcher functionality
- Translation hook usage in components
- Language preference persistence
- Fallback to English for missing keys

### Integration Tests
- Language change updates all components
- Language persists across page navigation
- Language persists across sessions
- All participant views translate correctly

### Manual Testing
- Test each supported language
- Verify all UI elements translate
- Check for missing translations
- Verify no English text appears (except user content)

---

## Missing Translation Handling

- Use i18next fallback mechanism
- Log missing translation keys in development
- Provide fallback to English
- Consider adding translation key to UI in development mode

---

## Future Enhancements

- Server-side language preference storage
- Facilitator-configured workshop languages
- Real-time translation of user-generated content
- Additional language support
- RTL language support

---

## Definition of Done

- [ ] Language switcher accessible to participants
- [ ] All participant views translate correctly
- [ ] Translation applies immediately on selection
- [ ] Language preference persists across sessions
- [ ] Complete translation coverage verified
- [ ] No missing translations in participant views
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed for all languages
- [ ] Code review completed
- [ ] Documentation updated

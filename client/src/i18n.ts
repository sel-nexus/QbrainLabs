import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Supported languages
export const supportedLanguages = ['en', 'es', 'fr', 'de'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// Language metadata
export const languageInfo: Record<SupportedLanguage, {
    name: string;
    nativeName: string;
    flag: string;
    dir: 'ltr' | 'rtl';
}> = {
    en: { name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
    es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
    fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
    de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
};

// Inline English translations as fallback
// This ensures translations are always available even if HTTP backend fails
const enTranslations = {
    common: {
        language: "Language",
        welcome: "Welcome",
        loading: "Loading...",
        error: "Error",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        create: "Create",
        submit: "Submit",
        back: "Back",
        next: "Next",
        previous: "Previous",
        search: "Search",
        filter: "Filter",
        export: "Export",
        import: "Import",
        settings: "Settings",
        help: "Help",
        close: "Close",
        confirm: "Confirm",
        yes: "Yes",
        no: "No"
    },
    nav: {
        home: "Home",
        login: "Login",
        admin: "Admin",
        dashboard: "Dashboard",
        profile: "Profile",
        logout: "Logout",
        adminPanel: "Admin Panel",
        knowledgeBase: "Knowledge Base",
        changePassword: "Change Password",
        signIn: "Sign In",
        signOut: "Sign Out"
    },
    auth: {
        login: "Login",
        register: "Register",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
        forgotPassword: "Forgot Password?",
        rememberMe: "Remember Me",
        loginSuccess: "Login successful",
        loginError: "Login failed",
        logoutSuccess: "Logged out successfully"
    },
    workshop: {
        title: "Workshop",
        create: "Create Workshop",
        join: "Join Workshop",
        enterPin: "Enter PIN Code",
        participants: "Participants",
        useCases: "Use Cases",
        scoring: "Scoring",
        results: "Results",
        active: "Active",
        completed: "Completed",
        pending: "Pending"
    },
    matrix: {
        title: "Prioritization Matrix",
        quickWins: "Quick Wins",
        strategicBets: "Strategic Bets",
        lowPriority: "Low Priority",
        questionMarks: "Question Marks",
        feasibility: "Feasibility",
        value: "Value"
    },
    landing: {
        hero: {
            badge: "Now with AI-Powered Scoring",
            title: "Map AI Use Cases",
            titleHighlight: "With Your Team",
            subtitle: "The collaborative platform for identifying, scoring, and prioritizing AI opportunities. Turn brainstorming into a strategic roadmap in minutes.",
            facilitatorLogin: "Facilitator Login",
            joinSession: "Join Session"
        },
        features: {
            title: "Powerful Features",
            subtitle: "Everything you need to run successful AI prioritization workshops",
            aiPowered: "AI-Powered Intelligence",
            aiPoweredDesc: "Our RAG engine helps refine use cases and check technical feasibility in real-time.",
            realtime: "Real-Time Collaboration",
            realtimeDesc: "Vote, score, and discuss ideas synchronously. See results update live on the matrix.",
            strategic: "Strategic Prioritization",
            strategicDesc: "Automatically map opportunities to a Value vs. Feasibility matrix to find quick wins."
        },
        howItWorks: {
            title: "How It Works",
            step1: "01",
            step1Title: "Create",
            step1Desc: "Define your criteria and launch a secure workspace for your team.",
            step2: "02",
            step2Title: "Collaborate",
            step2Desc: "Team submits ideas and AI helps refine and validate them in real-time.",
            step3: "03",
            step3Title: "Synthesize",
            step3Desc: "Vote on value and feasibility, then export your prioritized roadmap."
        },
        benefits: {
            title: "Why Teams Choose Us",
            subtitle: "Proven results from organizations that transformed their AI strategy",
            fasterStat: "75%",
            fasterLabel: "Faster",
            fasterDesc: "Time for use case priority",
            workshopsStat: "25+",
            workshopsLabel: "Workshops",
            workshopsDesc: "Successfully Executed",
            aiStat: "AI",
            aiLabel: "Powered",
            aiDesc: "Intelligent assistance",
            betterStat: "3x",
            betterLabel: "Better",
            betterDesc: "Decision outcomes"
        },
        cta: {
            title: "Ready to Prioritize Your",
            titleHighlight: "AI Journey?",
            subtitle: "Start collaborating with your team today and transform ideas into an actionable AI roadmap.",
            getStarted: "Get Started",
            joinSession: "Join a Session",
            copyright: "© 2026 Qbrain AI Labs. All Rights Reserved."
        }
    },
    admin: {
        title: "Admin Dashboard",
        users: "Users",
        workshops: "Workshops",
        settings: "Settings",
        statistics: "Statistics",
        totalUsers: "Total Users",
        activeWorkshops: "Active Workshops",
        totalSubmissions: "Total Submissions"
    }
};

i18n
    // Load translation using HTTP backend
    // Translations are loaded from /public/locales/{lng}/translation.json
    .use(Backend)
    // Detect user language from browser settings, localStorage, etc.
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    .init({
        // Fallback language when translation is not available
        fallbackLng: 'en',

        // Supported languages
        supportedLngs: supportedLanguages,

        // Ensure region codes like en-US resolve to en for loading
        load: 'languageOnly',

        // Accept and match non-explicit language codes
        nonExplicitSupportedLngs: true,

        // Normalize detected language codes
        cleanCode: true,

        // Debug mode (disable in production)
        debug: import.meta.env.DEV,

        // Interpolation options
        interpolation: {
            escapeValue: false, // React already escapes by default
        },

        // Use inline resources as fallback
        resources: {
            en: {
                translation: enTranslations
            }
        },

        // Allow partial bundled languages (use inline + HTTP backend)
        partialBundledLanguages: true,

        // Backend options for loading translations
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
            // Add timeout to handle slow network connections
            requestOptions: {
                mode: 'cors',
                credentials: 'same-origin',
                cache: 'default'
            },
            // Retry failed requests
            crossDomain: false,
            withCredentials: false,
            // Allow backend to fail gracefully and use inline resources
            allowMultiLoading: false
        },

        // Language detection options
        detection: {
            // Order of language detection strategies
            order: ['localStorage', 'navigator', 'htmlTag'],
            // Key used in localStorage
            lookupLocalStorage: 'preferredLanguage',
            // Cache user language
            caches: ['localStorage'],
        },

        // React options - disable suspense to prevent blocking on translation load
        react: {
            useSuspense: false,
        },
    });

// Export i18n instance
export default i18n;

// Helper function to get current language
export const getCurrentLanguage = (): SupportedLanguage => {
    const lang = i18n.language;
    // Handle language codes like 'en-US' -> 'en'
    const shortLang = lang.split('-')[0] as SupportedLanguage;
    return supportedLanguages.includes(shortLang) ? shortLang : 'en';
};

// Helper function to change language
export const changeLanguage = (lng: SupportedLanguage): Promise<void> => {
    return i18n.changeLanguage(lng).then(() => {
        localStorage.setItem('preferredLanguage', lng);
        // Update document direction for RTL languages (future support)
        const langInfo = languageInfo[lng];
        if (langInfo) {
            document.documentElement.dir = langInfo.dir;
            document.documentElement.lang = lng;
        }
    });
};

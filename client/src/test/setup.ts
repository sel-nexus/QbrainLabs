import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock socket.io-client
vi.mock('../lib/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    io: { on: vi.fn(), off: vi.fn() },
  },
}));

// react-i18next backed by a real i18next instance with the English bundle, so
// components render the same text as the app (keys, interpolation, plurals).
vi.mock('react-i18next', async () => {
  const { default: i18next } = await import('i18next');
  const { default: en } = await import('../../public/locales/en/translation.json');
  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'en', fallbackLng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
  const t = i18n.t.bind(i18n);
  return {
    useTranslation: () => ({ t, i18n: Object.assign(i18n, { changeLanguage: vi.fn() }) }),
    Trans: ({ children }: any) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});

// Mock Element.scrollTo for carousel components
Element.prototype.scrollTo = vi.fn() as any;

// US48.13: every locale has the same keys and placeholders as English.
import { describe, it, expect } from 'vitest';
// @ts-expect-error plain JS module shared with the CLI check
import { checkLocales } from '../../scripts/check-i18n.mjs';

describe('locale key parity', () => {
    it('matches en/translation.json in every language', () => {
        expect(checkLocales()).toEqual([]);
    });
});

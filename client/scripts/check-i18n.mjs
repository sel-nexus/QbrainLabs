// Every locale must have exactly the keys in en/translation.json (the source
// of truth) with the same {{placeholders}}. Run: npm run i18n:check
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'locales');

const flatten = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]]));
const placeholders = (text) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
const load = (lng) => new Map(flatten(JSON.parse(readFileSync(join(LOCALES_DIR, lng, 'translation.json'), 'utf8'))));

/** Returns a list of human-readable problems; empty when all locales match English. */
export function checkLocales() {
    const en = load('en');
    const problems = [];
    for (const lng of readdirSync(LOCALES_DIR).filter((d) => d !== 'en')) {
        const other = load(lng);
        for (const [key, text] of en) {
            if (!other.has(key)) problems.push(`${lng}: missing "${key}"`);
            else if (placeholders(other.get(key)) !== placeholders(text)) problems.push(`${lng}: placeholders differ in "${key}"`);
            else if (!other.get(key).trim()) problems.push(`${lng}: empty "${key}"`);
        }
        for (const key of other.keys()) if (!en.has(key)) problems.push(`${lng}: extra "${key}" (not in en)`);
    }
    return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const problems = checkLocales();
    if (problems.length) {
        console.error(`i18n key parity failed (${problems.length}):\n  ${problems.join('\n  ')}`);
        process.exit(1);
    }
    console.log('i18n: all locales match en/translation.json');
}

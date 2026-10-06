import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour shared by every modal: Escape closes, Tab stays inside the
 * dialog, focus moves in on open and returns to the opener on close.
 */
export function useDialog(ref: RefObject<HTMLElement | null>, isOpen: boolean, onClose: () => void) {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return;
        const opener = document.activeElement as HTMLElement | null;
        const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        // Wait a frame so animated content is mounted before focusing.
        const raf = requestAnimationFrame(() => {
            const el = ref.current;
            if (el && !el.contains(document.activeElement)) (el.querySelector<HTMLElement>('[autofocus]') ?? focusables()[0] ?? el).focus();
        });

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key !== 'Tab') return;
            const items = focusables();
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('keydown', onKey);
            opener?.focus?.();
        };
    }, [isOpen, ref]);
}

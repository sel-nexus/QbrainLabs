import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { ConfirmationModal } from '../components/ConfirmationModal';

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    /** Ask for an optional reason; the promise then resolves to the text ('' if blank) or null if cancelled. */
    reasonLabel?: string;
}

type Resolver = (value: string | null) => void;

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<string | null>) | null>(null);

/** Renders one shared ConfirmationModal so pages can `await confirm(...)` instead of window.confirm/prompt. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<Resolver | null>(null);

    const ask = useCallback((next: ConfirmOptions) => {
        resolver.current?.(null);
        setOptions(next);
        return new Promise<string | null>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const settle = (value: string | null) => {
        resolver.current?.(value);
        resolver.current = null;
        setOptions(null);
    };

    return (
        <ConfirmContext.Provider value={ask}>
            {children}
            <ConfirmationModal
                isOpen={!!options}
                title={options?.title ?? ''}
                message={options?.message ?? ''}
                confirmText={options?.confirmText}
                cancelText={options?.cancelText}
                variant={options?.variant}
                reasonLabel={options?.reasonLabel}
                onConfirm={(reason) => settle(reason ?? '')}
                onClose={() => settle(null)}
            />
        </ConfirmContext.Provider>
    );
}

/**
 * `const confirm = useConfirm();`
 * - `if (!(await confirm.ok({ title, message }))) return;`
 * - `const reason = await confirm.reason({ ..., reasonLabel }); if (reason === null) return;`
 */
export function useConfirm() {
    const ask = useContext(ConfirmContext);
    if (!ask) throw new Error('useConfirm must be used within a ConfirmProvider');
    return {
        ok: async (options: ConfirmOptions) => (await ask(options)) !== null,
        reason: ask,
    };
}

import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, className, id, ...props }, ref) => {
        const { theme } = useTheme();
        // Tie the visible label to the input so tapping it focuses the field
        // and screen readers announce it.
        const generatedId = useId();
        const inputId = id || generatedId;

        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label htmlFor={inputId} className={`text-sm pl-1 font-medium ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`
                        w-full px-4 py-3 rounded-lg border-2 transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-brand-violet/30
                        ${theme === 'light' 
                            ? 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-brand-violet' 
                            : 'bg-surface-800/80 border-white/10 text-white placeholder:text-gray-500 focus:border-brand-violet'
                        }
                        ${className}
                    `}
                    {...props}
                />
            </div>
        );
    }
);

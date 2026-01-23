import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, className, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && <label className="text-sm text-gray-400 pl-1">{label}</label>}
                <input
                    ref={ref}
                    className={`
            w-full bg-black/20 border-b-2 border-white/10 px-4 py-3 rounded-t-md
            text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-violet
            transition-colors duration-200
            ${className}
          `}
                    {...props}
                />
            </div>
        );
    }
);

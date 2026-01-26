import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';


function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    children: ReactNode;
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
    const baseStyles = "px-6 py-2.5 rounded-full font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center";

    const variants = {
        primary: "bg-gradient-to-r from-brand-violet to-brand-magenta text-white shadow-glow hover:brightness-110 border-none",
        secondary: "bg-transparent border-2 theme-border theme-text-secondary hover:theme-bg-tertiary hover:theme-text-primary",
        danger: "bg-semantic-danger text-white hover:brightness-90",
        ghost: "bg-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary"
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], className)}
            {...props}
        >
            {children}
        </button>
    );
}

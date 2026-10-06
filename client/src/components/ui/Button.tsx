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

// type defaults to "button" so a Button inside a <form> (e.g. Browse Templates on
// CreateWorkshop) never submits it by accident; submit buttons pass type="submit".
export function Button({ variant = 'primary', type = 'button', className, children, ...props }: ButtonProps) {
    const baseStyles = "px-6 py-2.5 rounded-full font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-violet focus-visible:ring-offset-2 focus-visible:ring-offset-transparent flex items-center justify-center";

    const variants = {
        primary: "bg-gradient-to-r from-brand-violet to-brand-magenta text-white shadow-glow hover:brightness-110 border-none",
        secondary: "bg-transparent border-2 theme-border theme-text-secondary hover:theme-bg-tertiary hover:theme-text-primary",
        danger: "bg-semantic-danger text-white hover:brightness-90",
        ghost: "bg-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary"
    };

    return (
        <button
            type={type}
            className={cn(baseStyles, variants[variant], className)}
            {...props}
        >
            {children}
        </button>
    );
}

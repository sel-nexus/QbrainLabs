import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../../context/ThemeContext';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    children: ReactNode;
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
    const { theme } = useTheme();
    
    const baseStyles = "px-6 py-2.5 rounded-full font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center";

    const variants = {
        primary: "bg-gradient-to-r from-brand-violet to-brand-magenta text-white shadow-glow hover:brightness-110 border-none",
        secondary: theme === 'light'
            ? "bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400"
            : "bg-transparent border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30",
        danger: "bg-semantic-danger text-white hover:brightness-90",
        ghost: theme === 'light'
            ? "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            : "bg-transparent text-gray-300 hover:text-white hover:bg-white/10"
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

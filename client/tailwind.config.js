/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    violet: 'hsl(250, 100%, 65%)',
                    magenta: 'hsl(320, 100%, 60%)',
                },
                surface: {
                    900: 'hsl(225, 25%, 10%)',
                    800: 'hsl(225, 20%, 15%)',
                    glass: 'hsla(225, 25%, 15%, 0.6)',
                },
                semantic: {
                    success: 'hsl(150, 100%, 45%)',
                    warning: 'hsl(35, 100%, 55%)',
                    danger: 'hsl(0, 90%, 60%)',
                }
            },
            fontFamily: {
                heading: ['"Plus Jakarta Sans"', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            boxShadow: {
                'glow': '0 0 20px rgba(124, 58, 237, 0.5)',
            }
        },
    },
    plugins: [],
}

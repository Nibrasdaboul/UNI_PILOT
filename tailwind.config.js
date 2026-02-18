import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    'animate-page-scale-in',
    'animate-page-slide-up',
    'animate-page-slide-down',
    'animate-page-slide-right',
    'animate-page-slide-left',
    'animate-page-fade',
    'page-entrance-stagger-right',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))', '2': 'hsl(var(--chart-2))', '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))', '5': 'hsl(var(--chart-5))'
        }
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'scroll-fade-up': { from: { opacity: '0', transform: 'translateY(28px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scroll-fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scroll-slide-left': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'scroll-slide-right': { from: { opacity: '0', transform: 'translateX(-24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'scroll-scale': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'float-soft': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        'glow-pulse': { '0%, 100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
        'page-scale-in': { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'page-slide-up': { from: { opacity: '0', transform: 'translateY(32px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'page-slide-down': { from: { opacity: '0', transform: 'translateY(-24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'page-slide-right': { from: { opacity: '0', transform: 'translateX(40px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'page-slide-left': { from: { opacity: '0', transform: 'translateX(-40px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'page-fade': { from: { opacity: '0' }, to: { opacity: '1' } }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'scroll-fade-up': 'scroll-fade-up 0.7s ease-out forwards',
        'scroll-fade-in': 'scroll-fade-in 0.6s ease-out forwards',
        'scroll-slide-left': 'scroll-slide-left 0.6s ease-out forwards',
        'scroll-slide-right': 'scroll-slide-right 0.6s ease-out forwards',
        'scroll-scale': 'scroll-scale 0.5s ease-out forwards',
        'float': 'float 4s ease-in-out infinite',
        'float-soft': 'float-soft 5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'page-scale-in': 'page-scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'page-slide-up': 'page-slide-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'page-slide-down': 'page-slide-down 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'page-slide-right': 'page-slide-right 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'page-slide-left': 'page-slide-left 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'page-fade': 'page-fade 0.45s ease-out forwards'
      },
      perspective: { 1000: '1000px', 1200: '1200px' }
    }
  },
  plugins: [tailwindcssAnimate],
};

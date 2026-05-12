import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette
        primary: {
          DEFAULT: 'hsl(215, 70%, 45%)',
          foreground: 'hsl(0, 0%, 100%)',
          hover: 'hsl(215, 70%, 38%)',
        },
        // Semantic palette
        background: 'hsl(0, 0%, 99%)',
        card: {
          DEFAULT: 'hsl(0, 0%, 100%)',
          foreground: 'hsl(222, 47%, 11%)',
        },
        muted: {
          DEFAULT: 'hsl(210, 20%, 96%)',
          foreground: 'hsl(215, 15%, 47%)',
        },
        border: 'hsl(214, 20%, 90%)',
        foreground: 'hsl(222, 47%, 11%)',
        destructive: {
          DEFAULT: 'hsl(0, 72%, 51%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        success: 'hsl(142, 71%, 35%)',
        warning: 'hsl(38, 92%, 50%)',
        // shadcn/ui semantic tokens (CSS variable-based)
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // Pipeline stage colors
        stage: {
          lead: 'hsl(210, 50%, 70%)',
          consultation: 'hsl(175, 45%, 55%)',
          proposal: 'hsl(45, 65%, 58%)',
          'active-design': 'hsl(260, 45%, 62%)',
          installation: 'hsl(25, 60%, 55%)',
          complete: 'hsl(142, 45%, 48%)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config

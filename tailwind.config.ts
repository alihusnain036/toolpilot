import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * The theme is built entirely on CSS custom properties (see app/globals.css).
 * Light and dark are therefore ONE token set with TWO value sets: `:root`
 * holds the light values, `.dark` overrides them. No Tailwind utility needs a
 * `dark:` variant to pick up a themed colour.
 *
 * Where the approved design does not state a value, the nearest Tailwind
 * default is used (see docs/decisions/0002-design-tokens.md).
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './src/**/*.{ts,tsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        background: 'hsl(var(--color-background) / <alpha-value>)',
        foreground: 'hsl(var(--color-foreground) / <alpha-value>)',
        muted: {
          DEFAULT: 'hsl(var(--color-muted) / <alpha-value>)',
          foreground: 'hsl(var(--color-muted-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--color-card) / <alpha-value>)',
          foreground: 'hsl(var(--color-card-foreground) / <alpha-value>)',
        },
        // Lines and focus
        border: 'hsl(var(--color-border) / <alpha-value>)',
        input: 'hsl(var(--color-input) / <alpha-value>)',
        ring: 'hsl(var(--color-ring) / <alpha-value>)',
        // Brand and intent
        primary: {
          DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
          foreground: 'hsl(var(--color-primary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
          foreground: 'hsl(var(--color-accent-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--color-success) / <alpha-value>)',
          foreground: 'hsl(var(--color-success-foreground) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--color-warning) / <alpha-value>)',
          foreground: 'hsl(var(--color-warning-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--color-destructive) / <alpha-value>)',
          foreground:
            'hsl(var(--color-destructive-foreground) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      spacing: {
        // Named steps layered on top of Tailwind's numeric scale, so layout
        // rhythm can be retuned in one place.
        gutter: 'var(--space-gutter)',
        section: 'var(--space-section)',
        stack: 'var(--space-stack)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: 'var(--leading-xs)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--leading-sm)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-base)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--leading-lg)' }],
        xl: ['var(--text-xl)', { lineHeight: 'var(--leading-xl)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-2xl)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-3xl)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-4xl)' }],
      },
      maxWidth: {
        content: 'var(--width-content)',
        prose: 'var(--width-prose)',
      },
    },
  },
  plugins: [],
};

export default config;

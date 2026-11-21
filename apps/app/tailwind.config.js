/** @type {import('tailwindcss').Config} */
const v = (name) => `hsl(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./index.ts', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // shadcn/ui tokens (neutral + blue primary) -> see global.css
      colors: {
        background: v('background'), foreground: v('foreground'),
        card: v('card'), 'card-foreground': v('card-foreground'),
        primary: v('primary'), 'primary-foreground': v('primary-foreground'),
        secondary: v('secondary'), 'secondary-foreground': v('secondary-foreground'),
        muted: v('muted'), 'muted-foreground': v('muted-foreground'),
        accent: v('accent'), 'accent-foreground': v('accent-foreground'),
        destructive: v('destructive'), success: v('success'),
        border: v('border'), input: v('input'),
      },
      borderRadius: { md: '8px', lg: '10px' },
    },
  },
};

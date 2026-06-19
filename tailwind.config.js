/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // warm Moonlighter-inspired UI tokens (mirror of src/theme/palette.ts)
        panel: '#FBF6EA',
        cream: '#FFFFFF',
        line: '#E2D2AC',
        sunken: '#F1E6CE',
        ink: '#2E241A',
        'ink-soft': '#5A4A36',
        'ink-faint': '#6B5A3E',
        teal: '#1FA89C',
        'teal-deep': '#14756C',
        indigo: '#7A5BA6',
        amber: '#E0843C',
        golden: '#FFCF6E',
        sales: '#C2682B',
        'sales-tint': '#F6E0CC',
        'sales-deep': '#7E3F12',
        hr: '#1F8A8C',
        'hr-tint': '#D2E9ED',
        'hr-deep': '#125562',
        aidev: '#7A5BA6',
        'aidev-tint': '#E8E0F0',
        'aidev-deep': '#4A3268',
        // on-dark text tokens (AA-safe over the warm dark chrome #15100a / world)
        'on-dark': '#FFFFFF',
        'on-dark-soft': '#E7DCC8',
        'on-dark-faint': '#B7A488',
      },
      fontFamily: {
        pixel: ['"Pixelify Sans"', 'ui-monospace', 'monospace'],
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
      },
      // one radius + one shadow family shared across every overlay
      borderRadius: {
        panel: '16px',
      },
      boxShadow: {
        panel: '0 18px 50px rgba(0,0,0,0.45)',
        pop: '0 24px 60px rgba(0,0,0,0.5)',
        chip: '0 4px 14px rgba(10,8,5,0.35)',
      },
    },
  },
  plugins: [],
};

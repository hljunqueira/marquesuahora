import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C3AED',
          gold: '#D4AF37',
          dark: '#0B0F19',
          obsidian: '#0F172A',
          graphite: '#64748B',
          rose: '#C07A65',
          emerald: '#047857',
          sapphire: '#2563EB',
          success: '#059669',
          warning: '#D97706',
          danger: '#DC2626'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        serif: ['Lora', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'luxury': '0 20px 40px -15px rgba(124, 58, 237, 0.12), 0 0 1px 1px rgba(124, 58, 237, 0.05)',
        'card': '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'floating': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }
    },
  },
  plugins: [],
};
export default config;

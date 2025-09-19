/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Retro Game Show Theme
        'retro-blue': '#3B82F6',
        'retro-orange': '#F59E0B', 
        'retro-green': '#10B981',
        'retro-red': '#EF4444',
        'retro-purple': '#8B5CF6',
        'retro-cyan': '#06B6D4',
        
        // Backgrounds
        'bg-primary': '#0F172A',
        'bg-secondary': '#1E293B',
        'bg-accent': '#334155',
        
        // Text colors
        'text-primary': '#F8FAFC',
        'text-secondary': '#CBD5E1',
        'text-muted': '#94A3B8',
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'medium': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        'large': '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px', 
        'lg': '16px',
        'xl': '20px',
      }
    },
  },
  plugins: [],
}

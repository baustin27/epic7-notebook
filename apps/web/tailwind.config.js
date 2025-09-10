/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        border: 'rgb(226 232 240)',
        input: 'rgb(226 232 240)',
        ring: 'rgb(59 130 246)',
        background: 'rgb(255 255 255)',
        foreground: 'rgb(15 23 42)',
        primary: {
          DEFAULT: 'rgb(59 130 246)',
          foreground: 'rgb(255 255 255)',
        },
        secondary: {
          DEFAULT: 'rgb(107 114 128)',
          foreground: 'rgb(255 255 255)',
        },
        muted: 'rgb(248 250 252)',
        'muted-foreground': 'rgb(100 116 139)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      // Minimum touch targets for motor accessibility
      minHeight: {
        '44': '44px', // WCAG 2.5.5 target size
      },
      minWidth: {
        '44': '44px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        // Existing animations
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        
        // Enhanced micro-interactions
        'button-press': 'buttonPress 0.1s ease-out',
        'gentle-bounce': 'gentleBounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
        
        // Message and chat animations
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'message-appear': 'messageAppear 0.4s ease-out',
        'typing-indicator': 'typingIndicator 1.4s ease-in-out infinite',
        
        // Modal and component transitions
        'modal-enter': 'modalEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'modal-exit': 'modalExit 0.2s ease-in',
        'sidebar-expand': 'sidebarExpand 0.25s ease-out',
        'sidebar-collapse': 'sidebarCollapse 0.25s ease-in',
        
        // Loading and progress animations
        'skeleton-pulse': 'skeletonPulse 1.5s ease-in-out infinite',
        'spinner': 'spinner 1s linear infinite',
      },
      keyframes: {
        // Existing keyframes
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        
        // Enhanced micro-interaction keyframes
        buttonPress: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.95)' },
        },
        gentleBounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        
        // Message and chat keyframes
        slideInRight: {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        messageAppear: {
          '0%': { transform: 'translateY(20px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        typingIndicator: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' },
        },
        
        // Modal and component keyframes
        modalEnter: {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(10px) scale(0.95)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)' 
          },
        },
        modalExit: {
          '0%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)' 
          },
          '100%': { 
            opacity: '0', 
            transform: 'translateY(-10px) scale(0.95)' 
          },
        },
        sidebarExpand: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        sidebarCollapse: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
        
        // Loading and progress keyframes
        skeletonPulse: {
          '0%': { backgroundColor: 'rgb(229, 231, 235)' },
          '50%': { backgroundColor: 'rgb(209, 213, 219)' },
          '100%': { backgroundColor: 'rgb(229, 231, 235)' },
        },
        spinner: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      transitionTimingFunction: {
        'bounce-gentle': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-in-back': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
      },
      // Focus ring and outline for keyboard navigation
      ringColor: {
        a11y: '#3b82f6', // 4.5:1 contrast ratio
      },
      ringWidth: {
        '2': '2px', // Visible focus indicator
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        // High contrast mode utilities
        '.high-contrast': {
          'border-color': '#000 !important',
          'background-color': '#fff !important',
          'color': '#000 !important',
        },
        '.high-contrast-inverse': {
          'border-color': '#fff !important',
          'background-color': '#000 !important',
          'color': '#fff !important',
        },
        // Enhanced focus ring
        '.focus-ring-a11y': {
          'outline': '2px solid #3b82f6 !important',
          'outline-offset': '2px !important',
        },
        // Skip links focus styles
        '.skip-link-focus': {
          'position': 'static !important',
          'width': 'auto !important',
          'height': 'auto !important',
          'margin': '0 !important',
          'overflow': 'visible !important',
          'clip': 'auto !important',
          'white-space': 'normal !important',
          'background': '#fff !important',
          'color': '#000 !important',
          'padding': '0.5rem !important',
          'border-radius': '0.25rem !important',
          'box-shadow': '0 0 0 2px #3b82f6 !important',
          'z-index': '50 !important',
        },
      })
    },
  ],
}
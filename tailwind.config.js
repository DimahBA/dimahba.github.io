/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./static/**/*.js",
    "./*.js", // Add this to include your JS files
  ],
  theme: {
    extend: {
      colors: {
        'green-background': '#CDD8B7',
        'beige': '#FFFBDD',
        'off-white': '#FFFDEF',
        'off-white-200': '#FFF1C8',
        'white': '#FFFDEF',
        'yellow': '#FCE8A9',
        'yellow-200': '#FCDE6E',
        'orange': '#F7CFAF',
        'orange-200': '#DB9369',
        'brown': "#DDBEA9",
        'brown-200': '#D4A27F',
        'green': '#E5EBBD',
        'green-200': '#ADBA84',
        'blue-200': '#79C0CF',
        'blue': '#ACE3EB',
        'pink-200': '#D99DAE',
      },
      fontFamily: {
        'serif': ['Podkova', 'serif'],
      },
      fontWeight: {
        'regular': 400,
        'medium': 500,
        'semibold': 600,
        'bold': 700,
      },
      keyframes: {
        'accelerated-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'pattern-move': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '64px 64px' }
        },
        'pattern-move-slow': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '128px 128px' }
        },
        pop: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'strong-pop': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '80%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'quick-pop': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '70%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'smooth-appear': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-150%)' },
          '100%': { transform: 'translateX(150%)' },
        },
        'text-shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'accelerated-spin': 'accelerated-spin 1s cubic-bezier(0.4, 0, 0.2, 1)',
        'linear-spin': 'accelerated-spin 2s linear infinite',
        'pattern-diagonal': 'pattern-move 4s linear infinite',
        'pattern-diagonal-slow': 'pattern-move-slow 8s linear infinite',
        'pop': 'pop 0.5s ease-out forwards',
        'strong-pop': 'strong-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'quick-pop': 'quick-pop 0.3s ease-out forwards',
        'smooth-appear': 'smooth-appear 0.5s ease-out forwards',
        'pop-out': 'pop-out 0.4s ease-out forwards',
        'shimmer': 'shimmer 2.5s infinite',
        'text-shimmer': 'text-shimmer 2.8s infinite linear',
      },

      backgroundImage: {
        'pattern': "url(\"data:image/svg+xml,%3Csvg width='64' height='64' viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 16c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0-2c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zm33.414-6l5.95-5.95L45.95.636 40 6.586 34.05.636 32.636 2.05 38.586 8l-5.95 5.95 1.414 1.414L40 9.414l5.95 5.95 1.414-1.414L41.414 8zM40 48c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0-2c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zM9.414 40l5.95-5.95-1.414-1.414L8 38.586l-5.95-5.95L.636 34.05 6.586 40l-5.95 5.95 1.414 1.414L8 41.414l5.95 5.95 1.414-1.414L9.414 40z' fill='%23ddbea9' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
} 
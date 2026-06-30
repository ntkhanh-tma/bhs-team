/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F7DF3',
        accent: '#7CC9A7',
        holiday: '#F7C873',
        'your-days': '#B48CF2',
      },
    },
  },
  plugins: [],
};

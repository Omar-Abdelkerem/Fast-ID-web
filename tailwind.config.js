// Design tokens come from the design deck (navy and blue). The token names stay the same as in the work package.
export default {
  // the "dark" class on <html> switches the theme (see src/components/Switchers.jsx)
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        espresso: "#232963", // deck Navy: headings, sidebar, strong text
        cream: "#F4F5FA", // deck Page: page background
        beige: "#E8F0FE", // deck Sky: light tints
        terracotta: "#4966F0", // deck Blue: accents
        "terracotta-dark": "#4966F0", // deck Blue: buttons and links (white text passes contrast)
        tan: "#6F7391", // deck Muted
        muted: "#6F7391",
        line: "#DDE1F0",
        success: "#2F7D5B",
        danger: "#B3372F",
        warning: "#A9710F",
      },
      fontFamily: {
        sans: ["Cairo", "Poppins", "sans-serif"],
        heading: ["Poppins", "Cairo", "sans-serif"],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Fast ID Case Study Design System (Navy & Royal Blue)
        navy: "#232963",
        "navy-dark": "#191E4D",
        blue: "#4966F0",
        "blue-dark": "#3A54D8",
        sky: "#E8F0FE",
        page: "#F4F5FA",
        muted: "#6F7391",
        line: "#E2E6F3",
        success: "#2F7D5B",
        "success-dark": "#236347",
        "success-bg": "#E6F4EE",
        warning: "#A9710F",
        "warning-dark": "#8B5B09",
        "warning-bg": "#FEF6E4",
        info: "#3A54D8",
        "info-bg": "#E8F0FE",
        danger: "#B3372F",
        "danger-bg": "#FDECEB",

        // Backward-compatible semantic aliases for teammate feature modules (§4.7)
        espresso: "#232963",
        cream: "#F4F5FA",
        terracotta: "#4966F0",
        "terracotta-dark": "#3A54D8",
        tan: "#6F7391",
        beige: "#E8F0FE",
      },
      fontFamily: {
        sans: ["Cairo", "system-ui", "-apple-system", "sans-serif"],
        heading: ["Readex Pro", "Cairo", "system-ui", "sans-serif"],
        serif: ["Readex Pro", "Cairo", "system-ui", "sans-serif"],
        arabic: ["Cairo", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #232963 0%, #34449E 55%, #4966F0 100%)",
      },
      boxShadow: {
        card: "0 1px 3px rgba(35, 41, 99, 0.06), 0 1px 2px rgba(35, 41, 99, 0.04)",
      },
    },
  },
  plugins: [],
};

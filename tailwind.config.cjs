module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "rgb(var(--pasadena-cream, 250 247 242) / <alpha-value>)",
        sand: "rgb(var(--pasadena-sand, 243 235 223) / <alpha-value>)",
        linen: "rgb(var(--pasadena-linen, 230 218 202) / <alpha-value>)",
        walnut: "rgb(var(--pasadena-walnut, 59 46 35) / <alpha-value>)",
        ink: "rgb(var(--pasadena-ink, 34 27 20) / <alpha-value>)",
        stone: "rgb(var(--pasadena-stone, 110 97 85) / <alpha-value>)",
        brass: "rgb(var(--pasadena-brass, 154 107 52) / <alpha-value>)",
        "brass-deep":
          "rgb(var(--pasadena-brass-deep, 122 83 39) / <alpha-value>)",
        sage: "rgb(var(--pasadena-sage, 111 122 95) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(34,27,20,.04), 0 12px 32px -18px rgba(34,27,20,.35)",
        lift: "0 2px 4px rgba(34,27,20,.05), 0 24px 48px -24px rgba(34,27,20,.45)",
      },
      maxWidth: { content: "1240px" },
    },
  },
};

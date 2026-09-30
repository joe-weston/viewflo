module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF7F2",
        sand: "#F3EBDF",
        linen: "#E6DACA",
        walnut: "#3B2E23",
        ink: "#221B14",
        stone: "#6E6155",
        brass: "#9A6B34",
        "brass-deep": "#7A5327",
        sage: "#6F7A5F",
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

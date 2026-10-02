import React from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "dark",
  className = "",
}: Props) {
  const isLight = tone === "light";
  return (
    <div
      className={`${align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`}
    >
      {eyebrow && (
        <p
          className={`text-[0.72rem] uppercase tracking-[0.2em] ${isLight ? "text-linen/70" : "text-brass"}`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`mt-3 font-display text-3xl font-semibold leading-[1.15] md:text-[2.6rem] ${isLight ? "text-cream" : "text-ink"}`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 text-base leading-relaxed ${isLight ? "text-cream/75" : "text-stone"}`}
        >
          {description}
        </p>
      )}
    </div>
  );
}


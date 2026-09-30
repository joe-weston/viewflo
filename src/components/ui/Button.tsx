import React from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-brass text-cream hover:bg-brass-deep shadow-[0_10px_24px_-14px_rgba(122,83,39,0.9)]",
  secondary:
    "border border-walnut/25 bg-transparent text-walnut hover:border-walnut/60 hover:bg-walnut/5",
  ghost: "text-walnut hover:bg-walnut/5",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-[0.95rem]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type LinkProps = CommonProps & { href: string };

export function Button(props: ButtonProps | LinkProps) {
  const {
    variant = "primary",
    size = "md",
    className = "",
    children,
    ...rest
  } = props as CommonProps & Record<string, unknown>;

  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (typeof (props as LinkProps).href === "string") {
    const { href, ...linkRest } = rest as { href: string };
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}


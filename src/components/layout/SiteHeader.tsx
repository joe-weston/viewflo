"use client";
import React, { useState } from "react";
import Link from "next/link";
import { MenuIcon, PhoneIcon, XIcon } from "lucide-react";
import { Button } from "../ui/Button";

const navItems = [
  { label: "Services", to: "/pasadena-shades-and-shutters/#services" },
  { label: "Project Gallery", to: "/pasadena-shades-and-shutters/gallery" },
  { label: "How It Works", to: "/pasadena-shades-and-shutters/#process" },
  { label: "Service Area", to: "/pasadena-shades-and-shutters/#service-area" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      className="sticky top-0 z-40 border-b border-linen/80 bg-cream/95 backdrop-blur"
    >
      <div className="hidden bg-walnut text-cream md:block">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-2 text-[0.78rem]">
          <p className="tracking-wide text-cream/80">
            Owned &amp; run by Robin Alvarez · 25 years of interior design in
            Los Angeles
          </p>
          <a
            href="tel:+18186185288"
            className="flex items-center gap-2 font-medium text-cream transition-colors duration-150 ease-out hover:text-linen"
          >
            <PhoneIcon className="h-3.5 w-3.5" aria-hidden="true" />
            818-618-5288
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-5 py-4 md:px-6">
        <Link href="/pasadena-shades-and-shutters/" className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-md bg-walnut"
          >
            <span className="flex h-5 w-5 flex-col justify-between">
              <span className="block h-[2px] w-full rounded-full bg-linen" />
              <span className="block h-[2px] w-full rounded-full bg-linen/70" />
              <span className="block h-[2px] w-full rounded-full bg-linen/45" />
              <span className="block h-[2px] w-full rounded-full bg-linen/25" />
            </span>
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold text-ink">
              Pasadena Shades &amp; Shutters
            </span>
            <span className="hidden text-[0.7rem] uppercase tracking-[0.18em] text-stone sm:block">
              Custom window treatments
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.to}
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-stone transition-colors duration-150 ease-out hover:bg-sand hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <Button href="/pasadena-shades-and-shutters/send-photos" variant="secondary">
            Send photos
          </Button>
          <Button href="/pasadena-shades-and-shutters/consultation">Request a Consultation</Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-controls="mobile-menu"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-linen text-walnut xl:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <XIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <MenuIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          onClick={() => setOpen(false)}
          className="border-t border-linen bg-cream px-5 pb-6 pt-4 xl:hidden"
        >
          <nav className="flex flex-col" aria-label="Mobile">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.to}
                className="border-b border-linen/70 py-3 font-display text-lg text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-3">
            <Button href="/pasadena-shades-and-shutters/consultation" size="lg">
              Request a Consultation
            </Button>
            <Button href="/pasadena-shades-and-shutters/send-photos" variant="secondary" size="lg">
              Send Photos of Your Windows
            </Button>
            <a
              href="tel:+18186185288"
              className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-walnut"
            >
              <PhoneIcon className="h-4 w-4" aria-hidden="true" />
              818-618-5288
            </a>
          </div>
        </div>
      )}
    </header>
  );
}


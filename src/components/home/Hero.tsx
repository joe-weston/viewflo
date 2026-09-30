"use client";
import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";
import { ArrowRightIcon, CameraIcon } from "lucide-react";
import { Button } from "../ui/Button";

const easing = [0.23, 1, 0.32, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-content items-center gap-10 px-5 pb-14 pt-10 md:px-6 md:pb-20 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
        >
          <p className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-brass">
            <span className="h-px w-8 bg-brass/50" aria-hidden="true" />
            Pasadena · With Robin Alvarez
          </p>

          <h1 className="mt-5 font-display text-[2.35rem] font-semibold leading-[1.08] text-ink sm:text-5xl lg:text-[3.6rem]">
            Custom window treatments, designed for your home and installed by a
            trusted local expert.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone">
            Shutters, shades, blinds, drapery, and motorized treatments —
            designed and measured by Robin Alvarez, an interior designer of 25
            years, then installed by the same professional crew she has worked
            with for years. Free in-home consultation across the Los Angeles
            area.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/pasadena-shades-and-shutters/consultation" size="lg">
              Request a Consultation
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button href="/pasadena-shades-and-shutters/send-photos" variant="secondary" size="lg">
              <CameraIcon className="h-4 w-4" aria-hidden="true" />
              Send Photos of Your Windows
            </Button>
          </div>

          <p className="mt-7 text-sm text-stone">
            Personal design guidance · Free in-home consultation
          </p>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: easing, delay: 0.08 }}
          className="relative"
        >
          <div className="overflow-hidden rounded-[1.75rem] bg-sand shadow-lift">
            <Image
              preload
              width={1200}
              height={900}
              src="/818aaed5-2de2-408a-9918-b48936405ebb.jpg"
              alt="Pasadena craftsman living room with custom white plantation shutters filtering afternoon light"
              className="h-[22rem] w-full object-cover sm:h-[26rem] lg:h-[34rem]"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-linen bg-white/80 p-4 shadow-card sm:absolute sm:-bottom-6 sm:-left-6 sm:mt-0 sm:max-w-[17rem] sm:bg-cream">
            <p className="font-display text-sm font-semibold text-ink">
              Window treatments, made personal
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone">
              Explore materials, light control, and finishes for your home.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


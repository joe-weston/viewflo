"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MinusIcon, PlusIcon } from "lucide-react";
import { faqs } from "../../data/content";
import { SectionHeading } from "../ui/SectionHeading";

const easing = [0.23, 1, 0.32, 1] as const;

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  useEffect(() => {
    const openChoosing = () => {
      if (window.location.hash === "#choosing-treatments") setOpenIndex(2);
    };
    openChoosing();
    window.addEventListener("hashchange", openChoosing);
    return () => window.removeEventListener("hashchange", openChoosing);
  }, []);

  return (
    <section id="faq" className="scroll-mt-28 bg-cream">
      <div className="mx-auto grid max-w-content gap-10 px-5 py-16 md:px-6 md:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionHeading
          eyebrow="Questions"
          title="The things people ask before they call"
        />

        <div>
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                id={index === 2 ? "choosing-treatments" : undefined}
                className="scroll-mt-28 border-b border-linen"
              >
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="font-display text-lg font-medium text-ink">
                      {faq.question}
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-linen text-walnut">
                      {isOpen ? (
                        <MinusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: easing }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pr-12 text-[0.95rem] leading-relaxed text-stone">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import React from "react";
import { processSteps } from "../../data/content";
import { SectionHeading } from "../ui/SectionHeading";

export function Process() {
  return (
    <div id="process" className="scroll-mt-28">
      <section id="how_it_works" className="scroll-mt-28 bg-cream">
        <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-24">
          <SectionHeading
            eyebrow="How it works"
            title="Four steps, one person, start to finish"
            description="A personal conversation about your windows, from your first photos to installation planning."
          />

          <ol className="mt-12 grid gap-y-10 md:grid-cols-2 md:gap-x-12 lg:grid-cols-4 lg:gap-x-8">
            {processSteps.map((step, index) => (
              <li key={step.number} className="relative flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-semibold text-brass">
                    {step.number}
                  </span>
                  <span className="h-px flex-1 bg-linen" aria-hidden="true" />

                  {index === processSteps.length - 1 && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-brass"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-stone">
                  {step.description}
                </p>
                <p className="mt-auto pt-4 text-xs uppercase tracking-[0.14em] text-stone/70">
                  {step.duration}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

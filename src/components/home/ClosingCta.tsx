import React from "react";
import { ArrowRightIcon, CameraIcon, PhoneIcon } from "lucide-react";
import { TenantLink as Link } from "../TenantLink";
import { Button } from "../ui/Button";

export function ClosingCta() {
  return (
    <section className="bg-walnut">
      <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <h2 className="max-w-2xl font-display text-3xl font-semibold leading-[1.15] text-cream md:text-[2.6rem]">
              Start with a design consultation — or just send us photos and skip
              the appointment.
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-cream/70">
              Send photos of your windows to request a quote. Robin can review
              your project and discuss the next steps with you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href="/pasadena-shades-and-shutters/consultation"
                size="lg"
                className="!bg-cream !text-walnut hover:!bg-linen"
              >
                Request a Consultation
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Link
                href="/pasadena-shades-and-shutters/photo-intake"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-cream/35 px-7 py-3.5 text-[0.95rem] font-medium text-cream transition-colors duration-150 ease-out hover:border-cream/80"
              >
                <CameraIcon className="h-4 w-4" aria-hidden="true" />
                Send Photos of Your Windows
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-cream/15 p-6">
            <p className="text-[0.72rem] uppercase tracking-[0.2em] text-linen/60">
              Prefer to talk?
            </p>
            <a
              href="tel:+18186185288"
              className="mt-3 flex items-center gap-3 font-display text-2xl font-semibold text-cream transition-colors duration-150 ease-out hover:text-linen"
            >
              <PhoneIcon className="h-5 w-5" aria-hidden="true" />
              818-618-5288
            </a>
            <p className="mt-3 text-sm leading-relaxed text-cream/60">
              Call to discuss your windows or arrange an in-home consultation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

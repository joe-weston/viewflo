import { TenantLink as Link } from "../components/TenantLink";
import { PhoneIcon, CameraIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "../components/ui/Button";
import { LeadForm } from "../components/leads/LeadForm";
export function Consultation() {
  return (
    <section className="mx-auto max-w-content px-5 py-14 md:px-6 md:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm uppercase tracking-widest text-brass">
            Let&apos;s talk about your windows
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
            Request a consultation
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone">
            Explore materials, colors, privacy, and light control with Robin
            Alvarez. Call to discuss your project and request details about an
            in-home consultation.
          </p>
          <p className="mt-5 leading-relaxed text-stone">
            Your appointment is confirmed when you speak with us. Have window
            photos ready? You can also{" "}
            <Link
              className="underline underline-offset-4"
              href="/pasadena-shades-and-shutters/photo-intake"
            >
              send photos to request a quote
            </Link>
            .
          </p>
        </div>
        <div className="min-w-0 space-y-6">
          <LeadForm kind="consultation" />
          <div className="rounded-3xl border border-linen bg-white p-7 shadow-card md:p-10">
            <PhoneIcon aria-hidden className="h-8 w-8 text-brass" />
            <h2 className="mt-5 font-display text-2xl">
              Talk with Pasadena Shades &amp; Shutters
            </h2>
            <a
              href="tel:+18186185288"
              className="mt-6 flex items-center justify-center gap-3 rounded-full bg-brass px-6 py-4 text-lg font-medium text-cream hover:bg-brass-deep"
            >
              818-618-5288
              <ArrowRightIcon aria-hidden className="h-5 w-5" />
            </a>
            <p className="mt-5 leading-relaxed text-stone">
              Let us know your location, the rooms you are working on, and the
              types of window treatments you have in mind.
            </p>
            <div className="mt-7 border-t border-linen pt-7">
              <Button
                href="/pasadena-shades-and-shutters/photo-intake"
                variant="secondary"
                className="w-full"
              >
                <CameraIcon aria-hidden className="h-4 w-4" />
                Send Photos of Your Windows
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

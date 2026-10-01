import { LeadForm } from "../components/leads/LeadForm";
export function PhotoIntake() {
  return (
    <section className="mx-auto max-w-content px-5 py-12 md:px-6 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-12">
        <div>
          <p className="text-xs uppercase tracking-widest text-brass">
            Start with a photo
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
            Send photos of your windows
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone">
            Share your windows, room, and project ideas. Robin will review your
            request and discuss products and next steps with you.
          </p>
          <ul className="mt-7 space-y-4 text-stone">
            <li>Include the whole window and a little surrounding wall.</li>
            <li>Daytime shots help us see the light and trim.</li>
            <li>Tell us about arches, deep sills, or hard-to-reach windows.</li>
          </ul>
          <div className="mt-8 rounded-2xl border border-linen bg-sand p-6">
            <h2 className="font-display text-xl">What happens next</h2>
            <p className="mt-3 leading-relaxed text-stone">
              Your photos are stored privately for project review. We will send
              a confirmation email and contact you about options. Final pricing
              may require measurements and product selections.
            </p>
            <p className="mt-4 text-stone">
              Prefer to talk?{" "}
              <a
                href="tel:+18186185288"
                className="underline underline-offset-4"
              >
                818-618-5288
              </a>
            </p>
          </div>
        </div>
        <LeadForm kind="photo_intake" />
      </div>
    </section>
  );
}

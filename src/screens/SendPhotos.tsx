"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { CameraIcon, CheckIcon, PhoneIcon } from "lucide-react";
import { Button } from "../components/ui/Button";
import { event as trackEvent } from "../components/SiteAnalytics";
import { validateContact, validatePhotos } from "../../lib/photo-validation";
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}
export function SendPhotos() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [verification, setVerification] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"editing" | "sending" | "received">(
    "editing",
  );
  const [progress, setProgress] = useState(0);
  const [reference, setReference] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const previewRef = useRef<string[]>([]);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const started = useRef(false);
  const requestIdentity = useRef<{ key: string; id: string } | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  function replacePhotos(next: File[]) {
    previewRef.current.forEach(URL.revokeObjectURL);
    const urls = next.map((p) => URL.createObjectURL(p));
    previewRef.current = urls;
    setPhotos(next);
    setPreviewUrls(urls);
  }
  useEffect(
    () => () => {
      xhrRef.current?.abort();
      previewRef.current.forEach(URL.revokeObjectURL);
      if (widgetId.current && window.turnstile)
        window.turnstile.remove(widgetId.current);
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  function renderWidget() {
    if (widget.current && window.turnstile && !widgetId.current && siteKey)
      widgetId.current = window.turnstile.render(widget.current, {
        sitekey: siteKey,
        action: "photo-quote",
        callback: (token: string) => setVerification(token),
        "expired-callback": () => setVerification(""),
        "error-callback": () =>
          setError(
            "The security check could not load. Please retry or call us.",
          ),
      });
  }
  function resetVerification() {
    setVerification("");
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    const photoError = validatePhotos(photos);
    if (photoError) {
      setError(photoError);
      return;
    }
    if (!validateContact(contact.trim())) {
      setError("Enter a valid phone number or email address.");
      return;
    }
    if (!consent) {
      setError(
        "Please confirm permission to use your photos for this request.",
      );
      return;
    }
    if (siteKey && !verification) {
      setError("Please complete the security check.");
      return;
    }
    setError("");
    setStatus("sending");
    setProgress(0);
    const body = new FormData();
    photos.forEach((p) => body.append("photos", p));
    body.append("contact", contact.trim());
    body.append("notes", notes);
    body.append("consent", "yes");
    body.append("verification", verification);
    const key = JSON.stringify([
      contact.trim(),
      notes,
      photos.map((p) => [p.name, p.size, p.lastModified]),
    ]);
    if (requestIdentity.current?.key !== key)
      requestIdentity.current = { key, id: crypto.randomUUID() };
    body.append("requestId", requestIdentity.current.id);
    body.append(
      "website",
      String(
        new FormData(e.currentTarget as HTMLFormElement).get("website") || "",
      ),
    );
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/photo-requests/");
    xhr.timeout = 45000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded / e.total) * 100));
    };
    const fail = (message: string) => {
      setStatus("editing");
      setError(message);
      trackEvent("photo_request_error");
      resetVerification();
    };
    xhr.onload = () => {
      let response: { error?: string; reference?: string } = {};
      try {
        response = JSON.parse(xhr.responseText);
      } catch {
        response = {};
      }
      if (xhr.status === 201 && response.reference) {
        setReference(response.reference);
        setStatus("received");
        replacePhotos([]);
        trackEvent("photo_request_submitted");
      } else
        fail(
          response.error ||
            "We could not send your photos. Please try again or call 818-618-5288.",
        );
    };
    xhr.onerror = () =>
      fail(
        "The connection was interrupted. Your request may not have reached us. Please call 818-618-5288 before resending.",
      );
    xhr.ontimeout = () =>
      fail(
        "The request timed out. Please call 818-618-5288 to check receipt before resending.",
      );
    xhr.send(body);
  }
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-content px-5 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div>
            <p className="text-[.72rem] uppercase tracking-[.2em] text-brass">
              Start with a photo
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">
              Send photos of your windows
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone">
              Show us your windows and request a quote. Robin will review your
              project and discuss options with you. Final pricing may require
              measurements and product selections.
            </p>
            <ul className="mt-8 space-y-4 text-stone">
              {[
                "Include the whole window and a little surrounding wall.",
                "Add one photo per window, or a wide view of the room.",
                "Tell us about arches, deep sills, or hard-to-reach windows.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckIcon
                    aria-hidden
                    className="h-5 w-5 shrink-0 text-brass"
                  />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-linen bg-sand p-5">
              <p className="flex items-center gap-2 font-medium">
                <PhoneIcon aria-hidden className="h-4 w-4" />
                Prefer to talk?
              </p>
              <a
                href="tel:+18186185288"
                className="mt-2 inline-block text-lg underline underline-offset-4"
              >
                818-618-5288
              </a>
              <p className="mt-2 text-sm text-stone">
                Call to discuss your project or request an in-home consultation.
              </p>
            </div>
          </div>
          {status === "received" ? (
            <div
              role="status"
              className="rounded-3xl border border-linen bg-white p-8 shadow-card"
            >
              <CheckIcon className="h-10 w-10 text-brass" />
              <h2 className="mt-5 font-display text-3xl">
                Your photo request is saved
              </h2>
              <p className="mt-4 text-stone">
                Thank you. Your photos and contact details have been received
                for review. This is a quote request, not a confirmed appointment
                or final price.
              </p>
              <p className="mt-4 break-all text-sm text-stone">
                Reference: {reference}
              </p>
              <div className="mt-8">
                <Button href="/pasadena-shades-and-shutters/gallery">Explore local projects</Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={submit}
              noValidate
              className="rounded-3xl border border-linen bg-white p-6 shadow-card md:p-9"
              onFocus={() => {
                if (!started.current) {
                  started.current = true;
                  trackEvent("photo_request_started");
                }
              }}
            >
              <fieldset disabled={status === "sending"} className="min-w-0">
                <legend className="sr-only">Photo quote request</legend>
                <label htmlFor="photos" className="block font-medium">
                  Your window photos
                </label>
                <p id="photo-help" className="mt-2 text-sm text-stone">
                  1–3 JPG or PNG photos, up to 1 MB each. Convert HEIC photos to
                  JPG first.
                </p>
                <div className="mt-4 rounded-2xl border border-dashed border-linen p-5">
                  <CameraIcon aria-hidden className="mb-3 h-7 w-7 text-brass" />
                  <input
                    id="photos"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png"
                    aria-describedby="photo-help"
                    className="block w-full min-w-0 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-sand file:px-4 file:py-3 file:text-ink"
                    onChange={(e) => {
                      const chosen = Array.from(e.target.files || []);
                      const issue = validatePhotos(chosen);
                      if (issue) {
                        setError(issue);
                        e.target.value = "";
                        return;
                      }
                      replacePhotos(chosen);
                      setError("");
                    }}
                  />
                  {photos.length > 0 && (
                    <ul className="mt-4 grid gap-3">
                      {photos.map((photo, i) => (
                        <li
                          key={`${photo.name}-${i}`}
                          className="flex min-w-0 items-center gap-3 rounded-xl bg-sand p-2"
                        >
                          {previewUrls[i] && (
                            <img
                              src={previewUrls[i]}
                              alt={`Selected window photo ${i + 1}`}
                              className="h-14 w-14 rounded-lg object-cover"
                            />
                          )}
                          <span className="min-w-0 flex-1 break-all text-xs">
                            {photo.name}
                          </span>
                          <button
                            type="button"
                            className="min-h-11 px-2 text-sm underline"
                            aria-label={`Remove photo ${i + 1}`}
                            onClick={() =>
                              replacePhotos(photos.filter((_, n) => n !== i))
                            }
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <label
                  htmlFor="photo-contact"
                  className="mt-7 block font-medium"
                >
                  Phone or email
                </label>
                <input
                  id="photo-contact"
                  autoComplete="email"
                  value={contact}
                  maxLength={254}
                  onChange={(e) => setContact(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-linen p-3"
                  required
                />
                <label htmlFor="photo-notes" className="mt-7 block font-medium">
                  What are you hoping to do?{" "}
                  <span className="text-sm font-normal text-stone">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="photo-notes"
                  value={notes}
                  maxLength={2000}
                  rows={4}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-linen p-3"
                />
                <div hidden>
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-stone">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  I have permission to share these photos and agree that
                  Pasadena Shades &amp; Shutters may use them and my contact
                  details to respond to this request.
                </label>
                <p className="mt-3 text-xs leading-relaxed text-stone">
                  Please include only your windows; avoid people or sensitive
                  documents. Photos are stored privately for project review.{" "}
                  <Link href="/pasadena-shades-and-shutters/privacy.php" className="underline">
                    Privacy policy
                  </Link>
                  .
                </p>
                {siteKey && (
                  <>
                    <Script
                      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                      onReady={renderWidget}
                    />
                    <div className="mt-5" ref={widget} />
                  </>
                )}
                <Button type="submit" size="lg" className="mt-7 w-full">
                  {status === "sending"
                    ? "Sending your request…"
                    : "Send photos to request a quote"}
                </Button>
              </fieldset>
              {status === "sending" && (
                <div role="status" className="mt-4">
                  <label
                    htmlFor="upload-progress"
                    className="text-sm text-stone"
                  >
                    {progress < 100
                      ? `Uploading photos — ${progress}%`
                      : "Saving your request…"}
                  </label>
                  <progress
                    id="upload-progress"
                    max={100}
                    value={progress}
                    className="mt-2 w-full"
                  />
                </div>
              )}
              {error && (
                <p
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
                >
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}


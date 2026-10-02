"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { trackPasadena } from "../PasadenaAnalytics";
import Link from "next/link";
import { CameraIcon, CheckIcon } from "lucide-react";
import { Button } from "../ui/Button";
import {
  cities,
  projectTypes,
  timelines,
  validateLead,
  windowCounts,
  type LeadDetails,
  type LeadKind,
} from "../../../lib/lead-fields";
import { validatePhotos } from "../../../lib/photo-validation";
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
const emptyDetails: LeadDetails = {
  projectTypes: [],
  windowCount: "",
  timeline: "",
  city: "",
};
const inputClass =
  "mt-2 w-full min-w-0 rounded-xl border border-linen bg-white p-3 text-ink focus-visible:outline-brass";
const labels: Record<string, string> = {
  shutters: "Shutters",
  shades: "Shades",
  blinds: "Blinds",
  drapery: "Drapery",
  motorized: "Motorized",
  "not-sure": "Not sure yet",
};
function Choices({
  title,
  value,
  values,
  onChange,
  required = false,
}: {
  title: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="font-medium">
        {title}
        {!required && (
          <span className="ml-1 text-sm font-normal text-stone">
            (optional)
          </span>
        )}
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {values.map((option) => (
          <label
            key={option}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${value === option ? "border-brass bg-sand" : "border-linen bg-white"}`}
          >
            <input
              type="radio"
              name={title}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function LeadForm({ kind }: { kind: LeadKind }) {
  const consultation = kind === "consultation";
  const [details, setDetails] = useState<LeadDetails>(emptyDetails);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [verification, setVerification] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"editing" | "sending" | "received">(
    "editing",
  );
  const [progress, setProgress] = useState(0);
  const [receipt, setReceipt] = useState<{
    reference: string;
    emailStatus: "sent" | "queued";
  } | null>(null);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const identity = useRef<{ key: string; id: string } | null>(null);
  const previewRef = useRef<string[]>([]);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const stepRef = useRef<HTMLHeadingElement>(null);
  const receiptRef = useRef<HTMLHeadingElement>(null);
  const sending = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const showSecurity = (!consultation || step === 2) && status !== "received";
  const phoneError = error === "Enter a valid phone number.";
  useEffect(
    () => () => {
      xhr.current?.abort();
      previewRef.current.forEach(URL.revokeObjectURL);
    },
    [],
  );
  useEffect(() => {
    if (phoneError) {
      phoneRef.current?.focus({ preventScroll: true });
      phoneRef.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    } else if (error) errorRef.current?.focus();
  }, [error, phoneError]);
  useEffect(() => {
    if (consultation && step > 0) stepRef.current?.focus();
  }, [step, consultation]);
  useEffect(() => {
    if (status === "received") {
      receiptRef.current?.focus({ preventScroll: true });
      receiptRef.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    }
  }, [status]);
  useEffect(() => {
    if (
      !scriptReady ||
      !siteKey ||
      !showSecurity ||
      !widget.current ||
      !window.turnstile
    )
      return;
    widgetId.current = window.turnstile.render(widget.current, {
      sitekey: siteKey,
      action: "lead-intake",
      callback: (token: string) => setVerification(token),
      "expired-callback": () => setVerification(""),
      "error-callback": () =>
        setError(
          "The security check could not load. Please retry or call 818-618-5288.",
        ),
    });
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [scriptReady, siteKey, showSecurity]);
  function replacePhotos(next: File[]) {
    previewRef.current.forEach(URL.revokeObjectURL);
    previewRef.current = next.map((photo) => URL.createObjectURL(photo));
    setPreviews(previewRef.current);
    setPhotos(next);
  }
  function setDetail(key: keyof LeadDetails, value: string | string[]) {
    setDetails((current) => ({ ...current, [key]: value }));
  }
  function nextStep() {
    if (
      step === 0 &&
      (!details.projectTypes.length ||
        !details.windowCount ||
        !details.timeline)
    ) {
      setError("Choose a project type, window count, and timeline.");
      return;
    }
    if (step === 1 && !details.city) {
      setError("Choose your city.");
      return;
    }
    setError("");
    setStep(step + 1);
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    if (consultation && step < 2) {
      nextStep();
      return;
    }
    const photoIssue =
      !consultation || photos.length ? validatePhotos(photos) : null;
    if (photoIssue) {
      setError(photoIssue);
      return;
    }
    const issue = validateLead({
      id: identity.current?.id || crypto.randomUUID(),
      kind,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      details,
      sourcePath: "",
      consentAt: "",
    });
    if (issue) {
      setError(issue);
      return;
    }
    if (!consent) {
      setError(
        "Please confirm permission to respond to your request and use any photos.",
      );
      return;
    }
    if (siteKey && !verification) {
      setError("Please complete the security check.");
      return;
    }
    const key = JSON.stringify([
      kind,
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      notes.trim(),
      details,
      photos.map((p) => [p.name, p.size, p.lastModified]),
    ]);
    if (identity.current?.key !== key)
      identity.current = { key, id: crypto.randomUUID() };
    const body = new FormData();
    Object.entries({
      requestId: identity.current.id,
      kind,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      details: JSON.stringify(details),
      consent: "yes",
      verification,
      website: String(new FormData(event.currentTarget).get("website") || ""),
    }).forEach(([key, value]) => body.append(key, value));
    photos.forEach((photo) => body.append("photos", photo));
    sending.current = true;
    setStatus("sending");
    setError("");
    setProgress(0);
    const request = new XMLHttpRequest();
    xhr.current = request;
    request.open("POST", "/api/leads/");
    request.timeout = 65000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        setProgress(Math.round((event.loaded / event.total) * 100));
    };
    const fail = (message: string) => {
      sending.current = false;
      setStatus("editing");
      setError(message);
      setVerification("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    };
    request.onload = () => {
      let response: {
        reference?: string;
        error?: string;
        emailStatus?: "sent" | "queued";
      } = {};
      try {
        response = JSON.parse(request.responseText);
      } catch {
        /* Show a safe fallback. */
      }
      if (request.status === 201 && response.reference) {
        setReceipt({
          reference: response.reference,
          emailStatus: response.emailStatus === "sent" ? "sent" : "queued",
        });
        trackPasadena(
          consultation ? "consultation_submitted" : "photo_submitted",
        );
        setStatus("received");
        replacePhotos([]);
      } else
        fail(
          response.error ||
            "We could not confirm receipt. Retry with the same form or call 818-618-5288.",
        );
    };
    request.onerror = request.ontimeout = () =>
      fail(
        "The connection was interrupted. Your request may already be saved. Retry without changing the form or call 818-618-5288 to check receipt.",
      );
    request.send(body);
  }
  const projectFields = (
    <div className="space-y-7">
      <fieldset>
        <legend className="font-medium">
          What are you thinking about?{!consultation && " (optional)"}
        </legend>
        <p className="mt-1 text-sm text-stone">Select all that apply.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {projectTypes.map((value) => (
            <label
              key={value}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${details.projectTypes.includes(value) ? "border-brass bg-sand" : "border-linen"}`}
            >
              <input
                type="checkbox"
                checked={details.projectTypes.includes(value)}
                onChange={() =>
                  setDetail(
                    "projectTypes",
                    details.projectTypes.includes(value)
                      ? details.projectTypes.filter((v) => v !== value)
                      : [...details.projectTypes, value],
                  )
                }
              />
              {labels[value]}
            </label>
          ))}
        </div>
      </fieldset>
      <Choices
        title="How many windows?"
        value={details.windowCount}
        values={windowCounts}
        onChange={(v) => setDetail("windowCount", v)}
        required={consultation}
      />
      <Choices
        title="What's your timeline?"
        value={details.timeline}
        values={timelines}
        onChange={(v) => setDetail("timeline", v)}
        required={consultation}
      />
    </div>
  );
  const photoFields = (
    <div>
      <label htmlFor="photos" className="block font-medium">
        Your window photos{" "}
        {consultation && (
          <span className="font-normal text-sm text-stone">(optional)</span>
        )}
      </label>
      <p id="photo-help" className="mt-2 text-sm text-stone">
        {consultation ? "Up to 3" : "1–3"} JPG or PNG photos, up to 1 MB each.
        Convert HEIC to JPG first.
      </p>
      <div className="mt-4 rounded-2xl border border-dashed border-linen p-4">
        <CameraIcon aria-hidden className="mb-3 h-6 w-6 text-brass" />
        <input
          id="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png"
          aria-describedby="photo-help"
          className="block w-full min-w-0 text-sm file:mr-2 file:rounded-full file:border-0 file:bg-sand file:px-4 file:py-3"
          onChange={(event) => {
            const next = Array.from(event.target.files || []);
            const issue = next.length ? validatePhotos(next) : null;
            if (issue) {
              setError(issue);
              event.target.value = "";
              return;
            }
            replacePhotos(next);
            // Retain Files in state; clear the picker so removing and selecting
            // the same file again still produces a change event.
            event.target.value = "";
            setError("");
          }}
        />
        {photos.length > 0 && (
          <ul className="mt-4 grid gap-3">
            {photos.map((photo, index) => (
              <li
                key={`${photo.name}-${index}`}
                className="flex min-w-0 items-center gap-3 rounded-xl bg-sand p-2"
              >
                {/* Local object URLs never leave the visitor's browser. */}
                <img
                  src={previews[index]}
                  alt={`Selected window photo ${index + 1}`}
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1 break-all text-xs">
                  {photo.name}
                </span>
                <button
                  type="button"
                  className="min-h-11 p-2 text-sm underline"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() =>
                    replacePhotos(photos.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
  const detailFields = (
    <div className="space-y-7">
      <Choices
        title="Which city is the home in?"
        value={details.city}
        values={cities}
        onChange={(v) => setDetail("city", v)}
        required={consultation}
      />
      {consultation && photoFields}
      <label className="block font-medium" htmlFor="lead-notes">
        Anything else we should know?{" "}
        <span className="text-sm font-normal text-stone">(optional)</span>
        <textarea
          id="lead-notes"
          className={inputClass}
          rows={4}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
    </div>
  );
  const contactFields = (
    <div className="space-y-5">
      <label className="block font-medium" htmlFor="lead-name">
        Your full name
        <input
          id="lead-name"
          name="name"
          className={inputClass}
          value={name}
          maxLength={100}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <div>
        <label className="block font-medium" htmlFor="lead-phone">
          Phone number{" "}
          {!consultation && (
            <span className="text-sm font-normal text-stone">(optional)</span>
          )}
          <input
            id="lead-phone"
            ref={phoneRef}
            name="phone"
            type="tel"
            inputMode="tel"
            className={`${inputClass} ${phoneError ? "!border-red-500 !bg-red-50 focus-visible:!outline-red-700" : ""}`}
            value={phone}
            maxLength={40}
            autoComplete="tel"
            placeholder="e.g. 818-555-0100"
            aria-invalid={phoneError || undefined}
            aria-describedby={
              phoneError
                ? "lead-phone-help lead-phone-error"
                : "lead-phone-help"
            }
            onChange={(e) => setPhone(e.target.value)}
            required={consultation}
          />
        </label>
        <p id="lead-phone-help" className="mt-2 text-sm text-stone">
          Enter a phone number with area code where we can reach you.
        </p>
        {phoneError && (
          <p
            id="lead-phone-error"
            role="alert"
            className="mt-2 text-sm text-red-900"
          >
            Enter a valid phone number, including area code (e.g. 818-555-0100).
          </p>
        )}
      </div>
      <label className="block font-medium" htmlFor="lead-email">
        Email
        <input
          id="lead-email"
          name="email"
          type="email"
          className={inputClass}
          value={email}
          maxLength={254}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <p className="text-sm text-stone">
        We use your details to respond to this request and send a confirmation.
        You will not be added to a mailing list.
      </p>
      <label className="flex items-start gap-3 text-sm leading-relaxed text-stone">
        <input
          id="lead-consent"
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        I agree that Pasadena Shades &amp; Shutters may use my contact details
        to respond and confirm receipt. I have permission to share any photos
        for private project review.
      </label>
      <p className="text-xs leading-relaxed text-stone">
        Please avoid people or sensitive documents in photos.{" "}
        <Link
          className="underline"
          href="/pasadena-shades-and-shutters/privacy.php/"
        >
          Privacy policy
        </Link>
        .
      </p>
    </div>
  );
  if (status === "received" && receipt)
    return (
      <div
        role="status"
        className="rounded-3xl border border-linen bg-white p-8 shadow-card"
      >
        <CheckIcon aria-hidden className="h-10 w-10 text-brass" />
        <h2
          ref={receiptRef}
          tabIndex={-1}
          className="mt-5 scroll-mt-40 font-display text-3xl"
        >
          Your request is saved
        </h2>
        <p className="mt-4 leading-relaxed text-stone">
          Thank you. We will review your request and contact you about next
          steps. This is not a confirmed appointment.
        </p>
        <p className="mt-4 text-stone">
          {receipt.emailStatus === "sent"
            ? "A confirmation email has been sent. Please check your inbox."
            : "Your confirmation email is queued. Your request is received; you do not need to submit it again."}
        </p>
        <p className="mt-4 break-all text-sm text-stone">
          Reference: {receipt.reference}
        </p>
        <Button
          href="/pasadena-shades-and-shutters/gallery/"
          variant="secondary"
          className="mt-7"
        >
          Explore local projects
        </Button>
      </div>
    );
  return (
    <form
      onSubmit={submit}
      onChange={(event) => {
        // Clear stale validation after controlled field handlers have saved the value.
        // File selection owns its own errors and must not have them cleared here.
        if (
          !(event.target instanceof HTMLInputElement) ||
          event.target.type !== "file"
        )
          setError("");
      }}
      noValidate
      className="min-w-0 rounded-3xl border border-linen bg-white p-6 shadow-card md:p-9"
    >
      <fieldset disabled={status === "sending"} className="min-w-0">
        <legend className="sr-only">
          {consultation ? "Consultation request" : "Photo request"}
        </legend>
        {consultation && (
          <>
            <div className="mb-5 flex gap-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= step ? "bg-brass" : "bg-linen"}`}
                />
              ))}
            </div>
            <p className="text-xs uppercase tracking-widest text-stone">
              Step {step + 1} of 3
            </p>
            <h2
              ref={stepRef}
              tabIndex={-1}
              className="mb-7 mt-3 font-display text-2xl"
            >
              {["Your project", "The details", "Your info"][step]}
            </h2>
          </>
        )}
        {consultation ? (
          <>
            {step === 0 && projectFields}
            {step === 1 && detailFields}
            {step === 2 && (
              <>
                {contactFields}
                <div className="mt-6 rounded-2xl bg-sand p-4 text-sm leading-7">
                  <p>
                    Project:{" "}
                    {details.projectTypes.map((v) => labels[v]).join(", ")}
                  </p>
                  <p>
                    {details.windowCount} · {details.city}
                  </p>
                  <p>{details.timeline}</p>
                  <p>{photos.length} photos attached</p>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-7">
            {photoFields}
            {projectFields}
            {detailFields}
            {contactFields}
          </div>
        )}
        <div hidden>
          <label htmlFor="lead-website">Website</label>
          <input
            id="lead-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        {showSecurity && siteKey && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              onReady={() => setScriptReady(true)}
            />
            <div className="mt-5" ref={widget} />
          </>
        )}
        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-linen pt-6 sm:flex-row sm:justify-between">
          {consultation && step > 0 && (
            <button
              type="button"
              className="min-h-11 px-4 text-sm underline"
              onClick={() => {
                setStep(step - 1);
                setError("");
                setVerification("");
              }}
            >
              Back
            </button>
          )}
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            {status === "sending"
              ? "Sending your request…"
              : consultation && step < 2
                ? "Continue"
                : consultation
                  ? "Request my consultation"
                  : "Send photos"}
          </Button>
        </div>
      </fieldset>
      {status === "sending" && (
        <div role="status" className="mt-4">
          <label htmlFor="lead-progress" className="text-sm text-stone">
            {progress < 100
              ? `Uploading — ${progress}%`
              : "Saving your request…"}
          </label>
          <progress
            id="lead-progress"
            max={100}
            value={progress}
            className="mt-2 w-full"
          />
        </div>
      )}
      {error && !phoneError && (
        <p
          role="alert"
          ref={errorRef}
          tabIndex={-1}
          className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
        >
          {error}
        </p>
      )}
    </form>
  );
}

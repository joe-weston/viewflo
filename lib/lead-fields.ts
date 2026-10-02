export const projectTypes = [
  "shutters",
  "shades",
  "blinds",
  "drapery",
  "motorized",
  "not-sure",
] as const;
export const windowCounts = [
  "1–2 windows",
  "3–5 windows",
  "6–10 windows",
  "11–20 windows",
  "Whole home (20+)",
];
export const timelines = [
  "As soon as possible",
  "Within 1–2 months",
  "3–6 months out",
  "Just gathering ideas",
];
export const cities = [
  "Pasadena",
  "South Pasadena",
  "Glendale",
  "La Cañada Flintridge",
  "Montrose",
  "La Crescenta",
  "Burbank",
  "Toluca Lake",
  "Arcadia",
  "Somewhere nearby",
];
export type LeadKind = "consultation" | "photo_intake";
export type LeadDetails = {
  projectTypes: string[];
  windowCount: string;
  timeline: string;
  city: string;
  /** Accepted only for compatibility with older clients; never requested or displayed. */
  budget?: string;
};
export type LeadInput = {
  id: string;
  kind: LeadKind;
  name: string;
  email: string;
  phone: string;
  notes: string;
  details: LeadDetails;
  sourcePath: string;
  consentAt: string;
};
export const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validPhone(phone: string) {
  return (
    /^[+\d\s().-]+$/.test(phone) &&
    phone.replace(/\D/g, "").length >= 10 &&
    phone.replace(/\D/g, "").length <= 15
  );
}
export function validateLead(input: LeadInput) {
  if (!uuidPattern.test(input.id))
    return "Please reload the form and try again.";
  if (!["consultation", "photo_intake"].includes(input.kind))
    return "Choose a valid request type.";
  if (!input.name || input.name.length > 100)
    return "Enter your name (up to 100 characters).";
  if (input.email.length > 254 || !emailPattern.test(input.email))
    return "Enter a valid email address.";
  if (
    input.phone.length > 40 ||
    (input.phone && !validPhone(input.phone)) ||
    (input.kind === "consultation" && !input.phone)
  )
    return "Enter a valid phone number.";
  if (input.notes.length > 2000)
    return "Keep your notes under 2,000 characters.";
  const d = input.details;
  if (
    !d ||
    typeof d !== "object" ||
    Array.isArray(d) ||
    Object.keys(d).some(
      (key) =>
        !["projectTypes", "windowCount", "timeline", "city", "budget"].includes(
          key,
        ),
    )
  )
    return "Choose valid project details.";
  if (
    !Array.isArray(d.projectTypes) ||
    d.projectTypes.length > 6 ||
    d.projectTypes.some(
      (v) => !projectTypes.includes(v as (typeof projectTypes)[number]),
    ) ||
    new Set(d.projectTypes).size !== d.projectTypes.length
  )
    return "Choose valid project types.";
  for (const [value, options] of [
    [d.windowCount, windowCounts],
    [d.timeline, timelines],
    [d.city, cities],
  ] as const) {
    if (typeof value !== "string" || (value && !options.includes(value)))
      return "Choose valid project details.";
    if (!value && input.kind === "consultation")
      return "Complete your project, city, windows, and timeline.";
  }
  if (input.kind === "consultation" && !d.projectTypes.length)
    return "Choose at least one project type.";
  return null;
}

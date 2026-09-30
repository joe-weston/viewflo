export type LegalDocument = {
  id: string;
  kind: "terms" | "privacy" | "sow";
  version: string;
  title: string;
  body: string;
  sha256: string;
  published_at: string;
  retired_at: string | null;
};
export function billingRole(role: string) {
  return role === "owner" || role === "billing";
}
export function currentPair(docs: LegalDocument[], now = Date.now()) {
  const current = docs.filter(
    (d) =>
      ["terms", "privacy"].includes(d.kind) &&
      !d.retired_at &&
      Date.parse(d.published_at) <= now,
  );
  return current.filter((d) => d.kind === "terms").length === 1 &&
    current.filter((d) => d.kind === "privacy").length === 1
    ? current
    : [];
}
export function allAccepted(docs: LegalDocument[], ids: string[]) {
  return (
    currentPair(docs).length === 2 &&
    currentPair(docs).every((d) => ids.includes(d.id))
  );
}
export function safeSlug(value: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}
export function requireTestKey(key: string | undefined) {
  if (!key?.startsWith("sk_test_"))
    throw new Error("Test billing is not configured");
  return key;
}

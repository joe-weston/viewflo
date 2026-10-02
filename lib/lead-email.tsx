import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { deliveryRecipient, type LeadEnvironment } from "./lead-environment";
import type { LeadDetails, LeadKind } from "./lead-fields";
export const pasadenaDefaultSender = {
  name: "Pasadena Shades & Shutters",
  email: "notifications@pasadenashadesandshutters.com",
};
export type EmailPayload = {
  environment?: LeadEnvironment;
  adminUrl?: string;
  reference: string;
  kind: LeadKind;
  name: string;
  email: string;
  phone: string;
  notes: string;
  details: LeadDetails;
  sourcePath: string;
  receivedAt: string;
  photoCount: number;
  senderName: string;
  senderEmail: string;
  replyTo: string;
};
export type EmailJob = {
  id: string;
  lead_id: string;
  audience: "submitter" | "manager";
  recipient: string;
  claim_token: string;
  payload: EmailPayload;
};
export function emailContent(job: EmailJob) {
  const p = job.payload;
  const kind =
    p.kind === "consultation" ? "consultation request" : "photo request";
  const subject =
    job.audience === "manager"
      ? `You have a new lead — ${kind}`
      : `We received your ${kind}`;
  const lines =
    job.audience === "manager"
      ? [
          `${p.name} submitted a ${kind}.`,
          `Email: ${p.email}`,
          `Phone: ${p.phone || "Not provided"}`,
          `Project: ${p.details.projectTypes.join(", ") || "Not provided"}`,
          `City: ${p.details.city || "Not provided"}`,
          `Windows: ${p.details.windowCount || "Not provided"}`,
          `Timeline: ${p.details.timeline || "Not provided"}`,
          `Notes: ${p.notes || "None"}`,
          `Photos: ${p.photoCount} (stored privately for authorized project review)`,
          ...(p.adminUrl
            ? [`View submission (sign-in required): ${p.adminUrl}`]
            : []),
        ]
      : [
          `Thank you, ${p.name}. ${p.senderName} received your ${kind}.`,
          "We will review your request and contact you about next steps. Your request is not a confirmed appointment.",
          `Email: ${p.email}`,
          `Phone: ${p.phone || "Not provided"}`,
          `Project: ${p.details.projectTypes.join(", ") || "Not provided"}`,
          `City: ${p.details.city || "Not provided"}`,
          `Windows: ${p.details.windowCount || "Not provided"}`,
          `Timeline: ${p.details.timeline || "Not provided"}`,
          `Notes: ${p.notes || "None"}`,
          `Photos: ${p.photoCount}`,
          "Questions? Call 818-618-5288.",
        ];
  lines.push(`Received: ${p.receivedAt}`, `Reference: ${p.reference}`);
  const react = (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body
        style={{
          backgroundColor: "#faf7f2",
          fontFamily: "Arial, sans-serif",
          color: "#302821",
        }}
      >
        <Container style={{ padding: "24px", maxWidth: "560px" }}>
          <Heading>{subject}</Heading>
          {lines.map((line, i) => (
            <Text key={i} style={{ whiteSpace: "pre-wrap" }}>
              {line}
            </Text>
          ))}
        </Container>
      </Body>
    </Html>
  );
  return {
    from: `${p.senderName || pasadenaDefaultSender.name} <${p.senderEmail || pasadenaDefaultSender.email}>`,
    to: p.environment
      ? deliveryRecipient(p.environment, job.recipient)
      : job.recipient,
    replyTo: job.audience === "manager" ? p.email : p.replyTo,
    subject:
      p.environment === "staging"
        ? `[STAGING ${job.audience} ${p.reference}] ${subject}`
        : subject,
    text: lines.join("\n\n"),
    react,
  };
}
export async function processEmailJobs(
  jobs: EmailJob[],
  send: (job: EmailJob) => Promise<string>,
  finish: (
    job: EmailJob,
    id: string | null,
    error: string | null,
  ) => Promise<void>,
) {
  // Each recipient owns its delivery and failure; a failed confirmation cannot hide a manager alert.
  return Promise.all(
    jobs.map(async (job) => {
      let id: string | null = null;
      try {
        id = await send(job);
      } catch {
        /* Never persist raw provider errors or customer data. */
      }
      await finish(job, id, id ? null : "provider_unavailable");
      return id !== null;
    }),
  );
}

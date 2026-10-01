import { Resend, type Response as ResendResponse } from "resend";
import { emailContent, type EmailJob } from "./lead-email";
// The SDK's default development logger prints raw provider errors. This adapter
// bounds network calls and deliberately returns only safe error categories.
export class LeadResend extends Resend {
  override async fetchRequest<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ResendResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        return {
          data: null,
          error: {
            name: "application_error",
            statusCode: response.status,
            message: "Email provider unavailable",
          },
          headers: null,
        };
      return { data: (await response.json()) as T, error: null, headers: null };
    } catch {
      return {
        data: null,
        error: {
          name: "application_error",
          statusCode: null,
          message: "Email provider unavailable",
        },
        headers: null,
      };
    }
  }
}
export async function sendLeadEmail(resend: Resend, job: EmailJob) {
  const result = await resend.emails.send(emailContent(job), {
    idempotencyKey: `lead-email/${job.id}`,
  });
  if (result.error || !result.data?.id) throw new Error("Send unavailable");
  return result.data.id;
}

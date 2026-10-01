import { handleLeadIntake } from "../../../lib/lead-intake";
import {
  leadReady,
  verifyLead,
  saveLead,
  deliverLeadEmails,
} from "../../../lib/lead-store";
export const runtime = "nodejs";
export const maxDuration = 60;
export function POST(request: Request) {
  return handleLeadIntake(request, {
    ready: leadReady,
    verify: verifyLead,
    save: saveLead,
    deliver: deliverLeadEmails,
  });
}

export const customerMailbox = "jocduplbot@gmail.com";
export const customerMailKinds = ["intake", "quote", "feedback"] as const;
export type CustomerMailKind = (typeof customerMailKinds)[number];

export function validateCustomerRun(run: string) {
  if (!/^vfcrm-[0-9]{14}-[a-f0-9]{8}$/.test(run))
    throw Error("Unique CRM run marker required");
  return run;
}

export function validateTestSender(sender: string) {
  if (
    !/^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(sender) ||
    sender === customerMailbox
  )
    throw Error("Exact verified sender address required");
  return sender;
}

export function customerPrefix(run: string, kind: CustomerMailKind) {
  if (!customerMailKinds.includes(kind)) throw Error("Unknown message kind");
  return "[" + validateCustomerRun(run) + " " + kind + "] ";
}

export function providerPayload(
  run: string,
  kind: CustomerMailKind,
  sender: string,
  raw: unknown,
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Malformed mail payload");
  const mail = raw as Record<string, unknown>;
  if (
    Object.keys(mail).some(
      (key) =>
        ![
          "from",
          "to",
          "reply_to",
          "subject",
          "text",
          "html",
          "tags",
          "headers",
        ].includes(key),
    )
  )
    throw Error("Unapproved mail fields");
  const to = Array.isArray(mail.to) ? mail.to : [mail.to];
  if (to.length !== 1 || to[0] !== customerMailbox)
    throw Error("Recipient denied");
  if (
    typeof mail.subject !== "string" ||
    !mail.subject.trim() ||
    mail.subject.length > 250 ||
    /[\r\n]/.test(mail.subject)
  )
    throw Error("Invalid test subject");
  const expected =
    kind === "intake"
      ? "We received your photo request"
      : kind === "quote"
        ? "Quote: Window estimate " + run
        : "Project feedback " + run;
  if (mail.subject !== expected)
    throw Error("Unexpected subject for armed delivery phase");
  const text = typeof mail.text === "string" ? mail.text : undefined;
  const html = typeof mail.html === "string" ? mail.html : undefined;
  if (
    (!text?.trim() && !html?.trim()) ||
    (text?.length ?? 0) + (html?.length ?? 0) > 65_536
  )
    throw Error("Invalid test content");
  return {
    from: validateTestSender(sender),
    to: [customerMailbox],
    subject: customerPrefix(run, kind) + mail.subject,
    text,
    html,
  };
}

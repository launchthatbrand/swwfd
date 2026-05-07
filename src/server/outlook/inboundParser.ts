import "server-only";

const REPLY_TRUNCATION_PATTERNS = [
  /^on .+ wrote:$/i,
  /^from:\s.+$/i,
  /^sent:\s.+$/i,
  /^to:\s.+$/i,
  /^subject:\s.+$/i,
  /^-{2,}\s*original message\s*-{2,}$/i,
  /^_{5,}$/i,
];

const normalizeWhitespace = (value: string) => {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const stripHtml = (value: string) => {
  return normalizeWhitespace(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
};

const truncateQuotedReply = (value: string) => {
  const lines = value.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (REPLY_TRUNCATION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      break;
    }
    if (trimmed.startsWith(">")) {
      break;
    }
    cleaned.push(line);
  }
  return normalizeWhitespace(cleaned.join("\n"));
};

export const extractReplyReferences = (headerValue: string | null) => {
  if (!headerValue) return [] as string[];
  return Array.from(
    new Set(
      headerValue
        .split(/\s+/)
        .map((part) => part.trim())
        .filter((part) => /^<.+>$/.test(part)),
    ),
  );
};

export const extractInboundReplyText = (args: {
  uniqueBodyContent: string;
  bodyContent: string;
  bodyPreview: string;
}) => {
  const candidate =
    args.uniqueBodyContent.trim().length > 0
      ? args.uniqueBodyContent
      : args.bodyContent.trim().length > 0
        ? args.bodyContent
        : args.bodyPreview;
  const plain = stripHtml(candidate);
  const truncated = truncateQuotedReply(plain);
  if (truncated.length > 0) return truncated;
  if (plain.length > 0) return plain;
  return normalizeWhitespace(args.bodyPreview);
};

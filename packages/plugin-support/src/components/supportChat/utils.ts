export const generateSessionId = (organizationId: string) => {
  if (typeof crypto?.randomUUID === "function") {
    return `support-${organizationId}-${crypto.randomUUID()}`;
  }
  return `support-${organizationId}-${Date.now()}`;
};

export interface StoredSupportContact {
  contactId: string;
  fullName?: string;
  email?: string;
}

export const readStoredContact = (
  storageKey: string,
): StoredSupportContact | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredSupportContact) : null;
  } catch {
    return null;
  }
};

type LexicalNode = {
  type?: string;
  text?: string;
  children?: LexicalNode[];
};

type LexicalRoot = {
  root?: LexicalNode & { children?: LexicalNode[] };
};

export const parseLexicalRichText = (serialized: string): string => {
  try {
    const parsed = JSON.parse(serialized) as LexicalRoot;
    const rootChildren = parsed.root?.children ?? [];
    const blocks = rootChildren
      .map((node) => extractTextFromNode(node).trim())
      .filter((block) => block.length > 0);
    return blocks.join("\n\n");
  } catch {
    return serialized;
  }
};

const extractTextFromNode = (node: LexicalNode): string => {
  if (!node) {
    return "";
  }
  if (typeof node.text === "string" && node.text.length > 0) {
    return node.text;
  }
  if (Array.isArray(node.children)) {
    return node.children.map((child) => extractTextFromNode(child)).join("");
  }
  return "";
};

export type AdminMetaBoxContext<T = unknown, U = unknown, V = unknown> = {
  slug: string;
  organizationId?: V;
  visibility?: Record<string, unknown>;
  [key: string]: unknown;
} & T &
  U;

type MetaBoxRegistration = {
  id: string;
  title: string;
  description?: string;
  location?: "main" | "sidebar" | string;
  priority?: number;
  render: () => unknown;
};

export const registerMetaBoxHook = <TContext = unknown>(
  _slot: string,
  _callback: (context: TContext) => MetaBoxRegistration | null,
) => {
  // no-op shim for local package compatibility
};

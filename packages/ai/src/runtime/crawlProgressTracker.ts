import type { CrawlSourceType, CrawlUrlStatus } from "./linkCrawl";
import { normalizeUrlForCrawlIdentity } from "./linkCrawl";

export type CrawlProgressRow<TSourceType extends CrawlSourceType = CrawlSourceType> = {
  url: string;
  sourceType: TSourceType;
  status: CrawlUrlStatus;
  error?: string;
};

export type CrawlProgressIdentityResolver = (url: string) => string | null;

export type CreateCrawlProgressTrackerOptions = {
  resolveIdentity?: CrawlProgressIdentityResolver;
};

export type CrawlProgressTracker<TSourceType extends CrawlSourceType = CrawlSourceType> = {
  upsert: (row: CrawlProgressRow<TSourceType>) => void;
  snapshot: () => CrawlProgressRow<TSourceType>[];
  clear: () => void;
  size: () => number;
};

export const createCrawlProgressTracker = <
  TSourceType extends CrawlSourceType = CrawlSourceType,
>(
  options: CreateCrawlProgressTrackerOptions = {},
): CrawlProgressTracker<TSourceType> => {
  const resolveIdentity = options.resolveIdentity ?? normalizeUrlForCrawlIdentity;
  const rowsByIdentity = new Map<string, CrawlProgressRow<TSourceType>>();

  return {
    upsert: (row) => {
      const identity = resolveIdentity(row.url) ?? row.url;
      const previous = rowsByIdentity.get(identity);
      rowsByIdentity.set(identity, {
        ...row,
        error: row.error ?? previous?.error,
      });
    },
    snapshot: () => Array.from(rowsByIdentity.values()),
    clear: () => {
      rowsByIdentity.clear();
    },
    size: () => rowsByIdentity.size,
  };
};


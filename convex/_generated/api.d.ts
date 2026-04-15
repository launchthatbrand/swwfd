/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: {
  admin: {
    ensureFirstAdmin: FunctionReference<
      "mutation",
      "public",
      {},
      { becameAdmin: boolean; isAdmin: boolean }
    >;
    listAdmins: FunctionReference<
      "query",
      "public",
      {},
      Array<{
        _id: Id<"users">;
        email?: string;
        isAdmin?: boolean;
        name?: string;
      }>
    >;
  };
  auth: {
    isAuthenticated: FunctionReference<"query", "public", {}, any>;
    signIn: FunctionReference<
      "action",
      "public",
      {
        calledBy?: string;
        params?: any;
        provider?: string;
        refreshToken?: string;
        verifier?: string;
      },
      any
    >;
    signOut: FunctionReference<"action", "public", {}, any>;
  };
  devAuthBypass: {
    ensureViewerAdmin: FunctionReference<
      "mutation",
      "public",
      { expectedEmail?: string },
      boolean
    >;
  };
  jobApplications: {
    apply: FunctionReference<
      "mutation",
      "public",
      { coverLetter?: string; jobId: Id<"jobs"> },
      Id<"jobApplications">
    >;
    listMine: FunctionReference<
      "query",
      "public",
      {},
      Array<{
        _creationTime: number;
        _id: Id<"jobApplications">;
        coverLetter?: string;
        createdAt: number;
        jobId: Id<"jobs">;
        userId: Id<"users">;
      }>
    >;
  };
  jobs: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        company: string;
        description: string;
        location: string;
        tags?: Array<string>;
        title: string;
      },
      Id<"jobs">
    >;
    get: FunctionReference<
      "query",
      "public",
      { jobId: Id<"jobs"> },
      null | {
        _creationTime: number;
        _id: Id<"jobs">;
        company: string;
        createdAt: number;
        description: string;
        location: string;
        tags: Array<string>;
        title: string;
      }
    >;
    list: FunctionReference<
      "query",
      "public",
      { limit?: number },
      Array<{
        _creationTime: number;
        _id: Id<"jobs">;
        company: string;
        createdAt: number;
        description: string;
        location: string;
        tags: Array<string>;
        title: string;
      }>
    >;
  };
  mondayTouchBackfill: {
    cancelBackfill: FunctionReference<
      "mutation",
      "public",
      { jobId?: Id<"mondayTouchBackfillJobs"> },
      { jobId: Id<"mondayTouchBackfillJobs">; status: string }
    >;
    cancelCsvExport: FunctionReference<
      "mutation",
      "public",
      { jobId?: Id<"mondayTouchCsvExportJobs"> },
      { jobId: Id<"mondayTouchCsvExportJobs">; status: string }
    >;
    getCsvExportCsv: FunctionReference<
      "query",
      "public",
      { jobId: Id<"mondayTouchCsvExportJobs"> },
      null | {
        csv?: string;
        fileName: string;
        lastError?: string | null;
        status: "running" | "done" | "failed" | "cancelled";
      }
    >;
    getLatestCsvExportJob: FunctionReference<
      "query",
      "public",
      {},
      null | {
        baselineDate: string;
        chunkCount: number;
        contactBoardId: string;
        currentCursor?: string | null;
        finishedAt?: number | null;
        jobId: Id<"mondayTouchCsvExportJobs">;
        lastError?: string | null;
        pageSize: number;
        processedContacts: number;
        rowCount: number;
        sourceTag: string;
        startedAt: number;
        status: "running" | "done" | "failed" | "cancelled";
        updatedAt: number;
        workflowId?: string;
      }
    >;
    getLatestJob: FunctionReference<
      "query",
      "public",
      {},
      null | {
        baselineDate: string;
        contactBoardId: string;
        createdTouches: number;
        currentCursor?: string | null;
        errorsCount: number;
        finishedAt?: number | null;
        jobId: Id<"mondayTouchBackfillJobs">;
        lastError?: string | null;
        pageSize: number;
        processedContacts: number;
        skippedTouches: number;
        sourceTag: string;
        startedAt: number;
        status: "running" | "done" | "failed" | "cancelled";
        touchBoardId: string;
        updatedAt: number;
        workflowId?: string;
      }
    >;
    startBackfill: FunctionReference<
      "mutation",
      "public",
      { baselineDate?: string; pageSize?: number; sourceTag?: string },
      { jobId: Id<"mondayTouchBackfillJobs">; workflowId: string }
    >;
    startCsvExport: FunctionReference<
      "mutation",
      "public",
      { baselineDate?: string; pageSize?: number; sourceTag?: string },
      { jobId: Id<"mondayTouchCsvExportJobs">; workflowId: string }
    >;
  };
  viewer: {
    me: FunctionReference<
      "query",
      "public",
      {},
      null | {
        email?: string;
        isAdmin?: boolean;
        name?: string;
        userId: Id<"users">;
      }
    >;
  };
};

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: {
  auth: {
    store: FunctionReference<
      "mutation",
      "internal",
      {
        args:
          | {
              generateTokens: boolean;
              sessionId?: Id<"authSessions">;
              type: "signIn";
              userId: Id<"users">;
            }
          | { type: "signOut" }
          | { refreshToken: string; type: "refreshSession" }
          | {
              allowExtraProviders: boolean;
              generateTokens: boolean;
              params: any;
              provider?: string;
              type: "verifyCodeAndSignIn";
              verifier?: string;
            }
          | { type: "verifier" }
          | { signature: string; type: "verifierSignature"; verifier: string }
          | {
              profile: any;
              provider: string;
              providerAccountId: string;
              signature: string;
              type: "userOAuth";
            }
          | {
              accountId?: Id<"authAccounts">;
              allowExtraProviders: boolean;
              code: string;
              email?: string;
              expirationTime: number;
              phone?: string;
              provider: string;
              type: "createVerificationCode";
            }
          | {
              account: { id: string; secret?: string };
              profile: any;
              provider: string;
              shouldLinkViaEmail?: boolean;
              shouldLinkViaPhone?: boolean;
              type: "createAccountFromCredentials";
            }
          | {
              account: { id: string; secret?: string };
              provider: string;
              type: "retrieveAccountWithCredentials";
            }
          | {
              account: { id: string; secret: string };
              provider: string;
              type: "modifyAccount";
            }
          | {
              except?: Array<Id<"authSessions">>;
              type: "invalidateSessions";
              userId: Id<"users">;
            };
      },
      any
    >;
  };
  mondayTouchBackfill: {
    appendCsvChunk: FunctionReference<
      "mutation",
      "internal",
      {
        chunkContent: string;
        jobId: Id<"mondayTouchCsvExportJobs">;
        nextCursor: string | null;
        processedContactsDelta: number;
        rowCountDelta: number;
      },
      null
    >;
    backfillTouchesWorkflow: FunctionReference<
      "mutation",
      "internal",
      any,
      any
    >;
    exportTouchesCsvWorkflow: FunctionReference<
      "mutation",
      "internal",
      any,
      any
    >;
    finishCsvJob: FunctionReference<
      "mutation",
      "internal",
      {
        jobId: Id<"mondayTouchCsvExportJobs">;
        lastError?: string | null;
        status: "done" | "failed" | "cancelled";
      },
      null
    >;
    finishJob: FunctionReference<
      "mutation",
      "internal",
      {
        jobId: Id<"mondayTouchBackfillJobs">;
        lastError?: string | null;
        status: "done" | "failed" | "cancelled";
      },
      null
    >;
    getCsvJobForWorkflow: FunctionReference<
      "query",
      "internal",
      { jobId: Id<"mondayTouchCsvExportJobs"> },
      null | {
        _id: Id<"mondayTouchCsvExportJobs">;
        baselineDate: string;
        contactBoardId: string;
        currentCursor?: string | null;
        pageSize: number;
        sourceTag: string;
        status: "running" | "done" | "failed" | "cancelled";
      }
    >;
    getJobForWorkflow: FunctionReference<
      "query",
      "internal",
      { jobId: Id<"mondayTouchBackfillJobs"> },
      null | {
        _id: Id<"mondayTouchBackfillJobs">;
        baselineDate: string;
        contactBoardId: string;
        currentCursor?: string | null;
        pageSize: number;
        sourceTag: string;
        status: "running" | "done" | "failed" | "cancelled";
        touchBoardId: string;
      }
    >;
    updateJobProgress: FunctionReference<
      "mutation",
      "internal",
      {
        createdTouchesDelta: number;
        errorsDelta: number;
        jobId: Id<"mondayTouchBackfillJobs">;
        nextCursor: string | null;
        processedContactsDelta: number;
        skippedTouchesDelta: number;
      },
      null
    >;
  };
  mondayTouchBackfillNode: {
    fetchContactsPageAction: FunctionReference<
      "action",
      "internal",
      { boardId: string; cursor?: string | null; pageSize: number },
      {
        contacts: Array<{
          createdAtDate: string | null;
          email: string | null;
          id: string;
          name: string;
          ownerIds: Array<string>;
        }>;
        nextCursor: string | null;
      }
    >;
    fetchExistingBaselineKeysAction: FunctionReference<
      "action",
      "internal",
      { baselineDate: string; sourceTag: string; touchBoardId: string },
      { keys: Array<string> }
    >;
    writeTouchRowsAction: FunctionReference<
      "action",
      "internal",
      {
        baselineDate: string;
        contacts: Array<{
          createdAtDate: string | null;
          email: string | null;
          id: string;
          name: string;
          ownerIds: Array<string>;
        }>;
        dedupeKeys: Array<string>;
        jobId: Id<"mondayTouchBackfillJobs">;
        sourceTag: string;
        touchBoardId: string;
      },
      {
        created: number;
        createdKeys: Array<string>;
        deduped: number;
        errors: number;
        skipped: number;
      }
    >;
  };
};

export declare const components: {
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  launchthat_core_tenant: import("../../../../packages/plugins/core-tenant/src/convex/component/_generated/component.js").ComponentApi<"launchthat_core_tenant">;
  launchthat_notifications: import("../../../../packages/plugins/notifications/src/convex/component/_generated/component.js").ComponentApi<"launchthat_notifications">;
  launchthat_push: import("../../../../packages/plugins/push/src/convex/component/_generated/component.js").ComponentApi<"launchthat_push">;
  launchthat_email: import("../../../../packages/plugins/email/src/convex/component/_generated/component.js").ComponentApi<"launchthat_email">;
  launchthat_feedback: import("../../../../packages/plugins/feedback/src/convex/component/_generated/component.js").ComponentApi<"launchthat_feedback">;
  launchthat_crm: import("../../../../packages/plugins/crm/src/convex/component/_generated/component.js").ComponentApi<"launchthat_crm">;
  launchthat_ecommerce: import("../../../../packages/plugins/ecommerce/src/convex/component/_generated/component.js").ComponentApi<"launchthat_ecommerce">;
  launchthat_joincodes: import("../../../../packages/plugins/joincodes/src/convex/component/_generated/component.js").ComponentApi<"launchthat_joincodes">;
  launchthat_affiliates: import("../../../../packages/plugins/affiliates/src/convex/component/_generated/component.js").ComponentApi<"launchthat_affiliates">;
  launchthat_discord: import("../../../../packages/plugins/discord/src/convex/component/_generated/component.js").ComponentApi<"launchthat_discord">;
  launchthat_onboarding: import("../../../../packages/plugins/onboarding/src/convex/component/_generated/component.js").ComponentApi<"launchthat_onboarding">;
  launchthat_access: import("../../../../packages/plugins/access/src/convex/component/_generated/component.js").ComponentApi<"launchthat_access">;
  launchthat_observability: import("../../../../packages/plugins/observability/src/convex/component/_generated/component.js").ComponentApi<"launchthat_observability">;
  launchthat_shortlinks: import("../../../../packages/plugins/shortlinks/src/convex/component/_generated/component.js").ComponentApi<"launchthat_shortlinks">;
};

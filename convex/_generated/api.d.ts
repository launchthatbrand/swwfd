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
  mondayMonthlyMigration: {
    cancelMigration: FunctionReference<
      "mutation",
      "public",
      { jobId?: Id<"mondayMonthlyMigrationJobs"> },
      { jobId: Id<"mondayMonthlyMigrationJobs">; status: string }
    >;
    getLatestJob: FunctionReference<
      "query",
      "public",
      {},
      null | {
        createdParentUpdates: number;
        createdSubitemUpdates: number;
        createdSubitems: number;
        currentCursor?: string | null;
        dryRun: boolean;
        errorsCount: number;
        finishedAt?: number | null;
        includeParentUpdates: boolean;
        includeSubitemUpdates: boolean;
        includeSubitems: boolean;
        jobId: Id<"mondayMonthlyMigrationJobs">;
        lastError?: string | null;
        mappedContacts: number;
        monthTag: string;
        pageSize: number;
        processedContacts: number;
        skippedContacts: number;
        sourceBoardId: string;
        sourceBoardName?: string | null;
        startedAt: number;
        status: "running" | "done" | "failed" | "cancelled";
        targetBoardId: string;
        updateProgressColumns?: boolean;
        updatedAt: number;
        updatedProgressColumns?: number;
        warningsCount: number;
        workflowId?: string;
      }
    >;
    startMigration: FunctionReference<
      "mutation",
      "public",
      {
        dryRun?: boolean;
        includeParentUpdates?: boolean;
        includeSubitemUpdates?: boolean;
        includeSubitems?: boolean;
        monthTag?: string;
        pageSize?: number;
        sourceBoardId: string;
        targetBoardId?: string;
        updateProgressColumns?: boolean;
      },
      { jobId: Id<"mondayMonthlyMigrationJobs">; workflowId: string }
    >;
  };
  mondaySettings: {
    getFeatureFlags: FunctionReference<
      "query",
      "public",
      {},
      { emailMarketingEnabled: boolean }
    >;
    setFeatureFlags: FunctionReference<
      "mutation",
      "public",
      { emailMarketingEnabled: boolean; updatedByMondayUserId: string },
      { emailMarketingEnabled: boolean }
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
  mondayUserBoardSettings: {
    getForOwnerBoard: FunctionReference<
      "query",
      "public",
      { accountId: string; ownerMondayUserId: string },
      {
        colorTheme: "neutral" | "sky" | "emerald" | "violet" | "rose";
        createdAt: number;
        fontSize: "default" | "medium" | "large";
        ownerMondayUserId: string;
        tableDensity?: "expanded" | "compact";
        updatedAt: number;
      }
    >;
    upsertForOwnerBoard: FunctionReference<
      "mutation",
      "public",
      {
        accountId: string;
        colorTheme: "neutral" | "sky" | "emerald" | "violet" | "rose";
        fontSize: "default" | "medium" | "large";
        ownerMondayUserId: string;
        tableDensity?: "expanded" | "compact";
        viewerMondayUserId: string;
      },
      {
        colorTheme: "neutral" | "sky" | "emerald" | "violet" | "rose";
        createdAt: number;
        fontSize: "default" | "medium" | "large";
        ownerMondayUserId: string;
        tableDensity?: "expanded" | "compact";
        updatedAt: number;
      }
    >;
  };
  mondayUserFilterPresets: {
    listForOwnerBoard: FunctionReference<
      "query",
      "public",
      { accountId: string; ownerMondayUserId: string },
      Array<{
        conditions: Array<{
          field:
            | "owner"
            | "district"
            | "name"
            | "email"
            | "phone"
            | "address"
            | "tags"
            | "createdAt"
            | "hireDate"
            | "detail";
          id: string;
          operator:
            | "contains"
            | "equals"
            | "not_equals"
            | "starts_with"
            | "ends_with"
            | "is_empty"
            | "is_not_empty"
            | "on_or_after"
            | "on_or_before"
            | "between";
          target?: string;
          value: string;
          valueTo: string;
        }>;
        createdAt: number;
        id: string;
        matchMode: "all" | "any";
        name: string;
        ownerMondayUserId: string;
        updatedAt: number;
      }>
    >;
    removeForOwnerBoard: FunctionReference<
      "mutation",
      "public",
      { accountId: string; ownerMondayUserId: string; presetId: string },
      null
    >;
    upsertForOwnerBoard: FunctionReference<
      "mutation",
      "public",
      {
        accountId: string;
        conditions: Array<{
          field:
            | "owner"
            | "district"
            | "name"
            | "email"
            | "phone"
            | "address"
            | "tags"
            | "createdAt"
            | "hireDate"
            | "detail";
          id: string;
          operator:
            | "contains"
            | "equals"
            | "not_equals"
            | "starts_with"
            | "ends_with"
            | "is_empty"
            | "is_not_empty"
            | "on_or_after"
            | "on_or_before"
            | "between";
          target?: string;
          value: string;
          valueTo: string;
        }>;
        matchMode: "all" | "any";
        name: string;
        ownerMondayUserId: string;
        presetId?: string;
        viewerMondayUserId: string;
      },
      {
        conditions: Array<{
          field:
            | "owner"
            | "district"
            | "name"
            | "email"
            | "phone"
            | "address"
            | "tags"
            | "createdAt"
            | "hireDate"
            | "detail";
          id: string;
          operator:
            | "contains"
            | "equals"
            | "not_equals"
            | "starts_with"
            | "ends_with"
            | "is_empty"
            | "is_not_empty"
            | "on_or_after"
            | "on_or_before"
            | "between";
          target?: string;
          value: string;
          valueTo: string;
        }>;
        createdAt: number;
        id: string;
        matchMode: "all" | "any";
        name: string;
        ownerMondayUserId: string;
        updatedAt: number;
      }
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
  mondayMonthlyMigration: {
    finishJob: FunctionReference<
      "mutation",
      "internal",
      {
        jobId: Id<"mondayMonthlyMigrationJobs">;
        lastError?: string | null;
        status: "done" | "failed" | "cancelled";
      },
      null
    >;
    getExistingEntriesForSourceItem: FunctionReference<
      "query",
      "internal",
      { sourceBoardId: string; sourceItemId: string },
      {
        parentUpdateEntityIds: Array<string>;
        sourceSubitemToTargetSubitem: Array<{
          sourceSubitemId: string;
          targetSubitemId: string;
        }>;
        subitemEntityIds: Array<string>;
        subitemUpdateEntityIds: Array<string>;
      }
    >;
    getExistingEntriesForSourceItemsBatch: FunctionReference<
      "query",
      "internal",
      { sourceBoardId: string; sourceItemIds: Array<string> },
      Array<{
        parentUpdateEntityIds: Array<string>;
        sourceItemId: string;
        sourceSubitemToTargetSubitem: Array<{
          sourceSubitemId: string;
          targetSubitemId: string;
        }>;
        subitemEntityIds: Array<string>;
        subitemUpdateEntityIds: Array<string>;
      }>
    >;
    getJobForWorkflow: FunctionReference<
      "query",
      "internal",
      { jobId: Id<"mondayMonthlyMigrationJobs"> },
      null | {
        _id: Id<"mondayMonthlyMigrationJobs">;
        currentCursor?: string | null;
        dryRun: boolean;
        includeParentUpdates: boolean;
        includeSubitemUpdates: boolean;
        includeSubitems: boolean;
        monthTag: string;
        pageSize: number;
        sourceBoardId: string;
        sourceBoardName?: string | null;
        status: "running" | "done" | "failed" | "cancelled";
        targetBoardId: string;
        updateProgressColumns?: boolean;
      }
    >;
    recordCreatedEntries: FunctionReference<
      "mutation",
      "internal",
      {
        entries: Array<{
          sourceEntityId: string;
          sourceEntityType: "parent_update" | "subitem" | "subitem_update";
          sourceItemId: string;
          targetEntityId: string | null;
          targetItemId: string;
        }>;
        jobId: Id<"mondayMonthlyMigrationJobs">;
        sourceBoardId: string;
      },
      null
    >;
    runMonthlyMigrationWorkflow: FunctionReference<
      "mutation",
      "internal",
      any,
      any
    >;
    updateJobProgress: FunctionReference<
      "mutation",
      "internal",
      {
        createdParentUpdatesDelta: number;
        createdSubitemUpdatesDelta: number;
        createdSubitemsDelta: number;
        errorsDelta: number;
        jobId: Id<"mondayMonthlyMigrationJobs">;
        mappedContactsDelta: number;
        nextCursor: string | null;
        processedContactsDelta: number;
        skippedContactsDelta: number;
        sourceBoardName?: string | null;
        updatedProgressColumnsDelta: number;
        warningsDelta: number;
      },
      null
    >;
  };
  mondayMonthlyMigrationNode: {
    fetchSourcePageAction: FunctionReference<
      "action",
      "internal",
      {
        cursor?: string | null;
        pageSize: number;
        sourceBoardId: string;
        targetBoardId: string;
      },
      {
        items: Array<{
          email: string | null;
          id: string;
          mainDatabaseId: string | null;
          mirrorDatabaseId: string | null;
          name: string;
          relationMainId: string | null;
          subitems: Array<{
            columnValues: Array<{
              id: string;
              text: string | null;
              type: string;
              value: string | null;
            }>;
            id: string;
            name: string;
            updates: Array<{
              body: string;
              createdAt: string | null;
              creatorName: string | null;
              id: string;
              updatedAt: string | null;
            }>;
          }>;
          updates: Array<{
            body: string;
            createdAt: string | null;
            creatorName: string | null;
            id: string;
            updatedAt: string | null;
          }>;
        }>;
        nextCursor: string | null;
        sourceBoardName: string | null;
        sourceSubitemBoardColumns: Array<{
          id?: string | null;
          settings_str?: string | null;
          title?: string | null;
          type?: string | null;
        }>;
        sourceSubitemBoardId: string | null;
        targetSubitemBoardColumns: Array<{
          id?: string | null;
          settings_str?: string | null;
          title?: string | null;
          type?: string | null;
        }>;
        targetSubitemBoardId: string | null;
      }
    >;
    migrateSourceItemAction: FunctionReference<
      "action",
      "internal",
      {
        cachedSourceSubitemBoardColumns?: Array<{
          id?: string | null;
          settings_str?: string | null;
          title?: string | null;
          type?: string | null;
        }>;
        cachedTargetSubitemBoardColumns?: Array<{
          id?: string | null;
          settings_str?: string | null;
          title?: string | null;
          type?: string | null;
        }>;
        cachedTargetSubitemBoardId?: string | null;
        dryRun: boolean;
        existingEntries: {
          parentUpdateEntityIds: Array<string>;
          sourceSubitemToTargetSubitem: Array<{
            sourceSubitemId: string;
            targetSubitemId: string;
          }>;
          subitemEntityIds: Array<string>;
          subitemUpdateEntityIds: Array<string>;
        };
        includeParentUpdates: boolean;
        includeSubitemUpdates: boolean;
        includeSubitems: boolean;
        monthTag: string;
        sourceBoardId: string;
        sourceBoardName: string | null;
        sourceItem: {
          email: string | null;
          id: string;
          mainDatabaseId: string | null;
          mirrorDatabaseId: string | null;
          name: string;
          relationMainId: string | null;
          subitems: Array<{
            columnValues: Array<{
              id: string;
              text: string | null;
              type: string;
              value: string | null;
            }>;
            id: string;
            name: string;
            updates: Array<{
              body: string;
              createdAt: string | null;
              creatorName: string | null;
              id: string;
              updatedAt: string | null;
            }>;
          }>;
          updates: Array<{
            body: string;
            createdAt: string | null;
            creatorName: string | null;
            id: string;
            updatedAt: string | null;
          }>;
        };
        sourceSubitemBoardId?: string | null;
        targetBoardId: string;
        updateProgressColumns: boolean;
      },
      {
        createdEntries: Array<{
          sourceEntityId: string;
          sourceEntityType: "parent_update" | "subitem" | "subitem_update";
          sourceItemId: string;
          targetEntityId: string | null;
          targetItemId: string;
        }>;
        createdParentUpdates: number;
        createdSubitemUpdates: number;
        createdSubitems: number;
        errors: number;
        mappedContacts: number;
        processedContacts: number;
        skippedContacts: number;
        updatedProgressColumns: number;
        warnings: Array<string>;
      }
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
  workflow: {
    event: {
      create: FunctionReference<
        "mutation",
        "internal",
        { name: string; workflowId: string },
        string
      >;
      send: FunctionReference<
        "mutation",
        "internal",
        {
          eventId?: string;
          name?: string;
          result:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId?: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        string
      >;
    };
    journal: {
      load: FunctionReference<
        "query",
        "internal",
        { shortCircuit?: boolean; workflowId: string },
        {
          blocked?: boolean;
          journalEntries: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          ok: boolean;
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      startSteps: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          steps: Array<{
            retry?:
              | boolean
              | { base: number; initialBackoffMs: number; maxAttempts: number };
            schedulerOptions?: { runAt?: number } | { runAfter?: number };
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
          }>;
          workflowId: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        Array<{
          _creationTime: number;
          _id: string;
          step:
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                functionType: "query" | "mutation" | "action";
                handle: string;
                inProgress: boolean;
                kind?: "function";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workId?: string;
              }
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                handle: string;
                inProgress: boolean;
                kind: "workflow";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workflowId?: string;
              }
            | {
                args: { eventId?: string };
                argsSize: number;
                completedAt?: number;
                eventId?: string;
                inProgress: boolean;
                kind: "event";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
              };
          stepNumber: number;
          workflowId: string;
        }>
      >;
    };
    workflow: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        null
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { force?: boolean; workflowId: string },
        boolean
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          runResult:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId: string;
        },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          maxParallelism?: number;
          onComplete?: { context?: any; fnHandle: string };
          startAsync?: boolean;
          workflowArgs: any;
          workflowHandle: string;
          workflowName: string;
        },
        string
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            context?: any;
            name?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listByName: FunctionReference<
        "query",
        "internal",
        {
          name: string;
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            context?: any;
            name?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listSteps: FunctionReference<
        "query",
        "internal",
        {
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          workflowId: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            completedAt?: number;
            eventId?: string;
            kind: "function" | "workflow" | "event";
            name: string;
            nestedWorkflowId?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            stepId: string;
            stepNumber: number;
            workId?: string;
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      restart: FunctionReference<
        "mutation",
        "internal",
        { from?: number | string; startAsync?: boolean; workflowId: string },
        null
      >;
    };
  };
  launchthat_core_tenant: {
    mutations: {
      acceptOrgInviteByToken: FunctionReference<
        "mutation",
        "internal",
        { redeemedByUserId: string; token: string },
        { organizationId: string }
      >;
      createOrganization: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          logo?: string;
          logoMediaId?: string;
          name: string;
          slug?: string;
          userId: string;
        },
        string
      >;
      createOrganizationMedia: FunctionReference<
        "mutation",
        "internal",
        {
          contentType: string;
          filename?: string;
          organizationId: string;
          size: number;
          storageId: string;
          uploadedByUserId: string;
        },
        string
      >;
      createOrgInvite: FunctionReference<
        "mutation",
        "internal",
        {
          createdByUserId: string;
          email: string;
          expiresAt: number;
          organizationId: string;
          role: "owner" | "admin" | "staff" | "member";
        },
        { inviteId: string; token: string }
      >;
      deleteOrganization: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string },
        null
      >;
      deleteOrganizationMedia: FunctionReference<
        "mutation",
        "internal",
        { mediaId: string },
        null
      >;
      ensureMembership: FunctionReference<
        "mutation",
        "internal",
        {
          organizationId: string;
          role?: "owner" | "admin" | "staff" | "member";
          setActive?: boolean;
          userId: string;
        },
        null
      >;
      generateOrganizationMediaUploadUrl: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string },
        string
      >;
      removeMembership: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; userId: string },
        null
      >;
      removeOrganizationDomain: FunctionReference<
        "mutation",
        "internal",
        { appKey: string; hostname: string; organizationId: string },
        null
      >;
      revokeOrgInvite: FunctionReference<
        "mutation",
        "internal",
        { inviteId: string; organizationId: string },
        null
      >;
      setActiveOrganizationForUser: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; userId: string },
        null
      >;
      setOrganizationClerkOrganizationId: FunctionReference<
        "mutation",
        "internal",
        { clerkOrganizationId: string; organizationId: string },
        null
      >;
      setOrganizationDomainStatus: FunctionReference<
        "mutation",
        "internal",
        {
          appKey: string;
          hostname: string;
          lastError?: string;
          organizationId: string;
          records?: Array<{ name: string; type: string; value: string }>;
          status: "unconfigured" | "pending" | "verified" | "error";
        },
        null
      >;
      updateOrganization: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          logo?: string | null;
          logoMediaId?: string | null;
          name?: string;
          organizationId: string;
          slug?: string;
        },
        null
      >;
      updateOrganizationPublicProfileConfig: FunctionReference<
        "mutation",
        "internal",
        {
          config: null | {
            heroCtas?: Array<{
              id: string;
              label: string;
              url: string;
              variant?: "primary" | "outline";
            }>;
            links: Array<{ label: string; url: string }>;
            logoCrop?: { x: number; y: number };
            sections: Array<{
              enabled: boolean;
              id: string;
              kind: "hero" | "about" | "links" | "stats";
            }>;
            version: "v1";
          };
          organizationId: string;
        },
        null
      >;
      upsertOrgAccessSettings: FunctionReference<
        "mutation",
        "internal",
        {
          joinCodesEnabled: boolean;
          organizationId: string;
          visibility: "public" | "private";
        },
        null
      >;
      upsertOrganizationDomain: FunctionReference<
        "mutation",
        "internal",
        {
          appKey: string;
          hostname: string;
          organizationId: string;
          status?: "unconfigured" | "pending" | "verified" | "error";
        },
        null
      >;
      upsertOrgAuthPolicySettings: FunctionReference<
        "mutation",
        "internal",
        {
          accountLinkMode: "disabled" | "clerk_auto_only" | "full_merge";
          allowedEmailDomains: Array<string>;
          authFlowMode: "gate_before_signin" | "open_then_gate_content";
          enabledEmailMagicLink: boolean;
          enabledOauthProviders: Array<string>;
          enabledPhoneOtp: boolean;
          organizationId: string;
          signupMode: "invite_only" | "self_serve_domain" | "self_serve_open";
          updatedByUserId: string;
        },
        null
      >;
      upsertOrgConsentSettings: FunctionReference<
        "mutation",
        "internal",
        {
          openPositionsEnabled: boolean;
          ordersEnabled: boolean;
          organizationId: string;
          tradeIdeasEnabled: boolean;
          userId: string;
        },
        null
      >;
    };
    queries: {
      getMemberByUserAndOrganization: FunctionReference<
        "query",
        "internal",
        { organizationId: string; userId: string },
        null | { isActive: boolean; role: string; userId: string }
      >;
      getOrgAccessSettings: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        null | {
          _creationTime: number;
          _id: string;
          joinCodesEnabled: boolean;
          organizationId: string;
          updatedAt: number;
          visibility: "public" | "private";
        }
      >;
      getOrganizationByHostname: FunctionReference<
        "query",
        "internal",
        { appKey: string; hostname: string; requireVerified?: boolean },
        null | {
          _creationTime: number;
          _id: string;
          clerkOrganizationId?: string;
          createdAt?: number;
          description?: string;
          logo?: string;
          logoMediaId?: string;
          name: string;
          ownerId: string;
          publicProfileConfig?: {
            heroCtas?: Array<{
              id: string;
              label: string;
              url: string;
              variant?: "primary" | "outline";
            }>;
            links: Array<{ label: string; url: string }>;
            logoCrop?: { x: number; y: number };
            sections: Array<{
              enabled: boolean;
              id: string;
              kind: "hero" | "about" | "links" | "stats";
            }>;
            version: "v1";
          };
          slug: string;
          updatedAt?: number;
        }
      >;
      getOrganizationById: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        null | {
          _creationTime: number;
          _id: string;
          clerkOrganizationId?: string;
          createdAt?: number;
          description?: string;
          logo?: string;
          logoMediaId?: string;
          name: string;
          ownerId: string;
          publicProfileConfig?: {
            heroCtas?: Array<{
              id: string;
              label: string;
              url: string;
              variant?: "primary" | "outline";
            }>;
            links: Array<{ label: string; url: string }>;
            logoCrop?: { x: number; y: number };
            sections: Array<{
              enabled: boolean;
              id: string;
              kind: "hero" | "about" | "links" | "stats";
            }>;
            version: "v1";
          };
          slug: string;
          updatedAt?: number;
        }
      >;
      getOrganizationBySlug: FunctionReference<
        "query",
        "internal",
        { slug: string },
        null | {
          _creationTime: number;
          _id: string;
          clerkOrganizationId?: string;
          createdAt?: number;
          description?: string;
          logo?: string;
          logoMediaId?: string;
          name: string;
          ownerId: string;
          publicProfileConfig?: {
            heroCtas?: Array<{
              id: string;
              label: string;
              url: string;
              variant?: "primary" | "outline";
            }>;
            links: Array<{ label: string; url: string }>;
            logoCrop?: { x: number; y: number };
            sections: Array<{
              enabled: boolean;
              id: string;
              kind: "hero" | "about" | "links" | "stats";
            }>;
            version: "v1";
          };
          slug: string;
          updatedAt?: number;
        }
      >;
      getOrganizationMediaById: FunctionReference<
        "query",
        "internal",
        { mediaId: string },
        null | {
          _creationTime: number;
          _id: string;
          contentType: string;
          createdAt: number;
          filename?: string;
          organizationId: string;
          size: number;
          storageId: string;
          updatedAt: number;
          uploadedByUserId: string;
          url: string | null;
        }
      >;
      getOrgAuthPolicySettings: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        null | {
          _creationTime: number;
          _id: string;
          accountLinkMode: "disabled" | "clerk_auto_only" | "full_merge";
          allowedEmailDomains: Array<string>;
          authFlowMode: "gate_before_signin" | "open_then_gate_content";
          enabledEmailMagicLink: boolean;
          enabledOauthProviders: Array<string>;
          enabledPhoneOtp: boolean;
          organizationId: string;
          signupMode: "invite_only" | "self_serve_domain" | "self_serve_open";
          updatedAt: number;
          updatedByUserId: string;
        }
      >;
      getOrgConsentSettings: FunctionReference<
        "query",
        "internal",
        { organizationId: string; userId: string },
        null | {
          _creationTime: number;
          _id: string;
          openPositionsEnabled: boolean;
          ordersEnabled: boolean;
          organizationId: string;
          tradeIdeasEnabled: boolean;
          updatedAt: number;
          userId: string;
        }
      >;
      getOrgInviteByToken: FunctionReference<
        "query",
        "internal",
        { token: string },
        null | {
          _creationTime: number;
          _id: string;
          createdAt: number;
          createdByUserId: string;
          email: string;
          expiresAt: number;
          organizationId: string;
          redeemedAt?: number;
          redeemedByUserId?: string;
          revokedAt?: number;
          role: "owner" | "admin" | "staff" | "member";
          token: string;
        }
      >;
      listDomainsForOrg: FunctionReference<
        "query",
        "internal",
        { appKey?: string; organizationId: string },
        Array<{
          _creationTime: number;
          _id: string;
          appKey: string;
          createdAt: number;
          hostname: string;
          lastError?: string;
          organizationId: string;
          records?: Array<{ name: string; type: string; value: string }>;
          status: "unconfigured" | "pending" | "verified" | "error";
          updatedAt: number;
          verifiedAt?: number;
        }>
      >;
      listMembersByOrganizationId: FunctionReference<
        "query",
        "internal",
        { limit?: number; organizationId: string },
        Array<{ isActive: boolean; role: string; userId: string }>
      >;
      listOrganizationMedia: FunctionReference<
        "query",
        "internal",
        { limit?: number; organizationId: string },
        Array<{
          _creationTime: number;
          _id: string;
          contentType: string;
          createdAt: number;
          filename?: string;
          organizationId: string;
          size: number;
          storageId: string;
          updatedAt: number;
          uploadedByUserId: string;
          url: string | null;
        }>
      >;
      listOrganizations: FunctionReference<
        "query",
        "internal",
        { limit?: number; search?: string },
        Array<{
          _creationTime: number;
          _id: string;
          clerkOrganizationId?: string;
          createdAt?: number;
          description?: string;
          logo?: string;
          logoMediaId?: string;
          name: string;
          ownerId: string;
          publicProfileConfig?: {
            heroCtas?: Array<{
              id: string;
              label: string;
              url: string;
              variant?: "primary" | "outline";
            }>;
            links: Array<{ label: string; url: string }>;
            logoCrop?: { x: number; y: number };
            sections: Array<{
              enabled: boolean;
              id: string;
              kind: "hero" | "about" | "links" | "stats";
            }>;
            version: "v1";
          };
          slug: string;
          updatedAt?: number;
        }>
      >;
      listOrganizationsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          isActive: boolean;
          org: {
            _id: string;
            logoUrl: string | null;
            name: string;
            slug: string;
          };
          organizationId: string;
          role: string;
        }>
      >;
      listOrganizationsPublic: FunctionReference<
        "query",
        "internal",
        { includePlatform?: boolean; limit?: number; search?: string },
        Array<{
          _id: string;
          description?: string;
          logoUrl: string | null;
          name: string;
          slug: string;
        }>
      >;
      listOrgInvites: FunctionReference<
        "query",
        "internal",
        { includeExpired?: boolean; limit?: number; organizationId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          createdByUserId: string;
          email: string;
          expiresAt: number;
          organizationId: string;
          redeemedAt?: number;
          redeemedByUserId?: string;
          revokedAt?: number;
          role: "owner" | "admin" | "staff" | "member";
          token: string;
        }>
      >;
      listRawMembershipsByOrganization: FunctionReference<
        "query",
        "internal",
        { afterJoinedAt?: number; limit?: number; organizationId: string },
        {
          hasMore: boolean;
          rows: Array<{
            _id: string;
            isActive: boolean;
            joinedAt: number;
            organizationId: string;
            role: string;
            userId: string;
          }>;
        }
      >;
    };
  };
  launchthat_notifications: {
    mutations: {
      createNotification: FunctionReference<
        "mutation",
        "internal",
        {
          actionUrl?: string;
          content?: string;
          eventKey: string;
          orgId: string;
          tabKey?: string;
          title: string;
          userId: string;
        },
        null | string
      >;
      createNotificationOnce: FunctionReference<
        "mutation",
        "internal",
        {
          actionUrl?: string;
          content?: string;
          eventKey: string;
          orgId: string;
          tabKey?: string;
          title: string;
          userId: string;
        },
        null | string
      >;
      markAllNotificationsAsReadByUserId: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        number
      >;
      markAllNotificationsAsReadByUserIdAndOrgId: FunctionReference<
        "mutation",
        "internal",
        { orgId: string; userId: string },
        number
      >;
      markNotificationAsRead: FunctionReference<
        "mutation",
        "internal",
        { notificationId: string },
        boolean
      >;
      setOrgDefaults: FunctionReference<
        "mutation",
        "internal",
        {
          emailDefaults?: Record<string, boolean>;
          inAppDefaults?: Record<string, boolean>;
          orgId: string;
        },
        null
      >;
      setUserEventPrefs: FunctionReference<
        "mutation",
        "internal",
        {
          emailEnabled?: Record<string, boolean>;
          inAppEnabled?: Record<string, boolean>;
          orgId: string;
          userId: string;
        },
        null
      >;
      trackNotificationEvent: FunctionReference<
        "mutation",
        "internal",
        {
          channel: string;
          eventType: string;
          notificationId: string;
          targetUrl?: string;
          userId: string;
        },
        null
      >;
    };
    queries: {
      getDeliveryTogglesForUserEvent: FunctionReference<
        "query",
        "internal",
        { eventKey: string; orgId: string; userId: string },
        {
          orgEmailDefault: boolean | null;
          orgInAppDefault: boolean | null;
          userEmailOverride: boolean | null;
          userInAppOverride: boolean | null;
        }
      >;
      getEventsAnalyticsSummary: FunctionReference<
        "query",
        "internal",
        { daysBack?: number; maxRows?: number },
        {
          eventKeyMetrics: Array<{
            ctrPct: number;
            eventKey: string;
            interactions: number;
            sent: number;
          }>;
          fromCreatedAt: number;
          interactions: {
            byChannelAndType: Array<{
              channel: string;
              count: number;
              eventType: string;
            }>;
            byEventKey: Array<{ count: number; eventKey: string }>;
            events: number;
            uniqueNotifications: number;
            uniqueUsers: number;
          };
          interactionsByChannelDaily: Array<{
            date: string;
            email: number;
            inApp: number;
            other: number;
            push: number;
          }>;
          sent: {
            byEventKey: Array<{ count: number; eventKey: string }>;
            notifications: number;
          };
          timeSeriesDaily: Array<{
            ctrPct: number;
            date: string;
            interactions: number;
            sent: number;
          }>;
        }
      >;
      getOrgDefaults: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        {
          emailDefaults: Record<string, boolean>;
          inAppDefaults: Record<string, boolean>;
        }
      >;
      getUnreadCountByUserIdAcrossOrgs: FunctionReference<
        "query",
        "internal",
        { userId: string },
        number
      >;
      getUnreadCountByUserIdAndOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string; userId: string },
        number
      >;
      getUserEventPrefs: FunctionReference<
        "query",
        "internal",
        { orgId: string; userId: string },
        {
          emailEnabled: Record<string, boolean>;
          inAppEnabled: Record<string, boolean>;
        }
      >;
      listKnownEventKeysForOrg: FunctionReference<
        "query",
        "internal",
        { orgId: string; userId?: string },
        Array<string>
      >;
      paginateByUserIdAcrossOrgs: FunctionReference<
        "query",
        "internal",
        {
          filters?: { eventKey?: string; tabKey?: string };
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          userId: string;
        },
        { continueCursor: string | null; isDone: boolean; page: Array<any> }
      >;
      paginateByUserIdAndOrgId: FunctionReference<
        "query",
        "internal",
        {
          filters?: { eventKey?: string; tabKey?: string };
          orgId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          userId: string;
        },
        { continueCursor: string | null; isDone: boolean; page: Array<any> }
      >;
    };
  };
  launchthat_push: {
    mutations: {
      deleteMyPushSubscription: FunctionReference<
        "mutation",
        "internal",
        { endpoint?: string },
        null
      >;
      upsertMyPushSubscription: FunctionReference<
        "mutation",
        "internal",
        {
          subscription: {
            endpoint: string;
            expirationTime?: number | null;
            keys: { auth: string; p256dh: string };
          };
        },
        null
      >;
    };
    queries: {
      getMySubscriptionRowId: FunctionReference<
        "query",
        "internal",
        {},
        string | null
      >;
      listMySubscriptions: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          auth: string;
          endpoint: string;
          expirationTime?: number | null;
          p256dh: string;
        }>
      >;
      listSubscriptionsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          auth: string;
          endpoint: string;
          expirationTime?: number | null;
          p256dh: string;
        }>
      >;
    };
  };
  launchthat_email: {
    actions: {
      fetchReceivedEmailContent: FunctionReference<
        "action",
        "internal",
        { messageId: string; orgId: string },
        null | { html?: string; text?: string }
      >;
      revalidateSavedByoKey: FunctionReference<
        "action",
        "internal",
        { orgId: string; provider?: "resend" },
        {
          domains?: Array<{ id: string; name: string; status: string }>;
          error?: string;
          valid: boolean;
        }
      >;
      syncEmailDomain: FunctionReference<
        "action",
        "internal",
        { apiKey?: string; orgId: string },
        {
          emailDomain: string | null;
          lastError?: string;
          records: Array<{ name: string; type: string; value: string }>;
          status: "unconfigured" | "pending" | "verified" | "error";
          updatedAt: number;
        }
      >;
      syncEmailDomainWithSavedKey: FunctionReference<
        "action",
        "internal",
        { domain: string; orgId: string },
        {
          emailDomain: string | null;
          status: "unconfigured" | "pending" | "verified" | "error";
        }
      >;
      validateByoApiKey: FunctionReference<
        "action",
        "internal",
        { apiKey: string; provider?: "resend" },
        {
          domains?: Array<{ id: string; name: string; status: string }>;
          error?: string;
          valid: boolean;
        }
      >;
    };
    delivery: {
      emailSink: {
        sendTransactionalEmail: FunctionReference<
          "mutation",
          "internal",
          {
            orgId: string;
            templateKey: string;
            to: string;
            variables: Record<string, string>;
          },
          string
        >;
      };
    };
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      getAllContentByIds: FunctionReference<
        "query",
        "internal",
        { contentIds: Array<string> },
        Array<{ content: string; id: string }>
      >;
      getEmailsByIds: FunctionReference<
        "query",
        "internal",
        { emailIds: Array<string> },
        Array<any>
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bounced: boolean;
          clicked: boolean;
          complained: boolean;
          deliveryDelayed: boolean;
          errorMessage: string | null;
          failed: boolean;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          bcc?: Array<string>;
          cc?: Array<string>;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        },
        string
      >;
    };
    mutations: {
      enqueueEmail: FunctionReference<
        "mutation",
        "internal",
        {
          apiKey?: string;
          htmlBody: string;
          orgId: string;
          subject: string;
          templateKey?: string;
          textBody: string;
          to: string;
        },
        string
      >;
      enqueueTestEmail: FunctionReference<
        "mutation",
        "internal",
        { apiKey?: string; orgId: string; to: string },
        string
      >;
      resetTemplateOverride: FunctionReference<
        "mutation",
        "internal",
        { orgId: string; templateId: string },
        null
      >;
      setEmailDomain: FunctionReference<
        "mutation",
        "internal",
        { domain?: string; orgId: string },
        null
      >;
      upsertEmailSettings: FunctionReference<
        "mutation",
        "internal",
        {
          byoApiKey?: string;
          byoProvider?: "resend";
          designKey?: "clean" | "bold" | "minimal";
          enabled: boolean;
          fromLocalPart: string;
          fromMode: "portal" | "custom";
          fromName: string;
          orgId: string;
          orgMode?: "portal" | "byo";
          replyToEmail?: string;
        },
        null
      >;
      upsertTemplateOverride: FunctionReference<
        "mutation",
        "internal",
        {
          copyOverrides?: Record<string, string>;
          designOverrideKey?: "inherit" | "clean" | "bold" | "minimal";
          orgId: string;
          subjectOverride?: string;
          templateKey: string;
        },
        string
      >;
    };
    queries: {
      findOrgByInboundAddress: FunctionReference<
        "query",
        "internal",
        { domain: string; localPart: string },
        null | { orgId: string }
      >;
      getEmailDomain: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        null | {
          domain: string | null;
          lastError?: string;
          records: Array<{ name: string; type: string; value: string }>;
          status: "unconfigured" | "pending" | "verified" | "error";
          updatedAt: number;
        }
      >;
      getEmailSettings: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        null | {
          byoApiKeyMasked?: string;
          byoApiKeySet: boolean;
          byoProvider?: "resend";
          designKey?: "clean" | "bold" | "minimal";
          enabled: boolean;
          fromLocalPart: string;
          fromMode: "portal" | "custom";
          fromName: string;
          orgMode: "portal" | "byo";
          replyToEmail: string | null;
        }
      >;
      getOutboxById: FunctionReference<
        "query",
        "internal",
        { orgId: string; outboxId: string },
        null | any
      >;
      getTemplateOverrideById: FunctionReference<
        "query",
        "internal",
        { orgId: string; templateId: string },
        null | any
      >;
      listOutbox: FunctionReference<
        "query",
        "internal",
        {
          orgId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        { continueCursor: string | null; isDone: boolean; page: Array<any> }
      >;
      listTemplateOverrides: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<any>
      >;
    };
  };
  launchthat_feedback: {
    mutations: {
      addComment: FunctionReference<
        "mutation",
        "internal",
        { authorUserId: string; body: string; threadId: string },
        string
      >;
      createThread: FunctionReference<
        "mutation",
        "internal",
        {
          authorUserId: string;
          boardId: string;
          body: string;
          title: string;
          type?: "feedback" | "issue";
        },
        string
      >;
      toggleUpvote: FunctionReference<
        "mutation",
        "internal",
        { threadId: string; userId: string },
        { upvoteCount: number; upvoted: boolean }
      >;
    };
    queries: {
      getThreadWithViewer: FunctionReference<
        "query",
        "internal",
        { threadId: string; userId: string },
        null | any
      >;
      listComments: FunctionReference<
        "query",
        "internal",
        { limit?: number; threadId: string },
        Array<any>
      >;
      listThreadsForUser: FunctionReference<
        "query",
        "internal",
        {
          boardId: string;
          limit?: number;
          sort?: "trending" | "new";
          type?: "feedback" | "issue";
          userId: string;
        },
        Array<any>
      >;
    };
  };
  launchthat_crm: {
    contacts: {
      mutations: {
        createContact: FunctionReference<
          "mutation",
          "internal",
          {
            authorId?: string;
            category?: string;
            content?: string;
            excerpt?: string;
            featuredImageUrl?: string;
            meta?: any;
            organizationId?: string;
            postTypeSlug: string;
            slug: string;
            status: string;
            tags?: Array<string>;
            title: string;
            userId?: string;
          },
          string
        >;
        deleteContact: FunctionReference<
          "mutation",
          "internal",
          { contactId: string; organizationId?: string },
          null
        >;
        updateContact: FunctionReference<
          "mutation",
          "internal",
          {
            authorId?: string;
            category?: string;
            contactId: string;
            content?: string;
            excerpt?: string;
            featuredImageUrl?: string;
            meta?: any;
            organizationId?: string;
            slug?: string;
            status?: string;
            tags?: Array<string>;
            title?: string;
            userId?: string;
          },
          null
        >;
      };
      queries: {
        getContactById: FunctionReference<
          "query",
          "internal",
          { contactId: string; organizationId?: string },
          null | {
            _creationTime: number;
            _id: string;
            authorId?: string;
            category?: string;
            content?: string;
            createdAt: number;
            excerpt?: string;
            featuredImageUrl?: string;
            organizationId?: string;
            postTypeSlug: string;
            slug: string;
            status: string;
            tags?: Array<string>;
            title: string;
            updatedAt?: number;
            userId?: string;
          }
        >;
        getContactBySlug: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; slug: string },
          null | {
            _creationTime: number;
            _id: string;
            authorId?: string;
            category?: string;
            content?: string;
            createdAt: number;
            excerpt?: string;
            featuredImageUrl?: string;
            organizationId?: string;
            postTypeSlug: string;
            slug: string;
            status: string;
            tags?: Array<string>;
            title: string;
            updatedAt?: number;
            userId?: string;
          }
        >;
        getContactIdByEmail: FunctionReference<
          "query",
          "internal",
          { email: string; organizationId?: string },
          string | null
        >;
        getContactIdForUser: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; userId: string },
          string | null
        >;
        getContactMeta: FunctionReference<
          "query",
          "internal",
          { contactId: string },
          Array<{
            _creationTime: number;
            _id: string;
            contactId: string;
            createdAt: number;
            key: string;
            updatedAt?: number;
            value?: string | number | boolean | null;
          }>
        >;
        listContacts: FunctionReference<
          "query",
          "internal",
          { limit?: number; organizationId?: string; status?: string },
          Array<{
            _creationTime: number;
            _id: string;
            authorId?: string;
            category?: string;
            content?: string;
            createdAt: number;
            excerpt?: string;
            featuredImageUrl?: string;
            organizationId?: string;
            postTypeSlug: string;
            slug: string;
            status: string;
            tags?: Array<string>;
            title: string;
            updatedAt?: number;
            userId?: string;
          }>
        >;
        listContactsPaginated: FunctionReference<
          "query",
          "internal",
          {
            organizationId?: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            status?: string;
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              _creationTime: number;
              _id: string;
              authorId?: string;
              category?: string;
              content?: string;
              createdAt: number;
              excerpt?: string;
              featuredImageUrl?: string;
              organizationId?: string;
              postTypeSlug: string;
              slug: string;
              status: string;
              tags?: Array<string>;
              title: string;
              updatedAt?: number;
              userId?: string;
            }>;
          }
        >;
      };
    };
    marketingTags: {
      mutations: {
        assignMarketingTagToUser: FunctionReference<
          "mutation",
          "internal",
          {
            assignedBy?: string;
            contactId: string;
            expiresAt?: number;
            marketingTagId: string;
            notes?: string;
            organizationId?: string;
            source?: string;
          },
          string
        >;
        createMarketingTag: FunctionReference<
          "mutation",
          "internal",
          {
            category?: string;
            color?: string;
            createdBy?: string;
            description?: string;
            isActive?: boolean;
            name: string;
            organizationId?: string;
            slug?: string;
          },
          string
        >;
        removeMarketingTagFromUser: FunctionReference<
          "mutation",
          "internal",
          {
            contactId: string;
            marketingTagId: string;
            organizationId?: string;
          },
          boolean
        >;
      };
      queries: {
        contactHasMarketingTags: FunctionReference<
          "query",
          "internal",
          {
            contactId: string;
            organizationId?: string;
            requireAll?: boolean;
            tagSlugs: Array<string>;
          },
          {
            hasAccess: boolean;
            matchingTags: Array<string>;
            missingTags: Array<string>;
          }
        >;
        getContactIdForUser: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; userId: string },
          string | null
        >;
        getContactMarketingTags: FunctionReference<
          "query",
          "internal",
          { contactId: string; organizationId?: string },
          Array<{
            _id: string;
            assignedAt: number;
            assignedBy?: string;
            contactId: string;
            expiresAt?: number;
            marketingTag: {
              _creationTime: number;
              _id: string;
              category?: string;
              color?: string;
              createdAt?: number;
              createdBy?: string;
              description?: string;
              isActive?: boolean;
              name: string;
              organizationId?: string;
              slug?: string;
            };
            notes?: string;
            source?: string;
          }>
        >;
        getUserMarketingTags: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; userId: string },
          Array<{
            _id: string;
            assignedAt: number;
            assignedBy?: string;
            contactId: string;
            expiresAt?: number;
            marketingTag: {
              _creationTime: number;
              _id: string;
              category?: string;
              color?: string;
              createdAt?: number;
              createdBy?: string;
              description?: string;
              isActive?: boolean;
              name: string;
              organizationId?: string;
              slug?: string;
            };
            notes?: string;
            source?: string;
          }>
        >;
        listMarketingTags: FunctionReference<
          "query",
          "internal",
          { organizationId?: string },
          Array<{
            _creationTime: number;
            _id: string;
            category?: string;
            color?: string;
            createdAt?: number;
            createdBy?: string;
            description?: string;
            isActive?: boolean;
            name: string;
            organizationId?: string;
            slug?: string;
          }>
        >;
        listTaggedContactsByMarketingTag: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string | null;
            limit?: number;
            marketingTagId: string;
            organizationId?: string;
          },
          {
            continueCursor: string | null;
            isDone: boolean;
            page: Array<{ contactId: string; userId: string }>;
          }
        >;
      };
    };
    queries: {
      getContactCoverageCounts: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        { contactsWithUserId: number; isTruncated: boolean }
      >;
      getCrmDashboardMetrics: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        {
          contacts: { isTruncated: boolean; total: number };
          tagAssignments: { isTruncated: boolean; total: number };
          tags: { isTruncated: boolean; total: number };
        }
      >;
    };
    workflows: {
      mutations: {
        cancelWorkflow: FunctionReference<
          "mutation",
          "internal",
          { cleanup?: boolean; forceCleanup?: boolean; workflowId: string },
          { canceled: boolean; cleanedUp: boolean }
        >;
        startWorkflow: FunctionReference<
          "mutation",
          "internal",
          {
            maxParallelism?: number;
            startAsync?: boolean;
            workflowArgs: any;
            workflowHandle: string;
            workflowName: string;
          },
          { workflowId: string }
        >;
      };
      queries: {
        getWorkflowStatus: FunctionReference<
          "query",
          "internal",
          { workflowId: string },
          any
        >;
      };
    };
  };
  launchthat_ecommerce: {
    cart: {
      mutations: {
        addToCart: FunctionReference<
          "mutation",
          "internal",
          {
            productPostId: string;
            quantity?: number;
            userId: string;
            variationId?: string;
          },
          any
        >;
        addToGuestCart: FunctionReference<
          "mutation",
          "internal",
          {
            guestSessionId: string;
            productPostId: string;
            quantity?: number;
            variationId?: string;
          },
          any
        >;
        clearCart: FunctionReference<
          "mutation",
          "internal",
          { guestSessionId?: string; userId?: string },
          any
        >;
        mergeGuestCartIntoUserCart: FunctionReference<
          "mutation",
          "internal",
          { guestSessionId: string; userId: string },
          any
        >;
        removeFromCart: FunctionReference<
          "mutation",
          "internal",
          { cartItemId: string; userId: string },
          any
        >;
        removeFromGuestCart: FunctionReference<
          "mutation",
          "internal",
          { cartItemId: string; guestSessionId: string },
          any
        >;
        replaceCart: FunctionReference<
          "mutation",
          "internal",
          {
            guestSessionId?: string;
            productPostIds: Array<string>;
            userId?: string;
          },
          any
        >;
        updateCartItemQuantity: FunctionReference<
          "mutation",
          "internal",
          {
            cartItemId: string;
            guestSessionId?: string;
            quantity: number;
            userId?: string;
          },
          any
        >;
      };
      queries: {
        getCart: FunctionReference<
          "query",
          "internal",
          { guestSessionId?: string; userId?: string },
          any
        >;
      };
    };
    discounts: {
      mutations: {
        createDiscountCode: FunctionReference<
          "mutation",
          "internal",
          {
            active?: boolean;
            amount: number;
            code: string;
            kind: "percent" | "fixed";
            organizationId?: string;
          },
          string
        >;
        deleteDiscountCode: FunctionReference<
          "mutation",
          "internal",
          { id: string },
          null
        >;
        updateDiscountCode: FunctionReference<
          "mutation",
          "internal",
          {
            active?: boolean;
            amount?: number;
            code?: string;
            id: string;
            kind?: "percent" | "fixed";
          },
          null
        >;
        validateDiscountCode: FunctionReference<
          "mutation",
          "internal",
          { code: string; organizationId?: string; subtotal: number },
          {
            amount?: number;
            appliedCode?: string;
            discountAmount: number;
            kind?: "percent" | "fixed";
            ok: boolean;
            reason?: string;
          }
        >;
      };
      queries: {
        getDiscountCodeByCode: FunctionReference<
          "query",
          "internal",
          { code: string; organizationId?: string },
          null | any
        >;
        listDiscountCodes: FunctionReference<
          "query",
          "internal",
          { organizationId?: string },
          any
        >;
      };
    };
    funnels: {
      mutations: {
        ensureDefaultFunnel: FunctionReference<
          "mutation",
          "internal",
          { organizationId?: string },
          string
        >;
      };
      queries: {
        getDefaultFunnel: FunctionReference<
          "query",
          "internal",
          { organizationId?: string },
          null | {
            id: string;
            isDefault: boolean;
            slug: string;
            title?: string;
          }
        >;
        getFunnelBySlug: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; slug: string },
          null | {
            id: string;
            isDefault: boolean;
            slug: string;
            title?: string;
          }
        >;
      };
    };
    funnelSteps: {
      mutations: {
        addFunnelStep: FunctionReference<
          "mutation",
          "internal",
          {
            funnelId: string;
            kind: "checkout" | "upsell" | "thankYou";
            order?: number;
            organizationId?: string;
            slug?: string;
            title?: string;
          },
          string
        >;
        backfillFunnelStepRoutingMeta: FunctionReference<
          "mutation",
          "internal",
          { organizationId?: string },
          { scanned: number; skipped: number; updated: number }
        >;
        ensureBaselineStepsForFunnel: FunctionReference<
          "mutation",
          "internal",
          { funnelId: string; organizationId?: string },
          null
        >;
        ensureDefaultFunnelSteps: FunctionReference<
          "mutation",
          "internal",
          { organizationId?: string },
          null
        >;
        ensureFunnelStepRoutingMeta: FunctionReference<
          "mutation",
          "internal",
          { organizationId?: string; stepId: string },
          null
        >;
      };
      queries: {
        getFunnelStepById: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; stepId: string },
          null | {
            checkout?: {
              design: string;
              predefinedProductPostIds: Array<string>;
            };
            funnelId: string;
            funnelSlug: string;
            isDefaultFunnel: boolean;
            kind: string;
            order: number;
            stepId: string;
            stepSlug: string;
            stepTitle?: string;
          }
        >;
        getFunnelStepBySlug: FunctionReference<
          "query",
          "internal",
          { funnelSlug: string; organizationId?: string; stepSlug: string },
          null | {
            checkout?: {
              design: string;
              predefinedProductPostIds: Array<string>;
            };
            funnelId: string;
            funnelSlug: string;
            isDefaultFunnel: boolean;
            kind: string;
            order: number;
            stepId: string;
            stepSlug: string;
            stepTitle?: string;
          }
        >;
        getFunnelStepsForFunnel: FunctionReference<
          "query",
          "internal",
          { funnelId: string; organizationId?: string },
          Array<{
            id: string;
            kind: string;
            order: number;
            slug: string;
            title?: string;
          }>
        >;
      };
    };
    payouts: {
      actions: {
        createStripeConnectOnboardingLinkForUser: FunctionReference<
          "action",
          "internal",
          {
            businessType?: "individual" | "company";
            email?: string;
            fullName?: string;
            metadata?: any;
            productDescription?: string;
            refreshUrl: string;
            returnUrl: string;
            stripeSecretKey: string;
            supportEmail?: string;
            userId: string;
            websiteUrl?: string;
          },
          { connectAccountId: string; ok: boolean; url: string }
        >;
        disconnectStripePayoutAccountForUser: FunctionReference<
          "action",
          "internal",
          { deleteRemote?: boolean; stripeSecretKey: string; userId: string },
          { deletedLocal: boolean; deletedRemote: boolean; ok: boolean }
        >;
        getUpcomingSubscriptionDueCentsForUser: FunctionReference<
          "action",
          "internal",
          { currency?: string; stripeSecretKey: string; userId: string },
          { dueCents: number; ok: boolean }
        >;
        processStripeWebhook: FunctionReference<
          "action",
          "internal",
          {
            affiliateScopeId?: string;
            affiliateScopeType?: "site" | "org" | "app";
            rawBody: string;
            signature: string;
            stripeSecretKey: string;
            stripeWebhookSecret: string;
          },
          { handled: boolean; ok: boolean }
        >;
        runMonthly: FunctionReference<
          "action",
          "internal",
          {
            dryRun?: boolean;
            periodEnd: number;
            periodStart: number;
            provider?: string;
            providerConfig?: any;
          },
          {
            errors: Array<string>;
            ok: boolean;
            processedUsers: number;
            runId: string | null;
            totalCashCents: number;
            totalSubscriptionCreditCents: number;
          }
        >;
      };
      mutations: {
        deletePayoutAccount: FunctionReference<
          "mutation",
          "internal",
          { provider?: string; userId: string },
          { connectAccountId?: string; deleted: boolean; ok: boolean }
        >;
        setPayoutPreference: FunctionReference<
          "mutation",
          "internal",
          {
            currency?: string;
            minPayoutCents?: number;
            policy: "payout_only" | "apply_to_subscription_then_payout";
            userId: string;
          },
          { ok: boolean }
        >;
        upsertPayoutAccount: FunctionReference<
          "mutation",
          "internal",
          {
            connectAccountId: string;
            details?: any;
            provider?: string;
            status: string;
            userId: string;
          },
          { created: boolean; ok: boolean }
        >;
      };
      paymentEvents: {
        recordCommissionablePayment: FunctionReference<
          "mutation",
          "internal",
          {
            amountCents: number;
            currency?: string;
            externalEventId: string;
            kind: string;
            occurredAt?: number;
            referredUserId: string;
            scopeId?: string;
            scopeType?: "site" | "org" | "app";
            source: string;
          },
          {
            created: boolean;
            directCommissionCents: number;
            ok: boolean;
            referrerUserId: string | null;
            sponsorOverrideCents: number;
          }
        >;
      };
      queries: {
        getPayoutAccount: FunctionReference<
          "query",
          "internal",
          { provider?: string; userId: string },
          null | {
            connectAccountId: string;
            createdAt: number;
            details?: any;
            provider: string;
            status: string;
            updatedAt: number;
            userId: string;
          }
        >;
        getPayoutPreference: FunctionReference<
          "query",
          "internal",
          { userId: string },
          null | {
            createdAt: number;
            currency: string;
            minPayoutCents: number;
            policy: string;
            updatedAt: number;
            userId: string;
          }
        >;
        listPayoutTransfersForUser: FunctionReference<
          "query",
          "internal",
          { limit?: number; userId: string },
          Array<{
            cashCents: number;
            createdAt: number;
            currency: string;
            error?: string;
            externalBalanceTxnId?: string;
            externalTransferId?: string;
            provider: string;
            runId: string;
            status: string;
            subscriptionCreditCents: number;
            updatedAt: number;
            userId: string;
          }>
        >;
      };
    };
    plans: {
      mutations: {
        deactivateProductPlan: FunctionReference<
          "mutation",
          "internal",
          { productPostId: string },
          null
        >;
        seedPlans: FunctionReference<"mutation", "internal", {}, Array<string>>;
        updatePlan: FunctionReference<
          "mutation",
          "internal",
          {
            description?: string;
            displayName?: string;
            features?: Array<string>;
            isActive?: boolean;
            limits?: {
              crmMaxContacts?: number;
              discordAiDaily?: number;
              supportBubbleAiDaily?: number;
            };
            maxOrganizations?: number;
            planId: string;
            priceMonthly?: number;
            priceYearly?: number;
            sortOrder?: number;
          },
          null
        >;
        upsertProductPlan: FunctionReference<
          "mutation",
          "internal",
          {
            description?: string;
            displayName?: string;
            features?: Array<string>;
            isActive: boolean;
            limits?: {
              crmMaxContacts?: number;
              discordAiDaily?: number;
              supportBubbleAiDaily?: number;
            };
            maxOrganizations?: number;
            priceMonthly?: number;
            priceYearly?: number;
            productPostId: string;
            sortOrder?: number;
          },
          string
        >;
      };
      queries: {
        getPlanById: FunctionReference<
          "query",
          "internal",
          { planId: string },
          null | {
            _creationTime: number;
            _id: string;
            description: string;
            displayName: string;
            features?: Array<string>;
            isActive: boolean;
            kind: "system" | "product";
            limits?: {
              crmMaxContacts?: number;
              discordAiDaily?: number;
              supportBubbleAiDaily?: number;
            };
            maxOrganizations: number;
            name: string;
            priceMonthly: number;
            priceYearly?: number;
            productPostId?: string;
            sortOrder: number;
            updatedAt: number;
          }
        >;
        getPlanByName: FunctionReference<
          "query",
          "internal",
          { name: string },
          null | {
            _creationTime: number;
            _id: string;
            description: string;
            displayName: string;
            features?: Array<string>;
            isActive: boolean;
            kind: "system" | "product";
            limits?: {
              crmMaxContacts?: number;
              discordAiDaily?: number;
              supportBubbleAiDaily?: number;
            };
            maxOrganizations: number;
            name: string;
            priceMonthly: number;
            priceYearly?: number;
            productPostId?: string;
            sortOrder: number;
            updatedAt: number;
          }
        >;
        getPlanByProductPostId: FunctionReference<
          "query",
          "internal",
          { productPostId: string },
          null | {
            _creationTime: number;
            _id: string;
            description: string;
            displayName: string;
            features?: Array<string>;
            isActive: boolean;
            kind: "system" | "product";
            limits?: {
              crmMaxContacts?: number;
              discordAiDaily?: number;
              supportBubbleAiDaily?: number;
            };
            maxOrganizations: number;
            name: string;
            priceMonthly: number;
            priceYearly?: number;
            productPostId?: string;
            sortOrder: number;
            updatedAt: number;
          }
        >;
        getPlans: FunctionReference<
          "query",
          "internal",
          { isActive?: boolean },
          Array<{
            _creationTime: number;
            _id: string;
            description: string;
            displayName: string;
            features?: Array<string>;
            isActive: boolean;
            kind: "system" | "product";
            limits?: {
              crmMaxContacts?: number;
              discordAiDaily?: number;
              supportBubbleAiDaily?: number;
            };
            maxOrganizations: number;
            name: string;
            priceMonthly: number;
            priceYearly?: number;
            productPostId?: string;
            sortOrder: number;
            updatedAt: number;
          }>
        >;
        listAssignableOrgPlans: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            description: string;
            displayName: string;
            features?: Array<string>;
            isActive: boolean;
            kind: "system" | "product";
            limits?: {
              crmMaxContacts?: number;
              discordAiDaily?: number;
              supportBubbleAiDaily?: number;
            };
            maxOrganizations: number;
            name: string;
            priceMonthly: number;
            priceYearly?: number;
            productPostId?: string;
            sortOrder: number;
            updatedAt: number;
          }>
        >;
      };
    };
    posts: {
      mutations: {
        createPost: FunctionReference<
          "mutation",
          "internal",
          {
            authorId?: string;
            category?: string;
            content?: string;
            createdAt?: number;
            excerpt?: string;
            featuredImage?: string;
            featuredImageUrl?: string;
            meta?: Record<string, string | number | boolean | null>;
            organizationId?: string;
            postTypeSlug: string;
            slug: string;
            status:
              | "published"
              | "draft"
              | "archived"
              | "unpaid"
              | "paid"
              | "failed";
            tags?: Array<string>;
            title: string;
            updatedAt?: number;
          },
          any
        >;
        deletePost: FunctionReference<
          "mutation",
          "internal",
          { id: string },
          any
        >;
        setPostMeta: FunctionReference<
          "mutation",
          "internal",
          {
            key: string;
            postId: string;
            value?: string | number | boolean | null;
          },
          any
        >;
        updatePost: FunctionReference<
          "mutation",
          "internal",
          {
            category?: string;
            content?: string;
            excerpt?: string;
            featuredImage?: string;
            featuredImageUrl?: string;
            id: string;
            meta?: Record<string, string | number | boolean | null>;
            organizationId?: string;
            patch?: any;
            slug?: string;
            status?:
              | "published"
              | "draft"
              | "archived"
              | "unpaid"
              | "paid"
              | "failed";
            tags?: Array<string>;
            title?: string;
          },
          any
        >;
      };
      queries: {
        findFirstPostIdByMetaKeyValue: FunctionReference<
          "query",
          "internal",
          {
            key: string;
            organizationId?: string;
            postTypeSlug?: string;
            value: string;
          },
          null | string
        >;
        getAllPosts: FunctionReference<
          "query",
          "internal",
          {
            filters?: {
              authorId?: string;
              category?: string;
              limit?: number;
              postTypeSlug?: string;
              status?:
                | "published"
                | "draft"
                | "archived"
                | "unpaid"
                | "paid"
                | "failed";
            };
            organizationId?: string;
          },
          any
        >;
        getPostById: FunctionReference<
          "query",
          "internal",
          { id: string; organizationId?: string },
          null | any
        >;
        getPostBySlug: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; slug: string },
          null | any
        >;
        getPostCategories: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; postTypeSlug?: string },
          any
        >;
        getPostMeta: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; postId: string },
          any
        >;
        getPostTags: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; postTypeSlug?: string },
          any
        >;
        listPostIdsByMetaKeyValue: FunctionReference<
          "query",
          "internal",
          {
            key: string;
            limit?: number;
            organizationId?: string;
            postTypeSlug?: string;
            value: string;
          },
          Array<string>
        >;
        searchPosts: FunctionReference<
          "query",
          "internal",
          {
            limit?: number;
            organizationId?: string;
            postTypeSlug?: string;
            searchTerm: string;
          },
          any
        >;
      };
    };
  };
  launchthat_joincodes: {
    mutations: {
      createJoinCode: FunctionReference<
        "mutation",
        "internal",
        {
          code?: string;
          createdByUserId: string;
          expiresAt?: number;
          grants?: any;
          label?: string;
          maxUses?: number;
          organizationId?: string;
          permissions?: {
            globalEnabled?: boolean;
            openPositionsEnabled?: boolean;
            ordersEnabled?: boolean;
            tradeIdeasEnabled?: boolean;
          };
          role?: "member" | "staff" | "admin";
          scope: "platform" | "organization";
          tier?: "free" | "standard" | "pro";
        },
        { code: string; codeHash: string; joinCodeId: string }
      >;
      deactivateJoinCode: FunctionReference<
        "mutation",
        "internal",
        { joinCodeId: string },
        null
      >;
      deleteJoinCode: FunctionReference<
        "mutation",
        "internal",
        { joinCodeId: string },
        null
      >;
      redeemJoinCode: FunctionReference<
        "mutation",
        "internal",
        { code: string; redeemedByUserId: string },
        {
          expiresAt?: number;
          grants?: any;
          joinCodeId: string;
          label?: string;
          maxUses?: number;
          organizationId?: string;
          permissions?: {
            globalEnabled?: boolean;
            openPositionsEnabled?: boolean;
            ordersEnabled?: boolean;
            tradeIdeasEnabled?: boolean;
          };
          role?: "member" | "staff" | "admin";
          scope: "platform" | "organization";
          tier?: "free" | "standard" | "pro";
          uses: number;
        } | null
      >;
    };
    queries: {
      listJoinCodes: FunctionReference<
        "query",
        "internal",
        { organizationId?: string; scope: "platform" | "organization" },
        Array<{
          _id: string;
          code?: string;
          createdAt: number;
          createdByUserId: string;
          expiresAt?: number;
          grants?: any;
          isActive: boolean;
          label?: string;
          maxUses?: number;
          organizationId?: string;
          permissions?: {
            globalEnabled?: boolean;
            openPositionsEnabled?: boolean;
            ordersEnabled?: boolean;
            tradeIdeasEnabled?: boolean;
          };
          role?: "member" | "staff" | "admin";
          scope: "platform" | "organization";
          tier?: "free" | "standard" | "pro";
          updatedAt: number;
          uses: number;
        }>
      >;
    };
  };
  launchthat_affiliates: {
    admin: {
      getAffiliateProfileByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | {
          acceptedTermsAt?: number;
          acceptedTermsVersion?: string;
          createdAt: number;
          referralCode: string;
          status: "active" | "disabled";
          updatedAt: number;
          userId: string;
        }
      >;
      getProgramSettings: FunctionReference<
        "query",
        "internal",
        { scopeId: string; scopeType: "site" | "org" | "app" },
        {
          directCommissionBps: number;
          mlmEnabled: boolean;
          scopeId: string;
          scopeType: "site" | "org" | "app";
          sponsorOverrideBps: number;
          updatedAt: number;
        }
      >;
      listAffiliateConversions: FunctionReference<
        "query",
        "internal",
        { fromMs?: number; limit?: number },
        Array<{
          amountCents: number;
          currency: string;
          externalId: string;
          kind: string;
          occurredAt: number;
          referredUserId: string;
          referrerUserId: string;
        }>
      >;
      listAffiliateCreditEventsForUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        Array<{
          amountCents: number;
          conversionId?: string;
          createdAt: number;
          currency: string;
          externalEventId?: string;
          kind?: string;
          reason: string;
          referredUserId?: string;
          referrerUserId?: string;
          shortlinkCode?: string;
          utmContent?: string;
        }>
      >;
      listAffiliateLogs: FunctionReference<
        "query",
        "internal",
        { fromMs?: number; limit?: number },
        Array<{
          amountCents?: number;
          currency?: string;
          data?: any;
          externalId?: string;
          kind: string;
          message: string;
          ownerUserId: string;
          referralCode?: string;
          referredUserId?: string;
          ts: number;
          visitorId?: string;
        }>
      >;
      listAffiliateLogsForUser: FunctionReference<
        "query",
        "internal",
        { fromMs?: number; limit?: number; ownerUserId: string },
        Array<{
          amountCents?: number;
          currency?: string;
          data?: any;
          externalId?: string;
          kind: string;
          message: string;
          ownerUserId: string;
          referralCode?: string;
          referredUserId?: string;
          ts: number;
          visitorId?: string;
        }>
      >;
      listAffiliateProfiles: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          acceptedTermsAt?: number;
          acceptedTermsVersion?: string;
          createdAt: number;
          referralCode: string;
          status: "active" | "disabled";
          updatedAt: number;
          userId: string;
        }>
      >;
      listReferredUsersForReferrer: FunctionReference<
        "query",
        "internal",
        { limit?: number; referrerUserId: string },
        Array<{
          activatedAt?: number;
          attributedAt: number;
          firstPaidConversionAt?: number;
          referredUserId: string;
          shortlinkCode?: string;
          utmContent?: string;
        }>
      >;
      upsertProgramSettings: FunctionReference<
        "mutation",
        "internal",
        {
          directCommissionBps?: number;
          mlmEnabled?: boolean;
          scopeId: string;
          scopeType: "site" | "org" | "app";
          sponsorOverrideBps?: number;
        },
        {
          directCommissionBps: number;
          mlmEnabled: boolean;
          ok: boolean;
          scopeId: string;
          scopeType: "site" | "org" | "app";
          sponsorOverrideBps: number;
          updatedAt: number;
        }
      >;
    };
    analytics: {
      queries: {
        getTopLandingPathsForUser: FunctionReference<
          "query",
          "internal",
          { daysBack?: number; limit?: number; userId: string },
          {
            daysBack: number;
            referralCode: string | null;
            topLandingPaths: Array<{ clicks: number; path: string }>;
            totalClicks: number;
            userId: string;
          }
        >;
      };
    };
    conversions: {
      recordPaidConversion: FunctionReference<
        "mutation",
        "internal",
        {
          amountCents: number;
          currency: string;
          externalId: string;
          kind: "paid_subscription" | "paid_order";
          occurredAt?: number;
          proDiscountAmountOffCentsMonthly?: number;
          referredUserId: string;
          referrerIsPro?: boolean;
        },
        {
          created: boolean;
          discountGranted?: boolean;
          ok: boolean;
          referrerUserId: string | null;
        }
      >;
    };
    credit: {
      actions: {
        consumeForPayout: FunctionReference<
          "mutation",
          "internal",
          {
            cashCents?: number;
            currency?: string;
            runId: string;
            source?: string;
            subscriptionCreditCents?: number;
            userId: string;
          },
          {
            balanceCents: number;
            consumedCashCents: number;
            consumedSubscriptionCreditCents: number;
            ok: boolean;
          }
        >;
        recordCommissionDistributionFromPayment: FunctionReference<
          "mutation",
          "internal",
          {
            currency?: string;
            externalEventId: string;
            grossAmountCents: number;
            occurredAt?: number;
            paymentKind?: string;
            referredUserId: string;
            scopeId?: string;
            scopeType?: "site" | "org" | "app";
            source?: string;
          },
          {
            created: boolean;
            directCommissionCents: number;
            grossAmountCents: number;
            ok: boolean;
            referrerUserId: string | null;
            sponsorOverrideCents: number;
            sponsorUserId: string | null;
          }
        >;
        recordCommissionFromPayment: FunctionReference<
          "mutation",
          "internal",
          {
            amountCents: number;
            commissionRateBps?: number;
            currency?: string;
            externalEventId: string;
            grossAmountCents: number;
            occurredAt?: number;
            paymentKind?: string;
            referredUserId: string;
            source?: string;
          },
          {
            amountCents: number;
            created: boolean;
            grossAmountCents: number;
            ok: boolean;
            referrerUserId: string | null;
          }
        >;
      };
      queries: {
        getCreditBalance: FunctionReference<
          "query",
          "internal",
          { currency?: string; userId: string },
          { balanceCents: number; currency: string; userId: string }
        >;
      };
    };
    network: {
      mutations: {
        setMySponsorByReferralCodeOptIn: FunctionReference<
          "mutation",
          "internal",
          { nowMs?: number; referralCode: string; userId: string },
          { created: boolean; ok: boolean; sponsorUserId: string | null }
        >;
        setSponsorForUserAdmin: FunctionReference<
          "mutation",
          "internal",
          {
            adminUserId?: string;
            nowMs?: number;
            sponsorUserId: string | null;
            userId: string;
          },
          {
            ok: boolean;
            previousSponsorUserId: string | null;
            sponsorUserId: string | null;
            userId: string;
          }
        >;
      };
      queries: {
        getSponsorLinkForUser: FunctionReference<
          "query",
          "internal",
          { userId: string },
          null | {
            createdAt: number;
            createdSource: string;
            sponsorUserId: string;
            updatedAt?: number;
            updatedBy?: string;
            userId: string;
          }
        >;
        listDirectDownlineForSponsor: FunctionReference<
          "query",
          "internal",
          { limit?: number; sponsorUserId: string },
          Array<{ createdAt: number; createdSource: string; userId: string }>
        >;
      };
    };
    profiles: {
      createOrGetMyAffiliateProfile: FunctionReference<
        "mutation",
        "internal",
        { acceptTerms?: boolean; termsVersion?: string; userId: string },
        { referralCode: string; status: "active" | "disabled"; userId: string }
      >;
      getAffiliateProfileByReferralCode: FunctionReference<
        "query",
        "internal",
        { referralCode: string },
        null | {
          referralCode: string;
          status: "active" | "disabled";
          userId: string;
        }
      >;
      getAffiliateProfileByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | {
          referralCode: string;
          status: "active" | "disabled";
          userId: string;
        }
      >;
      getMyAffiliateStats: FunctionReference<
        "query",
        "internal",
        { nowMs?: number; userId: string },
        {
          activations30d: number;
          clicks30d: number;
          conversions30d: number;
          creditBalanceCents: number;
          referralCode: string | null;
          signups30d: number;
          userId: string;
        }
      >;
      setAffiliateProfileStatus: FunctionReference<
        "mutation",
        "internal",
        { status: "active" | "disabled"; userId: string },
        { ok: boolean; status: "active" | "disabled"; userId: string }
      >;
    };
    referrals: {
      queries: {
        listMyReferredUsers: FunctionReference<
          "query",
          "internal",
          { limit?: number; referrerUserId: string },
          Array<{
            activatedAt?: number;
            attributedAt: number;
            expiresAt: number;
            firstPaidConversionAt?: number;
            referredUserId: string;
            shortlinkCode?: string;
            status: string;
            utmContent?: string;
          }>
        >;
      };
    };
    rewards: {
      actions: {
        evaluateRewardsForReferrer: FunctionReference<
          "mutation",
          "internal",
          { referrerUserId: string },
          null
        >;
        grantSubscriptionDiscountBenefit: FunctionReference<
          "mutation",
          "internal",
          { amountOffCentsMonthly?: number; userId: string },
          { created: boolean; ok: boolean }
        >;
        redeemCredit: FunctionReference<
          "mutation",
          "internal",
          {
            amountCents: number;
            currency?: string;
            reason?: string;
            userId: string;
          },
          { balanceCents: number; ok: boolean }
        >;
      };
      queries: {
        listActiveBenefitsForUser: FunctionReference<
          "query",
          "internal",
          { userId: string },
          Array<{
            endsAt?: number;
            kind: string;
            startsAt: number;
            status: string;
            value: any;
          }>
        >;
      };
    };
    tracking: {
      attributeSignup: FunctionReference<
        "mutation",
        "internal",
        {
          attributionWindowDays?: number;
          nowMs?: number;
          referralCode?: string;
          referredUserId: string;
          shortlinkCode?: string;
          utmContent?: string;
          visitorId?: string;
        },
        null | {
          expiresAt: number;
          referralCode: string;
          referredUserId: string;
          referrerUserId: string;
          shortlinkCode?: string;
          utmContent?: string;
        }
      >;
      markActivated: FunctionReference<
        "mutation",
        "internal",
        { referredUserId: string; source?: "email_verified" | "manual" },
        { activated: boolean; ok: boolean; referrerUserId: string | null }
      >;
      recordClick: FunctionReference<
        "mutation",
        "internal",
        {
          ipHash?: string;
          landingPath?: string;
          referralCode: string;
          referrer?: string;
          uaHash?: string;
          visitorId: string;
        },
        null
      >;
    };
  };
  launchthat_discord: {
    automations: {
      mutations: {
        createAutomation: FunctionReference<
          "mutation",
          "internal",
          {
            action: { config: any; type: "send_message" };
            conditions?: any;
            enabled: boolean;
            guildId: string;
            name: string;
            organizationId?: string;
            scope?: "org" | "platform";
            trigger: { config: any; type: "schedule" | "event" };
          },
          string
        >;
        deleteAutomation: FunctionReference<
          "mutation",
          "internal",
          {
            automationId: string;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null
        >;
        markAutomationRun: FunctionReference<
          "mutation",
          "internal",
          {
            automationId: string;
            cursor?: string;
            lastRunAt?: number;
            nextRunAt?: number;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null
        >;
        updateAutomation: FunctionReference<
          "mutation",
          "internal",
          {
            action?: { config: any; type: "send_message" };
            automationId: string;
            conditions?: any;
            enabled?: boolean;
            name?: string;
            organizationId?: string;
            scope?: "org" | "platform";
            trigger?: { config: any; type: "schedule" | "event" };
          },
          null
        >;
      };
      queries: {
        listAutomations: FunctionReference<
          "query",
          "internal",
          {
            guildId: string;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          Array<{
            action: any;
            conditions?: any;
            createdAt: number;
            enabled: boolean;
            guildId: string;
            id: string;
            name: string;
            nextRunAt?: number;
            organizationId?: string;
            scope: "org" | "platform";
            state?: any;
            trigger: any;
            updatedAt: number;
          }>
        >;
        listDueAutomations: FunctionReference<
          "query",
          "internal",
          {
            limit?: number;
            now: number;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          Array<{
            action: any;
            conditions?: any;
            createdAt: number;
            enabled: boolean;
            guildId: string;
            id: string;
            name: string;
            nextRunAt?: number;
            organizationId: string;
            state?: any;
            trigger: any;
            updatedAt: number;
          }>
        >;
      };
    };
    delivery: {
      mutations: {
        incrementUserDeliveryStat: FunctionReference<
          "mutation",
          "internal",
          {
            kind: string;
            messagesSent?: number;
            organizationId: string;
            userId: string;
          },
          null
        >;
      };
      queries: {
        getUserDeliveryStats: FunctionReference<
          "query",
          "internal",
          {
            daysBack?: number;
            kind?: string;
            organizationId: string;
            userId: string;
          },
          {
            byDay: Array<{ day: string; messagesSent: number }>;
            daysBack: number;
            totalMessagesSent: number;
          }
        >;
      };
    };
    events: {
      mutations: {
        emitEvent: FunctionReference<
          "mutation",
          "internal",
          {
            dedupeKey?: string;
            eventKey: string;
            guildId?: string;
            organizationId?: string;
            payloadJson: string;
            scope?: "org" | "platform";
          },
          null
        >;
      };
      queries: {
        listRecentEvents: FunctionReference<
          "query",
          "internal",
          {
            eventKey?: string;
            guildId?: string;
            limit?: number;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          Array<{
            createdAt: number;
            dedupeKey?: string;
            eventKey: string;
            guildId?: string;
            id: string;
            organizationId?: string;
            payloadJson: string;
            scope: "org" | "platform";
          }>
        >;
      };
    };
    guildConnections: {
      mutations: {
        deleteGuildConnection: FunctionReference<
          "mutation",
          "internal",
          {
            guildId: string;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null
        >;
        upsertGuildConnection: FunctionReference<
          "mutation",
          "internal",
          {
            botModeAtConnect: "global" | "custom";
            connectedAt: number;
            guildId: string;
            guildName?: string;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null
        >;
      };
      queries: {
        getGuildConnectionByGuildId: FunctionReference<
          "query",
          "internal",
          { guildId: string; scope?: "org" | "platform" },
          null | {
            botModeAtConnect: "global" | "custom";
            connectedAt: number;
            guildId: string;
            guildName?: string;
            organizationId?: string;
            scope: "org" | "platform";
          }
        >;
        listGuildConnectionsForOrg: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; scope?: "org" | "platform" },
          Array<{
            botModeAtConnect: "global" | "custom";
            connectedAt: number;
            guildId: string;
            guildName?: string;
          }>
        >;
      };
    };
    guildSettings: {
      mutations: {
        upsertGuildSettings: FunctionReference<
          "mutation",
          "internal",
          {
            announcementChannelId?: string;
            announcementEventKeys?: Array<string>;
            approvedMemberRoleId?: string;
            autoJoinEnabled?: boolean;
            courseUpdatesChannelId?: string;
            escalationConfidenceThreshold?: number;
            escalationKeywords?: Array<string>;
            guildId: string;
            inviteUrl?: string;
            memberTradesChannelId?: string;
            memberTradesTemplateId?: string;
            mentorTradesChannelId?: string;
            mentorTradesTemplateId?: string;
            organizationId?: string;
            scope?: "org" | "platform";
            supportAiDisabledMessageEnabled?: boolean;
            supportAiDisabledMessageText?: string;
            supportAiEnabled: boolean;
            supportForumChannelId?: string;
            supportPrivateIntakeChannelId?: string;
            supportStaffRoleId?: string;
            threadReplyCooldownMs?: number;
          },
          null
        >;
      };
      queries: {
        getGuildSettings: FunctionReference<
          "query",
          "internal",
          {
            guildId: string;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null | {
            announcementChannelId?: string;
            announcementEventKeys?: Array<string>;
            approvedMemberRoleId?: string;
            autoJoinEnabled?: boolean;
            courseUpdatesChannelId?: string;
            escalationConfidenceThreshold?: number;
            escalationKeywords?: Array<string>;
            guildId: string;
            inviteUrl?: string;
            memberTradesChannelId?: string;
            memberTradesTemplateId?: string;
            mentorTradesChannelId?: string;
            mentorTradesTemplateId?: string;
            organizationId?: string;
            scope: "org" | "platform";
            supportAiDisabledMessageEnabled?: boolean;
            supportAiDisabledMessageText?: string;
            supportAiEnabled: boolean;
            supportForumChannelId?: string;
            supportPrivateIntakeChannelId?: string;
            supportStaffRoleId?: string;
            threadReplyCooldownMs?: number;
            updatedAt: number;
          }
        >;
      };
    };
    oauth: {
      actions: {
        completeUserLink: FunctionReference<
          "action",
          "internal",
          { code: string; state: string },
          {
            discordUserId: string;
            guildId: string | null;
            organizationId?: string;
            userId: string;
          }
        >;
        startUserLink: FunctionReference<
          "action",
          "internal",
          {
            callbackPath: string;
            organizationId?: string;
            returnTo: string;
            scope?: "org" | "platform";
            userId: string;
          },
          { state: string; url: string }
        >;
      };
      helpers: {
        queries: {
          computeAuthRedirectUri: FunctionReference<
            "query",
            "internal",
            {
              callbackPath: string;
              fallbackAuthHost?: string;
              returnTo: string;
              rootDomain?: string;
            },
            { isLocal: boolean; redirectUri: string; returnToHost: string }
          >;
        };
      };
      mutations: {
        consumeOauthState: FunctionReference<
          "mutation",
          "internal",
          { state: string },
          {
            callbackPath?: string;
            codeVerifier: string;
            kind: "org_install" | "user_link";
            organizationId?: string;
            returnTo: string;
            scope: "org" | "platform";
            userId?: string;
          } | null
        >;
        createOauthState: FunctionReference<
          "mutation",
          "internal",
          {
            callbackPath?: string;
            codeVerifier: string;
            kind: "org_install" | "user_link";
            organizationId?: string;
            returnTo: string;
            scope?: "org" | "platform";
            state: string;
            userId?: string;
          },
          null
        >;
      };
      queries: {
        peekOauthState: FunctionReference<
          "query",
          "internal",
          { state: string },
          {
            callbackPath?: string;
            codeVerifier: string;
            createdAt: number;
            kind: "org_install" | "user_link";
            organizationId?: string;
            returnTo: string;
            scope: "org" | "platform";
            userId?: string;
          } | null
        >;
      };
    };
    orgConfigs: {
      internalQueries: {
        getOrgConfigSecrets: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; scope?: "org" | "platform" },
          {
            botMode: "global" | "custom";
            botTokenEncrypted?: string;
            clientId?: string;
            clientSecretEncrypted?: string;
            customBotTokenEncrypted?: string;
            customClientId?: string;
            customClientSecretEncrypted?: string;
            enabled: boolean;
            guildId?: string;
            organizationId?: string;
            scope: "org" | "platform";
          } | null
        >;
      };
      mutations: {
        setOrgEnabled: FunctionReference<
          "mutation",
          "internal",
          {
            enabled: boolean;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null
        >;
        upsertOrgConfig: FunctionReference<
          "mutation",
          "internal",
          {
            botTokenEncrypted: string;
            clientId: string;
            clientSecretEncrypted: string;
            enabled: boolean;
            guildId: string;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null
        >;
        upsertOrgConfigV2: FunctionReference<
          "mutation",
          "internal",
          {
            botMode: "global" | "custom";
            customBotTokenEncrypted?: string;
            customClientId?: string;
            customClientSecretEncrypted?: string;
            enabled: boolean;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null
        >;
      };
      queries: {
        getOrgConfig: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; scope?: "org" | "platform" },
          {
            botMode: "global" | "custom";
            connectedAt: number;
            customClientId?: string;
            enabled: boolean;
            hasBotToken: boolean;
            hasClientSecret: boolean;
            lastError?: string;
            lastValidatedAt?: number;
            organizationId?: string;
            scope: "org" | "platform";
          } | null
        >;
      };
    };
    roleRules: {
      mutations: {
        replaceMarketingTagRoleRules: FunctionReference<
          "mutation",
          "internal",
          {
            marketingTagId: string;
            organizationId: string;
            rules: Array<{
              guildId: string;
              roleId: string;
              roleName?: string;
            }>;
          },
          null
        >;
        replaceOrgRoleRules: FunctionReference<
          "mutation",
          "internal",
          {
            organizationId: string;
            rules: Array<{
              enabled: boolean;
              guildId?: string;
              kind: "product" | "marketingTag";
              marketingTagId?: string;
              productId?: string;
              roleId: string;
              roleName?: string;
            }>;
          },
          null
        >;
        replaceProductRoleRules: FunctionReference<
          "mutation",
          "internal",
          {
            organizationId: string;
            productId: string;
            rules: Array<{
              guildId: string;
              roleId: string;
              roleName?: string;
            }>;
          },
          null
        >;
      };
      queries: {
        listRoleRulesForMarketingTags: FunctionReference<
          "query",
          "internal",
          { marketingTagIds: Array<string>; organizationId: string },
          Array<{
            enabled: boolean;
            guildId?: string;
            marketingTagId: string;
            roleId: string;
            roleName?: string;
          }>
        >;
        listRoleRulesForOrgKind: FunctionReference<
          "query",
          "internal",
          { kind: "product" | "marketingTag"; organizationId: string },
          Array<{
            enabled: boolean;
            guildId?: string;
            roleId: string;
            roleName?: string;
          }>
        >;
        listRoleRulesForProduct: FunctionReference<
          "query",
          "internal",
          { organizationId: string; productId: string },
          Array<{
            enabled: boolean;
            guildId?: string;
            roleId: string;
            roleName?: string;
          }>
        >;
      };
    };
    routing: {
      mutations: {
        replaceRoutingRules: FunctionReference<
          "mutation",
          "internal",
          {
            guildId: string;
            kind: "trade_feed";
            organizationId?: string;
            rules: Array<{
              channelId: string;
              channelKind?: "mentors" | "members";
              conditions?: {
                actorRoles?: Array<string>;
                symbols?: Array<string>;
              };
              enabled: boolean;
              order: number;
              priority: number;
            }>;
            scope?: "org" | "platform";
          },
          null
        >;
        upsertRoutingRuleSet: FunctionReference<
          "mutation",
          "internal",
          {
            guildId: string;
            kind: "trade_feed";
            matchStrategy: "first_match" | "multi_cast" | "priority";
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null
        >;
      };
      queries: {
        getRoutingRuleSet: FunctionReference<
          "query",
          "internal",
          {
            guildId: string;
            kind: "trade_feed";
            organizationId?: string;
            scope?: "org" | "platform";
          },
          null | {
            guildId: string;
            kind: "trade_feed";
            matchStrategy: "first_match" | "multi_cast" | "priority";
            organizationId?: string;
            scope: "org" | "platform";
            updatedAt: number;
          }
        >;
        listRoutingRules: FunctionReference<
          "query",
          "internal",
          {
            guildId: string;
            kind: "trade_feed";
            organizationId?: string;
            scope?: "org" | "platform";
          },
          Array<{
            channelId: string;
            conditions?: {
              actorRoles?: Array<string>;
              symbols?: Array<string>;
            };
            enabled: boolean;
            id: string;
            order: number;
            priority: number;
          }>
        >;
        resolveChannelsForEvent: FunctionReference<
          "query",
          "internal",
          {
            actorRole: string;
            guildId: string;
            kind: "trade_feed";
            organizationId?: string;
            scope?: "org" | "platform";
            symbol: string;
          },
          Array<string>
        >;
        resolveTradeFeedChannel: FunctionReference<
          "query",
          "internal",
          {
            channelKind: "mentors" | "members";
            guildId: string;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          string | null
        >;
      };
    };
    support: {
      mutations: {
        logDiscordApiCall: FunctionReference<
          "mutation",
          "internal",
          {
            error?: string;
            guildId?: string;
            kind: string;
            method: string;
            organizationId?: string;
            retryAfterMs?: number;
            status: number;
            url: string;
          },
          null
        >;
        recordSupportAiRun: FunctionReference<
          "mutation",
          "internal",
          {
            answer: string;
            confidence?: number;
            escalated: boolean;
            guildId: string;
            model?: string;
            organizationId: string;
            promptHash: string;
            threadId: string;
            triggerMessageId: string;
          },
          null
        >;
        setEscalationMapping: FunctionReference<
          "mutation",
          "internal",
          {
            guildId: string;
            keyword?: string;
            organizationId: string;
            privateThreadId: string;
            publicThreadId: string;
            requesterDiscordUserId: string;
          },
          null
        >;
        upsertSupportThreadAndMessage: FunctionReference<
          "mutation",
          "internal",
          {
            authorDiscordUserId?: string;
            authorIsBot?: boolean;
            content?: string;
            createdByDiscordUserId?: string;
            forumChannelId?: string;
            guildId: string;
            messageCreatedAt?: number;
            messageId?: string;
            organizationId: string;
            threadId: string;
            threadName?: string;
          },
          null
        >;
      };
      queries: {
        getEscalationMappingForThread: FunctionReference<
          "query",
          "internal",
          { guildId: string; threadId: string },
          null | {
            privateThreadId: string;
            publicThreadId: string;
            requesterDiscordUserId: string;
          }
        >;
        hasAiRunForTriggerMessage: FunctionReference<
          "query",
          "internal",
          { guildId: string; triggerMessageId: string },
          boolean
        >;
      };
    };
    syncJobs: {
      mutations: {
        deleteJob: FunctionReference<
          "mutation",
          "internal",
          { jobId: string },
          null
        >;
        enqueueSyncJob: FunctionReference<
          "mutation",
          "internal",
          {
            organizationId: string;
            payload: any;
            reason: "purchase" | "tagChange" | "manual";
            userId: string;
          },
          null
        >;
        setJobStatus: FunctionReference<
          "mutation",
          "internal",
          {
            attempts?: number;
            jobId: string;
            lastError?: string;
            status: "pending" | "processing" | "done" | "failed";
          },
          null
        >;
      };
      queries: {
        listPendingJobs: FunctionReference<
          "query",
          "internal",
          { limit?: number },
          Array<{
            _id: string;
            attempts: number;
            createdAt: number;
            organizationId: string;
            payload: any;
            reason: "purchase" | "tagChange" | "manual";
            userId: string;
          }>
        >;
      };
    };
    templates: {
      mutations: {
        createTemplate: FunctionReference<
          "mutation",
          "internal",
          {
            description?: string;
            guildId?: string;
            kind: string;
            name: string;
            organizationId?: string;
            scope?: "org" | "platform";
            template: string;
            templateJson?: string;
          },
          string
        >;
        deleteTemplate: FunctionReference<
          "mutation",
          "internal",
          {
            organizationId?: string;
            scope?: "org" | "platform";
            templateId: string;
          },
          null
        >;
        updateTemplate: FunctionReference<
          "mutation",
          "internal",
          {
            description?: string;
            name?: string;
            organizationId?: string;
            scope?: "org" | "platform";
            template?: string;
            templateId: string;
            templateJson?: string;
          },
          null
        >;
        upsertTemplate: FunctionReference<
          "mutation",
          "internal",
          {
            description?: string;
            guildId?: string;
            kind: string;
            name?: string;
            organizationId?: string;
            scope?: "org" | "platform";
            template: string;
            templateJson?: string;
          },
          null
        >;
      };
      queries: {
        getTemplate: FunctionReference<
          "query",
          "internal",
          { guildId?: string; kind: string; organizationId: string },
          null | { template: string; updatedAt: number }
        >;
        getTemplateById: FunctionReference<
          "query",
          "internal",
          {
            organizationId?: string;
            scope?: "org" | "platform";
            templateId: string;
          },
          null | {
            _id: string;
            createdAt?: number;
            description?: string;
            guildId?: string;
            kind: string;
            name?: string;
            template: string;
            templateJson?: string;
            updatedAt: number;
          }
        >;
        listTemplates: FunctionReference<
          "query",
          "internal",
          {
            guildId?: string;
            kind: string;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          Array<{
            _id: string;
            createdAt?: number;
            description?: string;
            guildId?: string;
            kind: string;
            name?: string;
            scope: "org" | "guild";
            template: string;
            templateJson?: string;
            updatedAt: number;
          }>
        >;
        renderTradeIdeaMessage: FunctionReference<
          "query",
          "internal",
          {
            avgEntryPrice?: number;
            closedAt?: number;
            direction: "long" | "short";
            fees?: number;
            guildId?: string;
            netQty: number;
            openedAt?: number;
            organizationId?: string;
            realizedPnl?: number;
            scope?: "org" | "platform";
            status: "open" | "closed";
            symbol: string;
            templateId?: string;
          },
          { content: string }
        >;
      };
    };
    userLinks: {
      mutations: {
        linkUser: FunctionReference<
          "mutation",
          "internal",
          {
            discordAvatar?: string;
            discordDiscriminator?: string;
            discordGlobalName?: string;
            discordUserId: string;
            discordUsername?: string;
            organizationId?: string;
            scope?: "org" | "platform";
            userId: string;
          },
          null
        >;
        unlinkUser: FunctionReference<
          "mutation",
          "internal",
          {
            organizationId?: string;
            scope?: "org" | "platform";
            userId: string;
          },
          null
        >;
      };
      queries: {
        getUserIdByDiscordUserId: FunctionReference<
          "query",
          "internal",
          {
            discordUserId: string;
            organizationId?: string;
            scope?: "org" | "platform";
          },
          {
            discordAvatar?: string;
            discordDiscriminator?: string;
            discordGlobalName?: string;
            discordUsername?: string;
            linkedAt: number;
            userId: string;
          } | null
        >;
        getUserLink: FunctionReference<
          "query",
          "internal",
          {
            organizationId?: string;
            scope?: "org" | "platform";
            userId: string;
          },
          {
            discordAvatar?: string;
            discordDiscriminator?: string;
            discordGlobalName?: string;
            discordUserId: string;
            discordUsername?: string;
            linkedAt: number;
            organizationId?: string;
            scope: "org" | "platform";
          } | null
        >;
        getUserLinkForUser: FunctionReference<
          "query",
          "internal",
          { scope?: "org" | "platform"; userId: string },
          {
            discordAvatar?: string;
            discordDiscriminator?: string;
            discordGlobalName?: string;
            discordUserId: string;
            discordUsername?: string;
            linkedAt: number;
            organizationId?: string;
            scope: "org" | "platform";
          } | null
        >;
      };
    };
    userStreaming: {
      mutations: {
        setUserStreamingEnabled: FunctionReference<
          "mutation",
          "internal",
          {
            enabled: boolean;
            organizationId?: string;
            scope?: "org" | "platform";
            userId: string;
          },
          null
        >;
      };
      queries: {
        getUserStreamingPrefs: FunctionReference<
          "query",
          "internal",
          {
            organizationId?: string;
            scope?: "org" | "platform";
            userId: string;
          },
          null | {
            disabledAt?: number;
            enabled: boolean;
            enabledAt?: number;
            updatedAt: number;
          }
        >;
      };
    };
  };
  launchthat_onboarding: {
    mutations: {
      dismissOnboarding: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; userId: string },
        null
      >;
      markOnboardingComplete: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; userId: string },
        null
      >;
      setStepComplete: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; stepId: string; userId: string },
        null
      >;
      setWalkthroughProgress: FunctionReference<
        "mutation",
        "internal",
        {
          lastStep?: number;
          organizationId: string;
          status: "started" | "dismissed" | "completed" | "reset";
          tourId: string;
          userId: string;
        },
        null
      >;
      upsertOnboardingConfig: FunctionReference<
        "mutation",
        "internal",
        {
          allowDismiss?: boolean;
          bypassRoles?: Array<string>;
          ctaLabel?: string;
          ctaRoute?: string;
          description?: string;
          enabled: boolean;
          modalMediaUrl?: string;
          organizationId: string;
          roleBypassEnabled?: boolean;
          showWhenNoRequiredSteps?: boolean;
          steps: Array<{
            description?: string;
            id: string;
            mediaUrl?: string;
            meta?: {
              discordGuildId?: string;
              platform?: string;
              url?: string;
              walkthroughIds?: Array<string>;
            };
            required?: boolean;
            route?: string;
            title: string;
            type?: string;
          }>;
          title?: string;
        },
        null
      >;
    };
    queries: {
      getOnboardingConfig: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        null | {
          allowDismiss: boolean;
          bypassRoles: Array<string>;
          createdAt: number;
          ctaLabel?: string;
          ctaRoute?: string;
          description?: string;
          enabled: boolean;
          modalMediaUrl?: string;
          organizationId: string;
          roleBypassEnabled: boolean;
          showWhenNoRequiredSteps: boolean;
          steps: Array<{
            description?: string;
            id: string;
            mediaUrl?: string;
            meta?: {
              discordGuildId?: string;
              platform?: string;
              url?: string;
              walkthroughIds?: Array<string>;
            };
            required?: boolean;
            route?: string;
            title: string;
            type?: string;
          }>;
          title?: string;
          updatedAt: number;
        }
      >;
      getOnboardingStatus: FunctionReference<
        "query",
        "internal",
        { organizationId: string; role?: string; userId: string },
        {
          allowDismiss: boolean;
          bypassRoles: Array<string>;
          canDismiss: boolean;
          ctaLabel?: string;
          ctaRoute?: string;
          description?: string;
          dismissedAt?: number;
          enabled: boolean;
          modalMediaUrl?: string;
          roleBypassEnabled: boolean;
          shouldBlock: boolean;
          showWhenNoRequiredSteps: boolean;
          steps: Array<{
            completed: boolean;
            description?: string;
            id: string;
            mediaUrl?: string;
            meta?: {
              discordGuildId?: string;
              platform?: string;
              url?: string;
              walkthroughIds?: Array<string>;
            };
            route?: string;
            title: string;
            type?: string;
          }>;
          title?: string;
        }
      >;
      getWalkthroughProgress: FunctionReference<
        "query",
        "internal",
        { organizationId: string; tourId: string; userId: string },
        null | {
          completed: boolean;
          completedAt?: number;
          dismissed: boolean;
          dismissedAt?: number;
          lastStep?: number;
          updatedAt: number;
        }
      >;
    };
  };
  launchthat_access: {
    actions: {
      materializeEntitlementsForUser: FunctionReference<
        "mutation",
        "internal",
        {
          planFeatures?: any;
          planLimits?: any;
          planSlug: string;
          planUpdatedAt: number;
          skipCustomized: boolean;
          tier?: "free" | "standard" | "pro";
          userId: string;
        },
        {
          ok: boolean;
          reason: "updated" | "skipped_customized" | "noop";
          tickAt: number;
          updated: boolean;
        }
      >;
    };
    mutations: {
      assignUserToPlan: FunctionReference<
        "mutation",
        "internal",
        { planSlug: string; userId: string },
        { ok: boolean }
      >;
      deletePlanBySlug: FunctionReference<
        "mutation",
        "internal",
        { slug: string },
        { ok: boolean }
      >;
      ensureDefaultPlan: FunctionReference<
        "mutation",
        "internal",
        { name?: string; slug?: string },
        { ok: boolean; slug: string }
      >;
      incrementOrgUsageCounter: FunctionReference<
        "mutation",
        "internal",
        {
          kind: string;
          maxCount: number;
          organizationId: string;
          scope: string | null;
          windowStartMs: number;
        },
        { allowed: boolean; maxCount: number; nextCount: number }
      >;
      setDefaultPlan: FunctionReference<
        "mutation",
        "internal",
        { slug: string },
        { ok: boolean }
      >;
      setUserRoleKey: FunctionReference<
        "mutation",
        "internal",
        { roleKey: string; userId: string },
        { ok: boolean }
      >;
      upsertPlan: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          isActive?: boolean;
          isDefault?: boolean;
          name: string;
          slug: string;
        },
        { ok: boolean }
      >;
      upsertPlanEntitlements: FunctionReference<
        "mutation",
        "internal",
        { features?: any; limits?: any; planSlug: string },
        { ok: boolean }
      >;
      upsertRoleDefinition: FunctionReference<
        "mutation",
        "internal",
        { description?: string; isAdmin: boolean; key: string; label: string },
        { ok: boolean }
      >;
      upsertUserEntitlement: FunctionReference<
        "mutation",
        "internal",
        {
          customizedAt?: number;
          limits?: any;
          sourcePlanSlug?: string;
          sourcePlanUpdatedAt?: number;
          tier: "free" | "standard" | "pro";
          userId: string;
        },
        { ok: boolean }
      >;
    };
    queries: {
      getDefaultPlan: FunctionReference<
        "query",
        "internal",
        {},
        null | {
          createdAt: number;
          description?: string;
          isActive?: boolean;
          isDefault?: boolean;
          name: string;
          slug: string;
          updatedAt: number;
        }
      >;
      getDefaultPlanWithEntitlements: FunctionReference<
        "query",
        "internal",
        {},
        null | {
          entitlements: null | {
            features?: any;
            limits?: any;
            planSlug: string;
            updatedAt: number;
          };
          plan: {
            createdAt: number;
            description?: string;
            isActive?: boolean;
            isDefault?: boolean;
            name: string;
            slug: string;
            updatedAt: number;
          };
        }
      >;
      getPlanBySlug: FunctionReference<
        "query",
        "internal",
        { slug: string },
        null | {
          createdAt: number;
          description?: string;
          isActive?: boolean;
          isDefault?: boolean;
          name: string;
          slug: string;
          updatedAt: number;
        }
      >;
      getPlanEntitlements: FunctionReference<
        "query",
        "internal",
        { planSlug: string },
        any
      >;
      getUserEntitlement: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | {
          customizedAt?: number;
          limits?: any;
          sourcePlanSlug?: string;
          sourcePlanUpdatedAt?: number;
          tier: "free" | "standard" | "pro";
          updatedAt: number;
          userId: string;
        }
      >;
      getUserPlanAssignment: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | {
          assignedAt: number;
          planSlug: string;
          updatedAt: number;
          userId: string;
        }
      >;
      getUserRoleKey: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | string
      >;
      isUserAdmin: FunctionReference<
        "query",
        "internal",
        { userId: string },
        boolean
      >;
      listPlans: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          createdAt: number;
          description?: string;
          isActive?: boolean;
          isDefault?: boolean;
          name: string;
          slug: string;
          updatedAt: number;
        }>
      >;
      listPlansWithEntitlements: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          entitlements: null | {
            features?: any;
            limits?: any;
            planSlug: string;
            updatedAt: number;
          };
          plan: {
            createdAt: number;
            description?: string;
            isActive?: boolean;
            isDefault?: boolean;
            name: string;
            slug: string;
            updatedAt: number;
          };
        }>
      >;
      listRoleDefinitions: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          createdAt: number;
          description?: string;
          isAdmin: boolean;
          key: string;
          label: string;
          updatedAt: number;
        }>
      >;
      listUserIdsByRoleKey: FunctionReference<
        "query",
        "internal",
        { limit?: number; roleKey: string },
        Array<string>
      >;
      listUserPlanAssignmentsByPlanSlug: FunctionReference<
        "query",
        "internal",
        { limit?: number; planSlug: string },
        Array<{
          assignedAt: number;
          planSlug: string;
          updatedAt: number;
          userId: string;
        }>
      >;
    };
  };
  launchthat_observability: {
    events: {
      mutations: {
        insertLogEntry: FunctionReference<
          "mutation",
          "internal",
          {
            actorUserId?: string;
            appKey: string;
            createdAt?: number;
            kind: string;
            level: "debug" | "info" | "warn" | "error";
            message: string;
            metadata?: any;
            organizationId?: string;
            pluginKey: string;
            status?: "scheduled" | "running" | "complete" | "failed";
          },
          string
        >;
        recordEventInternal: FunctionReference<
          "mutation",
          "internal",
          {
            actorUserId?: string;
            appKey: string;
            createdAt?: number;
            ctaHref?: string;
            ctaLabel?: string;
            depth?: number;
            domain: string;
            event: string;
            funnelStage?: string;
            leadMagnetId?: string;
            level?: "debug" | "info" | "warn" | "error";
            message?: string;
            metadata?: any;
            organizationId?: string;
            path?: string;
            pluginKey?: string;
            properties?: any;
            slug?: string;
            source?: string;
            status?: "scheduled" | "running" | "complete" | "failed";
            targetPersona?: string;
          },
          string
        >;
      };
      queries: {
        getEventSummary: FunctionReference<
          "query",
          "internal",
          {
            appKey: string;
            daysBack?: number;
            organizationId?: string;
            pluginKey?: string;
          },
          {
            appKey: string;
            byLevel: Array<{ count: number; value: string }>;
            topEvents: Array<{ count: number; value: string }>;
            totalEvents: number;
            uniqueEvents: number;
            uniqueUsers: number;
            windowEndMs: number;
            windowStartMs: number;
          }
        >;
        listRecentEvents: FunctionReference<
          "query",
          "internal",
          {
            afterMs?: number;
            appKey: string;
            beforeMs?: number;
            domain?: string;
            event?: string;
            level?: "debug" | "info" | "warn" | "error";
            limit?: number;
            organizationId?: string;
            pluginKey?: string;
            source?: string;
            status?: "scheduled" | "running" | "complete" | "failed";
          },
          Array<{
            _creationTime: number;
            _id: string;
            actorUserId?: string;
            appKey: string;
            createdAt: number;
            ctaHref?: string;
            ctaLabel?: string;
            depth?: number;
            domain: string;
            event: string;
            funnelStage?: string;
            leadMagnetId?: string;
            level: "debug" | "info" | "warn" | "error";
            message?: string;
            metadata?: any;
            organizationId?: string;
            path?: string;
            pluginKey?: string;
            properties?: any;
            slug?: string;
            source?: string;
            status?: "scheduled" | "running" | "complete" | "failed";
            targetPersona?: string;
          }>
        >;
      };
    };
  };
  launchthat_shortlinks: {
    mutations: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          appKey: string;
          createdByUserId?: string;
          expiresAt?: number;
          kind?: string;
          path: string;
          targetId?: string;
        },
        { code: string }
      >;
      trackClickByCode: FunctionReference<
        "mutation",
        "internal",
        { appKey: string; code: string },
        null
      >;
      upsertSettings: FunctionReference<
        "mutation",
        "internal",
        {
          alphabet?: string;
          appKey: string;
          codeLength: number;
          domain: string;
          enabled: boolean;
          updatedByUserId?: string;
        },
        null
      >;
    };
    queries: {
      getByCode: FunctionReference<
        "query",
        "internal",
        { appKey: string; code: string },
        {
          appKey: string;
          code: string;
          disabledAt?: number;
          expiresAt?: number;
          kind?: string;
          path: string;
          targetId?: string;
        } | null
      >;
      getSettings: FunctionReference<
        "query",
        "internal",
        { appKey: string },
        {
          alphabet: string;
          codeLength: number;
          domain: string;
          enabled: boolean;
        }
      >;
      listByCreator: FunctionReference<
        "query",
        "internal",
        {
          appKey: string;
          createdByUserId: string;
          kind: string;
          limit?: number;
        },
        Array<{
          appKey: string;
          clickCount?: number;
          code: string;
          createdAt: number;
          createdByUserId?: string;
          disabledAt?: number;
          expiresAt?: number;
          kind?: string;
          lastAccessAt?: number;
          path: string;
          targetId?: string;
        }>
      >;
    };
  };
};

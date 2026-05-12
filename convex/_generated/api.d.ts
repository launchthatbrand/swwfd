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
  mondayHireEventBackfill: {
    cancelBackfill: FunctionReference<
      "mutation",
      "public",
      { jobId?: Id<"mondayHireEventBackfillJobs"> },
      { jobId: Id<"mondayHireEventBackfillJobs">; status: string }
    >;
    getLatestJob: FunctionReference<
      "query",
      "public",
      {},
      null | {
        contactBoardId: string;
        createdEvents: number;
        currentCursor?: string | null;
        dateFrom: string;
        dateTo: string;
        dryRun: boolean;
        errorsCount: number;
        finishedAt?: number | null;
        inRangeContacts: number;
        jobId: Id<"mondayHireEventBackfillJobs">;
        lastError?: string | null;
        monthKey: string;
        pageSize: number;
        processedContacts: number;
        skippedEvents: number;
        startedAt: number;
        status: "running" | "done" | "failed" | "cancelled";
        subitemBoardId?: string | null;
        updatedAt: number;
        workflowId?: string;
      }
    >;
    startBackfill: FunctionReference<
      "mutation",
      "public",
      { dryRun?: boolean; monthKey: string; pageSize?: number },
      { jobId: Id<"mondayHireEventBackfillJobs">; workflowId: string }
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
        createdTouchRecords?: number;
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
        monthKey?: string;
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
        monthKey?: string;
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
    getPlatformSettings: FunctionReference<
      "query",
      "public",
      {},
      {
        adminUserIds: Array<string>;
        employeeUserIds: Array<string>;
        masterAdminUserId: string;
        monthlyBoardMappings: Array<{ boardId: string; monthKey: string }>;
        replyToEmails: Array<string>;
      }
    >;
    setFeatureFlags: FunctionReference<
      "mutation",
      "public",
      { emailMarketingEnabled: boolean; updatedByMondayUserId: string },
      { emailMarketingEnabled: boolean }
    >;
    setPlatformSettings: FunctionReference<
      "mutation",
      "public",
      {
        adminUserIds: Array<string>;
        employeeUserIds: Array<string>;
        monthlyBoardMappings: Array<{ boardId: string; monthKey: string }>;
        replyToEmails: Array<string>;
        updatedByMondayUserId: string;
      },
      {
        adminUserIds: Array<string>;
        employeeUserIds: Array<string>;
        masterAdminUserId: string;
        monthlyBoardMappings: Array<{ boardId: string; monthKey: string }>;
        replyToEmails: Array<string>;
      }
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
  mondayTouchRangeBackfill: {
    cancelRangeBackfill: FunctionReference<
      "mutation",
      "public",
      { jobId?: Id<"mondayTouchRangeBackfillJobs"> },
      { jobId: Id<"mondayTouchRangeBackfillJobs">; status: string }
    >;
    getLatestJob: FunctionReference<
      "query",
      "public",
      {},
      null | {
        contactBoardId: string;
        createdTouches: number;
        currentCursor?: string | null;
        dateFrom: string;
        dateTo: string;
        dryRun: boolean;
        errorsCount: number;
        finishedAt?: number | null;
        inRangeContacts: number;
        jobId: Id<"mondayTouchRangeBackfillJobs">;
        lastError?: string | null;
        pageSize: number;
        processedContacts: number;
        skippedTouches: number;
        startedAt: number;
        status: "running" | "done" | "failed" | "cancelled";
        touchBoardId: string;
        updatedAt: number;
        updatedTouches: number;
        workflowId?: string;
      }
    >;
    startRangeBackfill: FunctionReference<
      "mutation",
      "public",
      { dateFrom: string; dateTo: string; dryRun?: boolean; pageSize?: number },
      { jobId: Id<"mondayTouchRangeBackfillJobs">; workflowId: string }
    >;
  };
  mondayUserBoardSettings: {
    getForOwnerBoard: FunctionReference<
      "query",
      "public",
      { accountId: string; ownerMondayUserId: string },
      {
        colorTheme:
          | "neutral"
          | "sky"
          | "emerald"
          | "violet"
          | "rose"
          | "custom";
        createdAt: number;
        customTheme?: { alpha: number; colorHex: string };
        displayMode?: "table" | "grid";
        fontSize: "default" | "medium" | "large";
        ownerMondayUserId: string;
        pageSize?: number;
        recordSource?: "created_in_month" | "touched_in_month";
        tableDensity?: "expanded" | "compact";
        updatedAt: number;
      }
    >;
    upsertForOwnerBoard: FunctionReference<
      "mutation",
      "public",
      {
        accountId: string;
        colorTheme:
          | "neutral"
          | "sky"
          | "emerald"
          | "violet"
          | "rose"
          | "custom";
        customTheme?: { alpha: number; colorHex: string };
        displayMode?: "table" | "grid";
        fontSize: "default" | "medium" | "large";
        ownerMondayUserId: string;
        pageSize?: number;
        recordSource?: "created_in_month" | "touched_in_month";
        tableDensity?: "expanded" | "compact";
        viewerMondayUserId: string;
      },
      {
        colorTheme:
          | "neutral"
          | "sky"
          | "emerald"
          | "violet"
          | "rose"
          | "custom";
        createdAt: number;
        customTheme?: { alpha: number; colorHex: string };
        displayMode?: "table" | "grid";
        fontSize: "default" | "medium" | "large";
        ownerMondayUserId: string;
        pageSize?: number;
        recordSource?: "created_in_month" | "touched_in_month";
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
  outlookConnections: {
    getByMondayIdentity: FunctionReference<
      "query",
      "public",
      {
        mondayAccountId: string;
        mondayAppClientId?: string;
        mondayUserId: string;
      },
      {
        _creationTime: number;
        _id: Id<"outlookConnections">;
        accessTokenExpiresAt: number;
        clientId: string;
        createdAt: number;
        displayName: string | null;
        email: string | null;
        encryptedAccessToken: string | null;
        encryptedRefreshToken: string;
        mondayAccountId: string;
        mondayAppClientId: string | null;
        mondayUserId: string;
        scopes: Array<string>;
        tenantId: string;
        updatedAt: number;
      } | null
    >;
    listForAdmin: FunctionReference<
      "query",
      "public",
      { limit?: number },
      Array<{
        _creationTime: number;
        _id: Id<"outlookConnections">;
        accessTokenExpiresAt: number;
        clientId: string;
        createdAt: number;
        displayName: string | null;
        email: string | null;
        encryptedAccessToken: string | null;
        encryptedRefreshToken: string;
        mondayAccountId: string;
        mondayAppClientId: string | null;
        mondayUserId: string;
        scopes: Array<string>;
        tenantId: string;
        updatedAt: number;
      }>
    >;
    removeByMondayIdentity: FunctionReference<
      "mutation",
      "public",
      {
        mondayAccountId: string;
        mondayAppClientId?: string;
        mondayUserId: string;
      },
      { removedCount: number }
    >;
    removeConnectionAsAdmin: FunctionReference<
      "mutation",
      "public",
      { connectionId: Id<"outlookConnections"> },
      { removed: boolean }
    >;
    upsertByMondayIdentity: FunctionReference<
      "mutation",
      "public",
      {
        accessTokenExpiresAt: number;
        clientId: string;
        displayName?: string;
        email?: string;
        encryptedAccessToken?: string;
        encryptedRefreshToken: string;
        mondayAccountId: string;
        mondayAppClientId?: string;
        mondayUserId: string;
        scopes: Array<string>;
        tenantId: string;
      },
      { connectionId: Id<"outlookConnections"> }
    >;
  };
  outlookInbound: {
    getGraphSubscriptionBySubscriptionId: FunctionReference<
      "query",
      "public",
      { subscriptionId: string },
      {
        _creationTime: number;
        _id: Id<"outlookGraphSubscriptions">;
        changeType: string;
        clientState: string;
        connectionEmail: string | null;
        createdAt: number;
        expirationDateTime: string;
        expirationTimestamp: number;
        lastError: string | null;
        lastRenewedAt: number | null;
        mondayAccountId: string;
        mondayAppClientId: string | null;
        mondayUserId: string;
        notificationUrl: string;
        resource: string;
        status: "active" | "expired" | "deleted" | "error";
        subscriptionId: string;
        updatedAt: number;
      } | null
    >;
    getInboundMessageByDedupeKey: FunctionReference<
      "query",
      "public",
      { dedupeKey: string },
      {
        _creationTime: number;
        _id: Id<"outlookInboundMessages">;
        contactItemId: string | null;
        conversationId: string | null;
        correlationConfidence: "high" | "medium" | "low" | null;
        correlationMethod:
          | "inReplyTo"
          | "conversationId"
          | "senderEmail"
          | "none"
          | null;
        createdAt: number;
        dedupeKey: string;
        errorMessage: string | null;
        fromEmail: string;
        graphMessageId: string;
        inReplyTo: string | null;
        internetMessageId: string | null;
        matchedContactEmail: string | null;
        mirrorMondaySubitemId: string | null;
        mirrorMondayUpdateId: string | null;
        mirrorTouchId: string | null;
        outboundMessageId?: Id<"outlookOutboundMessages">;
        parsedBody: string | null;
        rawBodyPreview: string | null;
        receivedAt: number;
        status: "received" | "parsed" | "mirrored" | "failed" | "ignored";
        subject: string;
        updatedAt: number;
      } | null
    >;
    getOutboundByInternetMessageId: FunctionReference<
      "query",
      "public",
      { internetMessageId: string },
      {
        _creationTime: number;
        _id: Id<"outlookOutboundMessages">;
        connectionEmail: string | null;
        contactItemId: string | null;
        conversationId: string | null;
        correlationToken: string | null;
        createdAt: number;
        graphMessageId: string | null;
        internetMessageId: string | null;
        mondayAccountId: string;
        mondayAppClientId: string | null;
        mondayUserId: string;
        recipientEmail: string;
        sentAt: number;
        status: "pending_lookup" | "identified";
        subject: string;
        updatedAt: number;
      } | null
    >;
    listExpiringGraphSubscriptions: FunctionReference<
      "query",
      "public",
      { expiresBefore: number; limit?: number },
      Array<{
        _creationTime: number;
        _id: Id<"outlookGraphSubscriptions">;
        changeType: string;
        clientState: string;
        connectionEmail: string | null;
        createdAt: number;
        expirationDateTime: string;
        expirationTimestamp: number;
        lastError: string | null;
        lastRenewedAt: number | null;
        mondayAccountId: string;
        mondayAppClientId: string | null;
        mondayUserId: string;
        notificationUrl: string;
        resource: string;
        status: "active" | "expired" | "deleted" | "error";
        subscriptionId: string;
        updatedAt: number;
      }>
    >;
    listGraphSubscriptionsByIdentity: FunctionReference<
      "query",
      "public",
      {
        mondayAccountId: string;
        mondayAppClientId?: string;
        mondayUserId: string;
      },
      Array<{
        _creationTime: number;
        _id: Id<"outlookGraphSubscriptions">;
        changeType: string;
        clientState: string;
        connectionEmail: string | null;
        createdAt: number;
        expirationDateTime: string;
        expirationTimestamp: number;
        lastError: string | null;
        lastRenewedAt: number | null;
        mondayAccountId: string;
        mondayAppClientId: string | null;
        mondayUserId: string;
        notificationUrl: string;
        resource: string;
        status: "active" | "expired" | "deleted" | "error";
        subscriptionId: string;
        updatedAt: number;
      }>
    >;
    listOutboundByConversationId: FunctionReference<
      "query",
      "public",
      { conversationId: string; limit?: number },
      Array<{
        _creationTime: number;
        _id: Id<"outlookOutboundMessages">;
        connectionEmail: string | null;
        contactItemId: string | null;
        conversationId: string | null;
        correlationToken: string | null;
        createdAt: number;
        graphMessageId: string | null;
        internetMessageId: string | null;
        mondayAccountId: string;
        mondayAppClientId: string | null;
        mondayUserId: string;
        recipientEmail: string;
        sentAt: number;
        status: "pending_lookup" | "identified";
        subject: string;
        updatedAt: number;
      }>
    >;
    listRecentOutboundByRecipient: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        mondayAccountId: string;
        mondayUserId: string;
        recipientEmail: string;
        sentAtMin: number;
      },
      Array<{
        _creationTime: number;
        _id: Id<"outlookOutboundMessages">;
        connectionEmail: string | null;
        contactItemId: string | null;
        conversationId: string | null;
        correlationToken: string | null;
        createdAt: number;
        graphMessageId: string | null;
        internetMessageId: string | null;
        mondayAccountId: string;
        mondayAppClientId: string | null;
        mondayUserId: string;
        recipientEmail: string;
        sentAt: number;
        status: "pending_lookup" | "identified";
        subject: string;
        updatedAt: number;
      }>
    >;
    markGraphSubscriptionStatus: FunctionReference<
      "mutation",
      "public",
      {
        expirationDateTime?: string;
        expirationTimestamp?: number;
        lastError?: string;
        status: "active" | "expired" | "deleted" | "error";
        subscriptionId: string;
      },
      { updated: boolean }
    >;
    markInboundMessageFailed: FunctionReference<
      "mutation",
      "public",
      {
        errorMessage: string;
        inboundMessageId: Id<"outlookInboundMessages">;
        status?: "failed" | "ignored";
      },
      { updated: boolean }
    >;
    markInboundMessageMirrored: FunctionReference<
      "mutation",
      "public",
      {
        inboundMessageId: Id<"outlookInboundMessages">;
        mirrorMondaySubitemId?: string;
        mirrorMondayUpdateId: string;
        mirrorTouchId?: string;
      },
      { updated: boolean }
    >;
    markInboundMessageParsed: FunctionReference<
      "mutation",
      "public",
      {
        contactItemId?: string;
        correlationConfidence: "high" | "medium" | "low" | null;
        correlationMethod:
          | "inReplyTo"
          | "conversationId"
          | "senderEmail"
          | "none"
          | null;
        inboundMessageId: Id<"outlookInboundMessages">;
        matchedContactEmail?: string;
        outboundMessageId?: Id<"outlookOutboundMessages">;
        parsedBody: string;
        status?: "received" | "parsed" | "mirrored" | "failed" | "ignored";
      },
      { updated: boolean }
    >;
    recordInboundMessageReceipt: FunctionReference<
      "mutation",
      "public",
      {
        conversationId?: string;
        dedupeKey: string;
        fromEmail: string;
        graphMessageId: string;
        inReplyTo?: string;
        internetMessageId?: string;
        rawBodyPreview?: string;
        receivedAt: number;
        subject: string;
      },
      {
        alreadyMirrored: boolean;
        inboundMessageId: Id<"outlookInboundMessages">;
        status: "received" | "parsed" | "mirrored" | "failed" | "ignored";
      }
    >;
    removeGraphSubscriptionsByIdentity: FunctionReference<
      "mutation",
      "public",
      {
        mondayAccountId: string;
        mondayAppClientId?: string;
        mondayUserId: string;
      },
      { updatedCount: number }
    >;
    upsertGraphSubscription: FunctionReference<
      "mutation",
      "public",
      {
        changeType: string;
        clientState: string;
        connectionEmail?: string;
        expirationDateTime: string;
        expirationTimestamp: number;
        lastError?: string;
        mondayAccountId: string;
        mondayAppClientId?: string;
        mondayUserId: string;
        notificationUrl: string;
        resource: string;
        status?: "active" | "expired" | "deleted" | "error";
        subscriptionId: string;
      },
      { created: boolean; graphSubscriptionId: Id<"outlookGraphSubscriptions"> }
    >;
    upsertOutboundMessage: FunctionReference<
      "mutation",
      "public",
      {
        connectionEmail?: string;
        contactItemId?: string;
        conversationId?: string;
        correlationToken?: string;
        graphMessageId?: string;
        internetMessageId?: string;
        mondayAccountId: string;
        mondayAppClientId?: string;
        mondayUserId: string;
        recipientEmail: string;
        sentAt: number;
        status?: "pending_lookup" | "identified";
        subject: string;
      },
      { created: boolean; outboundMessageId: Id<"outlookOutboundMessages"> }
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
  mondayHireEventBackfill: {
    finishJob: FunctionReference<
      "mutation",
      "internal",
      {
        jobId: Id<"mondayHireEventBackfillJobs">;
        lastError?: string | null;
        status: "done" | "failed" | "cancelled";
      },
      null
    >;
    getJobForWorkflow: FunctionReference<
      "query",
      "internal",
      { jobId: Id<"mondayHireEventBackfillJobs"> },
      null | {
        _id: Id<"mondayHireEventBackfillJobs">;
        contactBoardId: string;
        currentCursor?: string | null;
        dateFrom: string;
        dateTo: string;
        dryRun: boolean;
        monthKey: string;
        pageSize: number;
        status: "running" | "done" | "failed" | "cancelled";
        subitemBoardId?: string | null;
      }
    >;
    runWorkflow: FunctionReference<"mutation", "internal", any, any>;
    updateJobProgress: FunctionReference<
      "mutation",
      "internal",
      {
        createdEventsDelta: number;
        errorsDelta: number;
        inRangeContactsDelta: number;
        jobId: Id<"mondayHireEventBackfillJobs">;
        nextCursor: string | null;
        processedContactsDelta: number;
        skippedEventsDelta: number;
        subitemBoardId?: string | null;
      },
      null
    >;
  };
  mondayHireEventBackfillNode: {
    fetchAndUpsertHireEventPageAction: FunctionReference<
      "action",
      "internal",
      {
        boardId: string;
        cursor?: string | null;
        dateFrom: string;
        dateTo: string;
        dryRun?: boolean;
        pageSize: number;
      },
      {
        createdEvents: number;
        errors: number;
        inRangeContacts: number;
        nextCursor: string | null;
        processedContacts: number;
        skippedEvents: number;
        subitemBoardId: string | null;
      }
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
        monthKey?: string;
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
        createdTouchRecordsDelta: number;
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
          ownerIds: Array<string>;
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
        monthKey?: string | null;
        monthTag: string;
        sourceBoardId: string;
        sourceBoardName: string | null;
        sourceItem: {
          email: string | null;
          id: string;
          mainDatabaseId: string | null;
          mirrorDatabaseId: string | null;
          name: string;
          ownerIds: Array<string>;
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
        createdTouchRecords: number;
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
  mondayTouchRangeBackfill: {
    finishJob: FunctionReference<
      "mutation",
      "internal",
      {
        jobId: Id<"mondayTouchRangeBackfillJobs">;
        lastError?: string | null;
        status: "done" | "failed" | "cancelled";
      },
      null
    >;
    getJobForWorkflow: FunctionReference<
      "query",
      "internal",
      { jobId: Id<"mondayTouchRangeBackfillJobs"> },
      null | {
        _id: Id<"mondayTouchRangeBackfillJobs">;
        contactBoardId: string;
        currentCursor?: string | null;
        dateFrom: string;
        dateTo: string;
        dryRun: boolean;
        pageSize: number;
        status: "running" | "done" | "failed" | "cancelled";
        touchBoardId: string;
      }
    >;
    runWorkflow: FunctionReference<"mutation", "internal", any, any>;
    updateJobProgress: FunctionReference<
      "mutation",
      "internal",
      {
        createdTouchesDelta: number;
        errorsDelta: number;
        inRangeContactsDelta: number;
        jobId: Id<"mondayTouchRangeBackfillJobs">;
        nextCursor: string | null;
        processedContactsDelta: number;
        skippedTouchesDelta: number;
        updatedTouchesDelta: number;
      },
      null
    >;
  };
  mondayTouchRangeBackfillNode: {
    fetchAndUpsertPageAction: FunctionReference<
      "action",
      "internal",
      {
        boardId: string;
        cursor?: string | null;
        dateFrom: string;
        dateTo: string;
        dryRun?: boolean;
        pageSize: number;
        touchBoardId: string;
      },
      {
        createdTouches: number;
        errors: number;
        inRangeContacts: number;
        nextCursor: string | null;
        processedContacts: number;
        skippedTouches: number;
        updatedTouches: number;
      }
    >;
  };
  outlookInboundCron: {
    renewOutlookSubscriptions: FunctionReference<
      "action",
      "internal",
      {},
      { message: string; ok: boolean; status: number }
    >;
  };
};

export declare const components: {
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};

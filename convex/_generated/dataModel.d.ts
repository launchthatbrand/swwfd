/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  DocumentByName,
  TableNamesInDataModel,
  SystemTableNames,
  AnyDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";

/**
 * A type describing your Convex data model.
 *
 * This type includes information about what tables you have, the type of
 * documents stored in those tables, and the indexes defined on them.
 *
 * This type is used to parameterize methods like `queryGeneric` and
 * `mutationGeneric` to make them type-safe.
 */

export type DataModel = {
  authAccounts: {
    document: {
      emailVerified?: string;
      phoneVerified?: string;
      provider: string;
      providerAccountId: string;
      secret?: string;
      userId: Id<"users">;
      _id: Id<"authAccounts">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "emailVerified"
      | "phoneVerified"
      | "provider"
      | "providerAccountId"
      | "secret"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
      userIdAndProvider: ["userId", "provider", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  authRateLimits: {
    document: {
      attemptsLeft: number;
      identifier: string;
      lastAttemptTime: number;
      _id: Id<"authRateLimits">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "attemptsLeft"
      | "identifier"
      | "lastAttemptTime";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      identifier: ["identifier", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  authRefreshTokens: {
    document: {
      expirationTime: number;
      firstUsedTime?: number;
      parentRefreshTokenId?: Id<"authRefreshTokens">;
      sessionId: Id<"authSessions">;
      _id: Id<"authRefreshTokens">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "expirationTime"
      | "firstUsedTime"
      | "parentRefreshTokenId"
      | "sessionId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      sessionId: ["sessionId", "_creationTime"];
      sessionIdAndParentRefreshTokenId: [
        "sessionId",
        "parentRefreshTokenId",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  authSessions: {
    document: {
      expirationTime: number;
      userId: Id<"users">;
      _id: Id<"authSessions">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "expirationTime" | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  authVerificationCodes: {
    document: {
      accountId: Id<"authAccounts">;
      code: string;
      emailVerified?: string;
      expirationTime: number;
      phoneVerified?: string;
      provider: string;
      verifier?: string;
      _id: Id<"authVerificationCodes">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "accountId"
      | "code"
      | "emailVerified"
      | "expirationTime"
      | "phoneVerified"
      | "provider"
      | "verifier";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      accountId: ["accountId", "_creationTime"];
      code: ["code", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  authVerifiers: {
    document: {
      sessionId?: Id<"authSessions">;
      signature?: string;
      _id: Id<"authVerifiers">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "sessionId" | "signature";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      signature: ["signature", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  jobApplications: {
    document: {
      coverLetter?: string;
      createdAt: number;
      jobId: Id<"jobs">;
      userId: Id<"users">;
      _id: Id<"jobApplications">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "coverLetter"
      | "createdAt"
      | "jobId"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_jobId: ["jobId", "_creationTime"];
      by_jobId_and_userId: ["jobId", "userId", "_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  jobs: {
    document: {
      company: string;
      createdAt: number;
      description: string;
      location: string;
      tags: Array<string>;
      title: string;
      _id: Id<"jobs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "company"
      | "createdAt"
      | "description"
      | "location"
      | "tags"
      | "title";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_createdAt: ["createdAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  mondayGlobalSettings: {
    document: {
      emailMarketingEnabled: boolean;
      key: string;
      updatedAt: number;
      updatedByMondayUserId: string;
      _id: Id<"mondayGlobalSettings">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "emailMarketingEnabled"
      | "key"
      | "updatedAt"
      | "updatedByMondayUserId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  mondayMonthlyMigrationEntries: {
    document: {
      createdAt: number;
      jobId: Id<"mondayMonthlyMigrationJobs">;
      sourceBoardId: string;
      sourceEntityId: string;
      sourceEntityType: "parent_update" | "subitem" | "subitem_update";
      sourceItemId: string;
      targetEntityId?: string | null;
      targetItemId: string;
      _id: Id<"mondayMonthlyMigrationEntries">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "jobId"
      | "sourceBoardId"
      | "sourceEntityId"
      | "sourceEntityType"
      | "sourceItemId"
      | "targetEntityId"
      | "targetItemId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_jobId: ["jobId", "_creationTime"];
      by_sourceBoardId_and_sourceEntityType_and_sourceEntityId: [
        "sourceBoardId",
        "sourceEntityType",
        "sourceEntityId",
        "_creationTime",
      ];
      by_sourceBoardId_and_sourceItemId: [
        "sourceBoardId",
        "sourceItemId",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  mondayMonthlyMigrationJobs: {
    document: {
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
      updatedAt: number;
      warningsCount: number;
      workflowId?: string;
      _id: Id<"mondayMonthlyMigrationJobs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdParentUpdates"
      | "createdSubitems"
      | "createdSubitemUpdates"
      | "currentCursor"
      | "dryRun"
      | "errorsCount"
      | "finishedAt"
      | "includeParentUpdates"
      | "includeSubitems"
      | "includeSubitemUpdates"
      | "lastError"
      | "mappedContacts"
      | "monthTag"
      | "pageSize"
      | "processedContacts"
      | "skippedContacts"
      | "sourceBoardId"
      | "sourceBoardName"
      | "startedAt"
      | "status"
      | "targetBoardId"
      | "updatedAt"
      | "warningsCount"
      | "workflowId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_startedAt: ["startedAt", "_creationTime"];
      by_status: ["status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  mondayTouchBackfillJobs: {
    document: {
      baselineDate: string;
      contactBoardId: string;
      createdTouches: number;
      currentCursor?: string | null;
      errorsCount: number;
      finishedAt?: number | null;
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
      _id: Id<"mondayTouchBackfillJobs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "baselineDate"
      | "contactBoardId"
      | "createdTouches"
      | "currentCursor"
      | "errorsCount"
      | "finishedAt"
      | "lastError"
      | "pageSize"
      | "processedContacts"
      | "skippedTouches"
      | "sourceTag"
      | "startedAt"
      | "status"
      | "touchBoardId"
      | "updatedAt"
      | "workflowId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_startedAt: ["startedAt", "_creationTime"];
      by_status: ["status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  mondayTouchCsvExportChunks: {
    document: {
      chunkIndex: number;
      content: string;
      createdAt: number;
      jobId: Id<"mondayTouchCsvExportJobs">;
      _id: Id<"mondayTouchCsvExportChunks">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "chunkIndex"
      | "content"
      | "createdAt"
      | "jobId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_jobId_and_chunkIndex: ["jobId", "chunkIndex", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  mondayTouchCsvExportJobs: {
    document: {
      baselineDate: string;
      chunkCount: number;
      contactBoardId: string;
      currentCursor?: string | null;
      finishedAt?: number | null;
      lastError?: string | null;
      pageSize: number;
      processedContacts: number;
      rowCount: number;
      sourceTag: string;
      startedAt: number;
      status: "running" | "done" | "failed" | "cancelled";
      updatedAt: number;
      workflowId?: string;
      _id: Id<"mondayTouchCsvExportJobs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "baselineDate"
      | "chunkCount"
      | "contactBoardId"
      | "currentCursor"
      | "finishedAt"
      | "lastError"
      | "pageSize"
      | "processedContacts"
      | "rowCount"
      | "sourceTag"
      | "startedAt"
      | "status"
      | "updatedAt"
      | "workflowId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_startedAt: ["startedAt", "_creationTime"];
      by_status: ["status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  mondayUserBoardSettings: {
    document: {
      accountId: string;
      colorTheme: "neutral" | "sky" | "emerald" | "violet" | "rose";
      createdAt: number;
      fontSize: "default" | "medium" | "large";
      ownerMondayUserId: string;
      updatedAt: number;
      updatedByMondayUserId: string;
      _id: Id<"mondayUserBoardSettings">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "accountId"
      | "colorTheme"
      | "createdAt"
      | "fontSize"
      | "ownerMondayUserId"
      | "updatedAt"
      | "updatedByMondayUserId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_account_and_owner: ["accountId", "ownerMondayUserId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  mondayUserFilterPresets: {
    document: {
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
      createdAt: number;
      createdByMondayUserId: string;
      matchMode: "all" | "any";
      name: string;
      ownerMondayUserId: string;
      updatedAt: number;
      updatedByMondayUserId: string;
      _id: Id<"mondayUserFilterPresets">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "accountId"
      | "conditions"
      | "createdAt"
      | "createdByMondayUserId"
      | "matchMode"
      | "name"
      | "ownerMondayUserId"
      | "updatedAt"
      | "updatedByMondayUserId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_account_and_owner: ["accountId", "ownerMondayUserId", "_creationTime"];
      by_account_and_owner_and_name: [
        "accountId",
        "ownerMondayUserId",
        "name",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  users: {
    document: {
      email?: string;
      emailVerificationTime?: number;
      image?: string;
      isAdmin?: boolean;
      isAnonymous?: boolean;
      name?: string;
      phone?: string;
      phoneVerificationTime?: number;
      _id: Id<"users">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "email"
      | "emailVerificationTime"
      | "image"
      | "isAdmin"
      | "isAnonymous"
      | "name"
      | "phone"
      | "phoneVerificationTime";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_isAdmin: ["isAdmin", "_creationTime"];
      email: ["email", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
};

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Doc<TableName extends TableNames> = DocumentByName<
  DataModel,
  TableName
>;

/**
 * An identifier for a document in Convex.
 *
 * Convex documents are uniquely identified by their `Id`, which is accessible
 * on the `_id` field. To learn more, see [Document IDs](https://docs.convex.dev/using/document-ids).
 *
 * Documents can be loaded using `db.get(tableName, id)` in query and mutation functions.
 *
 * IDs are just strings at runtime, but this type can be used to distinguish them from other
 * strings when type checking.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Id<TableName extends TableNames | SystemTableNames> =
  GenericId<TableName>;

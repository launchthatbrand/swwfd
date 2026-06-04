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
  aiChatConversations: {
    document: {
      createdAt: number;
      firstMessageAt: number;
      lastMessageAt: number;
      lastMessageRole?: "user" | "assistant";
      lastMessageSnippet?: string;
      threadId: string;
      totalMessages: number;
      updatedAt: number;
      userId: string;
      _id: Id<"aiChatConversations">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "firstMessageAt"
      | "lastMessageAt"
      | "lastMessageRole"
      | "lastMessageSnippet"
      | "threadId"
      | "totalMessages"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_thread: ["threadId", "_creationTime"];
      by_user: ["userId", "_creationTime"];
      by_user_and_thread: ["userId", "threadId", "_creationTime"];
      by_user_lastMessageAt: ["userId", "lastMessageAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  aiEvalGenerations: {
    document: {
      appId: string;
      costUsd?: number;
      createdAt: number;
      featureDomain: string;
      generationKey: string;
      inputTokens?: number;
      latencyMs?: number;
      messageKey: string;
      metadata?: any;
      modelId?: string;
      organizationId: string;
      outputTokens?: number;
      provider?: string;
      source: string;
      threadKey: string;
      totalTokens?: number;
      _id: Id<"aiEvalGenerations">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "appId"
      | "costUsd"
      | "createdAt"
      | "featureDomain"
      | "generationKey"
      | "inputTokens"
      | "latencyMs"
      | "messageKey"
      | "metadata"
      | "modelId"
      | "organizationId"
      | "outputTokens"
      | "provider"
      | "source"
      | "threadKey"
      | "totalTokens";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_app_org_domain_thread_createdAt: [
        "appId",
        "organizationId",
        "featureDomain",
        "threadKey",
        "createdAt",
        "_creationTime",
      ];
      by_message_key_and_generation_key: [
        "messageKey",
        "generationKey",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  aiEvalMessages: {
    document: {
      appId: string;
      content: string;
      costUsd?: number;
      createdAt: number;
      featureDomain: string;
      inputTokens?: number;
      messageKey: string;
      metadata?: any;
      mirroredAt: number;
      modelId?: string;
      modelProvider?: string;
      organizationId: string;
      outputTokens?: number;
      role: "user" | "assistant" | "system";
      sequence: number;
      sessionId?: string;
      source: string;
      threadKey: string;
      totalTokens?: number;
      _id: Id<"aiEvalMessages">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "appId"
      | "content"
      | "costUsd"
      | "createdAt"
      | "featureDomain"
      | "inputTokens"
      | "messageKey"
      | "metadata"
      | "mirroredAt"
      | "modelId"
      | "modelProvider"
      | "organizationId"
      | "outputTokens"
      | "role"
      | "sequence"
      | "sessionId"
      | "source"
      | "threadKey"
      | "totalTokens";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_app_org_domain_thread_sequence: [
        "appId",
        "organizationId",
        "featureDomain",
        "threadKey",
        "sequence",
        "_creationTime",
      ];
      by_message_key: ["messageKey", "_creationTime"];
      by_thread_createdAt: ["threadKey", "createdAt", "_creationTime"];
      by_thread_sequence: ["threadKey", "sequence", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  aiEvalThreads: {
    document: {
      appId: string;
      createdAt: number;
      featureDomain: string;
      firstMessageAt: number;
      lastMessageAt: number;
      messageCount: number;
      organizationId: string;
      sessionId?: string;
      source: string;
      threadKey: string;
      updatedAt: number;
      _id: Id<"aiEvalThreads">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "appId"
      | "createdAt"
      | "featureDomain"
      | "firstMessageAt"
      | "lastMessageAt"
      | "messageCount"
      | "organizationId"
      | "sessionId"
      | "source"
      | "threadKey"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_app_org_domain_thread: [
        "appId",
        "organizationId",
        "featureDomain",
        "threadKey",
        "_creationTime",
      ];
      by_app_org_domain_updatedAt: [
        "appId",
        "organizationId",
        "featureDomain",
        "updatedAt",
        "_creationTime",
      ];
      by_thread_key: ["threadKey", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  aiLinkAnalysisRuns: {
    document: {
      completedAt?: number;
      metadata?: any;
      runId: string;
      sourceUrls: Array<string>;
      startedAt: number;
      status: "running" | "completed" | "failed" | "cancelled";
      threadId: string;
      updatedAt: number;
      urlRows: Array<{
        error?: string;
        sourceType: string;
        status: "detected" | "processing" | "completed" | "failed";
        updatedAt: number;
        url: string;
      }>;
      userId: string;
      _id: Id<"aiLinkAnalysisRuns">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "completedAt"
      | "metadata"
      | "runId"
      | "sourceUrls"
      | "startedAt"
      | "status"
      | "threadId"
      | "updatedAt"
      | "urlRows"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_run_id: ["runId", "_creationTime"];
      by_thread_and_updatedAt: ["threadId", "updatedAt", "_creationTime"];
      by_user_and_updatedAt: ["userId", "updatedAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  aiLogs: {
    document: {
      createdAt: number;
      eventType: string;
      level: string;
      message: string;
      metadata?: any;
      source?: string;
      threadId?: string;
      userId?: string;
      _id: Id<"aiLogs">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "eventType"
      | "level"
      | "message"
      | "metadata"
      | "source"
      | "threadId"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_createdAt: ["createdAt", "_creationTime"];
      by_eventType: ["eventType", "createdAt", "_creationTime"];
      by_level: ["level", "createdAt", "_creationTime"];
      by_thread: ["threadId", "createdAt", "_creationTime"];
      by_user: ["userId", "createdAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  aiSettings: {
    document: {
      embeddingDimension?: number;
      embeddingModel?: string;
      key: string;
      model: string;
      provider: string;
      ragNamespace?: string;
      systemPrompt?: string;
      updatedAt: number;
      _id: Id<"aiSettings">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "embeddingDimension"
      | "embeddingModel"
      | "key"
      | "model"
      | "provider"
      | "ragNamespace"
      | "systemPrompt"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  userAiCredits: {
    document: {
      granted: number;
      periodKey: string;
      spent: number;
      updatedAt: number;
      userId: string;
      _id: Id<"userAiCredits">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "granted"
      | "periodKey"
      | "spent"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_period: ["periodKey", "_creationTime"];
      by_user: ["userId", "_creationTime"];
      by_user_and_period: ["userId", "periodKey", "_creationTime"];
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

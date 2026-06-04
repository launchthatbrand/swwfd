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
  options: {
    document: {
      createdAt: number;
      key: string;
      organizationId: string;
      updatedAt?: number;
      value?: string | number | boolean | null;
      _id: Id<"options">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "key"
      | "organizationId"
      | "updatedAt"
      | "value";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
      by_org_key: ["organizationId", "key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  posts: {
    document: {
      authorId?: string;
      category?: string;
      content?: string;
      createdAt: number;
      excerpt?: string;
      featuredImageUrl?: string;
      organizationId: string;
      parentId?: Id<"posts">;
      parentTypeSlug?: string;
      postTypeSlug: string;
      slug: string;
      status: "published" | "draft" | "archived";
      tags?: Array<string>;
      title: string;
      updatedAt?: number;
      _id: Id<"posts">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "authorId"
      | "category"
      | "content"
      | "createdAt"
      | "excerpt"
      | "featuredImageUrl"
      | "organizationId"
      | "parentId"
      | "parentTypeSlug"
      | "postTypeSlug"
      | "slug"
      | "status"
      | "tags"
      | "title"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_org: ["organizationId", "_creationTime"];
      by_org_parent: ["organizationId", "parentId", "_creationTime"];
      by_org_postTypeSlug: ["organizationId", "postTypeSlug", "_creationTime"];
      by_org_slug: ["organizationId", "slug", "_creationTime"];
      by_parent: ["parentId", "_creationTime"];
      by_postTypeSlug: ["postTypeSlug", "_creationTime"];
      by_slug: ["slug", "_creationTime"];
      by_status: ["status", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  postsMeta: {
    document: {
      createdAt: number;
      key: string;
      postId: Id<"posts">;
      updatedAt?: number;
      value?: string | number | boolean | null;
      _id: Id<"postsMeta">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "key"
      | "postId"
      | "updatedAt"
      | "value";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_post: ["postId", "_creationTime"];
      by_post_and_key: ["postId", "key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  supportCannedResponses: {
    document: {
      body: string;
      channels: Array<"chat" | "email">;
      createdAt: number;
      isActive: boolean;
      organizationId: string;
      sortOrder?: number;
      title: string;
      updatedAt: number;
      _id: Id<"supportCannedResponses">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "body"
      | "channels"
      | "createdAt"
      | "isActive"
      | "organizationId"
      | "sortOrder"
      | "title"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_org: ["organizationId", "_creationTime"];
      by_org_active: ["organizationId", "isActive", "_creationTime"];
      by_org_active_updatedAt: [
        "organizationId",
        "isActive",
        "updatedAt",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  supportConversationEvents: {
    document: {
      actorId?: string;
      actorName?: string;
      agentThreadId?: string;
      createdAt: number;
      eventType: string;
      organizationId: string;
      payload?: string;
      sessionId: string;
      _id: Id<"supportConversationEvents">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "actorId"
      | "actorName"
      | "agentThreadId"
      | "createdAt"
      | "eventType"
      | "organizationId"
      | "payload"
      | "sessionId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_org_session: ["organizationId", "sessionId", "_creationTime"];
      by_org_session_createdAt: [
        "organizationId",
        "sessionId",
        "createdAt",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  supportConversationNotes: {
    document: {
      actorId?: string;
      actorName?: string;
      agentThreadId?: string;
      createdAt: number;
      note: string;
      organizationId: string;
      sessionId: string;
      _id: Id<"supportConversationNotes">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "actorId"
      | "actorName"
      | "agentThreadId"
      | "createdAt"
      | "note"
      | "organizationId"
      | "sessionId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_org_session: ["organizationId", "sessionId", "_creationTime"];
      by_org_session_createdAt: [
        "organizationId",
        "sessionId",
        "createdAt",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  supportConversations: {
    document: {
      agentThreadId?: string;
      assignedAgentId?: string;
      assignedAgentName?: string;
      contactEmail?: string;
      contactId?: string;
      contactName?: string;
      createdAt: number;
      emailThreadId?: string;
      firstMessageAt: number;
      inboundAlias?: string;
      lastMessageAt: number;
      lastMessageAuthor?: "user" | "assistant";
      lastMessageSnippet?: string;
      mode?: "agent" | "manual";
      organizationId: string;
      origin: "chat" | "email";
      sessionId: string;
      status?: "open" | "snoozed" | "closed";
      subject?: string;
      totalMessages: number;
      updatedAt: number;
      _id: Id<"supportConversations">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "agentThreadId"
      | "assignedAgentId"
      | "assignedAgentName"
      | "contactEmail"
      | "contactId"
      | "contactName"
      | "createdAt"
      | "emailThreadId"
      | "firstMessageAt"
      | "inboundAlias"
      | "lastMessageAt"
      | "lastMessageAuthor"
      | "lastMessageSnippet"
      | "mode"
      | "organizationId"
      | "origin"
      | "sessionId"
      | "status"
      | "subject"
      | "totalMessages"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_org: ["organizationId", "_creationTime"];
      by_org_agentThreadId: [
        "organizationId",
        "agentThreadId",
        "_creationTime",
      ];
      by_org_lastMessageAt: [
        "organizationId",
        "lastMessageAt",
        "_creationTime",
      ];
      by_org_session: ["organizationId", "sessionId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  supportRagIndexStatus: {
    document: {
      entryKey: string;
      lastAttemptAt: number;
      lastEntryId?: string;
      lastEntryStatus?: "pending" | "ready" | "replaced";
      lastError?: string;
      lastStatus: string;
      lastSuccessAt?: number;
      organizationId: string;
      postId: string;
      postTypeSlug: string;
      sourceType: "postType" | "lmsPostType";
      _id: Id<"supportRagIndexStatus">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "entryKey"
      | "lastAttemptAt"
      | "lastEntryId"
      | "lastEntryStatus"
      | "lastError"
      | "lastStatus"
      | "lastSuccessAt"
      | "organizationId"
      | "postId"
      | "postTypeSlug"
      | "sourceType";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_org_entryKey: ["organizationId", "entryKey", "_creationTime"];
      by_org_post: [
        "organizationId",
        "postTypeSlug",
        "postId",
        "_creationTime",
      ];
      by_org_sourceType_postType: [
        "organizationId",
        "sourceType",
        "postTypeSlug",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  supportRagSources: {
    document: {
      additionalMetaKeys?: string;
      baseInstructions?: string;
      createdAt: number;
      displayName?: string;
      fields: Array<"title" | "excerpt" | "content">;
      includeTags: boolean;
      isEnabled: boolean;
      lastIndexedAt?: number;
      metaFieldKeys?: Array<string>;
      organizationId: string;
      postTypeSlug: string;
      sourceType: "postType" | "lmsPostType";
      updatedAt: number;
      useCustomBaseInstructions?: boolean;
      _id: Id<"supportRagSources">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "additionalMetaKeys"
      | "baseInstructions"
      | "createdAt"
      | "displayName"
      | "fields"
      | "includeTags"
      | "isEnabled"
      | "lastIndexedAt"
      | "metaFieldKeys"
      | "organizationId"
      | "postTypeSlug"
      | "sourceType"
      | "updatedAt"
      | "useCustomBaseInstructions";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_org_postTypeSlug: ["organizationId", "postTypeSlug", "_creationTime"];
      by_org_type: ["organizationId", "sourceType", "_creationTime"];
      by_org_type_and_postTypeSlug: [
        "organizationId",
        "sourceType",
        "postTypeSlug",
        "_creationTime",
      ];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  supportRateLimits: {
    document: {
      count: number;
      expiresAt: number;
      key: string;
      updatedAt: number;
      _id: Id<"supportRateLimits">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "count"
      | "expiresAt"
      | "key"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
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

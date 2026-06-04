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
import { anyApi, componentsGeneric } from "convex/server";

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: {
  index: {
    addConversationNote: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        note: string;
        organizationId: string;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    appendConversationEvent: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        eventType: string;
        organizationId: string;
        payload?: any;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    assignConversation: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        assignedAgentId: string;
        assignedAgentName?: string;
        organizationId: string;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    createSupportCannedResponse: FunctionReference<
      "mutation",
      "public",
      {
        body: string;
        channels: Array<"chat" | "email">;
        isActive?: boolean;
        organizationId: string;
        sortOrder?: number;
        title: string;
      },
      Id<"supportCannedResponses">
    >;
    createSupportPost: FunctionReference<
      "mutation",
      "public",
      {
        authorId?: string;
        content?: string;
        excerpt?: string;
        meta?: Array<{ key: string; value?: string | number | boolean | null }>;
        organizationId: string;
        parentId?: Id<"posts">;
        parentTypeSlug?: string;
        postTypeSlug: string;
        slug: string;
        status: "published" | "draft" | "archived";
        tags?: Array<string>;
        title: string;
      },
      any
    >;
    deleteConversation: FunctionReference<
      "mutation",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      null
    >;
    deleteRagSourceConfig: FunctionReference<
      "mutation",
      "public",
      { organizationId: string; sourceId: Id<"supportRagSources"> },
      null
    >;
    deleteSupportCannedResponse: FunctionReference<
      "mutation",
      "public",
      { id: Id<"supportCannedResponses">; organizationId: string },
      null
    >;
    getAgentPresence: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    getConversationIndex: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    getConversationMode: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    getEmailSettingsByAliasLocalPart: FunctionReference<
      "query",
      "public",
      { aliasLocalPart: string },
      null | {
        allowEmailIntake: boolean;
        defaultAlias: string;
        inboundAlias: string;
        organizationId: string;
      }
    >;
    getRagIndexStatusForPost: FunctionReference<
      "query",
      "public",
      { organizationId: string; postId: string; postTypeSlug: string },
      any
    >;
    getRagSourceConfigForPostType: FunctionReference<
      "query",
      "public",
      { organizationId: string; postTypeSlug: string },
      any
    >;
    getRagSourceForPostType: FunctionReference<
      "query",
      "public",
      {
        organizationId: string;
        postTypeSlug: string;
        sourceType: "postType" | "lmsPostType";
      },
      any
    >;
    getRagSourceForPostTypeAny: FunctionReference<
      "query",
      "public",
      { organizationId: string; postTypeSlug: string },
      any
    >;
    getSupportOption: FunctionReference<
      "query",
      "public",
      { key: string; organizationId: string },
      any
    >;
    getSupportPostById: FunctionReference<
      "query",
      "public",
      { id: Id<"posts">; organizationId?: string },
      any
    >;
    getSupportPostMeta: FunctionReference<
      "query",
      "public",
      { organizationId?: string; postId: Id<"posts"> },
      any
    >;
    listConversationEvents: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    listConversationNotes: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    listConversations: FunctionReference<
      "query",
      "public",
      { limit?: number; organizationId: string },
      any
    >;
    listPresenceRoom: FunctionReference<
      "query",
      "public",
      { limit?: number; onlineOnly?: boolean; roomId: string },
      any
    >;
    listRagSourceRecords: FunctionReference<
      "query",
      "public",
      {
        includeHistorical?: boolean;
        limit?: number;
        organizationId: string;
        sourceId: Id<"supportRagSources">;
      },
      any
    >;
    listRagSources: FunctionReference<
      "query",
      "public",
      { organizationId: string },
      any
    >;
    listSupportCannedResponses: FunctionReference<
      "query",
      "public",
      { includeInactive?: boolean; organizationId: string },
      Array<{
        _creationTime: number;
        _id: Id<"supportCannedResponses">;
        body: string;
        channels: Array<"chat" | "email">;
        createdAt: number;
        isActive: boolean;
        organizationId: string;
        sortOrder?: number;
        title: string;
        updatedAt: number;
      }>
    >;
    listSupportOptions: FunctionReference<
      "query",
      "public",
      { organizationId: string },
      any
    >;
    listSupportPosts: FunctionReference<
      "query",
      "public",
      {
        filters?: {
          limit?: number;
          parentId?: Id<"posts">;
          postTypeSlug?: string;
          status?: "published" | "draft" | "archived";
        };
        organizationId: string;
      },
      any
    >;
    rateLimitOrThrow: FunctionReference<
      "mutation",
      "public",
      { key: string; limit: number; windowMs: number },
      null
    >;
    recordMessageIndexUpdate: FunctionReference<
      "mutation",
      "public",
      {
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        mode?: "agent" | "manual";
        organizationId: string;
        role: "user" | "assistant";
        sessionId: string;
        snippet: string;
        threadId: string;
      },
      null
    >;
    removeRagIndexStatus: FunctionReference<
      "mutation",
      "public",
      { organizationId: string; postId: string; postTypeSlug: string },
      null
    >;
    saveRagSourceConfig: FunctionReference<
      "mutation",
      "public",
      {
        additionalMetaKeys?: string;
        baseInstructions?: string;
        displayName?: string;
        fields?: Array<string>;
        includeTags?: boolean;
        isEnabled?: boolean;
        metaFieldKeys?: Array<string>;
        organizationId: string;
        postTypeSlug: string;
        sourceId?: Id<"supportRagSources">;
        sourceType?: "postType" | "lmsPostType";
        useCustomBaseInstructions?: boolean;
      },
      { ragSourceId: Id<"supportRagSources"> }
    >;
    setAgentPresence: FunctionReference<
      "mutation",
      "public",
      {
        agentName?: string;
        agentUserId: string;
        organizationId: string;
        sessionId?: string;
        status: "typing" | "idle";
        threadId?: string;
      },
      null
    >;
    setConversationMode: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        mode: "agent" | "manual";
        organizationId: string;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    setConversationStatus: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        organizationId: string;
        sessionId?: string;
        status: "open" | "snoozed" | "closed";
        threadId?: string;
      },
      null
    >;
    setSupportCannedResponseActive: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"supportCannedResponses">;
        isActive: boolean;
        organizationId: string;
      },
      null
    >;
    supportPresenceDisconnect: FunctionReference<
      "mutation",
      "public",
      { sessionToken: string },
      null
    >;
    supportPresenceHeartbeat: FunctionReference<
      "mutation",
      "public",
      { interval?: number; roomId: string; sessionId: string; userId: string },
      { roomToken: string; sessionToken: string }
    >;
    supportPresenceList: FunctionReference<
      "query",
      "public",
      { limit?: number; roomToken: string },
      any
    >;
    supportPresenceUpdateRoomUser: FunctionReference<
      "mutation",
      "public",
      { data?: any; roomId: string; userId: string },
      null
    >;
    touchRagSourceIndexedAt: FunctionReference<
      "mutation",
      "public",
      { sourceId: Id<"supportRagSources"> },
      null
    >;
    unassignConversation: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        organizationId: string;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    updateSupportCannedResponse: FunctionReference<
      "mutation",
      "public",
      {
        body?: string;
        channels?: Array<"chat" | "email">;
        id: Id<"supportCannedResponses">;
        isActive?: boolean;
        organizationId: string;
        sortOrder?: number;
        title?: string;
      },
      null
    >;
    updateSupportPost: FunctionReference<
      "mutation",
      "public",
      {
        authorId?: string;
        content?: string;
        excerpt?: string;
        id: Id<"posts">;
        meta?: Array<{ key: string; value?: string | number | boolean | null }>;
        organizationId: string;
        parentId?: Id<"posts">;
        parentTypeSlug?: string;
        postTypeSlug: string;
        slug: string;
        status: "published" | "draft" | "archived";
        tags?: Array<string>;
        title: string;
      },
      any
    >;
    upsertConversationIndex: FunctionReference<
      "mutation",
      "public",
      {
        agentThreadId?: string;
        assignedAgentId?: string;
        assignedAgentName?: string;
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        emailThreadId?: string;
        firstMessageAt?: number;
        inboundAlias?: string;
        lastMessageAt?: number;
        lastMessageAuthor?: "user" | "assistant";
        lastMessageSnippet?: string;
        mode?: "agent" | "manual";
        organizationId: string;
        origin: "chat" | "email";
        sessionId: string;
        status?: "open" | "snoozed" | "closed";
        subject?: string;
        totalMessages?: number;
      },
      null
    >;
    upsertRagIndexStatus: FunctionReference<
      "mutation",
      "public",
      {
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
      },
      null
    >;
    upsertSupportOption: FunctionReference<
      "mutation",
      "public",
      {
        key: string;
        organizationId: string;
        value?: string | number | boolean | null;
      },
      any
    >;
    upsertSupportPostMeta: FunctionReference<
      "mutation",
      "public",
      {
        entries: Array<{
          key: string;
          value?: string | number | boolean | null;
        }>;
        organizationId: string;
        postId: Id<"posts">;
      },
      any
    >;
    widgetBootstrap: FunctionReference<
      "query",
      "public",
      {
        clientSessionId?: string;
        contactEmail?: string;
        contactId?: string;
        limit?: number;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      {
        helpdeskArticles: Array<{
          id: string;
          slug?: string;
          summary: string;
          title: string;
          updatedAt: string;
        }>;
        messages: Array<{
          _id: string;
          agentName?: string;
          content: string;
          createdAt: number;
          messageType?: "chat" | "email_inbound" | "email_outbound";
          role: "user" | "assistant";
        }>;
        settings: {
          autoRespondToThreads: boolean;
          fields: {
            company: boolean;
            email: boolean;
            fullName: boolean;
            phone: boolean;
          };
          introHeadline: string;
          loggedInUsersAutocapture: boolean;
          privacyMessage: string;
          requireContact: boolean;
          welcomeMessage: string;
        };
        threadId?: string;
      }
    >;
    widgetCaptureContact: FunctionReference<
      "mutation",
      "public",
      {
        clientSessionId?: string;
        company?: string;
        contactId?: string;
        email?: string;
        fullName?: string;
        organizationId: string;
        phone?: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      {
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        sessionId: string;
        threadId: string;
      }
    >;
    widgetCreateThread: FunctionReference<
      "mutation",
      "public",
      {
        clientSessionId?: string;
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        mode?: "agent" | "manual";
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      { sessionId: string; threadId: string }
    >;
    widgetGetSettings: FunctionReference<
      "query",
      "public",
      {
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        widgetKey: string;
      },
      {
        allowedOrigins: Array<string>;
        settings: {
          autoRespondToThreads: boolean;
          fields: {
            company: boolean;
            email: boolean;
            fullName: boolean;
            phone: boolean;
          };
          introHeadline: string;
          loggedInUsersAutocapture: boolean;
          privacyMessage: string;
          requireContact: boolean;
          welcomeMessage: string;
        };
      }
    >;
    widgetListHelpdeskArticles: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        organizationId: string;
        query?: string;
        requestHost?: string;
        requestOrigin?: string;
        widgetKey: string;
      },
      Array<{
        id: string;
        slug?: string;
        summary: string;
        title: string;
        updatedAt: string;
      }>
    >;
    widgetListMessages: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      Array<{
        _id: string;
        agentName?: string;
        content: string;
        createdAt: number;
        messageType?: "chat" | "email_inbound" | "email_outbound";
        role: "user" | "assistant";
      }>
    >;
    widgetPresenceDisconnect: FunctionReference<
      "mutation",
      "public",
      {
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionToken: string;
        widgetKey: string;
      },
      null
    >;
    widgetPresenceHeartbeat: FunctionReference<
      "mutation",
      "public",
      {
        data?: any;
        interval?: number;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        sessionTokenId: string;
        threadId?: string;
        userId: string;
        widgetKey: string;
      },
      { roomToken: string; sessionToken: string }
    >;
    widgetPresenceList: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        onlineOnly?: boolean;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      Array<{ data?: any; name?: string; online?: boolean; userId: string }>
    >;
    widgetResolveThread: FunctionReference<
      "query",
      "public",
      {
        clientSessionId?: string;
        contactEmail?: string;
        contactId?: string;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      null | { threadId: string }
    >;
    widgetSendMessage: FunctionReference<
      "mutation",
      "public",
      {
        agentName?: string;
        clientSessionId?: string;
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        organizationId: string;
        prompt: string;
        requestHost?: string;
        requestOrigin?: string;
        role?: "user" | "assistant";
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      {
        autoRespondEnabled: boolean;
        mode: "agent" | "manual";
        requiresAgentReply: boolean;
        sessionId: string;
        threadId: string;
      }
    >;
  };
  mutations: {
    addConversationNote: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        note: string;
        organizationId: string;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    appendConversationEvent: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        eventType: string;
        organizationId: string;
        payload?: any;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    assignConversation: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        assignedAgentId: string;
        assignedAgentName?: string;
        organizationId: string;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    createSupportCannedResponse: FunctionReference<
      "mutation",
      "public",
      {
        body: string;
        channels: Array<"chat" | "email">;
        isActive?: boolean;
        organizationId: string;
        sortOrder?: number;
        title: string;
      },
      Id<"supportCannedResponses">
    >;
    createSupportPost: FunctionReference<
      "mutation",
      "public",
      {
        authorId?: string;
        content?: string;
        excerpt?: string;
        meta?: Array<{ key: string; value?: string | number | boolean | null }>;
        organizationId: string;
        parentId?: Id<"posts">;
        parentTypeSlug?: string;
        postTypeSlug: string;
        slug: string;
        status: "published" | "draft" | "archived";
        tags?: Array<string>;
        title: string;
      },
      any
    >;
    deleteConversation: FunctionReference<
      "mutation",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      null
    >;
    deleteRagSourceConfig: FunctionReference<
      "mutation",
      "public",
      { organizationId: string; sourceId: Id<"supportRagSources"> },
      null
    >;
    deleteSupportCannedResponse: FunctionReference<
      "mutation",
      "public",
      { id: Id<"supportCannedResponses">; organizationId: string },
      null
    >;
    rateLimitOrThrow: FunctionReference<
      "mutation",
      "public",
      { key: string; limit: number; windowMs: number },
      null
    >;
    recordMessageIndexUpdate: FunctionReference<
      "mutation",
      "public",
      {
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        mode?: "agent" | "manual";
        organizationId: string;
        role: "user" | "assistant";
        sessionId: string;
        snippet: string;
        threadId: string;
      },
      null
    >;
    removeRagIndexStatus: FunctionReference<
      "mutation",
      "public",
      { organizationId: string; postId: string; postTypeSlug: string },
      null
    >;
    saveRagSourceConfig: FunctionReference<
      "mutation",
      "public",
      {
        additionalMetaKeys?: string;
        baseInstructions?: string;
        displayName?: string;
        fields?: Array<string>;
        includeTags?: boolean;
        isEnabled?: boolean;
        metaFieldKeys?: Array<string>;
        organizationId: string;
        postTypeSlug: string;
        sourceId?: Id<"supportRagSources">;
        sourceType?: "postType" | "lmsPostType";
        useCustomBaseInstructions?: boolean;
      },
      { ragSourceId: Id<"supportRagSources"> }
    >;
    setAgentPresence: FunctionReference<
      "mutation",
      "public",
      {
        agentName?: string;
        agentUserId: string;
        organizationId: string;
        sessionId?: string;
        status: "typing" | "idle";
        threadId?: string;
      },
      null
    >;
    setConversationMode: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        mode: "agent" | "manual";
        organizationId: string;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    setConversationStatus: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        organizationId: string;
        sessionId?: string;
        status: "open" | "snoozed" | "closed";
        threadId?: string;
      },
      null
    >;
    setSupportCannedResponseActive: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"supportCannedResponses">;
        isActive: boolean;
        organizationId: string;
      },
      null
    >;
    supportPresenceDisconnect: FunctionReference<
      "mutation",
      "public",
      { sessionToken: string },
      null
    >;
    supportPresenceHeartbeat: FunctionReference<
      "mutation",
      "public",
      { interval?: number; roomId: string; sessionId: string; userId: string },
      { roomToken: string; sessionToken: string }
    >;
    supportPresenceUpdateRoomUser: FunctionReference<
      "mutation",
      "public",
      { data?: any; roomId: string; userId: string },
      null
    >;
    touchRagSourceIndexedAt: FunctionReference<
      "mutation",
      "public",
      { sourceId: Id<"supportRagSources"> },
      null
    >;
    unassignConversation: FunctionReference<
      "mutation",
      "public",
      {
        actorId?: string;
        actorName?: string;
        organizationId: string;
        sessionId?: string;
        threadId?: string;
      },
      null
    >;
    updateSupportCannedResponse: FunctionReference<
      "mutation",
      "public",
      {
        body?: string;
        channels?: Array<"chat" | "email">;
        id: Id<"supportCannedResponses">;
        isActive?: boolean;
        organizationId: string;
        sortOrder?: number;
        title?: string;
      },
      null
    >;
    updateSupportPost: FunctionReference<
      "mutation",
      "public",
      {
        authorId?: string;
        content?: string;
        excerpt?: string;
        id: Id<"posts">;
        meta?: Array<{ key: string; value?: string | number | boolean | null }>;
        organizationId: string;
        parentId?: Id<"posts">;
        parentTypeSlug?: string;
        postTypeSlug: string;
        slug: string;
        status: "published" | "draft" | "archived";
        tags?: Array<string>;
        title: string;
      },
      any
    >;
    upsertConversationIndex: FunctionReference<
      "mutation",
      "public",
      {
        agentThreadId?: string;
        assignedAgentId?: string;
        assignedAgentName?: string;
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        emailThreadId?: string;
        firstMessageAt?: number;
        inboundAlias?: string;
        lastMessageAt?: number;
        lastMessageAuthor?: "user" | "assistant";
        lastMessageSnippet?: string;
        mode?: "agent" | "manual";
        organizationId: string;
        origin: "chat" | "email";
        sessionId: string;
        status?: "open" | "snoozed" | "closed";
        subject?: string;
        totalMessages?: number;
      },
      null
    >;
    upsertRagIndexStatus: FunctionReference<
      "mutation",
      "public",
      {
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
      },
      null
    >;
    upsertSupportOption: FunctionReference<
      "mutation",
      "public",
      {
        key: string;
        organizationId: string;
        value?: string | number | boolean | null;
      },
      any
    >;
    upsertSupportPostMeta: FunctionReference<
      "mutation",
      "public",
      {
        entries: Array<{
          key: string;
          value?: string | number | boolean | null;
        }>;
        organizationId: string;
        postId: Id<"posts">;
      },
      any
    >;
    widgetCaptureContact: FunctionReference<
      "mutation",
      "public",
      {
        clientSessionId?: string;
        company?: string;
        contactId?: string;
        email?: string;
        fullName?: string;
        organizationId: string;
        phone?: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      {
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        sessionId: string;
        threadId: string;
      }
    >;
    widgetCreateThread: FunctionReference<
      "mutation",
      "public",
      {
        clientSessionId?: string;
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        mode?: "agent" | "manual";
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      { sessionId: string; threadId: string }
    >;
    widgetPresenceDisconnect: FunctionReference<
      "mutation",
      "public",
      {
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionToken: string;
        widgetKey: string;
      },
      null
    >;
    widgetPresenceHeartbeat: FunctionReference<
      "mutation",
      "public",
      {
        data?: any;
        interval?: number;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        sessionTokenId: string;
        threadId?: string;
        userId: string;
        widgetKey: string;
      },
      { roomToken: string; sessionToken: string }
    >;
    widgetSendMessage: FunctionReference<
      "mutation",
      "public",
      {
        agentName?: string;
        clientSessionId?: string;
        contactEmail?: string;
        contactId?: string;
        contactName?: string;
        organizationId: string;
        prompt: string;
        requestHost?: string;
        requestOrigin?: string;
        role?: "user" | "assistant";
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      {
        autoRespondEnabled: boolean;
        mode: "agent" | "manual";
        requiresAgentReply: boolean;
        sessionId: string;
        threadId: string;
      }
    >;
  };
  posts: {
    mutations: {
      createPost: FunctionReference<
        "mutation",
        "public",
        {
          category?: string;
          content?: string;
          excerpt?: string;
          featuredImage?: string;
          meta?: Record<string, string | number | boolean | null>;
          organizationId?: string;
          postTypeSlug: string;
          slug: string;
          status: "published" | "draft" | "archived";
          tags?: Array<string>;
          title: string;
        },
        string
      >;
      deletePost: FunctionReference<"mutation", "public", { id: string }, null>;
      updatePost: FunctionReference<
        "mutation",
        "public",
        {
          category?: string;
          content?: string;
          excerpt?: string;
          featuredImage?: string;
          id: string;
          meta?: Record<string, string | number | boolean | null>;
          organizationId?: string;
          slug?: string;
          status?: "published" | "draft" | "archived";
          tags?: Array<string>;
          title?: string;
        },
        null
      >;
    };
    queries: {
      getAllPosts: FunctionReference<
        "query",
        "public",
        {
          filters?: {
            authorId?: string;
            category?: string;
            limit?: number;
            postTypeSlug?: string;
            status?: "published" | "draft" | "archived";
          };
          organizationId?: string;
        },
        any
      >;
      getPostById: FunctionReference<
        "query",
        "public",
        { id: string; organizationId?: string },
        any
      >;
      getPostBySlug: FunctionReference<
        "query",
        "public",
        { organizationId?: string; slug: string },
        any
      >;
      getPostMeta: FunctionReference<
        "query",
        "public",
        { organizationId?: string; postId: string },
        any
      >;
    };
  };
  queries: {
    getAgentPresence: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    getConversationIndex: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    getConversationMode: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    getEmailSettingsByAliasLocalPart: FunctionReference<
      "query",
      "public",
      { aliasLocalPart: string },
      null | {
        allowEmailIntake: boolean;
        defaultAlias: string;
        inboundAlias: string;
        organizationId: string;
      }
    >;
    getRagIndexStatusForPost: FunctionReference<
      "query",
      "public",
      { organizationId: string; postId: string; postTypeSlug: string },
      any
    >;
    getRagSourceConfigForPostType: FunctionReference<
      "query",
      "public",
      { organizationId: string; postTypeSlug: string },
      any
    >;
    getRagSourceForPostType: FunctionReference<
      "query",
      "public",
      {
        organizationId: string;
        postTypeSlug: string;
        sourceType: "postType" | "lmsPostType";
      },
      any
    >;
    getRagSourceForPostTypeAny: FunctionReference<
      "query",
      "public",
      { organizationId: string; postTypeSlug: string },
      any
    >;
    getSupportOption: FunctionReference<
      "query",
      "public",
      { key: string; organizationId: string },
      any
    >;
    getSupportPostById: FunctionReference<
      "query",
      "public",
      { id: Id<"posts">; organizationId?: string },
      any
    >;
    getSupportPostMeta: FunctionReference<
      "query",
      "public",
      { organizationId?: string; postId: Id<"posts"> },
      any
    >;
    listConversationEvents: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    listConversationNotes: FunctionReference<
      "query",
      "public",
      { organizationId: string; sessionId?: string; threadId?: string },
      any
    >;
    listConversations: FunctionReference<
      "query",
      "public",
      { limit?: number; organizationId: string },
      any
    >;
    listPresenceRoom: FunctionReference<
      "query",
      "public",
      { limit?: number; onlineOnly?: boolean; roomId: string },
      any
    >;
    listRagSourceRecords: FunctionReference<
      "query",
      "public",
      {
        includeHistorical?: boolean;
        limit?: number;
        organizationId: string;
        sourceId: Id<"supportRagSources">;
      },
      any
    >;
    listRagSources: FunctionReference<
      "query",
      "public",
      { organizationId: string },
      any
    >;
    listSupportCannedResponses: FunctionReference<
      "query",
      "public",
      { includeInactive?: boolean; organizationId: string },
      Array<{
        _creationTime: number;
        _id: Id<"supportCannedResponses">;
        body: string;
        channels: Array<"chat" | "email">;
        createdAt: number;
        isActive: boolean;
        organizationId: string;
        sortOrder?: number;
        title: string;
        updatedAt: number;
      }>
    >;
    listSupportOptions: FunctionReference<
      "query",
      "public",
      { organizationId: string },
      any
    >;
    listSupportPosts: FunctionReference<
      "query",
      "public",
      {
        filters?: {
          limit?: number;
          parentId?: Id<"posts">;
          postTypeSlug?: string;
          status?: "published" | "draft" | "archived";
        };
        organizationId: string;
      },
      any
    >;
    supportPresenceList: FunctionReference<
      "query",
      "public",
      { limit?: number; roomToken: string },
      any
    >;
    widgetBootstrap: FunctionReference<
      "query",
      "public",
      {
        clientSessionId?: string;
        contactEmail?: string;
        contactId?: string;
        limit?: number;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      {
        helpdeskArticles: Array<{
          id: string;
          slug?: string;
          summary: string;
          title: string;
          updatedAt: string;
        }>;
        messages: Array<{
          _id: string;
          agentName?: string;
          content: string;
          createdAt: number;
          messageType?: "chat" | "email_inbound" | "email_outbound";
          role: "user" | "assistant";
        }>;
        settings: {
          autoRespondToThreads: boolean;
          fields: {
            company: boolean;
            email: boolean;
            fullName: boolean;
            phone: boolean;
          };
          introHeadline: string;
          loggedInUsersAutocapture: boolean;
          privacyMessage: string;
          requireContact: boolean;
          welcomeMessage: string;
        };
        threadId?: string;
      }
    >;
    widgetGetSettings: FunctionReference<
      "query",
      "public",
      {
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        widgetKey: string;
      },
      {
        allowedOrigins: Array<string>;
        settings: {
          autoRespondToThreads: boolean;
          fields: {
            company: boolean;
            email: boolean;
            fullName: boolean;
            phone: boolean;
          };
          introHeadline: string;
          loggedInUsersAutocapture: boolean;
          privacyMessage: string;
          requireContact: boolean;
          welcomeMessage: string;
        };
      }
    >;
    widgetListHelpdeskArticles: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        organizationId: string;
        query?: string;
        requestHost?: string;
        requestOrigin?: string;
        widgetKey: string;
      },
      Array<{
        id: string;
        slug?: string;
        summary: string;
        title: string;
        updatedAt: string;
      }>
    >;
    widgetListMessages: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      Array<{
        _id: string;
        agentName?: string;
        content: string;
        createdAt: number;
        messageType?: "chat" | "email_inbound" | "email_outbound";
        role: "user" | "assistant";
      }>
    >;
    widgetPresenceList: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        onlineOnly?: boolean;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      Array<{ data?: any; name?: string; online?: boolean; userId: string }>
    >;
    widgetResolveThread: FunctionReference<
      "query",
      "public",
      {
        clientSessionId?: string;
        contactEmail?: string;
        contactId?: string;
        organizationId: string;
        requestHost?: string;
        requestOrigin?: string;
        sessionId?: string;
        threadId?: string;
        widgetKey: string;
      },
      null | { threadId: string }
    >;
  };
} = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: {} = anyApi as any;

export const components = componentsGeneric() as unknown as {
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
};

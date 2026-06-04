/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    index: {
      addConversationNote: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          note: string;
          organizationId: string;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      appendConversationEvent: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          eventType: string;
          organizationId: string;
          payload?: any;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      assignConversation: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          assignedAgentId: string;
          assignedAgentName?: string;
          organizationId: string;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      createSupportCannedResponse: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          channels: Array<"chat" | "email">;
          isActive?: boolean;
          organizationId: string;
          sortOrder?: number;
          title: string;
        },
        string,
        Name
      >;
      createSupportPost: FunctionReference<
        "mutation",
        "internal",
        {
          authorId?: string;
          content?: string;
          excerpt?: string;
          meta?: Array<{
            key: string;
            value?: string | number | boolean | null;
          }>;
          organizationId: string;
          parentId?: string;
          parentTypeSlug?: string;
          postTypeSlug: string;
          slug: string;
          status: "published" | "draft" | "archived";
          tags?: Array<string>;
          title: string;
        },
        any,
        Name
      >;
      deleteConversation: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        null,
        Name
      >;
      deleteRagSourceConfig: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; sourceId: string },
        null,
        Name
      >;
      deleteSupportCannedResponse: FunctionReference<
        "mutation",
        "internal",
        { id: string; organizationId: string },
        null,
        Name
      >;
      getAgentPresence: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      getConversationIndex: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      getConversationMode: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      getEmailSettingsByAliasLocalPart: FunctionReference<
        "query",
        "internal",
        { aliasLocalPart: string },
        null | {
          allowEmailIntake: boolean;
          defaultAlias: string;
          inboundAlias: string;
          organizationId: string;
        },
        Name
      >;
      getRagIndexStatusForPost: FunctionReference<
        "query",
        "internal",
        { organizationId: string; postId: string; postTypeSlug: string },
        any,
        Name
      >;
      getRagSourceConfigForPostType: FunctionReference<
        "query",
        "internal",
        { organizationId: string; postTypeSlug: string },
        any,
        Name
      >;
      getRagSourceForPostType: FunctionReference<
        "query",
        "internal",
        {
          organizationId: string;
          postTypeSlug: string;
          sourceType: "postType" | "lmsPostType";
        },
        any,
        Name
      >;
      getRagSourceForPostTypeAny: FunctionReference<
        "query",
        "internal",
        { organizationId: string; postTypeSlug: string },
        any,
        Name
      >;
      getSupportOption: FunctionReference<
        "query",
        "internal",
        { key: string; organizationId: string },
        any,
        Name
      >;
      getSupportPostById: FunctionReference<
        "query",
        "internal",
        { id: string; organizationId?: string },
        any,
        Name
      >;
      getSupportPostMeta: FunctionReference<
        "query",
        "internal",
        { organizationId?: string; postId: string },
        any,
        Name
      >;
      listConversationEvents: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      listConversationNotes: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      listConversations: FunctionReference<
        "query",
        "internal",
        { limit?: number; organizationId: string },
        any,
        Name
      >;
      listPresenceRoom: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; roomId: string },
        any,
        Name
      >;
      listRagSourceRecords: FunctionReference<
        "query",
        "internal",
        {
          includeHistorical?: boolean;
          limit?: number;
          organizationId: string;
          sourceId: string;
        },
        any,
        Name
      >;
      listRagSources: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        any,
        Name
      >;
      listSupportCannedResponses: FunctionReference<
        "query",
        "internal",
        { includeInactive?: boolean; organizationId: string },
        Array<{
          _creationTime: number;
          _id: string;
          body: string;
          channels: Array<"chat" | "email">;
          createdAt: number;
          isActive: boolean;
          organizationId: string;
          sortOrder?: number;
          title: string;
          updatedAt: number;
        }>,
        Name
      >;
      listSupportOptions: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        any,
        Name
      >;
      listSupportPosts: FunctionReference<
        "query",
        "internal",
        {
          filters?: {
            limit?: number;
            parentId?: string;
            postTypeSlug?: string;
            status?: "published" | "draft" | "archived";
          };
          organizationId: string;
        },
        any,
        Name
      >;
      rateLimitOrThrow: FunctionReference<
        "mutation",
        "internal",
        { key: string; limit: number; windowMs: number },
        null,
        Name
      >;
      recordMessageIndexUpdate: FunctionReference<
        "mutation",
        "internal",
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
        null,
        Name
      >;
      removeRagIndexStatus: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; postId: string; postTypeSlug: string },
        null,
        Name
      >;
      saveRagSourceConfig: FunctionReference<
        "mutation",
        "internal",
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
          sourceId?: string;
          sourceType?: "postType" | "lmsPostType";
          useCustomBaseInstructions?: boolean;
        },
        { ragSourceId: string },
        Name
      >;
      setAgentPresence: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          agentUserId: string;
          organizationId: string;
          sessionId?: string;
          status: "typing" | "idle";
          threadId?: string;
        },
        null,
        Name
      >;
      setConversationMode: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          mode: "agent" | "manual";
          organizationId: string;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      setConversationStatus: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          organizationId: string;
          sessionId?: string;
          status: "open" | "snoozed" | "closed";
          threadId?: string;
        },
        null,
        Name
      >;
      setSupportCannedResponseActive: FunctionReference<
        "mutation",
        "internal",
        { id: string; isActive: boolean; organizationId: string },
        null,
        Name
      >;
      supportPresenceDisconnect: FunctionReference<
        "mutation",
        "internal",
        { sessionToken: string },
        null,
        Name
      >;
      supportPresenceHeartbeat: FunctionReference<
        "mutation",
        "internal",
        {
          interval?: number;
          roomId: string;
          sessionId: string;
          userId: string;
        },
        { roomToken: string; sessionToken: string },
        Name
      >;
      supportPresenceList: FunctionReference<
        "query",
        "internal",
        { limit?: number; roomToken: string },
        any,
        Name
      >;
      supportPresenceUpdateRoomUser: FunctionReference<
        "mutation",
        "internal",
        { data?: any; roomId: string; userId: string },
        null,
        Name
      >;
      touchRagSourceIndexedAt: FunctionReference<
        "mutation",
        "internal",
        { sourceId: string },
        null,
        Name
      >;
      unassignConversation: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          organizationId: string;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      updateSupportCannedResponse: FunctionReference<
        "mutation",
        "internal",
        {
          body?: string;
          channels?: Array<"chat" | "email">;
          id: string;
          isActive?: boolean;
          organizationId: string;
          sortOrder?: number;
          title?: string;
        },
        null,
        Name
      >;
      updateSupportPost: FunctionReference<
        "mutation",
        "internal",
        {
          authorId?: string;
          content?: string;
          excerpt?: string;
          id: string;
          meta?: Array<{
            key: string;
            value?: string | number | boolean | null;
          }>;
          organizationId: string;
          parentId?: string;
          parentTypeSlug?: string;
          postTypeSlug: string;
          slug: string;
          status: "published" | "draft" | "archived";
          tags?: Array<string>;
          title: string;
        },
        any,
        Name
      >;
      upsertConversationIndex: FunctionReference<
        "mutation",
        "internal",
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
        null,
        Name
      >;
      upsertRagIndexStatus: FunctionReference<
        "mutation",
        "internal",
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
        null,
        Name
      >;
      upsertSupportOption: FunctionReference<
        "mutation",
        "internal",
        {
          key: string;
          organizationId: string;
          value?: string | number | boolean | null;
        },
        any,
        Name
      >;
      upsertSupportPostMeta: FunctionReference<
        "mutation",
        "internal",
        {
          entries: Array<{
            key: string;
            value?: string | number | boolean | null;
          }>;
          organizationId: string;
          postId: string;
        },
        any,
        Name
      >;
      widgetBootstrap: FunctionReference<
        "query",
        "internal",
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
        },
        Name
      >;
      widgetCaptureContact: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
      widgetCreateThread: FunctionReference<
        "mutation",
        "internal",
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
        { sessionId: string; threadId: string },
        Name
      >;
      widgetGetSettings: FunctionReference<
        "query",
        "internal",
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
        },
        Name
      >;
      widgetListHelpdeskArticles: FunctionReference<
        "query",
        "internal",
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
        }>,
        Name
      >;
      widgetListMessages: FunctionReference<
        "query",
        "internal",
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
        }>,
        Name
      >;
      widgetPresenceDisconnect: FunctionReference<
        "mutation",
        "internal",
        {
          organizationId: string;
          requestHost?: string;
          requestOrigin?: string;
          sessionToken: string;
          widgetKey: string;
        },
        null,
        Name
      >;
      widgetPresenceHeartbeat: FunctionReference<
        "mutation",
        "internal",
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
        { roomToken: string; sessionToken: string },
        Name
      >;
      widgetPresenceList: FunctionReference<
        "query",
        "internal",
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
        Array<{ data?: any; name?: string; online?: boolean; userId: string }>,
        Name
      >;
      widgetResolveThread: FunctionReference<
        "query",
        "internal",
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
        null | { threadId: string },
        Name
      >;
      widgetSendMessage: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
    };
    mutations: {
      addConversationNote: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          note: string;
          organizationId: string;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      appendConversationEvent: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          eventType: string;
          organizationId: string;
          payload?: any;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      assignConversation: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          assignedAgentId: string;
          assignedAgentName?: string;
          organizationId: string;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      createSupportCannedResponse: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          channels: Array<"chat" | "email">;
          isActive?: boolean;
          organizationId: string;
          sortOrder?: number;
          title: string;
        },
        string,
        Name
      >;
      createSupportPost: FunctionReference<
        "mutation",
        "internal",
        {
          authorId?: string;
          content?: string;
          excerpt?: string;
          meta?: Array<{
            key: string;
            value?: string | number | boolean | null;
          }>;
          organizationId: string;
          parentId?: string;
          parentTypeSlug?: string;
          postTypeSlug: string;
          slug: string;
          status: "published" | "draft" | "archived";
          tags?: Array<string>;
          title: string;
        },
        any,
        Name
      >;
      deleteConversation: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        null,
        Name
      >;
      deleteRagSourceConfig: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; sourceId: string },
        null,
        Name
      >;
      deleteSupportCannedResponse: FunctionReference<
        "mutation",
        "internal",
        { id: string; organizationId: string },
        null,
        Name
      >;
      rateLimitOrThrow: FunctionReference<
        "mutation",
        "internal",
        { key: string; limit: number; windowMs: number },
        null,
        Name
      >;
      recordMessageIndexUpdate: FunctionReference<
        "mutation",
        "internal",
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
        null,
        Name
      >;
      removeRagIndexStatus: FunctionReference<
        "mutation",
        "internal",
        { organizationId: string; postId: string; postTypeSlug: string },
        null,
        Name
      >;
      saveRagSourceConfig: FunctionReference<
        "mutation",
        "internal",
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
          sourceId?: string;
          sourceType?: "postType" | "lmsPostType";
          useCustomBaseInstructions?: boolean;
        },
        { ragSourceId: string },
        Name
      >;
      setAgentPresence: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          agentUserId: string;
          organizationId: string;
          sessionId?: string;
          status: "typing" | "idle";
          threadId?: string;
        },
        null,
        Name
      >;
      setConversationMode: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          mode: "agent" | "manual";
          organizationId: string;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      setConversationStatus: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          organizationId: string;
          sessionId?: string;
          status: "open" | "snoozed" | "closed";
          threadId?: string;
        },
        null,
        Name
      >;
      setSupportCannedResponseActive: FunctionReference<
        "mutation",
        "internal",
        { id: string; isActive: boolean; organizationId: string },
        null,
        Name
      >;
      supportPresenceDisconnect: FunctionReference<
        "mutation",
        "internal",
        { sessionToken: string },
        null,
        Name
      >;
      supportPresenceHeartbeat: FunctionReference<
        "mutation",
        "internal",
        {
          interval?: number;
          roomId: string;
          sessionId: string;
          userId: string;
        },
        { roomToken: string; sessionToken: string },
        Name
      >;
      supportPresenceUpdateRoomUser: FunctionReference<
        "mutation",
        "internal",
        { data?: any; roomId: string; userId: string },
        null,
        Name
      >;
      touchRagSourceIndexedAt: FunctionReference<
        "mutation",
        "internal",
        { sourceId: string },
        null,
        Name
      >;
      unassignConversation: FunctionReference<
        "mutation",
        "internal",
        {
          actorId?: string;
          actorName?: string;
          organizationId: string;
          sessionId?: string;
          threadId?: string;
        },
        null,
        Name
      >;
      updateSupportCannedResponse: FunctionReference<
        "mutation",
        "internal",
        {
          body?: string;
          channels?: Array<"chat" | "email">;
          id: string;
          isActive?: boolean;
          organizationId: string;
          sortOrder?: number;
          title?: string;
        },
        null,
        Name
      >;
      updateSupportPost: FunctionReference<
        "mutation",
        "internal",
        {
          authorId?: string;
          content?: string;
          excerpt?: string;
          id: string;
          meta?: Array<{
            key: string;
            value?: string | number | boolean | null;
          }>;
          organizationId: string;
          parentId?: string;
          parentTypeSlug?: string;
          postTypeSlug: string;
          slug: string;
          status: "published" | "draft" | "archived";
          tags?: Array<string>;
          title: string;
        },
        any,
        Name
      >;
      upsertConversationIndex: FunctionReference<
        "mutation",
        "internal",
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
        null,
        Name
      >;
      upsertRagIndexStatus: FunctionReference<
        "mutation",
        "internal",
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
        null,
        Name
      >;
      upsertSupportOption: FunctionReference<
        "mutation",
        "internal",
        {
          key: string;
          organizationId: string;
          value?: string | number | boolean | null;
        },
        any,
        Name
      >;
      upsertSupportPostMeta: FunctionReference<
        "mutation",
        "internal",
        {
          entries: Array<{
            key: string;
            value?: string | number | boolean | null;
          }>;
          organizationId: string;
          postId: string;
        },
        any,
        Name
      >;
      widgetCaptureContact: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
      widgetCreateThread: FunctionReference<
        "mutation",
        "internal",
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
        { sessionId: string; threadId: string },
        Name
      >;
      widgetPresenceDisconnect: FunctionReference<
        "mutation",
        "internal",
        {
          organizationId: string;
          requestHost?: string;
          requestOrigin?: string;
          sessionToken: string;
          widgetKey: string;
        },
        null,
        Name
      >;
      widgetPresenceHeartbeat: FunctionReference<
        "mutation",
        "internal",
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
        { roomToken: string; sessionToken: string },
        Name
      >;
      widgetSendMessage: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
    };
    posts: {
      mutations: {
        createPost: FunctionReference<
          "mutation",
          "internal",
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
          string,
          Name
        >;
        deletePost: FunctionReference<
          "mutation",
          "internal",
          { id: string },
          null,
          Name
        >;
        updatePost: FunctionReference<
          "mutation",
          "internal",
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
          null,
          Name
        >;
      };
      queries: {
        getAllPosts: FunctionReference<
          "query",
          "internal",
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
          any,
          Name
        >;
        getPostById: FunctionReference<
          "query",
          "internal",
          { id: string; organizationId?: string },
          any,
          Name
        >;
        getPostBySlug: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; slug: string },
          any,
          Name
        >;
        getPostMeta: FunctionReference<
          "query",
          "internal",
          { organizationId?: string; postId: string },
          any,
          Name
        >;
      };
    };
    queries: {
      getAgentPresence: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      getConversationIndex: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      getConversationMode: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      getEmailSettingsByAliasLocalPart: FunctionReference<
        "query",
        "internal",
        { aliasLocalPart: string },
        null | {
          allowEmailIntake: boolean;
          defaultAlias: string;
          inboundAlias: string;
          organizationId: string;
        },
        Name
      >;
      getRagIndexStatusForPost: FunctionReference<
        "query",
        "internal",
        { organizationId: string; postId: string; postTypeSlug: string },
        any,
        Name
      >;
      getRagSourceConfigForPostType: FunctionReference<
        "query",
        "internal",
        { organizationId: string; postTypeSlug: string },
        any,
        Name
      >;
      getRagSourceForPostType: FunctionReference<
        "query",
        "internal",
        {
          organizationId: string;
          postTypeSlug: string;
          sourceType: "postType" | "lmsPostType";
        },
        any,
        Name
      >;
      getRagSourceForPostTypeAny: FunctionReference<
        "query",
        "internal",
        { organizationId: string; postTypeSlug: string },
        any,
        Name
      >;
      getSupportOption: FunctionReference<
        "query",
        "internal",
        { key: string; organizationId: string },
        any,
        Name
      >;
      getSupportPostById: FunctionReference<
        "query",
        "internal",
        { id: string; organizationId?: string },
        any,
        Name
      >;
      getSupportPostMeta: FunctionReference<
        "query",
        "internal",
        { organizationId?: string; postId: string },
        any,
        Name
      >;
      listConversationEvents: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      listConversationNotes: FunctionReference<
        "query",
        "internal",
        { organizationId: string; sessionId?: string; threadId?: string },
        any,
        Name
      >;
      listConversations: FunctionReference<
        "query",
        "internal",
        { limit?: number; organizationId: string },
        any,
        Name
      >;
      listPresenceRoom: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; roomId: string },
        any,
        Name
      >;
      listRagSourceRecords: FunctionReference<
        "query",
        "internal",
        {
          includeHistorical?: boolean;
          limit?: number;
          organizationId: string;
          sourceId: string;
        },
        any,
        Name
      >;
      listRagSources: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        any,
        Name
      >;
      listSupportCannedResponses: FunctionReference<
        "query",
        "internal",
        { includeInactive?: boolean; organizationId: string },
        Array<{
          _creationTime: number;
          _id: string;
          body: string;
          channels: Array<"chat" | "email">;
          createdAt: number;
          isActive: boolean;
          organizationId: string;
          sortOrder?: number;
          title: string;
          updatedAt: number;
        }>,
        Name
      >;
      listSupportOptions: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        any,
        Name
      >;
      listSupportPosts: FunctionReference<
        "query",
        "internal",
        {
          filters?: {
            limit?: number;
            parentId?: string;
            postTypeSlug?: string;
            status?: "published" | "draft" | "archived";
          };
          organizationId: string;
        },
        any,
        Name
      >;
      supportPresenceList: FunctionReference<
        "query",
        "internal",
        { limit?: number; roomToken: string },
        any,
        Name
      >;
      widgetBootstrap: FunctionReference<
        "query",
        "internal",
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
        },
        Name
      >;
      widgetGetSettings: FunctionReference<
        "query",
        "internal",
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
        },
        Name
      >;
      widgetListHelpdeskArticles: FunctionReference<
        "query",
        "internal",
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
        }>,
        Name
      >;
      widgetListMessages: FunctionReference<
        "query",
        "internal",
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
        }>,
        Name
      >;
      widgetPresenceList: FunctionReference<
        "query",
        "internal",
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
        Array<{ data?: any; name?: string; online?: boolean; userId: string }>,
        Name
      >;
      widgetResolveThread: FunctionReference<
        "query",
        "internal",
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
        null | { threadId: string },
        Name
      >;
    };
  };

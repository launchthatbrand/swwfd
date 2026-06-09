"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { FunctionReference } from "convex/server";

/**
 * App-provided Convex bindings for this plugin.
 *
 * IMPORTANT:
 * - Plugins must not assume any particular Convex namespace (e.g. `api.plugins.support...`).
 * - Each consuming app wires these bindings to wherever the relevant queries/mutations/actions
 *   live in that app’s Convex codebase.
 */
export type SupportConvexBindings = {
  support: {
    queries: {
      listHelpdeskArticles: FunctionReference<"query", "public", any, any>;
      listConversations: FunctionReference<"query", "public", any, any>;
      listMessages: FunctionReference<"query", "public", any, any>;
      getChannelCapabilities: FunctionReference<"query", "public", any, any>;
      getContactById: FunctionReference<"query", "public", any, any>;
      getAgentPresence: FunctionReference<"query", "public", any, any>;
      getConversationMode: FunctionReference<"query", "public", any, any>;
      getEmailSettings: FunctionReference<"query", "public", any, any>;
      listRagSources: FunctionReference<"query", "public", any, any>;
      listRagSourceRecords: FunctionReference<"query", "public", any, any>;
      listSupportCannedResponses: FunctionReference<"query", "public", any, any>;
      // Some apps may expose these under different files; keep them required for now.
      listConversationNotes: FunctionReference<"query", "public", any, any>;
      listConversationEvents: FunctionReference<"query", "public", any, any>;
    };
    mutations: {
      recordMessage: FunctionReference<"mutation", "public", any, any>;
      setAgentPresence: FunctionReference<"mutation", "public", any, any>;
      setConversationMode: FunctionReference<"mutation", "public", any, any>;
      saveEmailSettings: FunctionReference<"mutation", "public", any, any>;
      beginDomainVerification: FunctionReference<"mutation", "public", any, any>;
      saveRagSourceConfig: FunctionReference<"mutation", "public", any, any>;
      deleteRagSourceConfig: FunctionReference<"mutation", "public", any, any>;
      triggerRagReindexForPost: FunctionReference<"mutation", "public", any, any>;
      triggerRagReindexForPosts: FunctionReference<"mutation", "public", any, any>;
      triggerRagReindexForPostType: FunctionReference<"mutation", "public", any, any>;
      deleteRagRecordForPost: FunctionReference<"mutation", "public", any, any>;
      setConversationStatus: FunctionReference<"mutation", "public", any, any>;
      assignConversation: FunctionReference<"mutation", "public", any, any>;
      unassignConversation: FunctionReference<"mutation", "public", any, any>;
      addConversationNote: FunctionReference<"mutation", "public", any, any>;
      deleteConversation: FunctionReference<"mutation", "public", any, any>;
      createSupportCannedResponse: FunctionReference<"mutation", "public", any, any>;
      updateSupportCannedResponse: FunctionReference<"mutation", "public", any, any>;
      setSupportCannedResponseActive: FunctionReference<
        "mutation",
        "public",
        any,
        any
      >;
      deleteSupportCannedResponse: FunctionReference<"mutation", "public", any, any>;
    };
    options: {
      getSupportOption: FunctionReference<"query", "public", any, any>;
      saveSupportOption: FunctionReference<"mutation", "public", any, any>;
    };
    presence: {
      list: FunctionReference<"query", "public", any, any>;
      heartbeat: FunctionReference<"mutation", "public", any, any>;
      disconnect: FunctionReference<"mutation", "public", any, any>;
    };
    widget: {
      queries: {
        bootstrap: FunctionReference<"query", "public", any, any>;
        getSettings: FunctionReference<"query", "public", any, any>;
        resolveThread: FunctionReference<"query", "public", any, any>;
        listMessages: FunctionReference<"query", "public", any, any>;
        listHelpdeskArticles: FunctionReference<"query", "public", any, any>;
        listPresence: FunctionReference<"query", "public", any, any>;
      };
      mutations: {
        createThread: FunctionReference<"mutation", "public", any, any>;
        captureContact: FunctionReference<"mutation", "public", any, any>;
        sendMessage: FunctionReference<"mutation", "public", any, any>;
        presenceHeartbeat: FunctionReference<"mutation", "public", any, any>;
        presenceDisconnect: FunctionReference<"mutation", "public", any, any>;
      };
    };
    openaiModels: {
      listAvailableModels: FunctionReference<"action", "public", any, any>;
    };
    anthropicModels: {
      listAvailableModels: FunctionReference<"action", "public", any, any>;
    };
    googleModels: {
      listAvailableModels: FunctionReference<"action", "public", any, any>;
    };
    minimaxModels: {
      listAvailableModels: FunctionReference<"action", "public", any, any>;
    };
  };

  core: {
    organizations: {
      queries: {
        getOrganizationMembers: FunctionReference<"query", "public", any, any>;
      };
    };
    users: {
      queries: {
        listOrganizationUsersPage: FunctionReference<"query", "public", any, any>;
      };
    };
    roles: {
      queries: {
        getRoleNamesForUser: FunctionReference<"query", "public", any, any>;
        listPluginRoleAssignmentsForOrganization: FunctionReference<
          "query",
          "public",
          any,
          any
        >;
      };
      mutations: {
        assignPluginRoleToUser: FunctionReference<"mutation", "public", any, any>;
        removePluginRoleFromUser: FunctionReference<
          "mutation",
          "public",
          any,
          any
        >;
      };
    };
    postTypes: {
      list: FunctionReference<"query", "public", any, any>;
    };
  };

  integrations: {
    connections: {
      queries: {
        list: FunctionReference<"query", "public", any, any>;
      };
      actions: {
        upsertForOwner: FunctionReference<"action", "public", any, any>;
        remove: FunctionReference<"action", "public", any, any>;
      };
    };
  };
};

const SupportConvexContext = createContext<SupportConvexBindings | null>(null);

export function SupportConvexProvider(props: {
  bindings: SupportConvexBindings;
  children: React.ReactNode;
}) {
  const value = useMemo<SupportConvexBindings>(() => props.bindings, [props.bindings]);

  return (
    <SupportConvexContext.Provider value={value}>
      {props.children}
    </SupportConvexContext.Provider>
  );
}

export function useSupportConvex(): SupportConvexBindings {
  const ctx = useContext(SupportConvexContext);
  if (!ctx) {
    throw new Error(
      [
        "[@swwfd/plugin-support] Missing SupportConvexProvider.",
        "Provide app-specific Convex FunctionReferences via `bindings`.",
      ].join(" "),
    );
  }
  return ctx;
}


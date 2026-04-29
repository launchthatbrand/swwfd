/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import type { SupportConvexBindings } from "launchthat-plugin-support";

import { api } from "../../../convex/_generated/api";

export const swwfdSupportConvexBindings = {
  support: {
    queries: {
      listMessages: (api as any).plugins.support.queries.listMessages,
      getAgentPresence: (api as any).plugins.support.queries.getAgentPresence,
      getConversationMode: (api as any).plugins.support.queries.getConversationMode,
    },
    mutations: {
      recordMessage: (api as any).plugins.support.mutations.recordMessage,
    },
    options: {
      getSupportOption: (api as any).plugins.support.options.getSupportOption,
      saveSupportOption: (api as any).plugins.support.options.saveSupportOption,
    },
    presence: {
      list: (api as any).plugins.support.presence.list,
      heartbeat: (api as any).plugins.support.presence.heartbeat,
      disconnect: (api as any).plugins.support.presence.disconnect,
    },
    widget: {
      queries: {
        bootstrap: (api as any).plugins.support.widget.bootstrap,
        getSettings: (api as any).plugins.support.widget.getSettings,
        resolveThread: (api as any).plugins.support.widget.resolveThread,
        listMessages: (api as any).plugins.support.widget.listMessages,
        listHelpdeskArticles: (api as any).plugins.support.widget.listHelpdeskArticles,
        listPresence: (api as any).plugins.support.widget.listPresence,
      },
      mutations: {
        createThread: (api as any).plugins.support.widget.createThread,
        captureContact: (api as any).plugins.support.widget.captureContact,
        sendMessage: (api as any).plugins.support.widget.sendMessage,
        presenceHeartbeat: (api as any).plugins.support.widget.presenceHeartbeat,
        presenceDisconnect: (api as any).plugins.support.widget.presenceDisconnect,
      },
    },
  },
} as unknown as SupportConvexBindings;

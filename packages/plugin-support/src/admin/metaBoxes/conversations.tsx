"use client";

import type { AdminMetaBoxContext } from "@swwfd/admin-runtime";
import type { GenericId as Id } from "convex/values";
import { SupportSystem } from "../SupportSystem";
import { registerMetaBoxHook } from "@swwfd/admin-runtime";

type SupportContext = AdminMetaBoxContext<
  unknown,
  unknown,
  Id<"organizations"> | undefined
>;

const SUPPORT_CONVERSATIONS_SLUG = "supportconversations";

const SupportConversationsMetaBox = ({
  organizationId,
}: {
  organizationId?: Id<"organizations">;
}) => {
  if (!organizationId) {
    return (
      <div className="text-muted-foreground text-sm">
        An organization is required to view support conversations.
      </div>
    );
  }

  return (
    <SupportSystem
      organizationId={organizationId}
      buildNavHref={() => "#"}
      params={{ segments: ["conversations"] }}
      searchParams={{}}
    />
  );
};

let supportConversationsMetaBoxRegistered = false;

export const registerSupportConversationsMetaBox = () => {
  if (supportConversationsMetaBoxRegistered) {
    return;
  }

  registerMetaBoxHook<SupportContext>("main", (context) => {
    if (context.slug.toLowerCase() !== SUPPORT_CONVERSATIONS_SLUG) {
      return null;
    }

    context.visibility = {
      ...(context.visibility ?? {}),
      showGeneralPanel: false,
      showCustomFieldsPanel: false,
      showSidebarActions: false,
      showSidebarMetadata: false,
    };

    return {
      id: "support-conversations-main",
      title: "Support Conversations",
      description:
        "View and manage support conversations captured from the chat widget.",
      location: "main",
      priority: -100,
      render: () => (
        <SupportConversationsMetaBox
          organizationId={context.organizationId as Id<"organizations">}
        />
      ),
    };
  });

  supportConversationsMetaBoxRegistered = true;
};

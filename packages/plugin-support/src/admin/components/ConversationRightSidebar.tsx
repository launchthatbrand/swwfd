import * as React from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@launchthatapp/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@launchthatapp/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@launchthatapp/ui/avatar";
import {
  BadgeCheck,
  Bot,
  Briefcase,
  CalendarClock,
  Clock,
  Hash,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@launchthatapp/ui/card";
import {
  ContactInfoRow,
  formatDateTime,
  getInitials,
} from "./shared/contactUtils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@launchthatapp/ui/sidebar";
import { useMutation, useQuery } from "convex/react";

import { AgentModeToggle } from "./AgentModeToggle";
import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";
import { SUPPORT_COPY } from "../constants/supportCopy";
import { Separator } from "@launchthatapp/ui/separator";
import { toast } from "@launchthatapp/ui/toast";
import { useSupportConvex } from "../../convex/bindings";
import { useSupportPresence } from "../../components/hooks/useSupportPresence";

export interface ConversationSummary {
  threadId: string;
  sessionId: string;
  lastMessage: string;
  lastRole: "user" | "assistant";
  lastAt: number;
  firstAt: number;
  totalMessages: number;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  origin: "chat" | "email";
  status?: "open" | "snoozed" | "closed";
  assignedAgentId?: string;
  assignedAgentName?: string;
  mode?: "agent" | "manual";
  agentThreadId?: string;
}

export interface ContactDoc {
  _id: Id<"contacts">;
  organizationId: Id<"organizations">;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSidebarProps {
  conversation: ConversationSummary | undefined;
  contact: ContactDoc | null;
  fallbackName?: string;
  fallbackEmail?: string;
  organizationName?: string;
  organizationId?: Id<"organizations">;
  currentAgent?: {
    id: string;
    name?: string;
    imageUrl?: string;
  };
}

type PresenceMetadata = {
  role?: "agent" | "visitor";
  name?: string;
  imageUrl?: string;
};

type PresenceEntry = {
  userId: string;
  online?: boolean;
  name?: string;
  data?: unknown;
};

const AGENT_PRESENCE_PREFIX = "agent:";
const toAgentPresenceUserId = (agentId: string) =>
  `${AGENT_PRESENCE_PREFIX}${agentId}`;
const isAgentPresenceUser = (userId: string) =>
  userId.startsWith(AGENT_PRESENCE_PREFIX);

// type PresenceApi = Parameters<typeof usePresence>[0] & {
//   updateRoomUser: FunctionReference<
//     "mutation",
//     "public",
//     {
//       roomId: string;
//       userId: string;
//       data?: Record<string, unknown>;
//     },
//     null
//   >;
// };

// type PresenceEntry =
//   NonNullable<ReturnType<typeof usePresence>> extends Array<infer Entry>
//     ? Entry
//     : never;

export function ConversationRightSidebar({
  conversation,
  contact,
  fallbackName,
  fallbackEmail,
  organizationName,
  organizationId,
  currentAgent,
  ...props
}: React.ComponentProps<typeof Sidebar> & ConversationSidebarProps) {
  const convex = useSupportConvex();
  const setConversationMode = useMutation(
    convex.support.mutations.setConversationMode,
  );
  const setConversationStatus = useMutation(
    convex.support.mutations.setConversationStatus,
  );
  const assignConversation = useMutation(
    convex.support.mutations.assignConversation,
  );
  const unassignConversation = useMutation(
    convex.support.mutations.unassignConversation,
  );
  const addConversationNote = useMutation(
    convex.support.mutations.addConversationNote,
  );
  const deleteConversation = useMutation(
    convex.support.mutations.deleteConversation,
  );
  const contactName = contact?.fullName ?? fallbackName ?? "Unknown visitor";
  const contactEmail = contact?.email ?? fallbackEmail;
  const company = contact?.company;
  const hasEmail = Boolean(contactEmail);
  const hasContactRecord = Boolean(contact?._id);
  const contactId = contact?._id;

  const handleEmailContact = React.useCallback(() => {
    if (!hasEmail || !contactEmail) {
      toast.info("This contact does not have an email address yet.");
      return;
    }
    if (typeof window === "undefined") return;
    window.open(`mailto:${contactEmail}`, "_blank", "noopener,noreferrer");
  }, [contactEmail, hasEmail]);

  const handleViewContact = React.useCallback(() => {
    if (!hasContactRecord || !contactId) {
      toast.info("Contact record not found. Sync the contact to continue.");
      return;
    }
    if (typeof window === "undefined") return;
    const targetUrl = `/admin/contacts?contactId=${contactId}`;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }, [contactId, hasContactRecord]);
  const currentMode = conversation?.mode ?? "agent";
  const isAgentMode = currentMode === "agent";
  const currentStatus = conversation?.status ?? "open";
  const assignedAgentName =
    conversation?.assignedAgentName ??
    (conversation?.assignedAgentId ? "Agent" : undefined);
  const presenceSessionId = conversation?.sessionId ?? conversation?.threadId;
  const presenceRoomId =
    organizationId && presenceSessionId
      ? `support:${organizationId}:${presenceSessionId}`
      : null;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = React.useState(false);
  const presenceUserId = currentAgent
    ? toAgentPresenceUserId(currentAgent.id)
    : "agent:support-admin";
  const presenceState = useSupportPresence({
    presenceApi: convex.support.presence,
    roomId: presenceRoomId ?? "__support:no-room",
    userId: presenceUserId,
  }) as PresenceEntry[];
  const visitorConnected = React.useMemo(
    () =>
      presenceState.some(
        (entry) => entry.online && String(entry.userId).startsWith("visitor:"),
      ),
    [presenceState],
  );

  const handleToggleMode = React.useCallback(async () => {
    if (!conversation || !organizationId) {
      toast.info("Select a conversation to change agent mode.");
      return;
    }
    try {
      await setConversationMode({
        organizationId,
        threadId: conversation.threadId,
        sessionId: conversation.sessionId,
        mode: isAgentMode ? "manual" : "agent",
      });
      toast.success(
        isAgentMode
          ? "Switched to manual mode. The assistant will stop replying."
          : "Agent mode enabled. The assistant can reply again.",
      );
    } catch (error) {
      console.error("[conversation-sidebar] toggle mode", error);
      toast.error("Unable to update agent mode. Please try again.");
    }
  }, [conversation, isAgentMode, organizationId, setConversationMode]);

  const notes = useQuery(
    convex.support.queries.listConversationNotes,
    conversation && organizationId
      ? { organizationId, threadId: conversation.threadId }
      : "skip",
  ) as
    | Array<{
      _id: string;
      note: string;
      actorName?: string;
      createdAt: number;
    }>
    | undefined;

  const events = useQuery(
    convex.support.queries.listConversationEvents,
    conversation && organizationId
      ? { organizationId, threadId: conversation.threadId }
      : "skip",
  ) as
    | Array<{
      _id: string;
      eventType: string;
      actorName?: string;
      payload?: string;
      createdAt: number;
    }>
    | undefined;

  const [noteDraft, setNoteDraft] = React.useState("");

  const handleStatusChange = React.useCallback(
    async (status: "open" | "snoozed" | "closed") => {
      if (!conversation || !organizationId) return;
      try {
        await setConversationStatus({
          organizationId,
          threadId: conversation.threadId,
          status,
        });
        toast.success(`Conversation marked ${status}.`);
      } catch (error) {
        console.error("[conversation-sidebar] status change", error);
        toast.error("Unable to update conversation status.");
      }
    },
    [conversation, organizationId, setConversationStatus],
  );

  const handleAssignToMe = React.useCallback(async () => {
    if (!conversation || !organizationId || !currentAgent) return;
    try {
      await assignConversation({
        organizationId,
        threadId: conversation.threadId,
        assignedAgentId: currentAgent.id,
        assignedAgentName: currentAgent.name,
      });
      toast.success("Assigned conversation to you.");
    } catch (error) {
      console.error("[conversation-sidebar] assign", error);
      toast.error("Unable to assign conversation.");
    }
  }, [assignConversation, conversation, currentAgent, organizationId]);

  const handleUnassign = React.useCallback(async () => {
    if (!conversation || !organizationId) return;
    try {
      await unassignConversation({
        organizationId,
        threadId: conversation.threadId,
      });
      toast.success("Unassigned conversation.");
    } catch (error) {
      console.error("[conversation-sidebar] unassign", error);
      toast.error("Unable to unassign conversation.");
    }
  }, [conversation, organizationId, unassignConversation]);

  const handleAddNote = React.useCallback(async () => {
    if (!conversation || !organizationId) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    try {
      await addConversationNote({
        organizationId,
        threadId: conversation.threadId,
        note: trimmed,
      });
      setNoteDraft("");
      toast.success("Note added.");
    } catch (error) {
      console.error("[conversation-sidebar] add note", error);
      toast.error("Unable to add note.");
    }
  }, [addConversationNote, conversation, noteDraft, organizationId]);

  const handleDeleteConversation = React.useCallback(async () => {
    if (!conversation || !organizationId) return;
    if (visitorConnected) {
      toast.error(
        "Cannot delete this conversation while the visitor is connected.",
      );
      return;
    }
    setIsDeletingConversation(true);
    try {
      await deleteConversation({
        organizationId,
        threadId: conversation.threadId,
      });
      setConfirmDeleteOpen(false);
      toast.success("Conversation deleted.");
    } catch (error) {
      console.error("[conversation-sidebar] delete conversation", error);
      toast.error("Unable to delete conversation.", {
        description:
          error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setIsDeletingConversation(false);
    }
  }, [conversation, deleteConversation, organizationId, visitorConnected]);

  return (
    <Sidebar {...props}>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the conversation record, notes, and event
              history from the support workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingConversation}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingConversation || visitorConnected}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteConversation();
              }}
            >
              {isDeletingConversation ? "Deleting..." : "Delete conversation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SidebarHeader>
        <AgentModeToggle
          isAgentMode={isAgentMode}
          assignedAgentName={assignedAgentName}
          disabled={!conversation || !organizationId}
          onToggle={() => void handleToggleMode()}
        />
      </SidebarHeader>
      <SidebarContent className="space-y-4 p-4">

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm">Workflow</CardTitle>
            <CardDescription className="text-xs">
              Status and assignment controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={currentStatus === "open" ? "default" : "outline"}
                onClick={() => void handleStatusChange("open")}
                disabled={!conversation || !organizationId}
              >
                Open
              </Button>
              <Button
                type="button"
                size="sm"
                variant={currentStatus === "snoozed" ? "default" : "outline"}
                onClick={() => void handleStatusChange("snoozed")}
                disabled={!conversation || !organizationId}
              >
                Snoozed
              </Button>
              <Button
                type="button"
                size="sm"
                variant={currentStatus === "closed" ? "default" : "outline"}
                onClick={() => void handleStatusChange("closed")}
                disabled={!conversation || !organizationId}
              >
                Closed
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentAgent ? (
                conversation?.assignedAgentId === currentAgent.id ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleUnassign()}
                    disabled={!conversation || !organizationId}
                  >
                    Unassign
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleAssignToMe()}
                    disabled={!conversation || !organizationId}
                  >
                    Assign to me
                  </Button>
                )
              ) : null}
              {conversation?.assignedAgentName ? (
                <Badge variant="outline">
                  Assigned: {conversation.assignedAgentName}
                </Badge>
              ) : null}
            </div>
            <div className="rounded-md border border-dashed p-3">
              <div className="mb-2 flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                <p className="text-sm font-medium">Delete conversation</p>
              </div>
              <p className="text-muted-foreground mb-3 text-xs">
                {visitorConnected
                  ? "Visitor is currently connected. Ask them to disconnect before deleting."
                  : "Deletion is available only when the frontend visitor is disconnected."}
              </p>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={
                  !conversation ||
                  !organizationId ||
                  visitorConnected ||
                  isDeletingConversation
                }
              >
                Delete conversation
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm">Internal notes</CardTitle>
            <CardDescription className="text-xs">
              Visible to your team only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note…"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              disabled={!conversation || !organizationId}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => void handleAddNote()}
              disabled={!conversation || !organizationId || noteDraft.trim().length === 0}
            >
              Add note
            </Button>
            {notes && notes.length > 0 ? (
              <div className="space-y-2">
                {notes.slice(0, 8).map((note) => (
                  <div key={note._id} className="rounded-md border p-2 text-xs">
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span>{note.actorName ?? "Agent"}</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm">{note.note}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No notes yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm">Audit trail</CardTitle>
            <CardDescription className="text-xs">
              Recent workflow changes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {events && events.length > 0 ? (
              events.slice(0, 10).map((event) => (
                <div key={event._id} className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium">{event.eventType}</p>
                    <p className="text-muted-foreground truncate">
                      {event.actorName ?? "Agent"}
                      {event.payload ? ` • ${event.payload}` : ""}
                    </p>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-xs">No events yet.</p>
            )}
          </CardContent>
        </Card>
        {currentAgent ? (
          <ConversationPresenceCard
            currentAgent={currentAgent}
            presenceState={presenceState}
          />
        ) : null}
        {/* <SidebarGroup>
          <SidebarGroupLabel>Table of Contents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="font-medium">
                      {item.title}
                    </a>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub>
                      {item.items.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={item.isActive}
                          >
                            <a href={item.url}>{item.title}</a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{getInitials(contactName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg">{contactName}</CardTitle>
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                {company ? (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {company}
                  </span>
                ) : null}
                {organizationName ? (
                  <>
                    <span>•</span>
                    <span>{organizationName}</span>
                  </>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ContactInfoRow
              icon={Mail}
              label="Email"
              value={contactEmail ?? "—"}
            />
            <ContactInfoRow
              icon={Phone}
              label="Phone"
              value={contact?.phone ?? "—"}
            />
            <ContactInfoRow
              icon={MapPin}
              label="Location"
              value={
                contact?.tags
                  ?.find((tag) => tag.startsWith("location:"))
                  ?.split(":")[1] ?? "Not provided"
              }
            />
          </CardContent>
        </Card>

        <Accordion type="single" className="space-y-3">
          <AccordionItem value="overview" className="rounded-lg border">
            <AccordionTrigger className="px-4">
              Conversation overview
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 px-4 pt-1 pb-4 text-sm">
                <ContactInfoRow
                  icon={Hash}
                  label="Thread"
                  value={
                    conversation
                      ? conversation.threadId.slice(-12)
                      : SUPPORT_COPY.inspector.sessionPlaceholder
                  }
                />
                <ContactInfoRow
                  icon={Bot}
                  label="Agent thread"
                  value={
                    conversation?.agentThreadId ??
                    "Not created yet (agent has not replied)"
                  }
                />
                <ContactInfoRow
                  icon={MessageSquare}
                  label="Messages"
                  value={
                    conversation
                      ? `${conversation.totalMessages} messages`
                      : "—"
                  }
                />
                <ContactInfoRow
                  icon={CalendarClock}
                  label="Started"
                  value={formatDateTime(conversation?.firstAt)}
                />
                <ContactInfoRow
                  icon={Clock}
                  label="Last activity"
                  value={formatDateTime(conversation?.lastAt)}
                />
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary">
                    {conversation?.lastRole === "assistant"
                      ? "Assistant replied"
                      : "Awaiting assistant"}
                  </Badge>
                  {contactEmail ? (
                    <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  ) : null}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="actions" className="rounded-lg border">
            <AccordionTrigger className="px-4">Quick actions</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 px-4 pt-1 pb-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={handleEmailContact}
                    disabled={!hasEmail}
                    title={
                      hasEmail
                        ? undefined
                        : "No email available for this contact"
                    }
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email contact
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={handleViewContact}
                    disabled={!hasContactRecord}
                    title={
                      hasContactRecord
                        ? undefined
                        : "Contact profile not available in this workspace"
                    }
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    View contact
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="details" className="rounded-lg border">
            <AccordionTrigger className="px-4">
              Conversation details
            </AccordionTrigger>
            <AccordionContent>
              <div className="text-muted-foreground space-y-3 px-4 pt-1 pb-4 text-xs">
                <div>
                  <p className="text-foreground font-medium">Participants</p>
                  <p>
                    Assistant,{" "}
                    {contactName === "Unknown visitor"
                      ? "Visitor"
                      : contactName}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-foreground font-medium">Tags</p>
                  <p>
                    {contact?.tags && contact.tags.length > 0
                      ? contact.tags.join(", ")
                      : "No tags"}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-foreground font-medium">Notes</p>
                  <p>No notes recorded yet.</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SidebarContent>
      <SidebarRail />
      <SidebarTrigger className="absolute top-4 -left-10 rotate-180" />
    </Sidebar>
  );
}

interface PresenceCardProps {
  currentAgent: NonNullable<ConversationSidebarProps["currentAgent"]>;
  presenceState: PresenceEntry[];
}

const ConversationPresenceCard = ({
  currentAgent,
  presenceState,
}: PresenceCardProps) => {
  const normalizedCurrentAgentId = toAgentPresenceUserId(currentAgent.id);

  const onlineAgents = presenceState.filter(
    (agent: PresenceEntry) =>
      agent.online && isAgentPresenceUser(agent.userId),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Active agents</CardTitle>
        <CardDescription>
          {onlineAgents.length > 0
            ? `${onlineAgents.length} online`
            : "No teammates viewing this chat"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {onlineAgents.length > 0 ? (
          <ul className="space-y-2">
            {onlineAgents.map((agent: PresenceEntry) => {
              const isSelf = agent.userId === normalizedCurrentAgentId;
              const metadata = getPresenceMetadata(agent);
              const label = isSelf
                ? "You"
                : (metadata.name ??
                  agent.name ??
                  `Agent ${agent.userId.slice(-4)}`);
              return (
                <li
                  key={agent.userId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{label}</span>
                  <Badge variant="outline" className="text-xs">
                    Online
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Invite another teammate to keep an eye on this conversation.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const getPresenceMetadata = (entry: PresenceEntry): PresenceMetadata => {
  if (entry.data && typeof entry.data === "object") {
    return entry.data as PresenceMetadata;
  }
  return {};
};

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

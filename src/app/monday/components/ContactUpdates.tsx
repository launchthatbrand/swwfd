"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarIcon,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Send,
  SendHorizontal,
  Trash2,
  UserCheck,
} from "lucide-react";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import { Input } from "@launchthatapp/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { Textarea } from "@launchthatapp/ui/textarea";

import { Skeleton } from "~/components/ui/skeleton";

import type { MondaySubitemEntry } from "../types";
import {
  CONTACT_UPDATE_TYPE_OPTIONS,
  type ContactUpdateType,
} from "../constants";
import { formatUpdatedAt, hasHtmlLikeMarkup } from "../helpers";

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Mail; label: string; bgColor: string }
> = {
  welcome_email: {
    icon: Send,
    label: "Welcome Email",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
  },
  followup: {
    icon: Phone,
    label: "Follow-Up",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
  },
  questionnaire: {
    icon: FileText,
    label: "Questionnaire",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
  },
  resume: {
    icon: FileText,
    label: "Resume",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  resume_referral: {
    icon: UserCheck,
    label: "Resume Referral",
    bgColor: "bg-teal-50 dark:bg-teal-950/40",
  },
  general: {
    icon: MessageSquare,
    label: "General",
    bgColor: "bg-slate-50 dark:bg-slate-900/40",
  },
};

const getTypeConfig = (updateType: string) =>
  TYPE_CONFIG[updateType] ?? TYPE_CONFIG.general!;

const METHOD_BADGE_COLORS: Record<string, string> = {
  email: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
  "phone call": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  phone: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  text: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  sms: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  "in person": "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800",
  other: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const getMethodBadgeColor = (method: string | null): string => {
  if (!method) return "";
  const key = method.toLowerCase().trim();
  return METHOD_BADGE_COLORS[key] ?? METHOD_BADGE_COLORS.other!;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const isWithin7Days = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < SEVEN_DAYS_MS;
};

const toYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  subitem: MondaySubitemEntry;
  canEdit: boolean;
  isMine: boolean;
  onDelete: (subitemId: string) => void;
  onEditDate: (subitemId: string, currentDate: string | null) => void;
}

const MessageBubble = ({
  subitem,
  canEdit,
  isMine,
  onDelete,
  onEditDate,
}: MessageBubbleProps) => {
  const config = getTypeConfig(subitem.updateType);
  const Icon = config.icon;
  const creator = subitem.creatorProfile;
  const methodBadgeColor = getMethodBadgeColor(subitem.methodOfCommunication);

  const avatar = creator?.photoThumb ? (
    <img
      src={creator.photoThumb}
      alt={creator.name ?? "User"}
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  ) : (
    <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
      <Icon className="text-muted-foreground h-4 w-4" />
    </div>
  );

  const renderBody = () => {
    const parts: React.ReactNode[] = [];

    parts.push(
      <span key="name" className="text-[13px] leading-relaxed">
        {subitem.name}
      </span>,
    );

    for (const update of subitem.updates) {
      if (update.body.trim().length === 0) continue;
      if (hasHtmlLikeMarkup(update.body)) {
        parts.push(
          <div
            key={update.id}
            className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: update.body }}
          />,
        );
      } else {
        parts.push(
          <span
            key={update.id}
            className="whitespace-pre-wrap text-[13px] leading-relaxed"
          >
            {update.body}
          </span>,
        );
      }
    }
    return parts;
  };

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`group flex max-w-[80%] gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}
      >
        {avatar}

        <div className="min-w-0 space-y-0.5">
          {/* Meta line */}
          <div
            className={`flex items-center gap-1.5 px-1 ${isMine ? "flex-row-reverse" : ""}`}
          >
            <span className="text-muted-foreground text-[11px] font-medium">
              {creator?.name ?? config.label}
            </span>
            <span className="text-[11px] text-black dark:text-white">
              {subitem.createdAt ? formatUpdatedAt(subitem.createdAt) : ""}
            </span>
          </div>

          {/* Bubble */}
          <div
            className={`relative rounded-2xl px-3.5 py-2.5 ${
              isMine
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted rounded-tl-sm"
            }`}
          >
            <div className="space-y-1">{renderBody()}</div>
          </div>

          {/* Tags + actions row */}
          <div
            className={`flex items-center gap-1 px-1 ${isMine ? "flex-row-reverse" : ""}`}
          >
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] font-normal"
            >
              {config.label}
            </Badge>
            {subitem.methodOfCommunication ? (
              <Badge
                variant="outline"
                className={`px-1.5 py-0 text-[10px] font-normal ${methodBadgeColor}`}
              >
                {subitem.methodOfCommunication}
              </Badge>
            ) : null}

            <div className="flex items-center gap-0 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={!canEdit}
                onClick={() => onEditDate(subitem.id, subitem.createdAt)}
                title={canEdit ? "Change date" : "Cannot edit — older than 7 days"}
              >
                <CalendarIcon className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-5 w-5"
                disabled={!canEdit}
                onClick={() => onDelete(subitem.id)}
                title={canEdit ? "Delete update" : "Cannot delete — older than 7 days"}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ContactUpdates
// ---------------------------------------------------------------------------

interface ContactUpdatesProps {
  subitems: MondaySubitemEntry[];
  isLoading: boolean;
  isEmpty: boolean;
  isStaticMode: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (opts: { updateType: ContactUpdateType; date: string }) => void;
  onDeleteSubitem: (subitemId: string) => Promise<void>;
  onUpdateSubitemDate: (subitemId: string, date: string) => Promise<void>;
  isSubmitting: boolean;
  sessionToken: string | null;
  currentUserId: string | null;
}

export const ContactUpdates = ({
  subitems,
  isLoading,
  isEmpty,
  isStaticMode,
  draft,
  onDraftChange,
  onSubmit,
  onDeleteSubitem,
  onUpdateSubitemDate,
  isSubmitting,
  sessionToken,
  currentUserId,
}: ContactUpdatesProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Post-submit dialog state
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [pendingBody, setPendingBody] = useState("");
  const [selectedType, setSelectedType] = useState<ContactUpdateType>("general");
  const [selectedDate, setSelectedDate] = useState(() => toYMD(new Date()));

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit date dialog
  const [editDateTarget, setEditDateTarget] = useState<{
    subitemId: string;
    currentDate: string | null;
  } | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [subitems.length]);

  const sortedSubitems = useMemo(() => [...subitems].reverse(), [subitems]);

  const handleSendClick = useCallback(() => {
    const body = draft.trim();
    if (!body || isSubmitting) return;
    setPendingBody(body);
    setSelectedType("general");
    setSelectedDate(toYMD(new Date()));
    setShowTypeDialog(true);
  }, [draft, isSubmitting]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const handleConfirmPost = () => {
    setShowTypeDialog(false);
    onSubmit({ updateType: selectedType, date: selectedDate });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await onDeleteSubitem(deleteTargetId);
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const handleEditDateConfirm = async () => {
    if (!editDateTarget || !editDateValue) return;
    setIsUpdatingDate(true);
    try {
      await onUpdateSubitemDate(editDateTarget.subitemId, editDateValue);
    } finally {
      setIsUpdatingDate(false);
      setEditDateTarget(null);
    }
  };

  if (isStaticMode) {
    return (
      <p className="text-muted-foreground text-sm">
        Update history is unavailable in static mode.
      </p>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto rounded-md border border-black/50 px-2 py-3"
        >
          {isLoading ? (
            <div className="space-y-5 py-2">
              {[0.8, 0.6, 0.9, 0.5, 0.7].map((w, i) => (
                <div key={i} className={`flex gap-2.5 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="space-y-1.5" style={{ width: `${w * 100}%`, maxWidth: "80%" }}>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <MessageSquare className="text-muted-foreground/40 h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                No updates yet. Start the conversation below.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSubitems.map((subitem) => (
                <MessageBubble
                  key={subitem.id}
                  subitem={subitem}
                  canEdit={isWithin7Days(subitem.createdAt)}
                  isMine={
                    currentUserId != null &&
                    subitem.creatorProfile?.id === currentUserId
                  }
                  onDelete={setDeleteTargetId}
                  onEditDate={(id, date) => {
                    setEditDateTarget({ subitemId: id, currentDate: date });
                    const parsed = date ? date.slice(0, 10) : toYMD(new Date());
                    setEditDateValue(parsed);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 mt-3 border-t bg-background pt-3">
          <div className="flex items-end gap-2">
            <div className="relative min-w-0 flex-1">
              <Textarea
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write an update..."
                rows={1}
                disabled={isSubmitting}
                className="max-h-[120px] min-h-[36px] resize-none pr-10 text-sm"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 bottom-1 h-7 w-7"
                onClick={handleSendClick}
                disabled={isSubmitting || draft.trim().length === 0}
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Press{" "}
            {typeof navigator !== "undefined" &&
            /Mac/.test(navigator.userAgent)
              ? "⌘"
              : "Ctrl"}
            +Enter to send
          </p>
        </div>
      </div>

      {/* Post-submit: pick type & date */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Classify update</DialogTitle>
            <DialogDescription>
              Choose the type and date for this update before posting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={selectedType}
                onValueChange={(v) =>
                  setSelectedType(v as ContactUpdateType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_UPDATE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={selectedDate}
                max={toYMD(new Date())}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTypeDialog(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmPost} disabled={isSubmitting}>
              {isSubmitting ? "Posting..." : "Post update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Delete update?</DialogTitle>
            <DialogDescription>
              This will permanently delete this subitem and its updates from
              Monday.com. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteConfirm()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit date dialog */}
      <Dialog
        open={editDateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditDateTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Change date</DialogTitle>
            <DialogDescription>
              Update the date for this entry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              type="date"
              value={editDateValue}
              max={toYMD(new Date())}
              onChange={(e) => setEditDateValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDateTarget(null)}
              disabled={isUpdatingDate}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleEditDateConfirm()}
              disabled={isUpdatingDate || !editDateValue}
            >
              {isUpdatingDate ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

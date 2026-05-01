"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  ExternalLink,
  Loader2,
  Paperclip,
  Play,
  Plus,
  Send,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import { Button } from "@launchthatapp/ui/button";
import { Input } from "@launchthatapp/ui/input";
import { Textarea } from "@launchthatapp/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { Badge } from "@launchthatapp/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import type { MondayRecord } from "../types";
import type { HelpdeskTicket } from "~/server/monday/client";
import { useGuidedTour } from "./GuidedTourProvider";

// ---------------------------------------------------------------------------
// Help videos
// ---------------------------------------------------------------------------

interface HelpVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  duration?: string;
}

const HELP_VIDEOS: HelpVideo[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Dashboard overview and core workflows.",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "4:32",
  },
  {
    id: "contact-management",
    title: "Managing Contacts",
    description: "Search, filter, and update contact records.",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "6:15",
  },
  {
    id: "onboarding-steps",
    title: "Onboarding Steps",
    description: "Approval steps and advancing contacts.",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "5:48",
  },
  {
    id: "email-templates",
    title: "Email Templates",
    description: "Setting up and sending email templates.",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "3:20",
  },
  {
    id: "sync-data",
    title: "Syncing Data",
    description: "How the sync feature works.",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "2:55",
  },
  {
    id: "troubleshooting",
    title: "Common Issues",
    description: "Solutions to frequently reported problems.",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "7:10",
  },
];

// ---------------------------------------------------------------------------
// Ticket constants
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "contact_issue", label: "Contact Issue" },
  { value: "technical", label: "Technical" },
  { value: "data_sync", label: "Data / Sync" },
  { value: "other", label: "Other" },
] as const;

type TicketPriority = (typeof PRIORITY_OPTIONS)[number]["value"];
type TicketCategory = (typeof CATEGORY_OPTIONS)[number]["value"];

const PRIORITY_CLASSES: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Urgent: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_CLASSES: Record<string, string> = {
  "Working on it": "bg-amber-100 text-amber-700 border-amber-200",
  Done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Stuck: "bg-red-100 text-red-700 border-red-200",
};

// ---------------------------------------------------------------------------
// Video carousel
// ---------------------------------------------------------------------------

const VideoCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -220 : 220,
      behavior: "smooth",
    });
  };

  const playing = playingId ? HELP_VIDEOS.find((v) => v.id === playingId) : null;

  if (playing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{playing.title}</p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setPlayingId(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
          <iframe
            src={playing.url}
            title={playing.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute -left-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto scroll-smooth px-1 py-1 scrollbar-none"
      >
        {HELP_VIDEOS.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setPlayingId(video.id)}
            className="group flex w-40 shrink-0 flex-col gap-1.5 rounded-lg border bg-card p-2 text-left transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
              <div className="absolute inset-0 flex items-center justify-center transition-colors group-hover:bg-black/10">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow transition-transform group-hover:scale-110">
                  <Play className="ml-0.5 h-3 w-3" />
                </div>
              </div>
              {video.duration && (
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px text-[9px] font-medium text-white">
                  {video.duration}
                </span>
              )}
            </div>
            <p className="truncate text-xs font-semibold leading-tight">
              {video.title}
            </p>
            <p className="line-clamp-1 text-[10px] text-muted-foreground">
              {video.description}
            </p>
          </button>
        ))}
      </div>
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute -right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Ticket row
// ---------------------------------------------------------------------------

const TicketRow = ({ ticket }: { ticket: HelpdeskTicket }) => {
  const priorityCls = PRIORITY_CLASSES[ticket.priority ?? ""] ?? "bg-muted text-muted-foreground border-border";
  const statusCls = STATUS_CLASSES[ticket.status ?? ""] ?? "bg-muted text-muted-foreground border-border";
  const dateLabel = ticket.date
    ? new Date(ticket.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{ticket.name}</p>
        {ticket.linkedContact && (
          <p className="truncate text-xs text-muted-foreground">
            Contact: {ticket.linkedContact}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {ticket.category && (
          <Badge variant="outline" className="text-[10px]">
            {ticket.category}
          </Badge>
        )}
        {ticket.priority && (
          <span
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${priorityCls}`}
          >
            {ticket.priority}
          </span>
        )}
        {ticket.status && (
          <span
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${statusCls}`}
          >
            {ticket.status}
          </span>
        )}
        {dateLabel && (
          <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Support form
// ---------------------------------------------------------------------------

const SupportForm = ({
  linkedContact,
  sessionToken,
  currentUserId,
  onSuccess,
  onCancel,
}: {
  linkedContact: MondayRecord | null;
  sessionToken: string | null;
  currentUserId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState<TicketCategory>(
    linkedContact ? "contact_issue" : "general",
  );
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
      };
      if (linkedContact) {
        payload.linkedContactId = linkedContact.id;
        payload.linkedContactName = linkedContact.name;
      }
      if (currentUserId) {
        payload.submitterId = currentUserId;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["x-monday-token"] = sessionToken;

      const res = await fetch("/api/monday/helpdesk", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      setSuccess(true);
      setTimeout(() => onSuccess(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold">Ticket Submitted</p>
        <p className="text-xs text-muted-foreground">We&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">New Support Ticket</h3>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {linkedContact && (
        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <CircleHelp className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground">Linked Contact</p>
            <p className="truncate text-sm font-medium">{linkedContact.name}</p>
          </div>
          {linkedContact.email && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {linkedContact.email}
            </span>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="ticket-subject" className="text-xs font-medium">
          Subject <span className="text-destructive">*</span>
        </label>
        <Input
          id="ticket-subject"
          placeholder="Brief summary of the issue"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ticket-description" className="text-xs font-medium">
          Description <span className="text-destructive">*</span>
        </label>
        <Textarea
          id="ticket-description"
          placeholder="Describe the issue in detail..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Priority</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">Category</label>
          <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Attachments</label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={(e) => {
              if (e.target.files) {
                setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
              }
              e.target.value = "";
            }}
          />
          {files.map((file, i) => (
            <span
              key={`${file.name}-${i}`}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-[11px]"
            >
              {file.name.length > 20 ? `${file.name.slice(0, 17)}...` : file.name}
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          onClick={() => void handleSubmit()}
          disabled={submitting || !subject.trim() || !description.trim()}
          className="gap-1.5"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Submitting..." : "Submit Ticket"}
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export const HelpDeskDialog = ({
  open,
  onOpenChange,
  linkedContact,
  sessionToken,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedContact: MondayRecord | null;
  sessionToken: string | null;
  currentUserId: string | null;
}) => {
  const { startTour } = useGuidedTour();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const params = new URLSearchParams();
      if (currentUserId) params.set("submitterId", currentUserId);
      const res = await fetch(`/api/monday/helpdesk?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = (await res.json()) as { tickets?: HelpdeskTicket[] };
      setTickets(data.tickets ?? []);
    } catch (err) {
      setTicketsError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setTicketsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (open) {
      void fetchTickets();
      if (linkedContact) setShowNewTicket(true);
      else setShowNewTicket(false);
    }
  }, [open, linkedContact, fetchTickets]);

  const handleTicketCreated = () => {
    setShowNewTicket(false);
    void fetchTickets();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setShowNewTicket(false);
        onOpenChange(v);
      }}
    >
      <DialogContent className="flex h-[82vh] max-w-2xl flex-col overflow-hidden border-2 border-border/80 bg-linear-to-b from-background to-muted/20 p-0 shadow-xl">
        <DialogHeader className="shrink-0 border-b-2 border-border/70 bg-muted/35 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="h-5 w-5 text-primary" />
            Help Desk
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Video carousel */}
          <div className="shrink-0 border-b border-border/60 px-6 py-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Help Videos
            </p>
            <VideoCarousel />
          </div>

          {/* Guided tour */}
          <div className="shrink-0 border-b border-border/60 px-6 py-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => {
                onOpenChange(false);
                setTimeout(() => startTour("getting-started"), 350);
              }}
            >
              <Compass className="h-4 w-4" />
              Take a Guided Tour
            </Button>
          </div>

          {/* Tickets section */}
          <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
            {showNewTicket ? (
              <SupportForm
                linkedContact={linkedContact}
                sessionToken={sessionToken}
                currentUserId={currentUserId}
                onSuccess={handleTicketCreated}
                onCancel={() => setShowNewTicket(false)}
              />
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Your Tickets
                  </p>
                  <Button
                    size="sm"
                    className="h-7 gap-1 px-2.5 text-xs"
                    onClick={() => setShowNewTicket(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Ticket
                  </Button>
                </div>

                {ticketsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : ticketsError ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="text-xs text-destructive">{ticketsError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => void fetchTickets()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <CircleHelp className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No tickets yet</p>
                    <p className="text-xs text-muted-foreground/70">
                      Click &quot;+ New Ticket&quot; to submit a support request.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto">
                    {tickets.map((ticket) => (
                      <TicketRow key={ticket.id} ticket={ticket} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

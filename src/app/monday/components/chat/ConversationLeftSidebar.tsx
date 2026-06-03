"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

import { cn } from "~/lib/utils";

import type { ConversationLeftSidebarProps } from "./types";

const toRecordKey = (record: { id: string; contactId?: string | null }) =>
  (record.contactId ?? record.id).trim();

export const ConversationLeftSidebar = ({
  userId,
  records,
  isLoadingRecords,
  selectedRecordId,
  onSelectRecord,
}: ConversationLeftSidebarProps) => {
  const [favoriteRecordKeys, setFavoriteRecordKeys] = useState<string[]>([]);
  const storageKey = `monday-chat-favorites:${userId ?? "anonymous"}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setFavoriteRecordKeys([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setFavoriteRecordKeys(
        Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string")
          : [],
      );
    } catch {
      setFavoriteRecordKeys([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(favoriteRecordKeys));
  }, [favoriteRecordKeys, storageKey]);

  const filteredRecords = records;

  const favoriteSet = useMemo(() => new Set(favoriteRecordKeys), [favoriteRecordKeys]);
  const favoriteRecords = useMemo(
    () => filteredRecords.filter((record) => favoriteSet.has(toRecordKey(record))),
    [favoriteSet, filteredRecords],
  );
  const regularRecords = useMemo(
    () => filteredRecords.filter((record) => !favoriteSet.has(toRecordKey(record))),
    [favoriteSet, filteredRecords],
  );

  const toggleFavorite = (record: { id: string; contactId?: string | null }) => {
    const key = toRecordKey(record);
    setFavoriteRecordKeys((prev) =>
      prev.includes(key) ? prev.filter((entry) => entry !== key) : [...prev, key],
    );
  };

  return (
    <aside className="flex h-full min-h-0 w-[320px] shrink-0 flex-col border-r bg-background">
      <div className="min-h-0 flex-1 overflow-auto">
        {favoriteRecords.length > 0 ? (
          <div className="border-b p-2">
            <p className="text-muted-foreground px-1 pb-1 text-xs font-semibold uppercase tracking-wide">
              Pinned Contacts
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {favoriteRecords.map((record) => {
                const recordId = toRecordKey(record);
                const isActive = selectedRecordId === recordId;
                return (
                  <button
                    key={`fav:${record.id}:${recordId}`}
                    type="button"
                    onClick={() => onSelectRecord(record)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                      isActive ? "border-primary bg-primary/10" : "hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{record.name || "Unnamed Contact"}</p>
                        <p className="text-muted-foreground truncate">{record.email || "No email"}</p>
                      </div>
                      <button
                        type="button"
                        className="text-amber-500 hover:text-amber-600"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleFavorite(record);
                        }}
                        title="Unpin contact"
                      >
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-1 p-2 pb-3">
          {isLoadingRecords && regularRecords.length === 0 ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`record-skeleton-${index}`}
                className="space-y-1 rounded-md border px-2 py-1.5"
              >
                <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-4/5 animate-pulse rounded bg-muted" />
              </div>
            ))
          ) : (
            regularRecords.map((record) => {
            const recordId = toRecordKey(record);
            const isActive = selectedRecordId === recordId;
            const isFavorite = favoriteSet.has(recordId);
            return (
              <button
                key={`${record.id}:${recordId}`}
                type="button"
                onClick={() => onSelectRecord(record)}
                className={cn(
                  "w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                  isActive ? "border-primary bg-primary/10" : "hover:bg-muted/60",
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{record.name || "Unnamed Contact"}</p>
                    <p className="text-muted-foreground truncate">{record.email || "No email"}</p>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "hover:text-amber-600",
                      isFavorite ? "text-amber-500" : "text-muted-foreground",
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleFavorite(record);
                    }}
                    title={isFavorite ? "Unpin contact" : "Pin contact"}
                  >
                    <Star className={cn("h-3.5 w-3.5", isFavorite ? "fill-current" : "")} />
                  </button>
                </div>
              </button>
            );
            })
          )}
          {!isLoadingRecords && regularRecords.length === 0 ? (
            <p className="text-muted-foreground px-1 py-2 text-xs">No contacts match this search.</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

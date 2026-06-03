"use client";

import type { Dispatch, SetStateAction } from "react";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Textarea } from "@launchthatapp/ui/textarea";

import { uniqueSorted } from "../../../helpers";
import type { MondayPlatformSettings } from "../../../types";

const parseDelimitedList = (value: string) => {
  return uniqueSorted(
    value
      .split(/[\s,;\n]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
};

export type OutlookStatusData = {
  connected?: boolean;
  connection?: {
    email: string | null;
    displayName: string | null;
    updatedAt: number;
  } | null;
};

export type EmailSettingsTabProps = {
  callbackUrl: string;
  outlookStatus: OutlookStatusData | undefined;
  isConnectingOutlook: boolean;
  isDisconnectingOutlook: boolean;
  onConnectOutlook: () => void | Promise<void>;
  onDisconnectOutlook: () => void | Promise<void>;
  isMasterAdmin: boolean;
  platformSettings: MondayPlatformSettings;
  platformSettingsDraft: MondayPlatformSettings;
  setPlatformSettingsDraft: Dispatch<SetStateAction<MondayPlatformSettings>>;
  isSavingPlatformSettings: boolean;
  onResetReplyToEmails: () => void;
  onSaveReplyToEmails: () => void | Promise<void>;
};

export const EmailSettingsTab = ({
  callbackUrl,
  outlookStatus,
  isConnectingOutlook,
  isDisconnectingOutlook,
  onConnectOutlook,
  onDisconnectOutlook,
  isMasterAdmin,
  platformSettings,
  platformSettingsDraft,
  setPlatformSettingsDraft,
  isSavingPlatformSettings,
  onResetReplyToEmails,
  onSaveReplyToEmails,
}: EmailSettingsTabProps) => {
  const replyToUnchanged =
    platformSettings.replyToEmails.join(",") ===
    platformSettingsDraft.replyToEmails.join(",");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Email Settings</p>
        <p className="text-muted-foreground text-sm">
          Configure outbound email account settings for sending
          monday-designed templates.
        </p>
      </div>
      <div className="space-y-3 rounded-md border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              outlookStatus?.connected
                ? "default"
                : "secondary"
            }
          >
            {outlookStatus?.connected
              ? "Outlook connected"
              : "Outlook not connected"}
          </Badge>
          <Button
            size="sm"
            onClick={() => {
              void onConnectOutlook();
            }}
            disabled={isConnectingOutlook}
          >
            {isConnectingOutlook ? "Connecting..." : "Connect Outlook"}
          </Button>
          {outlookStatus?.connected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void onDisconnectOutlook();
              }}
              disabled={isDisconnectingOutlook}
            >
              {isDisconnectingOutlook
                ? "Disconnecting..."
                : "Disconnect"}
            </Button>
          ) : null}
        </div>
        <div className="text-muted-foreground text-sm">
          {outlookStatus?.connection?.email ? (
            <p>
              Connected mailbox:{" "}
              {outlookStatus.connection.email}
            </p>
          ) : (
            <p>
              Use OAuth to connect Outlook, then use this account
              for sending and engagement tracking.
            </p>
          )}
          {outlookStatus?.connection?.updatedAt ? (
            <p className="mt-1">
              Last updated:{" "}
              {new Date(
                outlookStatus.connection.updatedAt,
              ).toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs font-semibold tracking-wide uppercase">
            Callback URL
          </p>
          <p className="mt-1 break-all font-mono text-xs">
            {callbackUrl}
          </p>
        </div>
        {isMasterAdmin ? (
          <div className="space-y-3 rounded-md border-2 border-primary/30 bg-primary/5 p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Global Reply-To Addresses</p>
              <p className="text-muted-foreground text-xs">
                One email per line (or comma-separated). Every outbound message
                includes the sender&apos;s mailbox plus these addresses in
                Reply-To.
              </p>
            </div>
            <Textarea
              value={platformSettingsDraft.replyToEmails.join("\n")}
              onChange={(event) => {
                const nextReplyToEmails = parseDelimitedList(
                  event.target.value,
                ).map((entry) => entry.toLowerCase());
                setPlatformSettingsDraft((prev) => ({
                  ...prev,
                  replyToEmails: nextReplyToEmails,
                }));
              }}
              rows={4}
              placeholder="info@floridaroadjobs.com"
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isSavingPlatformSettings || replyToUnchanged}
                onClick={onResetReplyToEmails}
              >
                Reset
              </Button>
              <Button
                size="sm"
                disabled={isSavingPlatformSettings}
                onClick={() => {
                  void onSaveReplyToEmails();
                }}
              >
                {isSavingPlatformSettings ? "Saving..." : "Save reply-to"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

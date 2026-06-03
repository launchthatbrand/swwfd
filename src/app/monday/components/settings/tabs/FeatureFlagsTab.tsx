"use client";

import type { MondayFeatureFlags } from "../../../types";

export type FeatureFlagsTabProps = {
  featureFlags: MondayFeatureFlags;
  isSavingFeatureFlags: boolean;
  onEmailMarketingEnabledChange: (enabled: boolean) => void | Promise<void>;
};

export const FeatureFlagsTab = ({
  featureFlags,
  isSavingFeatureFlags,
  onEmailMarketingEnabledChange,
}: FeatureFlagsTabProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Feature Flags</p>
        <p className="text-muted-foreground text-sm">
          Toggle app capabilities without code changes.
        </p>
      </div>
      <div className="space-y-3 rounded-md border p-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={featureFlags.emailMarketingEnabled}
            disabled={isSavingFeatureFlags}
            onChange={(event) => {
              void onEmailMarketingEnabledChange(event.target.checked);
            }}
          />
          <div className="space-y-1">
            <p className="font-medium">Email Marketing</p>
            <p className="text-muted-foreground text-xs">
              Enables email marketing capabilities, including the
              Email action in the table.
            </p>
            {isSavingFeatureFlags ? (
              <p className="text-muted-foreground text-[11px]">
                Saving...
              </p>
            ) : null}
          </div>
        </label>
      </div>
    </div>
  );
};

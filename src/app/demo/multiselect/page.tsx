"use client";

import { useMemo, useState } from "react";

import { MultiSelect } from "@acme/ui/multi-select";

const makeDemoTags = () => {
  const tags: string[] = [];
  for (let fiscalYear = 2024; fiscalYear <= 2030; fiscalYear += 1) {
    tags.push(`FY${String(fiscalYear).slice(-2)} - Group Event`);
    tags.push(`FY${String(fiscalYear).slice(-2)} - Hired`);
    tags.push(`FY${String(fiscalYear).slice(-2)} - Intern`);
    tags.push(`FY${String(fiscalYear).slice(-2)} - Job Readiness`);
    tags.push(`FY${String(fiscalYear).slice(-2)} - Reentry`);
    tags.push(`FY${String(fiscalYear).slice(-2)} - Veteran`);
  }
  return tags;
};

export default function MultiSelectDemoPage() {
  const options = useMemo(
    () => makeDemoTags().map((value) => ({ label: value, value })),
    [],
  );
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">MultiSelect Demo</h1>
        <p className="text-muted-foreground text-sm">
          Isolated page for testing dropdown scroll and selection behavior outside
          the monday table dialogs.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <label className="mb-2 block text-sm font-medium">Tags</label>
        <MultiSelect
          options={options}
          defaultValue={selectedValues}
          onValueChange={setSelectedValues}
          placeholder="Select tags"
          modalPopover
        />
      </div>

      <div className="rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">Selected Tags</p>
        <p className="text-muted-foreground min-h-6 text-sm">
          {selectedValues.length > 0 ? selectedValues.join(", ") : "None"}
        </p>
      </div>
    </div>
  );
}

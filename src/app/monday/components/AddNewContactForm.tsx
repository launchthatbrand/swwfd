"use client";

import { Button } from "@launchthatapp/ui/button";
import { Input } from "@launchthatapp/ui/input";
import type { AddNewContactValues } from "../types";

export function AddNewContactForm(props: {
  values: AddNewContactValues;
  ownerOptions: { value: string; label: string }[];
  isSubmitting: boolean;
  onChange: <K extends keyof AddNewContactValues>(
    key: K,
    value: AddNewContactValues[K],
  ) => void;
  onSubmit: () => void;
}) {
  const { values, ownerOptions, isSubmitting, onChange, onSubmit } = props;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">First Name</label>
          <Input
            value={values.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            placeholder="First name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Last Name</label>
          <Input
            value={values.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            placeholder="Last name"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={values.email}
          onChange={(event) => onChange("email", event.target.value)}
          placeholder="name@example.com"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Address</label>
        <Input
          value={values.address}
          onChange={(event) => onChange("address", event.target.value)}
          placeholder="Street, City, State, Zip"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Owner</label>
        <select
          value={values.ownerId}
          onChange={(event) => onChange("ownerId", event.target.value)}
          className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
        >
          {ownerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => onSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Checking..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}

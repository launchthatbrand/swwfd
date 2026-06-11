import test from "node:test";
import assert from "node:assert/strict";

import { decideEmailProviderReason } from "./decision.ts";

test("routes multi-recipient sends to Zoho", () => {
  const result = decideEmailProviderReason({
    recipientCount: 3,
    ownerHasOutlookConnection: true,
  });
  assert.equal(result, "multi_zoho");
});

test("routes single-recipient sends to Outlook when connected", () => {
  const result = decideEmailProviderReason({
    recipientCount: 1,
    ownerHasOutlookConnection: true,
  });
  assert.equal(result, "single_outlook");
});

test("routes single-recipient sends to Zoho fallback when Outlook missing", () => {
  const result = decideEmailProviderReason({
    recipientCount: 1,
    ownerHasOutlookConnection: false,
  });
  assert.equal(result, "single_fallback_zoho");
});

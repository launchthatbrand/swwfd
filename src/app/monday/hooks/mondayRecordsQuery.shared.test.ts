import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  buildMondayRecordsActionPayload,
  buildMondayRecordsQueryKey,
} = await import(new URL("./mondayRecordsQuery.shared.ts", import.meta.url).href);

describe("buildMondayRecordsActionPayload", () => {
  it("applies the same date window semantics regardless of record source", () => {
    const baseArgs = {
      sessionToken: "session-token",
      isGlobalDateScope: false,
      monthBounds: { from: "2026-06-01", to: "2026-06-30" },
      debouncedSearch: "  ",
      ownerFilter: "",
      activeAdvancedFilterConditions: [],
      advancedFilterMatchMode: "all" as const,
    };

    const createdPayload = buildMondayRecordsActionPayload({
      ...baseArgs,
      recordSource: "created_in_month",
    });
    const touchedPayload = buildMondayRecordsActionPayload({
      ...baseArgs,
      recordSource: "touched_in_month",
    });

    assert.equal(createdPayload.dateFrom, "2026-06-01");
    assert.equal(createdPayload.dateTo, "2026-06-30");
    assert.equal(touchedPayload.dateFrom, "2026-06-01");
    assert.equal(touchedPayload.dateTo, "2026-06-30");
  });

  it("drops date window in global scope for both record sources", () => {
    const createdPayload = buildMondayRecordsActionPayload({
      sessionToken: "session-token",
      recordSource: "created_in_month",
      isGlobalDateScope: true,
      monthBounds: { from: "2026-06-01", to: "2026-06-30" },
      debouncedSearch: "abc",
      ownerFilter: "123",
      activeAdvancedFilterConditions: [],
      advancedFilterMatchMode: "all",
    });
    const touchedPayload = buildMondayRecordsActionPayload({
      sessionToken: "session-token",
      recordSource: "touched_in_month",
      isGlobalDateScope: true,
      monthBounds: { from: "2026-06-01", to: "2026-06-30" },
      debouncedSearch: "abc",
      ownerFilter: "123",
      activeAdvancedFilterConditions: [],
      advancedFilterMatchMode: "all",
    });

    assert.equal(createdPayload.dateFrom, undefined);
    assert.equal(createdPayload.dateTo, undefined);
    assert.equal(touchedPayload.dateFrom, undefined);
    assert.equal(touchedPayload.dateTo, undefined);
  });

  it("only sends advanced filters when active", () => {
    const inactivePayload = buildMondayRecordsActionPayload({
      sessionToken: "session-token",
      recordSource: "created_in_month",
      isGlobalDateScope: false,
      monthBounds: { from: "2026-06-01", to: "2026-06-30" },
      debouncedSearch: "",
      ownerFilter: "",
      activeAdvancedFilterConditions: [],
      advancedFilterMatchMode: "any",
    });

    assert.equal(inactivePayload.advancedFilterConditions, undefined);
    assert.equal(inactivePayload.advancedFilterMatchMode, undefined);
  });

  it("preserves touched-mode cursor and fixed page size contract", () => {
    const touchedPayload = buildMondayRecordsActionPayload({
      sessionToken: "session-token",
      recordSource: "touched_in_month",
      isGlobalDateScope: false,
      monthBounds: { from: "2026-06-01", to: "2026-06-30" },
      debouncedSearch: "alex",
      ownerFilter: "38959704",
      pageParam: "touch_v1:cursor-state",
      activeAdvancedFilterConditions: [],
      advancedFilterMatchMode: "all",
    });

    assert.equal(touchedPayload.recordSource, "touched_in_month");
    assert.equal(touchedPayload.limit, 50);
    assert.equal(touchedPayload.cursor, "touch_v1:cursor-state");
  });
});

describe("buildMondayRecordsQueryKey", () => {
  it("separates cache keys by record source", () => {
    const common = {
      viewMode: "userScoped",
      isGlobalDateScope: false,
      monthBounds: { from: "2026-06-01", to: "2026-06-30" },
      debouncedSearch: "lead",
      ownerFilter: "53441186",
      activeAdvancedFilterConditions: [],
      advancedFilterMatchMode: "all" as const,
      sessionToken: "session-token",
    };
    const createdKey = buildMondayRecordsQueryKey({
      ...common,
      recordSource: "created_in_month",
    });
    const touchedKey = buildMondayRecordsQueryKey({
      ...common,
      recordSource: "touched_in_month",
    });

    assert.notDeepEqual(createdKey, touchedKey);
  });
});

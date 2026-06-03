"use node";

import { v } from "convex/values";

import { callMondayGraphQL } from "./lib/mondayGraphQL";
import { mondayAction } from "./lib/mondayFunctions";

/** DELETE /api/monday/subitems */
export const deleteSubitem = mondayAction({
  args: { subitemId: v.string() },
  returns: v.object({ deletedId: v.string() }),
  handler: async (_ctx, _identity, args) => {
    const subitemId = args.subitemId.trim();
    if (!subitemId) throw new Error("Missing subitemId");

    const data = await callMondayGraphQL<{
      delete_item?: { id?: string | number | null } | null;
    }>(
      `mutation DeleteSubitem($itemId: ID!) {
        delete_item(item_id: $itemId) { id }
      }`,
      { itemId: subitemId },
    );
    return { deletedId: String(data.delete_item?.id ?? subitemId) };
  },
});

/** PATCH /api/monday/subitems */
export const patchSubitem = mondayAction({
  args: {
    subitemId: v.string(),
    date: v.string(),
  },
  returns: v.object({
    updatedId: v.string(),
    date: v.string(),
  }),
  handler: async (_ctx, _identity, args) => {
    const subitemId = args.subitemId.trim();
    const date = args.date.trim();
    if (!subitemId) throw new Error("Missing subitemId");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Date must be in YYYY-MM-DD format");
    }

    const data = await callMondayGraphQL<{
      change_column_value?: { id?: string | number | null } | null;
    }>(
      `mutation UpdateSubitemDate($itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(item_id: $itemId, column_id: $columnId, value: $value) { id }
      }`,
      {
        itemId: subitemId,
        columnId: "date0",
        value: JSON.stringify({ date }),
      },
    );
    return {
      updatedId: String(data.change_column_value?.id ?? subitemId),
      date,
    };
  },
});

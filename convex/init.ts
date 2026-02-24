import {
  seedPieces,
  seedPiecesFromRegistry,
} from "@launchthatbrand/activepieces-convex";
import { v } from "convex/values";
import type { RegistryIndex } from "@launchthatbrand/activepieces-convex";

import { components } from "./_generated/api";
import { action } from "./_generated/server";

const DEFAULT_PIECE_NAMES = new Set([
  "monday",
  "slack",
  "gmail",
  "discord",
  "thisApp",
]);

export default action({
  args: {
    piecesConfig: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, { piecesConfig }) => {
    const isRegistryShape =
      typeof piecesConfig === "object" &&
      piecesConfig !== null &&
      "pieces" in piecesConfig &&
      Array.isArray((piecesConfig as { pieces?: unknown }).pieces);

    const registry = isRegistryShape ? (piecesConfig as RegistryIndex) : null;
    const pieces = registry
      ? seedPiecesFromRegistry({
          ...registry,
          pieces: registry.pieces.filter((piece) =>
            DEFAULT_PIECE_NAMES.has(piece.name),
          ),
        }).map((piece) => ({
          ...piece,
          // Overwrite prior minimal seed records that were inserted at this version.
          version: "0.0.0-local",
        }))
      : seedPieces();

    await ctx.runMutation(
      components.activepieces.pieces.mutations.importPieces,
      { pieces },
    );
    return null;
  },
});

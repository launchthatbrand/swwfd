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

    let registry: RegistryIndex | null = null;
    if (isRegistryShape) {
      registry = piecesConfig as RegistryIndex;
    } else {
      // Mirror vendor/t3-activepieces nextjs app's rich registry source.
      const staticRegistryModule = await import(
        "../../../vendor/t3-activepieces/apps/nextjs/convex/pieces/registry/index.json"
      );
      const staticRegistry = staticRegistryModule.default as RegistryIndex;
      registry = {
        ...staticRegistry,
        pieces: staticRegistry.pieces.filter((piece) =>
          DEFAULT_PIECE_NAMES.has(piece.name),
        ),
      };
    }

    const pieces =
      registry.pieces.length > 0
        ? seedPiecesFromRegistry(registry).map((piece) => ({
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

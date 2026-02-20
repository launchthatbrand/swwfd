import { createPlatformWrappers } from "@acme/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

const wrappers = createPlatformWrappers(components);

export const createPlatform = mutation({
  ...wrappers.mutations.createPlatform,
  returns: v.any(),
});

export const updatePlatform = mutation({
  ...wrappers.mutations.updatePlatform,
  returns: v.any(),
});

export const deletePlatform = mutation({
  ...wrappers.mutations.deletePlatform,
  returns: v.any(),
});

export const createProject = mutation({
  ...wrappers.mutations.createProject,
  returns: v.any(),
});

export const updateProject = mutation({
  ...wrappers.mutations.updateProject,
  returns: v.any(),
});

export const deleteProject = mutation({
  ...wrappers.mutations.deleteProject,
  returns: v.any(),
});

export const addUserToPlatform = mutation({
  ...wrappers.mutations.addUserToPlatform,
  returns: v.any(),
});

export const updateUserRole = mutation({
  ...wrappers.mutations.updateUserRole,
  returns: v.any(),
});

export const removeUserFromPlatform = mutation({
  ...wrappers.mutations.removeUserFromPlatform,
  returns: v.any(),
});

export const backfillProjectMembers = mutation({
  ...wrappers.mutations.backfillProjectMembers,
  returns: v.any(),
});

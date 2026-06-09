"use node";

import { v } from "convex/values";

import { callMondayGraphQL, getMondayApiKey } from "./lib/mondayGraphQL";
import { mondayAction } from "./lib/mondayFunctions";
import type { MondaySessionIdentity } from "./lib/mondaySession";

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const mondayBoardUserValidator = v.object({
  id: v.string(),
  name: v.union(v.string(), v.null()),
  email: v.union(v.string(), v.null()),
  photoThumb: v.union(v.string(), v.null()),
});

const mondayUserProfileValidator = v.object({
  id: v.string(),
  email: v.union(v.string(), v.null()),
  name: v.union(v.string(), v.null()),
});

// ---------------------------------------------------------------------------
// Env + helpers
// ---------------------------------------------------------------------------

const getMondayBoardEnv = () => {
  getMondayApiKey();
  const boardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!boardId) {
    throw new Error("Missing Monday configuration");
  }
  return { boardId };
};

const resolveMondayUsersByIds = async (ids: string[]) => {
  const uniqueIds = Array.from(
    new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)),
  ).slice(0, 250);

  if (uniqueIds.length === 0) return [] as Array<{
    id: string;
    name: string | null;
    email: string | null;
    photoThumb: string | null;
  }>;

  interface UsersData {
    users?: Array<{
      id?: string | number | null;
      name?: string | null;
      email?: string | null;
      photo_thumb?: string | null;
    }>;
  }

  const data = await callMondayGraphQL<UsersData>(
    `query GetUsersByIds($userIds: [ID!]) {
      users(ids: $userIds) {
        id
        name
        email
        photo_thumb
      }
    }`,
    { userIds: uniqueIds },
  );

  const usersById = new Map(
    (data.users ?? [])
      .map((user) => {
        const idRaw = user.id;
        if (idRaw == null) return null;
        const id = String(idRaw).trim();
        if (!id) return null;
        return [
          id,
          {
            id,
            name: user.name?.trim() || null,
            email: user.email?.trim() || null,
            photoThumb: user.photo_thumb?.trim() || null,
          },
        ] as const;
      })
      .filter((entry): entry is readonly [string, {
        id: string;
        name: string | null;
        email: string | null;
        photoThumb: string | null;
      }] => !!entry),
  );

  return uniqueIds.map(
    (id) =>
      usersById.get(id) ?? {
        id,
        name: null,
        email: null,
        photoThumb: null,
      },
  );
};

const listMondayBoardUsersImpl = async () => {
  const { boardId } = getMondayBoardEnv();

  interface BoardUsersData {
    boards?: Array<{
      subscribers?: Array<{
        id?: string | number | null;
        name?: string | null;
        email?: string | null;
        photo_thumb?: string | null;
      }>;
      owners?: Array<{
        id?: string | number | null;
        name?: string | null;
        email?: string | null;
        photo_thumb?: string | null;
      }>;
    }>;
  }

  const data = await callMondayGraphQL<BoardUsersData>(
    `query ListMondayBoardUsers($boardId: ID!) {
      boards(ids: [$boardId]) {
        subscribers { id name email photo_thumb }
        owners { id name email photo_thumb }
      }
    }`,
    { boardId },
  );

  const users = [
    ...(data.boards?.[0]?.owners ?? []),
    ...(data.boards?.[0]?.subscribers ?? []),
  ];

  return Array.from(
    new Map(
      users
        .map((user) => {
          const rawId = user.id;
          if (rawId == null) return null;
          const id = String(rawId).trim();
          if (!id) return null;
          return [
            id,
            {
              id,
              name: user.name?.trim() || null,
              email: user.email?.trim() || null,
              photoThumb: user.photo_thumb?.trim() || null,
            },
          ] as const;
        })
        .filter(
          (
            entry,
          ): entry is readonly [
            string,
            {
              id: string;
              name: string | null;
              email: string | null;
              photoThumb: string | null;
            },
          ] => !!entry,
        ),
    ).values(),
  );
};

const getMondayUserProfileImpl = async (userId: string) => {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) throw new Error("Missing userId");

  interface UserData {
    users?: Array<{
      id?: string;
      email?: string | null;
      name?: string | null;
    }>;
  }

  const data = await callMondayGraphQL<UserData>(
    `query GetMondayUser($userIds: [ID!]) {
      users(ids: $userIds) { id email name }
    }`,
    { userIds: [trimmedUserId] },
  );

  const user = data.users?.[0];
  if (!user?.id) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
  };
};

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/** GET /api/monday/users — list board users or fetch by IDs */
export const listBoardUsers = mondayAction({
  args: { ids: v.optional(v.array(v.string())) },
  returns: v.object({
    users: v.array(mondayBoardUserValidator),
  }),
  handler: async (_ctx, _identity: MondaySessionIdentity, args) => {
    const ids = Array.from(
      new Set(
        (args.ids ?? [])
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      ),
    ).slice(0, 250);

    const users =
      ids.length === 0
        ? await listMondayBoardUsersImpl()
        : await resolveMondayUsersByIds(ids);

    return { users };
  },
});

/** GET /api/monday/users/me — authenticated Monday user profile */
export const getMyProfile = mondayAction({
  args: {},
  returns: v.object({
    user: v.union(mondayUserProfileValidator, v.null()),
  }),
  handler: async (_ctx, identity: MondaySessionIdentity) => {
    const user = await getMondayUserProfileImpl(identity.userId);
    return { user };
  },
});

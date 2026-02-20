import { createActivepiecesRouteHandler } from "@launchthatbrand/activepieces-next";
import { api } from "@convex-config/_generated/api";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const json = (body: unknown, init?: { status?: number }) => {
  return NextResponse.json(body, { status: init?.status ?? 200 });
};

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } =
  createActivepiecesRouteHandler({
    basePath: "/api/activepieces",
    dispatch: async ({ method, path, query, body, token }) => {
      // The UI should only call `/v1/*` routes through this mount.
      if (!path.startsWith("/v1/")) {
        return json({ error: "NOT_FOUND" }, { status: 404 });
      }

      if (!token) {
        return json({ error: "UNAUTHORIZED" }, { status: 401 });
      }

      // Make sure the requesting user exists in the Activepieces component's
      // platform/project membership tables before handling any /v1/* routes.
      // This is safe to call on every request; the component is idempotent.
      await fetchMutation(api.auth.mutations.provisionCurrentUser, {}, { token });

      const getSessionContext = async () => {
        return await fetchQuery(
          api.auth.queries.getSessionContext,
          {},
          { token },
        );
      };

      // Initial parity set (expand as needed).
      // NOTE: We call the host app's public wrapper functions, which in turn call
      // into the Activepieces Convex Component via `ctx.runQuery/runMutation`.
      if (method === "GET" && path === "/v1/flags") {
        const platformId = query.get("platformId") ?? undefined;
        const result = await fetchQuery(
          api.flags.queries.getFlags,
          { platformId },
          { token },
        );
        return json(result);
      }

      if (method === "PATCH" && path === "/v1/flags") {
        const platformId = query.get("platformId");
        if (!platformId) {
          return json({ error: "platformId is required" }, { status: 400 });
        }
        const patch = (body ?? {}) as Record<string, unknown>;
        const result = await fetchMutation(
          api.flags.mutations.updateFlags,
          { platformId, patch },
          { token },
        );
        return json(result);
      }

      // Platform
      {
        const match = /^\/v1\/platforms\/([^/]+)$/.exec(path);
        const platformId = match?.[1];
        if (platformId) {
          if (method === "GET") {
            const tryGetPlatform = async (id: string) => {
              return await fetchQuery(
                api.platform.queries.getPlatform,
                { id },
                { token },
              );
            };

            try {
              const result = await tryGetPlatform(platformId);
              return json(result);
            } catch {
              // Some UI paths appear to request `/platforms/:id` with a placeholder.
              // If that platform isn't accessible, fall back to the *current* platform
              // from SessionContext (which is what the embedded UI actually needs).
              const session = (await getSessionContext()) as
                | { platformId?: string | null }
                | null;
              const fallbackId = session?.platformId ?? null;
              if (fallbackId && fallbackId !== platformId) {
                const result = await tryGetPlatform(fallbackId);
                return json(result);
              }
              throw new Error("Forbidden");
            }
          }

          // Stock UI uses POST for updates.
          if (method === "POST") {
            const patch = (body ?? {}) as Record<string, unknown>;
            const tryUpdatePlatform = async (id: string) => {
              return await fetchMutation(
                api.platform.mutations.updatePlatform,
                { id, patch },
                { token },
              );
            };

            try {
              const result = await tryUpdatePlatform(platformId);
              return json(result);
            } catch {
              const session = (await getSessionContext()) as
                | { platformId?: string | null }
                | null;
              const fallbackId = session?.platformId ?? null;
              if (fallbackId && fallbackId !== platformId) {
                const result = await tryUpdatePlatform(fallbackId);
                return json(result);
              }
              throw new Error("Forbidden");
            }
          }
        }
      }

      // Projects (best-effort parity with Activepieces UI expectations)
      if (method === "GET" && path === "/v1/users/me") {
        const session = (await getSessionContext()) as
          | {
              userId?: string;
              platformId?: string | null;
              projectId?: string | null;
              roles?: { platform?: string | null; project?: string | null };
            }
          | null;

        if (!session?.userId) {
          return json({ error: "UNAUTHORIZED" }, { status: 401 });
        }

        // This is a best-effort shape; the embedded UI typically only needs a stable
        // identifier + current platform/project context.
        return json({
          id: session.userId,
          email: null,
          firstName: null,
          lastName: null,
          platformId: session.platformId ?? null,
          projectId: session.projectId ?? null,
          roles: session.roles ?? { platform: null, project: null },
        });
      }

      if (method === "GET" && path === "/v1/project-members/role") {
        const session = (await getSessionContext()) as
          | { roles?: { project?: string | null } }
          | null;
        const projectRole = session?.roles?.project ?? null;
        if (!projectRole) {
          return json(null);
        }

        // Activepieces UI expects a ProjectRole-like object (with permissions),
        // not just a role name string. Returning only "ADMIN" causes checkAccess()
        // to fail and hides write-gated controls like "Create flow".
        const permissionSets: Record<string, string[]> = {
          ADMIN: [
            "WRITE_FLOW",
            "WRITE_FOLDER",
            "WRITE_PROJECT_RELEASE",
            "WRITE_PROJECT_MEMBER",
            "WRITE_ALERT",
          ],
          EDITOR: ["WRITE_FLOW", "WRITE_FOLDER", "WRITE_ALERT"],
          OPERATOR: ["WRITE_FLOW"],
          VIEWER: [],
        };
        const permissions =
          permissionSets[projectRole] ?? permissionSets.ADMIN;

        return json({
          id: `default-${projectRole.toLowerCase()}`,
          name: projectRole,
          permissions,
          type: "DEFAULT",
        });
      }

      if (method === "POST" && path === "/v1/authentication/switch-platform") {
        const req = (body ?? {}) as Record<string, unknown>;
        const platformId = req.platformId;
        if (typeof platformId !== "string") {
          return json({ error: "platformId is required" }, { status: 400 });
        }
        const result = await fetchMutation(
          api.auth.mutations.switchPlatform,
          { platformId },
          { token },
        );
        return json(result);
      }

      if (method === "POST" && path === "/v1/authentication/switch-project") {
        const req = (body ?? {}) as Record<string, unknown>;
        const projectId = req.projectId;
        if (typeof projectId !== "string") {
          return json({ error: "projectId is required" }, { status: 400 });
        }
        const result = await fetchMutation(
          api.auth.mutations.switchProject,
          { projectId },
          { token },
        );
        return json(result);
      }

      if (method === "GET" && path === "/v1/users/projects") {
        const session = (await getSessionContext()) as
          | { platformId?: string | null }
          | null;
        const platformId = session?.platformId ?? null;
        if (!platformId) {
          return json({ data: [], next: null, previous: null });
        }
        const rows = await fetchQuery(
          api.platform.queries.listProjects,
          { platformId },
          { token },
        );
        return json({ data: rows, next: null, previous: null });
      }

      {
        const match = /^\/v1\/users\/projects\/([^/]+)$/.exec(path);
        const projectId = match?.[1];
        if (method === "GET" && projectId) {
          const tryGetProject = async (id: string) => {
            return await fetchQuery(
              api.platform.queries.getProject,
              { id },
              { token },
            );
          };

          try {
            const result = await tryGetProject(projectId);
            return json(result);
          } catch {
            const session = (await getSessionContext()) as
              | { projectId?: string | null }
              | null;
            const fallbackId = session?.projectId ?? null;
            if (fallbackId && fallbackId !== projectId) {
              const result = await tryGetProject(fallbackId);
              return json(result);
            }
            throw new Error("Forbidden");
          }
        }
      }

      if (method === "POST" && path === "/v1/projects") {
        const req = (body ?? {}) as Record<string, unknown>;
        const platformId = req.platformId;
        const id = req.id;
        const displayName = req.displayName;
        if (
          typeof platformId !== "string" ||
          typeof id !== "string" ||
          typeof displayName !== "string"
        ) {
          return json(
            { error: "platformId, id, displayName are required" },
            { status: 400 },
          );
        }
        const result = await fetchMutation(
          api.platform.mutations.createProject,
          { platformId, id, displayName },
          { token },
        );
        return json(result);
      }

      {
        const match = /^\/v1\/projects\/([^/]+)$/.exec(path);
        const projectId = match?.[1];
        if (projectId) {
          if (method === "POST") {
            const req = (body ?? {}) as Record<string, unknown>;
            const platformId = req.platformId;
            if (typeof platformId !== "string") {
              return json({ error: "platformId is required" }, { status: 400 });
            }
            const patch = (req ?? {}) as Record<string, unknown>;
            const result = await fetchMutation(
              api.platform.mutations.updateProject,
              {
                platformId,
                id: projectId,
                patch,
              },
              { token },
            );
            return json(result);
          }

          if (method === "DELETE") {
            const session = (await getSessionContext()) as
              | { platformId?: string | null }
              | null;
            const platformId = session?.platformId ?? null;
            if (!platformId) {
              return json({ error: "No platform selected" }, { status: 400 });
            }
            const result = await fetchMutation(
              api.platform.mutations.deleteProject,
              { platformId, id: projectId },
              { token },
            );
            return json(result);
          }
        }
      }

      if (method === "GET" && path === "/v1/users/projects/platforms") {
        const plats = (await fetchQuery(
          api.auth.queries.listUserPlatforms,
          {},
          { token },
        )) as Array<{ platformId: string }> | null;
        const platformIds = Array.isArray(plats)
          ? plats.map((p) => p.platformId).filter(Boolean)
          : [];

        const rows = [];
        for (const platformId of platformIds) {
          const projects = (await fetchQuery(
            api.platform.queries.listProjects,
            { platformId },
            { token },
          )) as Array<Record<string, unknown>>;
          for (const p of Array.isArray(projects) ? projects : []) {
            rows.push({ ...p, platformId });
          }
        }
        return json(rows);
      }

      // Pieces
      if (method === "GET" && path === "/v1/pieces") {
        const search = query.get("search") ?? undefined;
        const limitRaw = query.get("limit");
        const limit =
          typeof limitRaw === "string" && limitRaw.length > 0
            ? Number(limitRaw)
            : undefined;
        const cursor = query.get("cursor") ?? undefined;
        const result = await fetchQuery(
          api.pieces.queries.list,
          { search, limit, cursor },
          { token },
        );
        return json(result);
      }

      {
        const match = /^\/v1\/pieces\/([^/]+)$/.exec(path);
        const pieceName = match?.[1];
        if (method === "GET" && pieceName) {
          const version = query.get("version");
          if (!version) {
            return json({ error: "version is required" }, { status: 400 });
          }
          const result = await fetchQuery(
            api.pieces.queries.get,
            { name: pieceName, version },
            { token },
          );
          return json(result);
        }
      }

      // Flows
      if (method === "GET" && path === "/v1/flows") {
        const projectId = query.get("projectId") ?? undefined;
        const folderId = query.get("folderId") ?? undefined;
        const cursor = query.get("cursor") ?? undefined;
        const limitRaw = query.get("limit");
        const limit =
          typeof limitRaw === "string" && limitRaw.length > 0
            ? Number(limitRaw)
            : undefined;
        const tryListFlows = async (resolvedProjectId: string | undefined) => {
          return await fetchQuery(
            api.flows.queries.listFlows,
            { projectId: resolvedProjectId, folderId, cursor, limit },
            { token },
          );
        };

        try {
          const result = await tryListFlows(projectId);
          return json(result);
        } catch {
          const session = (await getSessionContext()) as
            | { projectId?: string | null }
            | null;
          const fallbackProjectId = session?.projectId ?? null;
          if (fallbackProjectId && fallbackProjectId !== projectId) {
            const result = await tryListFlows(fallbackProjectId);
            return json(result);
          }
          throw new Error("Forbidden");
        }
      }

      // Agents (optional feature; keep empty until implemented)
      if (method === "GET" && path === "/v1/agents") {
        return json({ data: [], next: null, previous: null });
      }

      {
        const match = /^\/v1\/flows\/([^/]+)$/.exec(path);
        const flowId = match?.[1];
        if (flowId) {
          if (method === "GET") {
            const result = await fetchQuery(
              api.flows.queries.getFlow,
              { id: flowId },
              { token },
            );
            return json(result);
          }
        }
      }

      if (method === "POST" && path === "/v1/flows") {
        const req = (body ?? {}) as Record<string, unknown>;
        const displayName = req.displayName;
        const projectId =
          typeof req.projectId === "string" ? req.projectId : undefined;
        const folderId =
          typeof req.folderId === "string" ? req.folderId : undefined;
        if (typeof displayName !== "string") {
          return json({ error: "displayName is required" }, { status: 400 });
        }
        const result = await fetchMutation(
          api.flows.mutations.createFlow,
          { displayName, projectId, folderId },
          { token },
        );
        return json(result);
      }

      return json({ error: "NOT_IMPLEMENTED", method, path }, { status: 501 });
    },
  });


/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import { getConvexHttpClient } from "~/server/convexHttp";

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

type ConvexFunctionRef = any;

interface MutationRouteConfig {
  mutation: ConvexFunctionRef;
  validate?: (body: Record<string, unknown>) => Record<string, unknown>;
  errorLabel?: string;
}

interface QueryRouteConfig {
  query: ConvexFunctionRef;
  resultKey?: string;
  errorLabel?: string;
}

/**
 * Creates a POST handler that parses JSON body and calls a Convex mutation.
 */
export const createConvexMutationRoute = (config: MutationRouteConfig) => ({
  POST: async (request: Request) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    try {
      const args = config.validate ? config.validate(body) : body;
      const convex = getConvexHttpClient();
      const result = await convex.mutation(config.mutation, args);
      return toJson({ ok: true, result });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : config.errorLabel ?? "Operation failed";
      return toJson({ ok: false, error: message }, 500);
    }
  },
});

/**
 * Creates a POST handler with no body that calls a Convex mutation.
 */
export const createConvexMutationRouteNoBody = (config: Omit<MutationRouteConfig, "validate">) => ({
  POST: async () => {
    try {
      const convex = getConvexHttpClient();
      const result = await convex.mutation(config.mutation, {});
      return toJson({ ok: true, result });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : config.errorLabel ?? "Operation failed";
      return toJson({ ok: false, error: message }, 500);
    }
  },
});

/**
 * Creates a GET handler that calls a Convex query and returns the result.
 */
export const createConvexQueryRoute = (config: QueryRouteConfig) => ({
  GET: async () => {
    try {
      const convex = getConvexHttpClient();
      const result = await convex.query(config.query, {});
      const key = config.resultKey ?? "job";
      return toJson({ ok: true, [key]: result });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : config.errorLabel ?? "Query failed";
      return toJson({ ok: false, error: message }, 500);
    }
  },
});

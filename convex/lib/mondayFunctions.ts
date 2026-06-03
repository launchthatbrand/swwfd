"use node";

import { v, type Infer, type Validator } from "convex/values";
import { internal } from "../_generated/api";
import {
  action as baseAction,
  internalAction as baseInternalAction,
  type ActionCtx,
} from "../_generated/server";
import type { MondaySessionIdentity } from "./mondaySession";

type MondayArgValidator = Validator<
  unknown,
  "required" | "optional",
  string
>;

type MondayActionConfig<
  Args extends Record<string, MondayArgValidator>,
  Returns extends Validator<unknown, "required", string>,
> = {
  args: Args;
  returns: Returns;
  handler: (
    ctx: ActionCtx,
    identity: MondaySessionIdentity,
    args: { [K in keyof Args]: Infer<Args[K]> },
  ) => Promise<Infer<Returns>>;
};

/**
 * Creates a public Convex action that automatically verifies a Monday session
 * token before calling the handler. The verified identity is passed to the handler.
 */
export const mondayAction = <
  Args extends Record<string, MondayArgValidator>,
  Returns extends Validator<unknown, "required", string>,
>(
  config: MondayActionConfig<Args, Returns>,
) => {
  return baseAction({
    args: { sessionToken: v.string(), ...config.args },
    returns: config.returns,
    handler: async (ctx, args) => {
      const { sessionToken, ...rest } = args;
      const identity = await ctx.runAction(
        internal.mondayAuth.verifySession,
        { sessionToken: sessionToken as string },
      );
      return (config.handler as Function)(ctx, identity, rest);
    },
  });
};

/**
 * Creates an internal Convex action that verifies a Monday session token.
 * Same as mondayAction but uses internalAction.
 */
export const mondayInternalAction = <
  Args extends Record<string, MondayArgValidator>,
  Returns extends Validator<unknown, "required", string>,
>(
  config: MondayActionConfig<Args, Returns>,
) => {
  return baseInternalAction({
    args: { sessionToken: v.string(), ...config.args },
    returns: config.returns,
    handler: async (ctx, args) => {
      const { sessionToken, ...rest } = args;
      const identity = await ctx.runAction(
        internal.mondayAuth.verifySession,
        { sessionToken: sessionToken as string },
      );
      return (config.handler as Function)(ctx, identity, rest);
    },
  });
};

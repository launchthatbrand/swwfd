import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "renew-outlook-graph-subscriptions",
  { hours: 6 },
  internal.outlookInboundCron.renewOutlookSubscriptions,
  {},
);

export default crons;

"use client";

import { MondayBoardView } from "./MondayBoardView";

export type { MondayBoardViewMode } from "./types";
export { MondayBoardView } from "./MondayBoardView";

export default function MondayBoardPage() {
  return <MondayBoardView viewMode="all" />;
}

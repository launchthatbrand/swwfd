import { MondayMetricsView } from "../../../metrics/MondayMetricsView";

const normalizeOwnerId = (value: string | string[] | undefined): string | undefined => {
  if (!value) return undefined;
  const first = Array.isArray(value) ? (value[0] ?? "") : value;
  const trimmed = first.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export default async function MondayUserOwnerMetricsPage(props: {
  params: Promise<{ ownerId: string }>;
}) {
  const params = await props.params;
  const ownerId = normalizeOwnerId(params.ownerId);
  return <MondayMetricsView forcedOwnerId={ownerId} />;
}

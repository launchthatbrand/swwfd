import { MondayBoardView } from "../../page";

const normalizeOwnerId = (value: string | string[] | undefined): string | undefined => {
  if (!value) return undefined;
  const first = Array.isArray(value) ? (value[0] ?? "") : value;
  const trimmed = first.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export default async function MondayUserOwnerScopedPage(props: {
  params: Promise<{ ownerId: string }>;
}) {
  const params = await props.params;
  const ownerId = normalizeOwnerId(params.ownerId);

  return (
    <div className="overscroll-x-contain overscroll-y-contain">
      <MondayBoardView
        viewMode="userScoped"
        initialOwnerFilter={ownerId}
        forcedOwnerId={ownerId}
      />
    </div>
  );
}

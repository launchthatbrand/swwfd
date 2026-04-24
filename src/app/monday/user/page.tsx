import { MondayBoardView } from "../page";

const normalizeOwnerId = (value: string | string[] | undefined): string | undefined => {
  if (!value) return undefined;
  const first = Array.isArray(value) ? (value[0] ?? "") : value;
  const trimmed = first.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export default async function MondayUserPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const forcedOwnerId = normalizeOwnerId(searchParams.ownerId);
  const initialOwnerFilter = forcedOwnerId ?? normalizeOwnerId(searchParams.owner);

  return (
    <div className="overscroll-x-contain overscroll-y-contain">
      <MondayBoardView
        viewMode="userScoped"
        initialOwnerFilter={initialOwnerFilter}
        forcedOwnerId={forcedOwnerId}
      />
    </div>
  );
}

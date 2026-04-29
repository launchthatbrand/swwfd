import { MondayBoardView } from "../page";

export default function MondayUserPage() {
  return (
    <div className="overscroll-x-contain overscroll-y-contain">
      <MondayBoardView viewMode="userScoped" />
    </div>
  );
}

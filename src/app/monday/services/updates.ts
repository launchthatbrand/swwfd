import { fetchMondayApi } from "./monday-api";

export const deleteSubitem = async (sessionToken: string, subitemId: string) => {
  return fetchMondayApi<{ ok: boolean; error?: string }>("/api/monday/subitems", {
    sessionToken,
    method: "DELETE",
    body: { subitemId },
  });
};

export const patchSubitemDate = async (sessionToken: string, subitemId: string, date: string) => {
  return fetchMondayApi<{ ok: boolean; error?: string }>("/api/monday/subitems", {
    sessionToken,
    method: "PATCH",
    body: { subitemId, date },
  });
};

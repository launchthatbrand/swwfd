import { useCallback, useEffect, useMemo, useState } from "react";

import type { StoredSupportContact } from "../supportChat/utils";
import { readStoredContact } from "../supportChat/utils";

export const useSupportContactStorage = (organizationId: string) => {
  const storageKey = useMemo(
    () => `support-contact-${organizationId}`,
    [organizationId],
  );

  const [contact, setContact] = useState<StoredSupportContact | null>(() =>
    readStoredContact(storageKey),
  );

  useEffect(() => {
    setContact(readStoredContact(storageKey));
  }, [storageKey]);

  const saveContact = useCallback(
    (next: StoredSupportContact) => {
      setContact(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
    },
    [storageKey],
  );

  return { contact, saveContact };
};

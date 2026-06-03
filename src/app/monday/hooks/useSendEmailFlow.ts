import { useMemo } from "react";

import type { MondayRecord } from "../types";

type UseSendEmailFlowArgs = {
  sendEmailRecord: MondayRecord | null;
  sendEmailStep: 1 | 2 | 3;
  isSendingEmail: boolean;
};

export const useSendEmailFlow = ({
  sendEmailRecord,
  sendEmailStep,
  isSendingEmail,
}: UseSendEmailFlowArgs) => {
  return useMemo(
    () => ({
      sendEmailRecord,
      sendEmailStep,
      isSendingEmail,
      isOpen: !!sendEmailRecord,
    }),
    [isSendingEmail, sendEmailRecord, sendEmailStep],
  );
};

import { registerSupportConversationsMetaBox } from "./conversations";

let supportMetaBoxesRegistered = false;

export const registerSupportAdminMetaBoxes = () => {
  if (supportMetaBoxesRegistered) {
    return;
  }

  registerSupportConversationsMetaBox();

  supportMetaBoxesRegistered = true;
};

export { registerSupportConversationsMetaBox };


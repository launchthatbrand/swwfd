"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
} from "@launchthatapp/ui/select";

import { PlusIcon } from "lucide-react";
import { useEditorModal } from "../../editor-hooks/use-modal";

export function BlockInsertPlugin({ children }: { children: React.ReactNode }) {
  const [modal] = useEditorModal();
  const logPrefix = "[ui-lexical][insert]";

  return (
    <>
      {modal}
      <Select
        onOpenChange={(open) => {
          console.info(logPrefix, "openChange", { open });
        }}
        onValueChange={(value) => {
          console.info(logPrefix, "valueChange", value);
        }}
      >
        <SelectTrigger className="h-8 w-min gap-1">
          <PlusIcon className="size-4" />
          <span>Insert</span>
        </SelectTrigger>
        <SelectContent
          portalled={false}
          position="popper"
          align="start"
          sideOffset={4}
        >
          <SelectGroup>{children}</SelectGroup>
        </SelectContent>
      </Select>
    </>
  );
}

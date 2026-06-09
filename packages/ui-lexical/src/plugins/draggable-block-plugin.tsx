"use client";

import type { JSX, MutableRefObject } from "react";
import { useRef } from "react";
import { DraggableBlockPlugin_EXPERIMENTAL } from "@lexical/react/LexicalDraggableBlockPlugin";
import { GripVerticalIcon } from "lucide-react";

const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

export function DraggableBlockPlugin({
  anchorElem,
}: {
  anchorElem: HTMLElement | null;
}): JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const menuRefForPlugin = menuRef as unknown as MutableRefObject<HTMLElement>;
  const targetLineRefForPlugin =
    targetLineRef as unknown as MutableRefObject<HTMLElement>;

  if (!anchorElem) {
    return null;
  }

  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      menuRef={menuRefForPlugin}
      targetLineRef={targetLineRefForPlugin}
      menuComponent={
        <div
          ref={menuRef}
          className="draggable-block-menu absolute left-0 top-0 cursor-grab rounded-sm px-[1px] py-0.5 opacity-0 will-change-transform hover:bg-gray-100 active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4 opacity-30" />
        </div>
      }
      targetLineComponent={
        <div
          ref={targetLineRef}
          className="pointer-events-none absolute left-0 top-0 h-1 bg-secondary-foreground opacity-0 will-change-transform"
        />
      }
      isOnMenu={isOnMenu}
    />
  );
}

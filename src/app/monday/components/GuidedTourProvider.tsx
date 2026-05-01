"use client";

import type { Tour } from "nextstepjs";
import { NextStepProvider, NextStepReact, useNextStep } from "nextstepjs";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

// Step indices for the dialog portion of the tour.
// We open the dialog when *leaving* step 5 (i.e. arriving at step 6).
const FIRST_DIALOG_STEP = 6;
const LAST_DIALOG_STEP = 8;

const TOURS: Tour[] = [
  {
    tour: "getting-started",
    steps: [
      // 0
      {
        icon: "👋",
        title: "Welcome!",
        content:
          "This is your contact management dashboard. Let's walk through the key features.",
        selector: "[data-board-filter-bar]",
        side: "bottom",
        showControls: true,
        showSkip: true,
      },
      // 1
      {
        icon: "🔍",
        title: "Search Contacts",
        content:
          "Type at least 2 characters to search contacts by name, email, or other details.",
        selector: "[data-tour='search']",
        side: "bottom",
        showControls: true,
        showSkip: true,
      },
      // 2
      {
        icon: "🎛️",
        title: "Filter & Sort",
        content:
          "Use the owner and district dropdowns to narrow down your view.",
        selector: "[data-tour='filters']",
        side: "bottom",
        showControls: true,
        showSkip: true,
      },
      // 3
      {
        icon: "📋",
        title: "View Modes",
        content:
          "Switch between table, grid, and kanban views. Click any contact card or row to open their details.",
        selector: "[data-tour='view-toggle']",
        side: "bottom",
        showControls: true,
        showSkip: true,
      },
      // 4
      {
        icon: "🛠️",
        title: "Help & Settings",
        content:
          "The question-mark icon opens the Help Desk — tutorial videos, support tickets, and this guided tour. The gear icon opens Settings for themes, fonts, and density.",
        selector: "[data-tour='toolbar-actions']",
        side: "bottom-right",
        showControls: true,
        showSkip: true,
      },
      // 5
      {
        icon: "👆",
        title: "Contact Records",
        content:
          "Click on any contact to see their full details. Click Next and we'll open one for you.",
        selector: "[data-record-id]",
        side: "right",
        showControls: true,
        showSkip: true,
      },
      // 6
      {
        icon: "👤",
        title: "Contact Overview",
        content:
          "At the top you can see their name, email, phone, address, and current onboarding progress bar.",
        selector: "[data-tour='contact-header']",
        side: "bottom",
        showControls: true,
        showSkip: true,
      },
      // 7
      {
        icon: "📊",
        title: "Quick Actions",
        content:
          "The onboarding stepper shows each stage. Use the quick-action buttons to advance a contact — Welcome Email, Follow-Up, Questionnaire, and more.",
        selector: "[data-tour='onboarding-stepper']",
        side: "bottom",
        showControls: true,
        showSkip: true,
      },
      // 8
      {
        icon: "💬",
        title: "Updates History",
        content:
          "The Updates tab shows the full conversation thread. You can create new updates, edit recent ones, or delete them. The Additional Information tab shows all Monday board columns.",
        selector: "[data-tour='contact-tabs']",
        side: "bottom",
        showControls: true,
        showSkip: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Shared mutable flag: is the tour currently showing dialog steps?
// Used by page.tsx to prevent the dialog from closing mid-tour.
// ---------------------------------------------------------------------------

let _tourLockDialog = false;

export const isTourLockingDialog = () => _tourLockDialog;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface GuidedTourContextValue {
  startTour: (tourId: string) => void;
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

export const useGuidedTour = () => {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error("useGuidedTour must be used within GuidedTourProvider");
  return ctx;
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const GuidedTourProvider = ({ children }: { children: ReactNode }) => {
  const prevStepRef = useRef(-1);

  const handleStepChange = useCallback((step: number, tourName: string | null) => {
    if (tourName !== "getting-started") return;

    // When arriving at the first dialog step, open the contact dialog
    if (step === FIRST_DIALOG_STEP && prevStepRef.current < FIRST_DIALOG_STEP) {
      _tourLockDialog = true;

      const firstCard = document.querySelector<HTMLElement>("[data-record-id]");
      if (firstCard) {
        firstCard.click();
      }
    }

    // Track whether we're in dialog steps
    if (step >= FIRST_DIALOG_STEP && step <= LAST_DIALOG_STEP) {
      _tourLockDialog = true;

      // Scroll the dialog container so the target element is visible,
      // then nudge nextstepjs to recalculate position.
      const selectorMap: Record<number, string> = {
        [FIRST_DIALOG_STEP]: "[data-tour='contact-header']",
        [FIRST_DIALOG_STEP + 1]: "[data-tour='onboarding-stepper']",
        [LAST_DIALOG_STEP]: "[data-tour='contact-tabs']",
      };

      const selector = selectorMap[step];
      if (selector) {
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLElement>(selector);
          if (!el) return;

          const dialogScroller = el.closest<HTMLElement>("[data-tour='contact-dialog']");
          if (!dialogScroller) return;

          // Scroll the element to the top of the dialog viewport
          const elRect = el.getBoundingClientRect();
          const dialogRect = dialogScroller.getBoundingClientRect();
          const scrollOffset = elRect.top - dialogRect.top + dialogScroller.scrollTop - 16;

          dialogScroller.scrollTo({ top: Math.max(0, scrollOffset), behavior: "smooth" });

          // After scroll settles, trigger a resize so nextstepjs recalculates
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
          }, 350);
        });
      }
    } else {
      _tourLockDialog = false;
    }

    prevStepRef.current = step;
  }, []);

  const handleComplete = useCallback(() => {
    _tourLockDialog = false;
    prevStepRef.current = -1;
    // Close dialog
    const closeBtn = document.querySelector<HTMLElement>(
      "[data-tour='contact-dialog'] button[aria-label='Close']",
    );
    if (closeBtn) {
      closeBtn.click();
    } else {
      // Fallback: press Escape
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
  }, []);

  const handleSkip = useCallback(() => {
    _tourLockDialog = false;
    prevStepRef.current = -1;
    const closeBtn = document.querySelector<HTMLElement>(
      "[data-tour='contact-dialog'] button[aria-label='Close']",
    );
    if (closeBtn) {
      closeBtn.click();
    } else {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
  }, []);

  return (
    <NextStepProvider>
      <NextStepReact
        steps={TOURS}
        shadowOpacity="0.6"
        clickThroughOverlay={false}
        onStepChange={handleStepChange}
        onComplete={handleComplete}
        onSkip={handleSkip}
        overlayZIndex={9999}
        scrollToTop={false}
        noInViewScroll={true}
      >
        <GuidedTourRuntime>{children}</GuidedTourRuntime>
      </NextStepReact>
    </NextStepProvider>
  );
};

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

const GuidedTourRuntime = ({ children }: { children: ReactNode }) => {
  const { startNextStep } = useNextStep();

  const startTour = useCallback(
    (tourId: string) => {
      startNextStep(tourId);
    },
    [startNextStep],
  );

  const value = useMemo(() => ({ startTour }), [startTour]);

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
    </GuidedTourContext.Provider>
  );
};

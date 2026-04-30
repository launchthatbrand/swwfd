"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  DEFAULT_USER_BOARD_GENERAL_SETTINGS,
  USER_BOARD_COLOR_THEME_STYLES,
} from "../constants";
import type { UserBoardGeneralSettings, UserBoardColorTheme } from "../types";

interface ThemeStyles {
  shellCardClassName: string;
  toolbarClassName: string;
  previewClassName: string;
  actionButtonClassName: string;
}

interface UserSettingsContextValue {
  settings: UserBoardGeneralSettings;
  colorTheme: UserBoardColorTheme;
  themeStyles: ThemeStyles;
}

const UserSettingsContext = createContext<UserSettingsContextValue>({
  settings: DEFAULT_USER_BOARD_GENERAL_SETTINGS,
  colorTheme: DEFAULT_USER_BOARD_GENERAL_SETTINGS.colorTheme,
  themeStyles: USER_BOARD_COLOR_THEME_STYLES[DEFAULT_USER_BOARD_GENERAL_SETTINGS.colorTheme],
});

export const useUserSettings = () => useContext(UserSettingsContext);

export const UserSettingsProvider = ({
  settings,
  children,
}: {
  settings: UserBoardGeneralSettings;
  children: ReactNode;
}) => {
  const value = useMemo<UserSettingsContextValue>(() => ({
    settings,
    colorTheme: settings.colorTheme,
    themeStyles: USER_BOARD_COLOR_THEME_STYLES[settings.colorTheme],
  }), [settings]);

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
};

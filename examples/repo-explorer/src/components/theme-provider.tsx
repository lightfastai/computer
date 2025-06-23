'use client';

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps as NextThemesProviderProps } from 'next-themes';
import type * as React from 'react';

type ThemeProviderProps = {
  children: React.ReactNode;
} & Omit<NextThemesProviderProps, 'children'>;

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'dark',
  enableSystem = true,
  disableTransitionOnChange = true,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

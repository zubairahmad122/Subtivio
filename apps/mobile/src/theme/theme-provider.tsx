import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colorScheme, useColorScheme, vars } from 'nativewind';
import type { PropsWithChildren } from 'react';
import { Platform, View } from 'react-native';

import { colors, cssVariables, type Scheme } from './tokens';

// NativeWind's class mode starts web in "light" unless <html> has `.dark`;
// follow the OS instead, like native does.
if (Platform.OS === 'web' && typeof window !== 'undefined') colorScheme.set('system');

const schemeVars = { light: vars(cssVariables.light), dark: vars(cssVariables.dark) };

/** Current scheme plus hex colours for non-className consumers. Dark is the default. */
export function useTheme() {
  const { colorScheme: current, setColorScheme } = useColorScheme();
  const scheme: Scheme = current === 'light' ? 'light' : 'dark';
  return { scheme, colors: colors[scheme], setColorScheme };
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const { scheme, colors: c } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.foreground,
      border: c.border,
      notification: c.primary,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={schemeVars[scheme]} className="flex-1 bg-background">
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </View>
    </NavigationThemeProvider>
  );
}

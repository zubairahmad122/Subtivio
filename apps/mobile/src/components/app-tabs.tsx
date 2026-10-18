import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/theme/theme-provider';

/** Platform tab bar on iOS (liquid glass) and Android (Material). Web: app-tabs.web.tsx. */
export function AppTabs() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={{ default: colors.muted, selected: colors.primary }}
      backgroundColor={colors.surface}
      indicatorColor={colors.elevated}
      labelStyle={{ selected: { color: colors.foreground } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="templates">
        <NativeTabs.Trigger.Label>Styles</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="textformat" md="text_fields" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

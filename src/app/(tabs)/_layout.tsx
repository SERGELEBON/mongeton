import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon = (active: IconName, inactive: IconName) =>
  function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={String(color)} />;
  };

export default function TabsLayout() {
  const c = useTheme();
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarLabelStyle: { fontFamily: Fonts.semiBold, fontSize: 11 },
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
      }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen
        name="accounts"
        options={{ title: t.tabs.accounts, tabBarIcon: icon('wallet', 'wallet-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t.tabs.settings, tabBarIcon: icon('settings', 'settings-outline') }}
      />
    </Tabs>
  );
}

import { Tabs } from 'expo-router/tabs';

import TabBar from '@/components/nav/TabBar';

/**
 * JavaScript tabs with our own floating bar, rather than native tabs: the spec's
 * pill (black active tile, yellow glyphs) isn't something the platform tab bar
 * can draw. Order and labels live in TabBar.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sales" />
      <Tabs.Screen name="supply" />
      <Tabs.Screen name="restock" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

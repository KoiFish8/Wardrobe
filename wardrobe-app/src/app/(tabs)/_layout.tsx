/**
 * Capsule tab bar — Home · Wardrobe · [+] · Gaps · Profile, with the raised
 * dark scan FAB in the center slot (design: 78px frosted bar, hairline top).
 * Deviation from the mock (user-approved): the 4th slot is Gaps, since the
 * generate flow lives behind the Home cards, not a tab.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Loading } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

const TABS: { name: string; icon: 'home' | 'grid' | 'bag' | 'person'; label: string }[] = [
  { name: 'index', icon: 'home', label: 'Today' },
  { name: 'wardrobe', icon: 'grid', label: 'Wardrobe' },
  { name: 'gaps', icon: 'bag', label: 'Gaps' },
  { name: 'profile', icon: 'person', label: 'Profile' },
];

function CapsuleTabBar({ state, navigation }: any) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items = TABS.map((tab) => {
    const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
    const focused = state.index === routeIndex;
    return (
      <Pressable
        key={tab.name}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: focused }}
        onPress={() => navigation.navigate(tab.name)}
        hitSlop={8}
        style={styles.slot}>
        <Ionicons
          name={focused ? tab.icon : (`${tab.icon}-outline` as any)}
          size={25}
          color={focused ? theme.text : theme.textTertiary}
        />
      </Pressable>
    );
  });

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          height: 78 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}>
      {items[0]}
      {items[1]}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan a garment"
        onPress={() => router.push('/scan')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accentSoft, transform: [{ scale: pressed ? 0.93 : 1 }] },
        ]}>
        <Ionicons name="add" size={24} color={theme.accentText} />
      </Pressable>
      {items[2]}
      {items[3]}
    </View>
  );
}

export default function TabsLayout() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs tabBar={(props) => <CapsuleTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="wardrobe" />
      <Tabs.Screen name="gaps" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 18,
  },
  slot: { width: 48, alignItems: 'center' },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    shadowColor: '#1b1815',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
});

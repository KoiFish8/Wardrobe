/**
 * Wear history — the device-local log of outfits the user has marked as worn,
 * grouped by day. Sourced from wornStore (AsyncStorage), the same log that
 * powers Today's "fit for today" selection and the recently-worn row.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { EmptyState, PressScale, ThemedText } from '@/components/ui';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGarments } from '@/lib/queries';
import { sampleImageSource } from '@/lib/sampleImages';
import { RequireSession } from '@/lib/session';
import { useWornStore, type WornEntry } from '@/lib/wornStore';

export default function WearHistoryScreen() {
  return (
    <RequireSession>
      <WearHistory />
    </RequireSession>
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function WearHistory() {
  const theme = useTheme();
  const router = useRouter();
  const entries = useWornStore((s) => s.entries);
  const hydrate = useWornStore((s) => s.hydrate);
  const unwear = useWornStore((s) => s.unwear);
  const { data: garments } = useGarments();
  const closet = useMemo(() => garments ?? [], [garments]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Group entries by calendar day (already newest-first in the store).
  const groups = useMemo(() => {
    const map = new Map<string, WornEntry[]>();
    for (const e of entries) {
      const key = new Date(e.wornAt).toDateString();
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader title="Wear history" />
      {entries.length === 0 ? (
        <EmptyState
          title="No wear history yet"
          body="Tap “Wear this today” on any look and it'll be logged here, grouped by day."
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {groups.map(([key, dayEntries]) => (
            <View key={key} style={{ marginTop: 18 }}>
              <ThemedText variant="overline" color={theme.textSecondary} style={{ marginBottom: 10 }}>
                {dayLabel(dayEntries[0].wornAt)} · {dayEntries.length} outfit{dayEntries.length === 1 ? '' : 's'}
              </ThemedText>
              <View style={{ gap: 10 }}>
                {dayEntries.map((entry) => {
                  const pieces = closet.filter((g) => entry.garmentIds.includes(g.id));
                  const time = new Date(entry.wornAt).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  return (
                    <PressScale
                      key={`${entry.outfitId}-${entry.wornAt}`}
                      onPress={() => unwear(entry.outfitId)}
                      accessibilityLabel={`Remove ${entry.title} from history`}
                      style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                      <View style={styles.thumbs}>
                        {pieces.slice(0, 4).map((p) => {
                          const src = sampleImageSource(p.id, p.imageUri);
                          return (
                            <View key={p.id} style={[styles.thumb, { backgroundColor: theme.backgroundImage }]}>
                              {src ? (
                                <Image source={src} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 14, fontFamily: Fonts.sansSemiBold }}>
                          {entry.title}
                        </ThemedText>
                        <ThemedText variant="caption" style={{ marginTop: 2 }}>
                          {time} · {entry.garmentIds.length} piece{entry.garmentIds.length === 1 ? '' : 's'}
                        </ThemedText>
                      </View>
                      <Ionicons name="close-circle-outline" size={20} color={theme.textTertiary} />
                    </PressScale>
                  );
                })}
              </View>
            </View>
          ))}
          <ThemedText variant="caption" color={theme.textTertiary} style={{ marginTop: 18, textAlign: 'center' }}>
            Tap an entry to remove it. History stays on this device.
          </ThemedText>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
  },
  thumbs: { flexDirection: 'row' },
  thumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: -6,
    borderWidth: 1.5,
    borderColor: '#fbfaf7',
  },
});

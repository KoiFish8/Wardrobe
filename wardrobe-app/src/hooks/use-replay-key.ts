/**
 * Returns a number that increments every time the screen regains focus. Use it
 * as a `key` on entering-animation wrappers so reanimated `entering` props
 * replay on each visit instead of only on first mount.
 *
 *   const replay = useReplayKey();
 *   <Animated.View key={replay} entering={FadeInDown}>…</Animated.View>
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useReplayKey(): number {
  const [key, setKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setKey((k) => k + 1);
    }, [])
  );
  return key;
}

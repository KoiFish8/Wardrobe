import { Redirect, Stack } from 'expo-router';

import { Loading } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function AuthLayout() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (user) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}

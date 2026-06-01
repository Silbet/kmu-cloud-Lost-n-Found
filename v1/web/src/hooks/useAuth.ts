import { useEffect } from 'react';
import { me } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

export function useAuthBootstrap() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (token && !user) {
      me().then(setUser).catch(() => clear());
    }
  }, [token, user, setUser, clear]);
}

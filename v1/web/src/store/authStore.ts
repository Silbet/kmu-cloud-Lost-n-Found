import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('lf_auth_token'),
  setAuth: (user, token) => {
    localStorage.setItem('lf_auth_token', token);
    set({ user, token });
  },
  setUser: (user) => set({ user }),
  clear: () => {
    localStorage.removeItem('lf_auth_token');
    set({ user: null, token: null });
  },
}));

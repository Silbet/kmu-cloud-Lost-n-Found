import { useQuery } from '@tanstack/react-query';
import { getConfig } from '@/api/admin';

export function useSystemConfig() {
  return useQuery({ queryKey: ['systemConfig'], queryFn: getConfig, staleTime: 60_000 });
}

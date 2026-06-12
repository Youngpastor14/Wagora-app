import { useAuth } from '@/contexts/AuthContext';

export function useProfile() {
  const { profile, loading, refreshProfile } = useAuth();
  return {
    profile,
    loading,
    refreshProfile
  };
}

import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, status, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // User is authenticated only if query succeeded and we have user data
  // status === 'success' means the query completed successfully without errors
  // status === 'error' means the query failed (e.g., 401 Unauthorized)
  // status === 'pending' means the query is still loading
  const isAuthenticated = status === 'success' && !!user;

  return {
    user,
    isLoading,
    isAuthenticated,
    refetch,
  };
}

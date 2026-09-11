import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface StorefrontCustomer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  birthday?: string | null;
  ordersCount: number;
  createdAt: string;
}

const meKey = (slug: string) => [`/api/storefront/${slug}/account/me`];

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Something went wrong");
  return data;
}

/**
 * Storefront customer session for one merchant (by slug). Separate from the
 * merchant/admin auth — its own cookie key on the server.
 */
export function useStorefrontCustomer(slug: string | undefined) {
  const qc = useQueryClient();
  const enabled = !!slug;

  const { data: customer, isLoading } = useQuery<StorefrontCustomer | null>({
    queryKey: meKey(slug || "_"),
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/storefront/${slug}/account/me`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: meKey(slug || "_") });

  const login = useMutation({
    mutationFn: (vars: { emailOrPhone: string; password: string }) =>
      post(`/api/storefront/${slug}/account/login`, vars),
    onSuccess: (c) => qc.setQueryData(meKey(slug || "_"), c),
  });

  const register = useMutation({
    mutationFn: (vars: { name: string; email: string; phone?: string; password: string }) =>
      post(`/api/storefront/${slug}/account/register`, vars),
    onSuccess: (c) => qc.setQueryData(meKey(slug || "_"), c),
  });

  const logout = useMutation({
    mutationFn: () => post(`/api/storefront/${slug}/account/logout`, {}),
    onSuccess: () => {
      qc.setQueryData(meKey(slug || "_"), null);
      qc.invalidateQueries({ queryKey: [`/api/storefront/${slug}/account/orders`] });
      qc.invalidateQueries({ queryKey: [`/api/storefront/${slug}/account/addresses`] });
    },
  });

  return { customer: customer ?? null, isLoading, refresh, login, register, logout };
}

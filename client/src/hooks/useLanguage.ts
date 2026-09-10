import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { Restaurant } from '@shared/schema';

export function usePlatformLanguage() {
  const { i18n } = useTranslation();
  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
  });

  useEffect(() => {
    if (restaurant?.platformLanguage && restaurant.platformLanguage !== i18n.language) {
      i18n.changeLanguage(restaurant.platformLanguage);
    }
  }, [restaurant?.platformLanguage, i18n]);
}

export function useStorefrontLanguage(restaurantId?: string) {
  const { i18n } = useTranslation();
  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: restaurantId ? [`/api/storefront/restaurant/${restaurantId}`] : ["/api/restaurants/me"],
    enabled: !!restaurantId || true,
  });

  useEffect(() => {
    if (restaurant?.storefrontLanguage && restaurant.storefrontLanguage !== i18n.language) {
      i18n.changeLanguage(restaurant.storefrontLanguage);
    }
  }, [restaurant?.storefrontLanguage, i18n]);
}

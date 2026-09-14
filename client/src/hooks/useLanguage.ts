import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { Merchant } from '@shared/schema';

export function usePlatformLanguage() {
  const { i18n } = useTranslation();
  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchants/me"],
  });

  useEffect(() => {
    if (merchant?.platformLanguage && merchant.platformLanguage !== i18n.language) {
      i18n.changeLanguage(merchant.platformLanguage);
    }
  }, [merchant?.platformLanguage, i18n]);
}

export function useStorefrontLanguage(merchantId?: string) {
  const { i18n } = useTranslation();
  const { data: merchant } = useQuery<Merchant>({
    queryKey: merchantId ? [`/api/storefront/merchant/${merchantId}`] : ["/api/merchants/me"],
    enabled: !!merchantId || true,
  });

  useEffect(() => {
    if (merchant?.storefrontLanguage && merchant.storefrontLanguage !== i18n.language) {
      i18n.changeLanguage(merchant.storefrontLanguage);
    }
  }, [merchant?.storefrontLanguage, i18n]);
}

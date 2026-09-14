import type { TFunction } from 'i18next';
import type { MenuItem } from '@shared/schema';

export function getTranslatedMenuItem(item: MenuItem, t: TFunction): MenuItem {
  const translatedName = t(`menu_item_${item.id}_name`, { 
    defaultValue: item.name,
    ns: 'merchant'
  });
  
  const translatedDescription = t(`menu_item_${item.id}_description`, { 
    defaultValue: item.description || '',
    ns: 'merchant'
  });
  
  return {
    ...item,
    name: translatedName,
    description: translatedDescription !== '' ? translatedDescription : item.description,
  };
}

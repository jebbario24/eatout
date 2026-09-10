class RestaurantTranslationsBackend {
  type = 'backend' as const;
  static type = 'backend' as const;
  
  restaurantSlug: string | null = null;
  
  init(services: any, backendOptions: any) {
    if (backendOptions && backendOptions.restaurantSlug) {
      this.restaurantSlug = backendOptions.restaurantSlug;
    }
  }
  
  read(language: string, namespace: string, callback: (err: any, data: any) => void) {
    if (namespace !== 'restaurant') {
      callback(null, {});
      return;
    }
    
    if (!this.restaurantSlug) {
      callback(null, {});
      return;
    }
    
    fetch(`/api/storefront/${this.restaurantSlug}/translations/${language}`)
      .then(response => {
        if (!response.ok) {
          callback(null, {});
          return;
        }
        return response.json();
      })
      .then(data => {
        if (!data) {
          callback(null, {});
          return;
        }
        
        const translations: Record<string, string> = {};
        
        if (data.menuItems && Array.isArray(data.menuItems)) {
          data.menuItems.forEach((item: any) => {
            if (item.id) {
              if (item.name) {
                translations[`menu_item_${item.id}_name`] = item.name;
              }
              if (item.description) {
                translations[`menu_item_${item.id}_description`] = item.description;
              }
            }
          });
        }
        
        callback(null, translations);
      })
      .catch(error => {
        console.error('Failed to load restaurant translations:', error);
        callback(null, {});
      });
  }
  
  setRestaurantSlug(slug: string) {
    this.restaurantSlug = slug;
  }
}

export default RestaurantTranslationsBackend;

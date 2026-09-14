class MerchantTranslationsBackend {
  type = 'backend' as const;
  static type = 'backend' as const;
  
  merchantSlug: string | null = null;
  
  init(services: any, backendOptions: any) {
    if (backendOptions && backendOptions.merchantSlug) {
      this.merchantSlug = backendOptions.merchantSlug;
    }
  }
  
  read(language: string, namespace: string, callback: (err: any, data: any) => void) {
    if (namespace !== 'merchant') {
      callback(null, {});
      return;
    }
    
    if (!this.merchantSlug) {
      callback(null, {});
      return;
    }
    
    fetch(`/api/storefront/${this.merchantSlug}/translations/${language}`)
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
        console.error('Failed to load merchant translations:', error);
        callback(null, {});
      });
  }
  
  setMerchantSlug(slug: string) {
    this.merchantSlug = slug;
  }
}

export default MerchantTranslationsBackend;

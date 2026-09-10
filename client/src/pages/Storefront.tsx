import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useStorefrontCustomer } from "@/hooks/useStorefrontCustomer";
import { CustomerAuthDialog } from "@/components/storefront/CustomerAuthDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Restaurant, MenuItem, MenuCategory, CustomerReview } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Minus, Trash2, Store, Clock, CreditCard, Banknote, Star, Mail, Phone, MessageSquare, Send, AlertCircle, Users, UserRound, PackageSearch } from "lucide-react";
import { SiPaypal, SiApple, SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { getTranslatedMenuItem } from "@/lib/translationHelpers";
import { FrequentlyBoughtTogether } from "@/components/marketing/FrequentlyBoughtTogether";
import { CountdownTimer } from "@/components/marketing/CountdownTimer";
import { LivePurchaseNotifications } from "@/components/marketing/LivePurchaseNotifications";
import { PixelScripts, trackViewContent, trackAddToCart, trackInitiateCheckout, trackPurchase } from "@/components/PixelScripts";
import { BundlesSection } from "@/components/marketing/storefront/BundlesSection";
import { ActivePromosBanner } from "@/components/marketing/storefront/ActivePromosBanner";
import { ReferralCTA } from "@/components/marketing/storefront/ReferralCTA";
import { BoostedItemsBadge } from "@/components/marketing/storefront/BoostedItemsBadge";
import { LanguageSelector } from "@/components/LanguageSelector";
import { MarketingTriggersModal } from "@/components/marketing/MarketingTriggersModal";

interface StorefrontPromo {
  id: string;
  code: string;
  type: string;
  value: number;
  description: string | null;
  expiresAt: Date | null;
  isActive: boolean;
}

interface CartItem {
  menuItem?: MenuItem;
  bundle?: {
    id: string;
    name: string;
    items: string[];
    regularPrice: number;
    bundlePrice: number;
  };
  quantity: number;
  selectedOptions?: Array<{
    optionGroupLabel: string;
    choices: Array<{ label: string; priceCents: number }>;
  }>;
}

interface OpeningHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

// Utility function to check if restaurant is currently open
// Note: This assumes opening and closing times are within the same calendar day.
// Overnight schedules (e.g., 10 PM to 2 AM) are not currently supported.
function isRestaurantOpen(openingHours: OpeningHours | null | undefined): boolean {
  // A merchant who hasn't configured hours yet hasn't restricted anything —
  // default to open rather than falsely showing new stores as "Closed",
  // which would silently kill conversion before they ever get their first order.
  if (!openingHours) return true;

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const todayHours = openingHours[currentDay];
  if (!todayHours || todayHours.closed) {
    return false;
  }
  
  // Compare times as strings (HH:MM format)
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}

// Get today's hours display text
function getTodayHoursText(openingHours: OpeningHours | null | undefined): string {
  if (!openingHours) return '';
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[new Date().getDay()];
  const todayHours = openingHours[currentDay];
  
  if (!todayHours || todayHours.closed) {
    return 'Closed today';
  }
  
  // Format time from 24h to 12h
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  return `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function Storefront() {
  const { slug } = useParams();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [authOpen, setAuthOpen] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('delivery');
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryCountry, setDeliveryCountry] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean>(true);
  const [deliveryError, setDeliveryError] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'cash' | 'apple' | 'google'>('cash');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const paypalButtonsRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);
  
  // Item options modal state
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [selectedItemOptions, setSelectedItemOptions] = useState<Array<{
    optionGroupLabel: string;
    choices: Array<{ label: string; priceCents: number }>;
  }>>([]);
  const [selectedMarketingSuggestions, setSelectedMarketingSuggestions] = useState<string[]>([]);
  
  // Review form state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  
  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoCodeError, setPromoCodeError] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);

  // Upsell modal state
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [upsellSuggestedItem, setUpsellSuggestedItem] = useState<MenuItem | null>(null);

  // Marketing triggers modal state
  const [marketingTriggersModalOpen, setMarketingTriggersModalOpen] = useState(false);
  const [marketingTriggerType, setMarketingTriggerType] = useState<'upsell' | 'crossSell' | 'downsell'>('crossSell');
  const [pendingCartItem, setPendingCartItem] = useState<{
    menuItem: MenuItem;
    selectedOptions?: Array<{
      optionGroupLabel: string;
      choices: Array<{ label: string; priceCents: number }>;
    }>;
  } | null>(null);
  const [skipMarketingTriggersForCurrentItem, setSkipMarketingTriggersForCurrentItem] = useState(false);

  const mockReferral = {
    referralLink: `${window.location.origin}/store/${slug}?ref=USER123`,
    referrerReward: '$10 credit',
    refereeReward: '$5 off',
    totalReferrals: 8,
    referralRevenue: 80.00,
  };

  // Try hostname-based lookup first, fallback to slug
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: slug ? ["/api/storefront/restaurant", slug] : ["/api/storefront/by-hostname"],
    queryFn: async () => {
      if (slug) {
        const response = await fetch(`/api/storefront/${slug}`);
        if (!response.ok) throw new Error("Restaurant not found");
        return response.json();
      }
      const response = await fetch(`/api/storefront/by-hostname`);
      if (!response.ok) throw new Error("Restaurant not found");
      return response.json();
    },
  });

  const sfSlug = slug || restaurant?.slug || undefined;
  const { customer: sfCustomer } = useStorefrontCustomer(sfSlug);
  const accountHref = slug ? `/store/${slug}/account` : "/account";
  const trackHref = slug ? `/store/${slug}/track` : "/track";

  // Prefill checkout from the signed-in customer (only if the field is still empty)
  useEffect(() => {
    if (!sfCustomer) return;
    setCustomerName((v) => v || sfCustomer.name || "");
    setCustomerPhone((v) => v || sfCustomer.phone || "");
    setCustomerEmail((v) => v || sfCustomer.email || "");
  }, [sfCustomer]);

  // Re-order: CustomerAccount stashes the items in sessionStorage then sends us here with ?reorder=1
  useEffect(() => {
    if (typeof window === "undefined") return;
    const wantsReorder = new URLSearchParams(window.location.search).get("reorder");
    if (!wantsReorder || !sfSlug) return;
    try {
      const raw = sessionStorage.getItem(`sf_reorder_${sfSlug}`);
      if (raw) {
        const items = JSON.parse(raw) as CartItem[];
        if (Array.isArray(items) && items.length) {
          setCart(items);
          toast({ title: "Added your last order to the cart" });
        }
        sessionStorage.removeItem(`sf_reorder_${sfSlug}`);
      }
    } catch {}
    window.history.replaceState({}, "", window.location.pathname);
  }, [sfSlug]);

  // Set storefront language based on restaurant settings
  useEffect(() => {
    if (restaurant?.storefrontLanguage && restaurant.storefrontLanguage !== i18n.language) {
      i18n.changeLanguage(restaurant.storefrontLanguage);
    }
  }, [restaurant?.storefrontLanguage, i18n]);

  // Set restaurant slug in i18n backend and reload restaurant namespace
  useEffect(() => {
    if (restaurant?.slug) {
      const backend = i18n.services.backendConnector?.backend as any;
      if (backend && backend.setRestaurantSlug) {
        backend.setRestaurantSlug(restaurant.slug);
        i18n.reloadResources(i18n.language, 'restaurant');
      }
    }
  }, [restaurant?.slug]);

  // Reload restaurant translations when language changes
  useEffect(() => {
    if (restaurant?.slug) {
      i18n.reloadResources(i18n.language, 'restaurant');
    }
  }, [i18n.language, restaurant?.slug]);

  // Create pixel config from restaurant settings
  const pixelConfig = useMemo(() => ({
    metaPixelId: restaurant?.metaPixelId,
    tiktokPixelId: restaurant?.tiktokPixelId,
    googleAnalyticsId: restaurant?.googleAnalyticsId,
    googleAdsId: restaurant?.googleAdsId,
  }), [restaurant?.metaPixelId, restaurant?.tiktokPixelId, restaurant?.googleAnalyticsId, restaurant?.googleAdsId]);

  // Fetch delivery zones for this restaurant
  const { data: deliveryZones = [] } = useQuery<Array<{
    id: string;
    country: string | null;
    city: string | null;
    neighborhood: string | null;
  }>>({
    queryKey: restaurant?.id ? ['/api/storefront/delivery-zones', restaurant.id] : ['no-restaurant'],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const response = await fetch(`/api/storefront/delivery-zones/${restaurant.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!restaurant?.id,
  });

  // Compute available countries from delivery zones
  const countries = useMemo(() => {
    const uniqueCountries = new Set<string>();
    deliveryZones.forEach(zone => {
      if (zone.country) {
        uniqueCountries.add(zone.country);
      }
    });
    return Array.from(uniqueCountries).sort((a, b) => a.localeCompare(b));
  }, [deliveryZones]);

  // Compute available cities for selected country from delivery zones
  const cities = useMemo(() => {
    if (!deliveryCountry) return [];
    const uniqueCities = new Set<string>();
    deliveryZones.forEach(zone => {
      if (zone.country === deliveryCountry && zone.city) {
        uniqueCities.add(zone.city);
      }
    });
    return Array.from(uniqueCities).sort((a, b) => a.localeCompare(b));
  }, [deliveryCountry, deliveryZones]);

  // Compute available neighborhoods for selected city from delivery zones
  const neighborhoods = useMemo(() => {
    if (!deliveryCountry || !deliveryCity) return [];
    const uniqueNeighborhoods = new Set<string>();
    deliveryZones.forEach(zone => {
      if (zone.country === deliveryCountry && zone.city === deliveryCity && zone.neighborhood) {
        uniqueNeighborhoods.add(zone.neighborhood);
      }
    });
    return Array.from(uniqueNeighborhoods).sort((a, b) => a.localeCompare(b));
  }, [deliveryCountry, deliveryCity, deliveryZones]);

  const { data: categories } = useQuery<MenuCategory[]>({
    queryKey: ["/api/storefront/categories", restaurant?.id],
    enabled: !!restaurant,
    queryFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/categories` : `/api/storefront/${restaurant?.slug}/categories`;
      const response = await fetch(endpoint);
      return response.json();
    },
  });

  // Fetch menu items for upsell logic
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/storefront/items", restaurant?.id],
    enabled: !!restaurant,
    queryFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/items` : `/api/storefront/${restaurant?.slug}/items`;
      const response = await fetch(endpoint);
      return response.json();
    },
  });

  // Fetch active upsell rules
  const { data: upsellRules = [] } = useQuery<any[]>({
    queryKey: ["/api/storefront/upsell-rules", restaurant?.id],
    enabled: !!restaurant,
    queryFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/upsell-rules` : `/api/storefront/${restaurant?.slug}/upsell-rules`;
      const response = await fetch(endpoint);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch active boosts
  const { data: activeBoosts = [] } = useQuery<any[]>({
    queryKey: ["/api/storefront/boosts", restaurant?.id],
    enabled: !!restaurant,
    queryFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/boosts` : `/api/storefront/${restaurant?.slug}/boosts`;
      const response = await fetch(endpoint);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: items } = useQuery<MenuItem[]>({
    queryKey: ["/api/storefront/items", restaurant?.id],
    enabled: !!restaurant,
    queryFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/items` : `/api/storefront/${restaurant?.slug}/items`;
      const response = await fetch(endpoint);
      return response.json();
    },
  });

  const { data: reviews = [] } = useQuery<CustomerReview[]>({
    queryKey: ["/api/storefront/reviews", restaurant?.slug],
    enabled: !!restaurant,
    queryFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/reviews` : `/api/storefront/${restaurant?.slug}/reviews`;
      const response = await fetch(endpoint);
      return response.json();
    },
  });

  const { data: bundles = [] } = useQuery<any[]>({
    queryKey: ["/api/storefront/bundles", restaurant?.slug],
    enabled: !!restaurant,
    queryFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/bundles` : `/api/storefront/${restaurant?.slug}/bundles`;
      const response = await fetch(endpoint);
      return response.json();
    },
  });

  // Fetch active promo codes from the database
  const { data: activePromos = [] } = useQuery<StorefrontPromo[]>({
    queryKey: ["/api/storefront/promos", restaurant?.slug],
    enabled: !!restaurant,
    queryFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/promos` : `/api/storefront/${restaurant?.slug}/promos`;
      const response = await fetch(endpoint);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Helper function to check if an item is currently boosted
  const isItemBoosted = (itemName: string) => {
    return activeBoosts.some((boost: any) => boost.itemName === itemName);
  };

  // Load PayPal SDK with restaurant's currency
  useEffect(() => {
    if (!restaurant) return;
    
    const script = document.createElement('script');
    const currency = restaurant.currency || 'USD';
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test'}&currency=${currency}`;
    script.async = true;
    script.onload = () => setPaypalReady(true);
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [restaurant?.currency]);

  // Reset delivery fee when switching to pickup
  useEffect(() => {
    if (orderType === 'pickup') {
      setDeliveryFee(0);
      setDeliveryAvailable(true);
      setDeliveryError("");
    }
  }, [orderType]);

  const filteredItems = selectedCategory
    ? items?.filter((item) => item.categoryId === selectedCategory)
    : items;

  // Group items by category when showing all
  const itemsByCategory = selectedCategory === null && items && categories
    ? categories.map(category => ({
        category,
        items: items.filter(item => item.categoryId === category.id)
      })).filter(group => group.items.length > 0)
    : null;

  // Compute today's hours text
  const todayHoursText = useMemo(() => {
    if (!restaurant?.openingHours) return '';
    return getTodayHoursText(restaurant.openingHours as OpeningHours);
  }, [restaurant?.openingHours]);

  // Get suggested items for marketing triggers modal
  const suggestedMarketingItems = useMemo(() => {
    if (!pendingCartItem || !menuItems || menuItems.length === 0) return [];
    
    const item = pendingCartItem.menuItem;
    let triggerIds: string[] = [];
    
    if (marketingTriggerType === 'crossSell') {
      triggerIds = (item.crossSellItemIds as string[]) || [];
    } else if (marketingTriggerType === 'upsell') {
      triggerIds = (item.upsellItemIds as string[]) || [];
    } else if (marketingTriggerType === 'downsell') {
      triggerIds = (item.downsellItemIds as string[]) || [];
    }
    
    return menuItems.filter((mi: MenuItem) => triggerIds.includes(mi.id));
  }, [pendingCartItem, menuItems, marketingTriggerType]);

  const addToCart = (item: MenuItem, skipUpsell = false, skipMarketingTriggers = false) => {
    // Check if item has options - if yes, open modal for selection
    const itemOptions = (item.options as any) || [];
    if (itemOptions.length > 0) {
      setSelectedItem(item);
      setSelectedItemOptions([]);
      setSkipMarketingTriggersForCurrentItem(skipMarketingTriggers);
      setItemModalOpen(true);
      return;
    }
    
    // Check for upsell rules if not skipping
    if (!skipUpsell && upsellRules.length > 0) {
      const matchingRule = upsellRules.find((rule: any) => rule.triggerItemId === item.id);
      if (matchingRule && matchingRule.suggestionItemIds && matchingRule.suggestionItemIds.length > 0) {
        // Find the first suggested item from menu items
        const suggestionId = matchingRule.suggestionItemIds[0];
        const suggestedItem = menuItems.find((mi: MenuItem) => mi.id === suggestionId);
        if (suggestedItem) {
          // Store the item to add and show upsell modal
          setSelectedItem(item);
          setUpsellSuggestedItem(suggestedItem);
          setUpsellModalOpen(true);
          return;
        }
      }
    }
    
    // Check for marketing trigger items if not skipping
    if (!skipMarketingTriggers) {
      const upsellIds = (item.upsellItemIds as string[]) || [];
      const crossSellIds = (item.crossSellItemIds as string[]) || [];
      const downsellIds = (item.downsellItemIds as string[]) || [];
      
      // Determine which type of trigger to show
      let triggerIds: string[] = [];
      let triggerType: 'upsell' | 'crossSell' | 'downsell' = 'crossSell';
      
      if (crossSellIds.length > 0) {
        triggerIds = crossSellIds;
        triggerType = 'crossSell';
      } else if (upsellIds.length > 0) {
        triggerIds = upsellIds;
        triggerType = 'upsell';
      } else if (downsellIds.length > 0) {
        triggerIds = downsellIds;
        triggerType = 'downsell';
      }
      
      // If there are marketing triggers, show the modal
      if (triggerIds.length > 0 && menuItems.length > 0) {
        setPendingCartItem({
          menuItem: item
        });
        setMarketingTriggerType(triggerType);
        setMarketingTriggersModalOpen(true);
        return;
      }
    }
    
    // Track AddToCart event
    if (restaurant) {
      trackAddToCart({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price.toString()),
        currency: restaurant.currency || 'USD',
        quantity: 1,
      }, pixelConfig);
    }
    
    // No options - add directly to cart
    const existingItem = cart.find((ci) => ci.menuItem?.id === item.id && !ci.selectedOptions);
    if (existingItem) {
      setCart(
        cart.map((ci) =>
          ci.menuItem?.id === item.id && !ci.selectedOptions
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        )
      );
    } else {
      setCart([...cart, { menuItem: item, quantity: 1 }]);
    }
    toast({ title: `${item.name} added to cart` });
  };
  
  const addToCartWithOptions = () => {
    if (!selectedItem) return;
    
    // Close the toppings modal first
    setItemModalOpen(false);
    
    // Build the new cart items array
    const newCartItems: CartItem[] = [];
    
    // Add the main item with its options
    newCartItems.push({ 
      menuItem: selectedItem, 
      quantity: 1,
      selectedOptions: selectedItemOptions
    });
    
    // Add any selected marketing suggestions (without options, as single items)
    if (selectedMarketingSuggestions.length > 0) {
      const suggestedMenuItems = menuItems.filter((item: MenuItem) => 
        selectedMarketingSuggestions.includes(item.id)
      );
      
      suggestedMenuItems.forEach((item: MenuItem) => {
        newCartItems.push({
          menuItem: item,
          quantity: 1,
          selectedOptions: []
        });
      });
    }
    
    // Add all items to cart
    setCart([...cart, ...newCartItems]);
    
    // Show toast message
    if (selectedMarketingSuggestions.length > 0) {
      toast({ 
        title: `${selectedItem.name} and ${selectedMarketingSuggestions.length} more item${selectedMarketingSuggestions.length > 1 ? 's' : ''} added to cart` 
      });
    } else {
      toast({ title: `${selectedItem.name} added to cart` });
    }
    
    // Clear all state
    setSelectedItem(null);
    setSelectedItemOptions([]);
    setSelectedMarketingSuggestions([]);
    setSkipMarketingTriggersForCurrentItem(false);
  };

  const handleUpsellAccept = () => {
    // Add both the original item and the suggested item to cart
    if (selectedItem && upsellSuggestedItem) {
      // Add original item
      addToCart(selectedItem, true);
      // Add suggested item
      addToCart(upsellSuggestedItem, true);
      toast({ title: "Items added to cart!" });
    }
    setUpsellModalOpen(false);
    setSelectedItem(null);
    setUpsellSuggestedItem(null);
  };

  const handleUpsellDecline = () => {
    // Add only the original item to cart
    if (selectedItem) {
      addToCart(selectedItem, true);
    }
    setUpsellModalOpen(false);
    setSelectedItem(null);
    setUpsellSuggestedItem(null);
  };

  // Marketing triggers modal handlers
  const handleAddSuggestedItem = (suggestedItem: MenuItem) => {
    // Add suggested item to cart (skip marketing triggers to avoid infinite loop)
    addToCart(suggestedItem, true, true);
  };

  const handleContinueToCart = () => {
    // Add the pending item to cart
    if (pendingCartItem) {
      setCart([...cart, {
        menuItem: pendingCartItem.menuItem,
        quantity: 1,
        selectedOptions: pendingCartItem.selectedOptions
      }]);
      
      toast({ title: `${pendingCartItem.menuItem.name} added to cart` });
    }
    
    // Close modal and reset state
    setMarketingTriggersModalOpen(false);
    setPendingCartItem(null);
  };

  // Handle marketing triggers modal dismissal
  const handleMarketingTriggersModalChange = (open: boolean) => {
    setMarketingTriggersModalOpen(open);
    // Clear pending item if modal is manually dismissed
    if (!open && pendingCartItem) {
      setPendingCartItem(null);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(
      cart
        .map((ci, idx) =>
          idx === index
            ? { ...ci, quantity: ci.quantity + delta }
            : ci
        )
        .filter((ci) => ci.quantity > 0)
    );
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const subtotal = cart.reduce(
    (sum, item) => {
      if (item.bundle) {
        // Bundle item
        return sum + item.bundle.bundlePrice * item.quantity;
      } else if (item.menuItem) {
        // Regular menu item
        const optionsTotal = (item.selectedOptions || []).reduce(
          (opSum, group) => opSum + group.choices.reduce((s, c) => s + c.priceCents, 0),
          0
        ) / 100;
        const itemTotal = parseFloat(item.menuItem.price) + optionsTotal;
        return sum + itemTotal * item.quantity;
      }
      return sum;
    },
    0
  );
  
  // Calculate promo discount
  const calculateDiscount = (promo: any, amount: number): number => {
    if (!promo) return 0;
    const discountConfig = promo.discount as any;
    if (discountConfig?.type === 'percentage') {
      return amount * (parseFloat(discountConfig.value) / 100);
    } else if (discountConfig?.type === 'fixed') {
      return parseFloat(discountConfig.value);
    }
    return 0;
  };
  
  const promoDiscount = appliedPromo ? calculateDiscount(appliedPromo, subtotal) : 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - promoDiscount);
  
  // Use restaurant's custom tax rate and handle tax-included pricing
  const taxRate = restaurant?.taxRate ? parseFloat(restaurant.taxRate) / 100 : 0;
  const taxIncludedInPrice = restaurant?.taxIncludedInPrice || false;
  const taxLabel = restaurant?.taxLabel || 'Tax';
  
  // Calculate tax based on discounted subtotal
  const taxAmount = taxIncludedInPrice 
    ? subtotalAfterDiscount * (taxRate / (1 + taxRate))  // Extract tax that's already included
    : subtotalAfterDiscount * taxRate;  // Add tax on top
  
  const total = taxIncludedInPrice 
    ? subtotalAfterDiscount + deliveryFee  // Tax already in subtotal
    : subtotalAfterDiscount + taxAmount + deliveryFee;  // Add tax and delivery fee
  
  // Apply promo code function
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoCodeError("Please enter a promo code");
      return;
    }
    
    setApplyingPromo(true);
    setPromoCodeError("");
    
    try {
      const endpoint = slug ? `/api/storefront/${slug}/validate-promo` : `/api/storefront/${restaurant?.slug}/validate-promo`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          promoCode: promoCode.trim(),
          orderTotal: subtotal 
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        setPromoCodeError(error.message || "Invalid promo code");
        setApplyingPromo(false);
        return;
      }
      
      const promo = await response.json();
      setAppliedPromo(promo);
      toast({ 
        title: "Promo code applied!", 
        description: `${promo.name || 'Discount'} has been applied to your order` 
      });
    } catch (error) {
      setPromoCodeError("Failed to apply promo code");
    } finally {
      setApplyingPromo(false);
    }
  };
  
  // Remove promo code function
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoCodeError("");
    toast({ title: "Promo code removed" });
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/checkout` : `/api/storefront/${restaurant?.slug}/checkout`;
      
      // Build shipping address from components or use the legacy field
      const fullAddress = deliveryCountry && deliveryCity
        ? `${homeAddress ? homeAddress + ', ' : ''}${deliveryCity}, ${deliveryCountry}`
        : shippingAddress;
      
      return await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderType,
          customerName,
          customerPhone,
          customerEmail: customerEmail || null,
          saveAddress: !!sfCustomer && orderType === 'delivery' && saveAddress,
          shippingAddress: fullAddress || null,
          deliveryCountry: orderType === 'delivery' ? deliveryCountry : null,
          deliveryCity: orderType === 'delivery' ? deliveryCity : null,
          deliveryAddress: orderType === 'delivery' ? fullAddress : null,
          deliveryFee: orderType === 'delivery' ? deliveryFee.toFixed(2) : '0.00',
          paymentMethod,
          items: cart.map((ci) => {
            if (ci.bundle) {
              // Bundle item
              return {
                bundleId: ci.bundle.id,
                quantity: ci.quantity,
                unitPrice: ci.bundle.bundlePrice.toString(),
                selectedOptions: null,
              };
            } else if (ci.menuItem) {
              // Regular menu item
              const optionsTotal = (ci.selectedOptions || []).reduce(
                (sum, group) => sum + group.choices.reduce((s, c) => s + c.priceCents, 0),
                0
              ) / 100;
              return {
                menuItemId: ci.menuItem.id,
                quantity: ci.quantity,
                unitPrice: (parseFloat(ci.menuItem.price) + optionsTotal).toString(),
                selectedOptions: ci.selectedOptions || null,
              };
            }
            return null;
          }).filter(Boolean),
          subtotal: subtotal.toFixed(2),
          promoCode: appliedPromo?.promoCode || null,
          promoDiscount: promoDiscount > 0 ? promoDiscount.toFixed(2) : null,
          tax: taxAmount.toFixed(2),
          total: total.toFixed(2),
        }),
      }).then((res) => res.json());
    },
    onSuccess: (data) => {
      if (data.paymentMethod === 'cash') {
        const successMessage = orderType === 'pickup' 
          ? t('storefront.orderSuccessPickup') || 'Order placed successfully! Pay when you pick up.'
          : t('storefront.orderSuccess') || 'Order placed successfully! Pay cash on delivery.';
        toast({ title: successMessage });
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setPaymentMethod('cash');
        setAppliedPromo(null);
        setPromoCode("");
        setPromoCodeError("");
      } else if (data.paymentMethod === 'paypal') {
        setCurrentOrderId(data.orderId);
        renderPayPalButtons(data.orderId, total);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({ title: t('storefront.orderConfirmed') });
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setPaymentMethod('cash');
        setAppliedPromo(null);
        setPromoCode("");
        setPromoCodeError("");
      }
    },
    onError: () => {
      toast({ title: t('storefront.orderError'), variant: "destructive" });
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/reviews` : `/api/storefront/${restaurant?.slug}/reviews`;
      return await apiRequest(endpoint, "POST", {
        customerName: reviewName,
        rating: reviewRating,
        comment: reviewComment,
      });
    },
    onSuccess: () => {
      toast({ title: "Review submitted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/storefront/reviews", restaurant?.slug] });
      setReviewDialogOpen(false);
      setReviewName("");
      setReviewRating(5);
      setReviewComment("");
    },
    onError: () => {
      toast({ title: "Failed to submit review", variant: "destructive" });
    },
  });

  const submitContactMutation = useMutation({
    mutationFn: async () => {
      const endpoint = slug ? `/api/storefront/${slug}/contact` : `/api/storefront/${restaurant?.slug}/contact`;
      return await apiRequest(endpoint, "POST", {
        customerName: contactName,
        customerEmail: contactEmail,
        customerPhone: contactPhone,
        subject: contactSubject,
        message: contactMessage,
      });
    },
    onSuccess: () => {
      toast({ title: "Message sent successfully!" });
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setContactSubject("");
      setContactMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const renderPayPalButtons = (orderId: string, amount: number) => {
    if (!window.paypal || !paypalReady || !paypalButtonsRef.current || paypalRendered.current) return;

    paypalRendered.current = true;
    paypalButtonsRef.current.innerHTML = '';

    window.paypal.Buttons({
      createOrder: () => orderId,
      onApprove: async (data: any) => {
        try {
          await apiRequest(`/api/storefront/${slug}/paypal-capture`, "POST", { orderId: data.orderID });
          toast({ title: t('storefront.orderConfirmed') });
          setCart([]);
          setCustomerName("");
          setCustomerPhone("");
          setCustomerEmail("");
          setCurrentOrderId(null);
          paypalRendered.current = false;
          setAppliedPromo(null);
          setPromoCode("");
          setPromoCodeError("");
        } catch (error) {
          toast({ title: t('storefront.orderError'), variant: "destructive" });
        }
      },
    }).render(paypalButtonsRef.current);
  };

  useEffect(() => {
    if (currentOrderId && paypalReady && paymentMethod === 'paypal') {
      renderPayPalButtons(currentOrderId, total);
    }
  }, [currentOrderId, paypalReady, paymentMethod]);

  // Auto-set order type when only one option is enabled
  useEffect(() => {
    if (!restaurant?.orderTypes) return;
    
    const orderTypes = restaurant.orderTypes as { pickup: boolean; delivery: boolean };
    const pickupEnabled = orderTypes.pickup ?? true;
    const deliveryEnabled = orderTypes.delivery ?? true;

    // If only pickup is enabled, set to pickup
    if (pickupEnabled && !deliveryEnabled && orderType !== 'pickup') {
      setOrderType('pickup');
    }
    // If only delivery is enabled, set to delivery
    if (!pickupEnabled && deliveryEnabled && orderType !== 'delivery') {
      setOrderType('delivery');
    }
  }, [restaurant?.orderTypes]);

  // Fetch delivery fee when address is complete
  useEffect(() => {
    if (!restaurant?.id || !deliveryCountry || !deliveryCity) {
      setDeliveryFee(0);
      setDeliveryAvailable(true);
      setDeliveryError("");
      return;
    }

    const fetchDeliveryFee = async () => {
      setDeliveryFeeLoading(true);
      setDeliveryError("");
      try {
        const params = new URLSearchParams({
          country: deliveryCountry,
          city: deliveryCity,
          ...(deliveryNeighborhood && { neighborhood: deliveryNeighborhood }),
        });
        
        const response = await fetch(`/api/storefront/delivery-fee/${restaurant.id}?${params}`);
        const data = await response.json();
        
        // Check if response is OK and delivery is available
        if (response.ok && data.deliveryAvailable && data.deliveryFee !== undefined) {
          setDeliveryFee(parseFloat(data.deliveryFee));
          setDeliveryAvailable(true);
          setDeliveryError("");
        } else {
          // Delivery not available to this location
          setDeliveryFee(0);
          setDeliveryAvailable(false);
          setDeliveryError(data.message || t('storefront.deliveryNotAvailable'));
        }
      } catch (error) {
        console.error("Error fetching delivery fee:", error);
        setDeliveryFee(0);
        setDeliveryAvailable(false);
        setDeliveryError(t('storefront.deliveryError'));
      } finally {
        setDeliveryFeeLoading(false);
      }
    };

    fetchDeliveryFee();
  }, [restaurant?.id, deliveryCountry, deliveryCity, deliveryNeighborhood]);

  const openingHours = restaurant?.openingHours as any;
  const enabledPaymentMethods = restaurant?.paymentMethods as { stripe?: boolean; paypal?: boolean; cash?: boolean } || {};

  if (restaurantLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="h-80 w-full" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Restaurant Not Found</h2>
            <p className="text-muted-foreground">
              The restaurant you're looking for doesn't exist or isn't available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Currency formatter using Intl.NumberFormat
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    const currency = restaurant.currency || 'USD';
    const country = restaurant.country || 'United States';
    
    // Map countries to locale codes
    const localeMap: { [key: string]: string } = {
      'United States': 'en-US',
      'Canada': 'en-CA',
      'United Kingdom': 'en-GB',
      'Morocco': 'ar-MA',
      'France': 'fr-FR',
      'Germany': 'de-DE',
      'Spain': 'es-ES',
      'Italy': 'it-IT',
      'UAE': 'ar-AE',
      'Saudi Arabia': 'ar-SA',
      'Egypt': 'ar-EG',
      'India': 'en-IN',
      'China': 'zh-CN',
      'Japan': 'ja-JP',
      'Australia': 'en-AU',
    };
    
    const locale = localeMap[country] || 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(numPrice);
  };

  // Helper function to convert hex to HSL
  const hexToHSL = (hex: string): { h: number; s: number; l: number; hslString: string } => {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
      hslString: `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
    };
  };

  // Calculate relative luminance for WCAG contrast
  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Calculate contrast ratio between two colors
  const getContrastRatio = (lum1: number, lum2: number): number => {
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Get best foreground color (black or white) for WCAG AA compliance (4.5:1)
  const getForegroundFromHex = (hex: string): string => {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const bgLuminance = getLuminance(r, g, b);
    const whiteLuminance = 1; // White has luminance of 1
    const blackLuminance = 0; // Black has luminance of 0
    
    const whiteContrast = getContrastRatio(whiteLuminance, bgLuminance);
    const blackContrast = getContrastRatio(bgLuminance, blackLuminance);
    
    // Return white if it has better contrast, otherwise black
    // Ensure minimum 4.5:1 ratio for WCAG AA compliance
    return whiteContrast >= blackContrast ? '0 0% 100%' : '0 0% 10%';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Inject custom brand colors */}
      {restaurant && (restaurant.primaryColor || restaurant.secondaryColor || restaurant.accentColor) && (() => {
        const primaryHex = restaurant.primaryColor || '#f97316';
        const secondaryHex = restaurant.secondaryColor || '#fb923c';
        const accentHex = restaurant.accentColor || '#fdba74';
        
        const primary = hexToHSL(primaryHex);
        const secondary = hexToHSL(secondaryHex);
        const accent = hexToHSL(accentHex);
        
        return (
          <style>{`
            :root {
              --primary: ${primary.hslString};
              --primary-foreground: ${getForegroundFromHex(primaryHex)};
              --secondary: ${secondary.hslString};
              --secondary-foreground: ${getForegroundFromHex(secondaryHex)};
              --accent: ${accent.hslString};
              --accent-foreground: ${getForegroundFromHex(accentHex)};
              --ring: ${primary.hslString};
            }
          `}</style>
        );
      })()}
      
      {/* Pixel Tracking Scripts */}
      {restaurant && (
        <PixelScripts
          metaPixelId={restaurant.metaPixelId ?? undefined}
          tiktokPixelId={restaurant.tiktokPixelId ?? undefined}
          googleAnalyticsId={restaurant.googleAnalyticsId ?? undefined}
          googleAdsId={restaurant.googleAdsId ?? undefined}
          metaVerificationCode={restaurant.metaVerificationCode ?? undefined}
        />
      )}
      
      {/* Sticky Header with Cart */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logoUrl && (
              <img 
                src={restaurant.logoUrl} 
                alt={restaurant.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
            <span className="font-display font-bold text-lg">{restaurant.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSelector
              enabledLanguages={restaurant?.enabledLanguages || ['en']}
              restaurantId={restaurant?.id}
            />

            <Link href={trackHref}>
              <Button variant="ghost" size="icon" title="Track an order" data-testid="button-track-order">
                <PackageSearch className="h-5 w-5" />
              </Button>
            </Link>

            {sfCustomer ? (
              <Link href={accountHref}>
                <Button variant="ghost" size="sm" data-testid="button-account">
                  <UserRound className="h-4 w-4 mr-1.5" />
                  {sfCustomer.name ? sfCustomer.name.split(" ")[0] : "Account"}
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)} data-testid="button-signin">
                <UserRound className="h-4 w-4 mr-1.5" />
                Sign in
              </Button>
            )}

            <Sheet>
            <SheetTrigger asChild>
              <Button variant="default" className="relative" data-testid="button-cart">
                <ShoppingCart className="h-5 w-5 mr-2" />
                {t('storefront.cart')}
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full" data-testid="cart-count">
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg flex flex-col">
              <SheetHeader>
                <SheetTitle>{t('storefront.cart')} ({cartItemCount} {t('storefront.items')})</SheetTitle>
              </SheetHeader>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('storefront.emptyCart')}</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 my-4">
                  <div className="space-y-4 px-1">
                      {cart.map((item, index) => {
                        if (item.bundle) {
                          // Render bundle item
                          const bundle = item.bundle;
                          return (
                            <div key={`bundle-${bundle.id}-${index}`} className="flex gap-4 p-3 rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10">
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="font-medium">{bundle.name}</h4>
                                  <Badge variant="default" className="ml-2">Bundle</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  {bundle.items.map((bundleItem, idx) => (
                                    <div key={idx}>• {bundleItem}</div>
                                  ))}
                                </div>
                                <p className="text-sm text-primary font-medium">
                                  {formatPrice(Number(bundle.bundlePrice).toFixed(2))}
                                  <span className="text-xs text-muted-foreground ml-1 line-through">
                                    {formatPrice(Number(bundle.regularPrice).toFixed(2))}
                                  </span>
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(index, -1)}
                                    data-testid={`button-decrease-bundle-${bundle.id}-${index}`}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center" data-testid={`quantity-bundle-${bundle.id}-${index}`}>{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(index, 1)}
                                    data-testid={`button-increase-bundle-${bundle.id}-${index}`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 ml-auto"
                                    onClick={() => removeFromCart(index)}
                                    data-testid={`button-remove-bundle-${bundle.id}-${index}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        } else if (item.menuItem) {
                          // Render regular menu item
                          const translatedCartItem = getTranslatedMenuItem(item.menuItem, t);
                          const optionsTotal = (item.selectedOptions || []).reduce(
                            (sum, group) => sum + group.choices.reduce((s, c) => s + c.priceCents, 0),
                            0
                          ) / 100;
                          const itemTotal = parseFloat(item.menuItem.price) + optionsTotal;
                          
                          return (
                          <div key={`${item.menuItem.id}-${index}`} className="flex gap-4 p-3 rounded-lg border">
                            {item.menuItem.imageUrl && (
                              <img
                                src={item.menuItem.imageUrl}
                                alt={translatedCartItem.name}
                                className="h-20 w-20 object-cover rounded-md"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium mb-1">{translatedCartItem.name}</h4>
                              {item.selectedOptions && item.selectedOptions.length > 0 && (
                                <div className="text-xs text-muted-foreground mb-1 space-y-1">
                                  {item.selectedOptions.map((optionGroup, idx) => (
                                    <div key={idx}>
                                      <span className="font-medium">{optionGroup.optionGroupLabel}:</span>{' '}
                                      {optionGroup.choices.map(c => c.label).join(', ')}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="text-sm text-primary font-medium">
                                {formatPrice(itemTotal.toFixed(2))}
                                {optionsTotal > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (base: {formatPrice(item.menuItem.price)} + {formatPrice(optionsTotal.toFixed(2))})
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(index, -1)}
                                  data-testid={`button-decrease-${item.menuItem.id}-${index}`}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center" data-testid={`quantity-${item.menuItem.id}-${index}`}>{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(index, 1)}
                                  data-testid={`button-increase-${item.menuItem.id}-${index}`}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 ml-auto"
                                  onClick={() => removeFromCart(index)}
                                  data-testid={`button-remove-${item.menuItem.id}-${index}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <div className="space-y-3 border-t pt-4">
                      <Input
                      placeholder={`${t('storefront.name')} *`}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      data-testid="input-customer-name"
                    />
                    <Input
                      placeholder={`${t('storefront.phone')} *`}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      data-testid="input-customer-phone"
                    />
                    <Input
                      type="email"
                      placeholder={`${t('storefront.email')} (optional)`}
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      data-testid="input-customer-email"
                    />
                    
                    {(() => {
                      const orderTypes = restaurant?.orderTypes as { pickup: boolean; delivery: boolean } | null;
                      const pickupEnabled = orderTypes?.pickup ?? true;
                      const deliveryEnabled = orderTypes?.delivery ?? true;
                      const bothEnabled = pickupEnabled && deliveryEnabled;

                      // Only show toggle if both types are enabled
                      if (!bothEnabled) return null;

                      return (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Order Type</Label>
                          <RadioGroup value={orderType} onValueChange={(value: 'pickup' | 'delivery') => setOrderType(value)} data-testid="order-type-toggle">
                            {deliveryEnabled && (
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="delivery" id="delivery" data-testid="radio-delivery" />
                                <Label htmlFor="delivery" className="font-normal cursor-pointer">Delivery</Label>
                              </div>
                            )}
                            {pickupEnabled && (
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pickup" id="pickup" data-testid="radio-pickup" />
                                <Label htmlFor="pickup" className="font-normal cursor-pointer">Pickup</Label>
                              </div>
                            )}
                          </RadioGroup>
                        </div>
                      );
                    })()}

                    {orderType === 'pickup' && restaurant?.address && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-1">Pickup Location:</p>
                        <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                      </div>
                    )}

                    {orderType === 'delivery' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="country-select" className="text-sm">Country *</Label>
                          <Select
                            value={deliveryCountry}
                            onValueChange={(value) => {
                              setDeliveryCountry(value);
                              setDeliveryCity("");
                            }}
                          >
                            <SelectTrigger id="country-select" data-testid="select-delivery-country">
                              <SelectValue placeholder={countries.length > 0 ? "Select country" : "No delivery zones configured"} />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.length > 0 ? (
                                countries.map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-countries" disabled>
                                  No delivery available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="city-select" className="text-sm">City *</Label>
                          <Select
                            value={deliveryCity}
                            onValueChange={setDeliveryCity}
                            disabled={!deliveryCountry}
                          >
                            <SelectTrigger id="city-select" data-testid="select-delivery-city">
                              <SelectValue placeholder={deliveryCountry ? (cities.length > 0 ? "Select city" : "No cities available") : "Select country first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {cities.length > 0 ? (
                                cities.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-cities" disabled>
                                  No cities available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <Input
                          placeholder="Home Address *"
                          value={homeAddress}
                          onChange={(e) => setHomeAddress(e.target.value)}
                          data-testid="input-home-address"
                        />
                        {sfCustomer && homeAddress.trim() && (
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Checkbox
                              checked={saveAddress}
                              onCheckedChange={(v) => setSaveAddress(v === true)}
                              data-testid="checkbox-save-address"
                            />
                            Save this address to my account
                          </label>
                        )}
                    {deliveryFeeLoading && (
                      <p className="text-xs text-muted-foreground">
                        Calculating delivery fee...
                      </p>
                    )}
                    {deliveryError && !deliveryFeeLoading && (
                      <p className="text-xs text-destructive" data-testid="delivery-error">
                        {deliveryError}
                      </p>
                    )}
                  </>
                )}
                </div>

                {/* Promo Code Section */}
                <div className="space-y-2 border-t pt-4">
                  {!appliedPromo ? (
                    <div className="space-y-2">
                      <Label className="text-sm">Promo Code</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter promo code"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value);
                            setPromoCodeError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleApplyPromo();
                            }
                          }}
                          disabled={applyingPromo || cart.length === 0}
                          data-testid="input-promo-code"
                          className="flex-1"
                        />
                        <Button
                          onClick={handleApplyPromo}
                          disabled={applyingPromo || !promoCode.trim() || cart.length === 0}
                          data-testid="button-apply-promo"
                          size="default"
                        >
                          {applyingPromo ? "Applying..." : "Apply"}
                        </Button>
                      </div>
                      {promoCodeError && (
                        <p className="text-xs text-destructive" data-testid="promo-error">
                          {promoCodeError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          {appliedPromo.name || 'Promo Applied'}
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-300">
                          Code: {appliedPromo.promoCode}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePromo}
                        data-testid="button-remove-promo"
                        className="h-8 text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t pt-4">
                    <div className="space-y-2 w-full">
                      <div className="flex justify-between text-sm">
                        <span>{t('storefront.subtotal')}</span>
                        <span data-testid="subtotal">
                          {formatPrice(subtotal)}
                        </span>
                      </div>
                      {promoDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Discount ({appliedPromo?.promoCode})</span>
                          <span data-testid="promo-discount">
                            -{formatPrice(promoDiscount)}
                          </span>
                        </div>
                      )}
                      {deliveryFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>{t('storefront.deliveryFee')}</span>
                          <span data-testid="delivery-fee">
                            {formatPrice(deliveryFee)}
                          </span>
                        </div>
                      )}
                      {!taxIncludedInPrice && taxAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>{taxLabel} {taxRate > 0 && `(${(taxRate * 100).toFixed(1)}%)`}</span>
                          <span data-testid="tax">
                            {formatPrice(taxAmount)}
                          </span>
                        </div>
                      )}
                      {taxIncludedInPrice && taxAmount > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{taxLabel} (included in prices)</span>
                          <span data-testid="tax-included">
                            {formatPrice(taxAmount)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>{t('storefront.total')}</span>
                        <span data-testid="total">
                          {formatPrice(total)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full space-y-3">
                      <Label className="text-sm font-medium">{t('storefront.paymentMethod')}</Label>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {enabledPaymentMethods?.stripe && (
                          <Button
                            variant="outline"
                            className="h-16 bg-black hover:bg-black/90 text-white border-black flex flex-col items-center justify-center gap-1"
                            disabled={!customerName || !customerPhone || (orderType === 'delivery' && (!deliveryCountry || !deliveryCity || !homeAddress || !deliveryAvailable)) || checkoutMutation.isPending}
                            onClick={() => {
                              setPaymentMethod('apple');
                              setCurrentOrderId(null);
                              paypalRendered.current = false;
                              checkoutMutation.mutate();
                            }}
                            data-testid="button-apple-pay"
                          >
                            <SiApple className="h-6 w-6" />
                            <span className="text-xs font-medium">{t('storefront.applePay')}</span>
                          </Button>
                        )}
                        
                        {enabledPaymentMethods?.stripe && (
                          <Button
                            variant="outline"
                            className="h-16 bg-white hover:bg-gray-50 text-gray-800 border-gray-300 flex flex-col items-center justify-center gap-1"
                            disabled={!customerName || !customerPhone || (orderType === 'delivery' && (!deliveryCountry || !deliveryCity || !homeAddress || !deliveryAvailable)) || checkoutMutation.isPending}
                            onClick={() => {
                              setPaymentMethod('google');
                              setCurrentOrderId(null);
                              paypalRendered.current = false;
                              checkoutMutation.mutate();
                            }}
                            data-testid="button-google-pay"
                          >
                            <SiGoogle className="h-5 w-5" />
                            <span className="text-xs font-medium">{t('storefront.googlePay')}</span>
                          </Button>
                        )}
                      </div>
                      
                      {enabledPaymentMethods?.stripe && (
                        <Button
                          variant="outline"
                          className="w-full h-16 bg-black hover:bg-black/90 text-white border-black flex items-center justify-center gap-2"
                          disabled={!customerName || !customerPhone || (orderType === 'delivery' && (!deliveryCountry || !deliveryCity || !homeAddress || !deliveryAvailable)) || checkoutMutation.isPending}
                          onClick={() => {
                            setPaymentMethod('stripe');
                            setCurrentOrderId(null);
                            paypalRendered.current = false;
                            checkoutMutation.mutate();
                          }}
                          data-testid="button-credit-card"
                        >
                          <CreditCard className="h-5 w-5" />
                          <span className="font-medium">{t('storefront.creditDebitCard')}</span>
                        </Button>
                      )}
                      
                      {enabledPaymentMethods?.paypal && (
                        <Button
                          variant="outline"
                          className="w-full h-16 bg-[#0070BA] hover:bg-[#005EA6] text-white border-[#0070BA] flex items-center justify-center gap-2"
                          disabled={!customerName || !customerPhone || (orderType === 'delivery' && (!deliveryCountry || !deliveryCity || !homeAddress || !deliveryAvailable)) || checkoutMutation.isPending}
                          onClick={() => {
                            setPaymentMethod('paypal');
                            setCurrentOrderId(null);
                            paypalRendered.current = false;
                            checkoutMutation.mutate();
                          }}
                          data-testid="button-paypal"
                        >
                          <SiPaypal className="h-5 w-5" />
                          <span className="font-medium">PayPal</span>
                        </Button>
                      )}
                      
                      {currentOrderId && paymentMethod === 'paypal' && (
                        <div className="w-full">
                          <div ref={paypalButtonsRef} data-testid="paypal-buttons" />
                        </div>
                      )}
                      
                      {enabledPaymentMethods?.cash && (
                        <Button
                          variant="outline"
                          className="w-full h-16 flex items-center justify-center gap-2"
                          disabled={!customerName || !customerPhone || (orderType === 'delivery' && (!deliveryCountry || !deliveryCity || !homeAddress || !deliveryAvailable)) || checkoutMutation.isPending}
                          onClick={() => {
                            setPaymentMethod('cash');
                            setCurrentOrderId(null);
                            paypalRendered.current = false;
                            checkoutMutation.mutate();
                          }}
                          data-testid="button-cash-on-delivery"
                        >
                          <Banknote className="h-5 w-5" />
                          <span className="font-medium">{t('storefront.cash')}</span>
                        </Button>
                      )}

                      {/* Place Order fallback when the merchant hasn't configured any payment
                          method yet — applies to both pickup and delivery, otherwise a
                          delivery checkout with no Stripe/PayPal/Cash enabled is a dead end:
                          the customer fills in their address and has no way to submit. */}
                      {!enabledPaymentMethods?.stripe && !enabledPaymentMethods?.paypal && !enabledPaymentMethods?.cash && (orderType === 'pickup' || orderType === 'delivery') && (
                        <div className="space-y-3">
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="text-sm text-muted-foreground">
                              {orderType === 'pickup'
                                ? (t('storefront.payOnPickup') || 'You will pay when you pick up your order')
                                : (t('storefront.payOnDelivery') || 'You will pay when your order is delivered')}
                            </p>
                          </div>
                          <Button
                            variant="default"
                            className="w-full h-16 flex items-center justify-center gap-2"
                            disabled={!customerName || !customerPhone || (orderType === 'delivery' && (!deliveryCountry || !deliveryCity || !homeAddress || !deliveryAvailable)) || checkoutMutation.isPending}
                            onClick={() => {
                              setPaymentMethod('cash');
                              setCurrentOrderId(null);
                              paypalRendered.current = false;
                              checkoutMutation.mutate();
                            }}
                            data-testid="button-place-order"
                          >
                            <ShoppingCart className="h-5 w-5" />
                            <span className="font-medium">{t('storefront.placeOrder') || 'Place Order'}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </div>

      {/* Hero Section with Cover Photo */}
      <div className="relative">
        {restaurant.coverImageUrl ? (
          <div 
            className="h-48 md:h-64 lg:h-80 bg-cover bg-center"
            style={{ backgroundImage: `url(${restaurant.coverImageUrl})` }}
          />
        ) : (
          <div className="h-48 md:h-64 lg:h-80 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        
        {/* Restaurant Logo & Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="-mt-16 md:-mt-20 mb-6">
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center gap-2">
                {/* Star rating above logo */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1 bg-background/95 backdrop-blur px-3 py-1.5 rounded-full shadow-lg" data-testid="rating-above-logo">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="text-sm font-semibold">
                      {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">({reviews.length})</span>
                  </div>
                )}
                
                {/* Logo */}
                {restaurant.logoUrl ? (
                  <img 
                    src={restaurant.logoUrl} 
                    alt={restaurant.name}
                    className="h-24 w-24 md:h-32 md:w-32 rounded-full object-cover bg-background border-4 border-background shadow-xl"
                  />
                ) : (
                  <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-background border-4 border-background shadow-xl flex items-center justify-center">
                    <Store className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
                  </div>
                )}
                
                {/* Star rating below logo */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-0.5" data-testid="rating-below-logo">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pb-2 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold">{restaurant.name}</h1>
                  <Badge 
                    variant={isRestaurantOpen(restaurant.openingHours as OpeningHours) ? "default" : "secondary"}
                    className={`text-sm px-3 py-1 ${isRestaurantOpen(restaurant.openingHours as OpeningHours) ? 'bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-700' : 'bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-700'} text-white`}
                    data-testid="badge-open-status"
                  >
                    {isRestaurantOpen(restaurant.openingHours as OpeningHours) ? t('storefront.open') : t('storefront.closed')}
                  </Badge>
                </div>
                {restaurant.description && (
                  <p className="text-muted-foreground mt-1 hidden sm:block">{restaurant.description}</p>
                )}
                {todayHoursText && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Clock className="h-4 w-4" />
                    <span data-testid="text-today-hours">{todayHoursText}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories - Horizontal Pills */}
      <div className="bg-background border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="px-4 py-2 text-sm cursor-pointer whitespace-nowrap hover-elevate"
                onClick={() => setSelectedCategory(null)}
                data-testid="category-all"
              >
                All
              </Badge>
              {categories?.map((category) => (
                <Badge
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  className="px-4 py-2 text-sm cursor-pointer whitespace-nowrap hover-elevate"
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`category-${category.name.toLowerCase()}`}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Marketing: Countdown Timer */}
        {(restaurant?.marketingSettings as any)?.enableCountdownTimer && (
          <div className="mb-6 flex justify-center">
            <CountdownTimer 
              minutes={(restaurant.marketingSettings as any).countdownMinutes || 30}
              message={(restaurant.marketingSettings as any).countdownMessage || "Offer expires in"}
            />
          </div>
        )}

        {/* Marketing: Bundles & Combos Section */}
        <BundlesSection 
          bundles={bundles} 
          formatPrice={formatPrice}
          onAddToCart={(bundle) => {
            const existingBundle = cart.find(item => item.bundle?.id === bundle.id);
            if (existingBundle) {
              setCart(cart.map(item =>
                item.bundle?.id === bundle.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ));
            } else {
              setCart([...cart, {
                bundle: {
                  id: bundle.id,
                  name: bundle.name,
                  items: bundle.items,
                  regularPrice: bundle.regularPrice,
                  bundlePrice: bundle.bundlePrice,
                },
                quantity: 1,
              }]);
            }
            toast({ title: "Added to cart", description: `${bundle.name} bundle added!` });
            
            // Track add to cart event for pixels
            if (restaurant) {
              trackAddToCart({
                id: bundle.id,
                name: bundle.name,
                price: bundle.bundlePrice,
                currency: restaurant.currency || 'USD',
                quantity: 1,
              }, pixelConfig);
            }
          }} 
        />

        {/* Marketing: Active Promos Banner */}
        <ActivePromosBanner promos={activePromos} />

        {itemsByCategory ? (
          // Showing all items grouped by category
          <div className="space-y-12">
            {itemsByCategory.map((group) => (
              <div key={group.category.id} className="space-y-6">
                <div className="border-b pb-2">
                  <h2 className="text-2xl font-bold" data-testid={`category-section-${group.category.name.toLowerCase()}`}>
                    {group.category.name}
                  </h2>
                  {group.category.description && (
                    <p className="text-sm text-muted-foreground mt-1">{group.category.description}</p>
                  )}
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((item) => {
                    const translatedItem = getTranslatedMenuItem(item, t);
                    return (<div key={item.id} className="space-y-4">
                      <Card 
                        className="overflow-hidden hover-elevate transition-all cursor-pointer group" 
                        onClick={() => item.isAvailable && addToCart(item)}
                        data-testid={`menu-item-${item.id}`}
                      >
                        <div className="relative aspect-square">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={translatedItem.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Store className="h-16 w-16 text-muted-foreground/50" />
                            </div>
                          )}
                          
                          {/* Boosted Item Badge */}
                          <BoostedItemsBadge isBoosted={isItemBoosted(item.name)} />
                          
                          {/* Menu Item Badges/Tags */}
                          {item.tags && item.tags.length > 0 && (
                            <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                              {item.tags.map((tag, idx) => {
                                const tagColors: Record<string, string> = {
                                  'Bestseller': 'bg-[hsl(38,92%,50%)] text-white border-transparent',
                                  'New': 'bg-[hsl(142,76%,36%)] text-white border-transparent',
                                  "Chef's Special": 'bg-[hsl(221,83%,53%)] text-white border-transparent',
                                  'Popular': 'bg-[hsl(346,77%,50%)] text-white border-transparent',
                                  'Spicy': 'bg-[hsl(0,84%,60%)] text-white border-transparent',
                                  'Vegetarian': 'bg-[hsl(140,61%,45%)] text-white border-transparent',
                                  'Vegan': 'bg-[hsl(120,61%,50%)] text-white border-transparent',
                                  'Gluten-Free': 'bg-[hsl(45,93%,47%)] text-white border-transparent',
                                  'Limited Time': 'bg-[hsl(280,61%,50%)] text-white border-transparent',
                                };
                                const badgeColor = tagColors[tag] || 'bg-muted text-foreground border-border';
                                return (
                                  <Badge
                                    key={idx}
                                    className={`shadow-md text-xs font-semibold ${badgeColor}`}
                                    data-testid={`badge-tag-${tag.toLowerCase().replace(/\s+/g, '-')}-${item.id}`}
                                  >
                                    {tag}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          
                          {!item.isAvailable ? (
                            <>
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
                              </div>
                              <div className="absolute top-2 right-2">
                                <Badge 
                                  variant="destructive" 
                                  className="shadow-md"
                                  data-testid={`badge-out-of-stock-${item.id}`}
                                >
                                  Out of Stock
                                </Badge>
                              </div>
                            </>
                          ) : item.stockCount !== null && item.stockCount !== undefined && item.stockCount < 10 ? (
                            <div className="absolute top-2 right-2">
                              <Badge 
                                className="shadow-md bg-[hsl(38,92%,50%)] text-white border-transparent hover:bg-[hsl(38,92%,45%)]"
                                data-testid={`badge-low-stock-${item.id}`}
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Low Stock
                              </Badge>
                            </div>
                          ) : null}
                        </div>
                        
                        <CardContent className="p-4">
                          <h3 className="font-bold text-lg mb-1 line-clamp-1">{translatedItem.name}</h3>
                          {translatedItem.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{translatedItem.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">
                              {formatPrice(item.price)}
                            </span>
                            {item.isAvailable && (
                              <Button 
                                size="icon" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(item);
                                }}
                                data-testid={`button-add-to-cart-${item.id}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {/* Marketing Badges: Scarcity & Social Proof */}
                          <div className="mt-3 space-y-2">
                            {/* Scarcity Notice Badge */}
                            {(item.marketingTactics as any)?.enableScarcityNotice && 
                             item.stockCount !== null && 
                             item.stockCount !== undefined && 
                             item.stockCount <= ((item.marketingTactics as any)?.scarcityThreshold || 5) && (
                              <Badge 
                                className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                                data-testid={`badge-scarcity-${item.id}`}
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {(item.marketingTactics as any)?.scarcityMessage?.replace('X', item.stockCount.toString()) || 
                                 `Only ${item.stockCount} left in stock!`}
                              </Badge>
                            )}

                            {/* Social Proof Badge */}
                            {(item.marketingTactics as any)?.enableSocialProof && (
                              <Badge 
                                className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                data-testid={`badge-social-proof-${item.id}`}
                              >
                                <Users className="h-3 w-3 mr-1" />
                                {(item.marketingTactics as any)?.socialProofMessage?.replace('X', ((item.marketingTactics as any)?.socialProofCount || 0).toString()) || 
                                 `${(item.marketingTactics as any)?.socialProofCount || 0} people ordered this`}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Marketing: Frequently Bought Together */}
                      {(restaurant?.marketingSettings as any)?.enableUpsells && item.upsellItemIds && item.upsellItemIds.length > 0 && (
                        <FrequentlyBoughtTogether
                          currentItem={item}
                          relatedItems={items?.filter(i => item.upsellItemIds?.includes(i.id) && i.isAvailable) || []}
                          onAddToCart={addToCart}
                          message={(restaurant.marketingSettings as any).upsellMessage}
                        />
                      )}
                    </div>
                  );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems && filteredItems.length > 0 ? (
          // Showing single category
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const translatedItem = getTranslatedMenuItem(item, t);
              return (<div key={item.id} className="space-y-4">
                <Card 
                  className="overflow-hidden hover-elevate transition-all cursor-pointer group" 
                  onClick={() => item.isAvailable && addToCart(item)}
                  data-testid={`menu-item-${item.id}`}
                >
                  <div className="relative aspect-square">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={translatedItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Store className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                    )}
                    
                    {/* Boosted Item Badge */}
                    <BoostedItemsBadge isBoosted={isItemBoosted(item.name)} />
                    
                    {/* Menu Item Badges/Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                        {item.tags.map((tag, idx) => {
                          const tagColors: Record<string, string> = {
                            'Bestseller': 'bg-[hsl(38,92%,50%)] text-white border-transparent',
                            'New': 'bg-[hsl(142,76%,36%)] text-white border-transparent',
                            "Chef's Special": 'bg-[hsl(221,83%,53%)] text-white border-transparent',
                            'Popular': 'bg-[hsl(346,77%,50%)] text-white border-transparent',
                            'Spicy': 'bg-[hsl(0,84%,60%)] text-white border-transparent',
                            'Vegetarian': 'bg-[hsl(140,61%,45%)] text-white border-transparent',
                            'Vegan': 'bg-[hsl(120,61%,50%)] text-white border-transparent',
                            'Gluten-Free': 'bg-[hsl(45,93%,47%)] text-white border-transparent',
                            'Limited Time': 'bg-[hsl(280,61%,50%)] text-white border-transparent',
                          };
                          const badgeColor = tagColors[tag] || 'bg-muted text-foreground border-border';
                          return (
                            <Badge
                              key={idx}
                              className={`shadow-md text-xs font-semibold ${badgeColor}`}
                              data-testid={`badge-tag-${tag.toLowerCase().replace(/\s+/g, '-')}-${item.id}`}
                            >
                              {tag}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    
                    {!item.isAvailable ? (
                      <>
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge 
                            variant="destructive" 
                            className="shadow-md"
                            data-testid={`badge-out-of-stock-${item.id}`}
                          >
                            Out of Stock
                          </Badge>
                        </div>
                      </>
                    ) : item.stockCount !== null && item.stockCount !== undefined && item.stockCount < 10 ? (
                      <div className="absolute top-2 right-2">
                        <Badge 
                          className="shadow-md bg-[hsl(38,92%,50%)] text-white border-transparent hover:bg-[hsl(38,92%,45%)]"
                          data-testid={`badge-low-stock-${item.id}`}
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Low Stock
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-1 line-clamp-1">{translatedItem.name}</h3>
                    {translatedItem.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{translatedItem.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(item.price)}
                      </span>
                      {item.isAvailable && (
                        <Button 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          data-testid={`button-add-to-cart-${item.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Marketing Badges: Scarcity & Social Proof */}
                    <div className="mt-3 space-y-2">
                      {/* Scarcity Notice Badge */}
                      {(item.marketingTactics as any)?.enableScarcityNotice && 
                       item.stockCount !== null && 
                       item.stockCount !== undefined && 
                       item.stockCount <= ((item.marketingTactics as any)?.scarcityThreshold || 5) && (
                        <Badge 
                          className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                          data-testid={`badge-scarcity-${item.id}`}
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {(item.marketingTactics as any)?.scarcityMessage?.replace('X', item.stockCount.toString()) || 
                           `Only ${item.stockCount} left in stock!`}
                        </Badge>
                      )}

                      {/* Social Proof Badge */}
                      {(item.marketingTactics as any)?.enableSocialProof && (
                        <Badge 
                          className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          data-testid={`badge-social-proof-${item.id}`}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {(item.marketingTactics as any)?.socialProofMessage?.replace('X', ((item.marketingTactics as any)?.socialProofCount || 0).toString()) || 
                           `${(item.marketingTactics as any)?.socialProofCount || 0} people ordered this`}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Marketing: Frequently Bought Together */}
                {(restaurant?.marketingSettings as any)?.enableUpsells && item.upsellItemIds && item.upsellItemIds.length > 0 && (
                  <FrequentlyBoughtTogether
                    currentItem={item}
                    relatedItems={items?.filter(i => item.upsellItemIds?.includes(i.id) && i.isAvailable) || []}
                    onAddToCart={addToCart}
                    message={(restaurant.marketingSettings as any).upsellMessage}
                  />
                )}
              </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No menu items available</p>
          </div>
        )}
      </div>

      {/* Marketing: Live Purchase Notifications */}
      <LivePurchaseNotifications 
        enabled={(restaurant?.marketingSettings as any)?.enableLiveNotifications || false}
        restaurantId={restaurant?.id}
      />

      {/* Marketing: Referral Program */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReferralCTA referralData={mockReferral} enabled={true} />
      </div>

      {/* Customer Reviews Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-12 border-t">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Customer Reviews</h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold">
                  {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} out of 5
                </span>
                <span className="text-muted-foreground">({reviews.length} reviews)</span>
              </div>
            )}
          </div>
          <Button 
            onClick={() => setReviewDialogOpen(true)} 
            className="gap-2"
            data-testid="button-write-review"
          >
            <Star className="h-4 w-4" />
            Write a Review
          </Button>
        </div>

        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <Card key={review.id} data-testid={`review-${review.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">{review.customerName}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(review.createdAt!).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contact Us Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-2 text-center">Contact Us</h2>
          <p className="text-muted-foreground mb-8 text-center">
            Have a question or feedback? We'd love to hear from you.
          </p>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name *</Label>
                    <Input
                      id="contact-name"
                      placeholder="Your name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="your@email.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      data-testid="input-contact-email"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Phone</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      placeholder="Your phone number"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      data-testid="input-contact-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-subject">Subject</Label>
                    <Input
                      id="contact-subject"
                      placeholder="What is this about?"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      data-testid="input-contact-subject"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message *</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Your message..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={5}
                    data-testid="input-contact-message"
                  />
                </div>

                <Button
                  onClick={() => submitContactMutation.mutate()}
                  disabled={!contactName || !contactMessage || submitContactMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-submit-contact"
                >
                  {submitContactMutation.isPending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Opening Hours - Footer */}
      {openingHours && (
        <div className="border-t bg-muted/30 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5" />
              Opening Hours
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(openingHours).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex justify-between items-center p-3 bg-background rounded-lg">
                  <span className="capitalize font-medium">{day}</span>
                  <span className="text-muted-foreground">
                    {hours.closed ? "Closed" : `${hours.open} - ${hours.close}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Write a Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-name">Your Name *</Label>
              <Input
                id="review-name"
                placeholder="Enter your name"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                data-testid="input-review-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Rating *</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setReviewRating(rating)}
                    className="transition-transform hover:scale-110"
                    data-testid={`button-rating-${rating}`}
                  >
                    <Star
                      className={`h-8 w-8 cursor-pointer ${
                        rating <= reviewRating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-comment">Comment</Label>
              <Textarea
                id="review-comment"
                placeholder="Tell us about your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                data-testid="input-review-comment"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setReviewDialogOpen(false)}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitReviewMutation.mutate()}
              disabled={!reviewName || submitReviewMutation.isPending}
              data-testid="button-submit-review"
            >
              {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Options Modal */}
      <Dialog open={itemModalOpen} onOpenChange={(open) => {
        setItemModalOpen(open);
        if (!open) {
          // Clear marketing suggestions when modal closes
          setSelectedMarketingSuggestions([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6">
              {selectedItem.description && (
                <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
              )}
              
              <div className="text-lg font-bold text-primary">
                {formatPrice(selectedItem.price)}
              </div>
              
              {((selectedItem.options as any) || []).map((optionGroup: any, optionIndex: number) => (
                <div key={optionIndex} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{optionGroup.label}</h3>
                    {optionGroup.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                  
                  {optionGroup.type === 'single' ? (
                    <RadioGroup
                      value={
                        selectedItemOptions.find(o => o.optionGroupLabel === optionGroup.label)?.choices[0]?.label || ""
                      }
                      onValueChange={(value) => {
                        const choice = optionGroup.choices.find((c: any) => c.label === value);
                        if (choice) {
                          setSelectedItemOptions(prev => [
                            ...prev.filter(o => o.optionGroupLabel !== optionGroup.label),
                            {
                              optionGroupLabel: optionGroup.label,
                              choices: [choice]
                            }
                          ]);
                        }
                      }}
                    >
                      {optionGroup.choices.map((choice: any, choiceIndex: number) => (
                        <div key={choiceIndex} className="flex items-center space-x-2 border rounded-lg p-3 hover-elevate">
                          <RadioGroupItem value={choice.label} id={`option-${optionIndex}-${choiceIndex}`} />
                          <label 
                            htmlFor={`option-${optionIndex}-${choiceIndex}`} 
                            className="flex-1 cursor-pointer flex items-center justify-between"
                          >
                            <span>{choice.label}</span>
                            {choice.priceCents > 0 && (
                              <span className="text-sm text-muted-foreground">
                                +{formatPrice((choice.priceCents / 100).toFixed(2))}
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {optionGroup.choices.map((choice: any, choiceIndex: number) => {
                        const selectedGroup = selectedItemOptions.find(o => o.optionGroupLabel === optionGroup.label);
                        const isSelected = selectedGroup?.choices.some(c => c.label === choice.label);
                        
                        return (
                          <div key={choiceIndex} className="flex items-center space-x-2 border rounded-lg p-3 hover-elevate">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedItemOptions(prev => {
                                    const existing = prev.find(o => o.optionGroupLabel === optionGroup.label);
                                    if (existing) {
                                      return prev.map(o => 
                                        o.optionGroupLabel === optionGroup.label
                                          ? { ...o, choices: [...o.choices, choice] }
                                          : o
                                      );
                                    } else {
                                      return [...prev, { optionGroupLabel: optionGroup.label, choices: [choice] }];
                                    }
                                  });
                                } else {
                                  setSelectedItemOptions(prev => 
                                    prev.map(o => 
                                      o.optionGroupLabel === optionGroup.label
                                        ? { ...o, choices: o.choices.filter(c => c.label !== choice.label) }
                                        : o
                                    ).filter(o => o.choices.length > 0)
                                  );
                                }
                              }}
                              id={`option-${optionIndex}-${choiceIndex}`}
                            />
                            <label 
                              htmlFor={`option-${optionIndex}-${choiceIndex}`} 
                              className="flex-1 cursor-pointer flex items-center justify-between"
                            >
                              <span>{choice.label}</span>
                              {choice.priceCents > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  +{formatPrice((choice.priceCents / 100).toFixed(2))}
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Marketing Suggestions - Frequently Bought Together */}
          {selectedItem && (() => {
            const upsellIds = (selectedItem.upsellItemIds as string[]) || [];
            const crossSellIds = (selectedItem.crossSellItemIds as string[]) || [];
            const downsellIds = (selectedItem.downsellItemIds as string[]) || [];
            
            let suggestedItemIds: string[] = [];
            let suggestionType = '';
            
            if (crossSellIds.length > 0) {
              suggestedItemIds = crossSellIds;
              suggestionType = 'Frequently Bought Together';
            } else if (upsellIds.length > 0) {
              suggestedItemIds = upsellIds;
              suggestionType = 'You Might Also Like';
            } else if (downsellIds.length > 0) {
              suggestedItemIds = downsellIds;
              suggestionType = 'More Options';
            }
            
            const suggestedItems = menuItems.filter((item: MenuItem) => 
              suggestedItemIds.includes(item.id)
            );
            
            if (suggestedItems.length === 0) return null;
            
            return (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {suggestionType}
                  </h3>
                  <div className="space-y-2">
                    {suggestedItems.map((item: MenuItem) => (
                      <div 
                        key={item.id} 
                        className="flex items-start gap-3 p-3 border rounded-lg hover-elevate"
                      >
                        <Checkbox
                          id={`suggestion-${item.id}`}
                          checked={selectedMarketingSuggestions.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMarketingSuggestions(prev => [...prev, item.id]);
                            } else {
                              setSelectedMarketingSuggestions(prev => 
                                prev.filter(id => id !== item.id)
                              );
                            }
                          }}
                          data-testid={`checkbox-suggestion-${item.id}`}
                        />
                        <label 
                          htmlFor={`suggestion-${item.id}`}
                          className="flex-1 cursor-pointer flex items-start gap-3"
                        >
                          {item.imageUrl && (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {item.description}
                              </div>
                            )}
                            <div className="text-sm font-semibold text-primary mt-1">
                              {formatPrice(item.price)}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addToCartWithOptions}
              disabled={
                selectedItem && ((selectedItem.options as any) || []).some((optionGroup: any) => {
                  if (!optionGroup.required) return false;
                  const normalizedLabel = optionGroup.label?.trim().toLowerCase();
                  return !selectedItemOptions.some(o => 
                    o.optionGroupLabel?.trim().toLowerCase() === normalizedLabel
                  );
                })
              }
              data-testid="button-add-to-cart-with-options"
            >
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upsell Modal */}
      <Dialog open={upsellModalOpen} onOpenChange={setUpsellModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Perfect Pairing!</DialogTitle>
          </DialogHeader>
          
          {selectedItem && upsellSuggestedItem && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Great choice! Customers who ordered <span className="font-semibold text-foreground">{selectedItem.name}</span> also loved:
              </p>
              
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {upsellSuggestedItem.imageUrl && (
                      <img 
                        src={upsellSuggestedItem.imageUrl} 
                        alt={upsellSuggestedItem.name}
                        className="w-20 h-20 rounded-md object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{upsellSuggestedItem.name}</h4>
                      {upsellSuggestedItem.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {upsellSuggestedItem.description}
                        </p>
                      )}
                      <div className="text-primary font-bold mt-2">
                        {formatPrice(upsellSuggestedItem.price)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span>Recommended by other customers</span>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button 
              variant="outline" 
              onClick={handleUpsellDecline}
              className="w-full sm:w-auto"
              data-testid="button-decline-upsell"
            >
              No, thanks
            </Button>
            <Button
              onClick={handleUpsellAccept}
              className="w-full sm:w-auto"
              data-testid="button-accept-upsell"
            >
              Yes, add both items!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marketing Triggers Modal */}
      <MarketingTriggersModal
        open={marketingTriggersModalOpen}
        onOpenChange={handleMarketingTriggersModalChange}
        originalItem={pendingCartItem?.menuItem || null}
        suggestedItems={suggestedMarketingItems}
        triggerType={marketingTriggerType}
        onAddSuggestedItem={handleAddSuggestedItem}
        onContinue={handleContinueToCart}
        formatPrice={formatPrice}
        selectedLanguage={i18n.language}
      />

      {sfSlug && (
        <CustomerAuthDialog
          slug={sfSlug}
          open={authOpen}
          onOpenChange={setAuthOpen}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Restaurant } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Clock, ExternalLink, CreditCard, Wallet, Globe, Check, ChevronsUpDown, Zap, TrendingUp, Award, Gift, ShoppingCart, Save } from "lucide-react";
import type { UploadResult } from "@uppy/core";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CURRENCIES, COUNTRIES } from "@/lib/countries-currencies";
import { getBusinessTypeConfig } from "@/lib/businessType";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "pt", name: "Portuguese (Português)" },
  { code: "nl", name: "Dutch (Nederlands)" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "zh", name: "Chinese (中文)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "ko", name: "Korean (한국어)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "he", name: "Hebrew (עברית)" },
  { code: "fa", name: "Persian (فارسی)" },
  { code: "ur", name: "Urdu (اردو)" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "pl", name: "Polish (Polski)" },
  { code: "tr", name: "Turkish (Türkçe)" },
  { code: "vi", name: "Vietnamese (Tiếng Việt)" },
  { code: "th", name: "Thai (ไทย)" },
  { code: "id", name: "Indonesian (Bahasa Indonesia)" },
  { code: "ms", name: "Malay (Bahasa Melayu)" },
  { code: "sv", name: "Swedish (Svenska)" },
];

interface OpeningHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

const defaultOpeningHours: OpeningHours = {
  monday: { open: "09:00", close: "22:00", closed: false },
  tuesday: { open: "09:00", close: "22:00", closed: false },
  wednesday: { open: "09:00", close: "22:00", closed: false },
  thursday: { open: "09:00", close: "22:00", closed: false },
  friday: { open: "09:00", close: "22:00", closed: false },
  saturday: { open: "10:00", close: "23:00", closed: false },
  sunday: { open: "10:00", close: "21:00", closed: false },
};

interface PaymentMethods {
  stripe: boolean;
  paypal: boolean;
  cash: boolean;
}

const defaultPaymentMethods: PaymentMethods = {
  stripe: false,
  paypal: false,
  cash: true,
};

const marketingSchema = z.object({
  // Upsell & Cross-sell
  enableUpsells: z.boolean().default(false),
  upsellMessage: z.string().optional(),
  enableCrossSell: z.boolean().default(false),
  
  // Urgency Triggers
  enableCountdownTimer: z.boolean().default(false),
  countdownMinutes: z.coerce.number().optional(),
  countdownMessage: z.string().optional(),
  enableStockWarning: z.boolean().default(false),
  lowStockThreshold: z.coerce.number().optional(),
  enableReservationTimer: z.boolean().default(false),
  reservationMinutes: z.coerce.number().optional(),
  
  // Scarcity Triggers
  enableLimitedEdition: z.boolean().default(false),
  limitedEditionMessage: z.string().optional(),
  enableMonthlyLimit: z.boolean().default(false),
  monthlyUnits: z.coerce.number().optional(),
  enableExclusiveOffer: z.boolean().default(false),
  exclusiveOfferMessage: z.string().optional(),
  
  // Social Proof
  enableRecentPurchases: z.boolean().default(false),
  recentPurchaseHours: z.coerce.number().optional(),
  enableTopSeller: z.boolean().default(false),
  enableLiveNotifications: z.boolean().default(false),
  
  // Cart Value Incentives
  enableFreeShipping: z.boolean().default(false),
  freeShippingThreshold: z.coerce.number().optional(),
  enableBuyXGetY: z.boolean().default(false),
  buyQuantity: z.coerce.number().optional(),
  getQuantity: z.coerce.number().optional(),
  enableMysteryGift: z.boolean().default(false),
  mysteryGiftThreshold: z.coerce.number().optional(),
  enableSpinWheel: z.boolean().default(false),
  
  // Post-Purchase
  enablePostPurchaseUpsell: z.boolean().default(false),
  postUpsellMessage: z.string().optional(),
  postUpsellAmount: z.coerce.number().optional(),
  enableThankYouCoupon: z.boolean().default(false),
  thankYouCouponCode: z.string().optional(),
  thankYouDiscount: z.coerce.number().optional(),
});

export default function OnlineStore() {
  const { toast } = useToast();
  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours);
  const [currency, setCurrency] = useState("USD");
  const [country, setCountry] = useState("United States");
  const [platformLanguage, setPlatformLanguage] = useState("en");
  const [storefrontLanguage, setStorefrontLanguage] = useState("en");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [platformLanguageOpen, setPlatformLanguageOpen] = useState(false);
  const [storefrontLanguageOpen, setStorefrontLanguageOpen] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    stripePublicKey: "",
    stripeSecretKey: "",
    paypalClientId: "",
    paypalClientSecret: "",
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>(defaultPaymentMethods);
  const [orderTypes, setOrderTypes] = useState({
    pickup: true,
    delivery: true,
  });
  const [taxSettings, setTaxSettings] = useState({
    taxRate: "0.00",
    taxIncludedInPrice: false,
    taxLabel: "Tax",
  });
  const [payoutSettings, setPayoutSettings] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    iban: "",
    swiftCode: "",
    country: "",
    payoutSchedule: "weekly" as "daily" | "weekly",
  });
  const [brandColors, setBrandColors] = useState({
    primaryColor: "",
    secondaryColor: "",
    accentColor: "",
  });

  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
  });
  const businessConfig = getBusinessTypeConfig(restaurant?.businessType);

  const logoMutation = useMutation({
    mutationFn: async (logoUrl: string) => {
      return apiRequest("/api/restaurant/logo", "PUT", { logoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Logo uploaded successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to upload logo", variant: "destructive" });
    },
  });

  const coverImageMutation = useMutation({
    mutationFn: async (coverImageUrl: string) => {
      return apiRequest("/api/restaurant/cover-image", "PUT", { coverImageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Cover photo uploaded successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to upload cover photo", variant: "destructive" });
    },
  });

  const brandColorsMutation = useMutation({
    mutationFn: async (colors: { primaryColor?: string; secondaryColor?: string; accentColor?: string }) => {
      return apiRequest("/api/restaurant/brand-colors", "PUT", colors);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Brand colors updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update brand colors", variant: "destructive" });
    },
  });

  const [seo, setSeo] = useState({ seoTitle: "", seoDescription: "", seoImageUrl: "" });
  useEffect(() => {
    const r = restaurant as any;
    if (r) setSeo({ seoTitle: r.seoTitle || "", seoDescription: r.seoDescription || "", seoImageUrl: r.seoImageUrl || "" });
  }, [restaurant]);
  const seoMutation = useMutation({
    mutationFn: async (data: typeof seo) => {
      if (!(restaurant as any)?.id) throw new Error("Restaurant not found");
      return apiRequest(`/api/restaurants/${(restaurant as any).id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "SEO settings saved" });
    },
    onError: () => toast({ title: "Failed to save SEO settings", variant: "destructive" }),
  });

  const openingHoursMutation = useMutation({
    mutationFn: async (hours: OpeningHours) => {
      return apiRequest("/api/restaurant/opening-hours", "PUT", { openingHours: hours });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Opening hours updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update opening hours", variant: "destructive" });
    },
  });

  const paymentSettingsMutation = useMutation({
    mutationFn: async (settings: typeof paymentSettings) => {
      return apiRequest("/api/restaurant/payment-settings", "PUT", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Payment settings updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update payment settings", variant: "destructive" });
    },
  });

  const paymentMethodsMutation = useMutation({
    mutationFn: async (methods: PaymentMethods) => {
      return apiRequest("/api/restaurant/payment-methods", "PUT", { paymentMethods: methods });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Payment methods updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update payment methods", variant: "destructive" });
    },
  });

  const orderTypesMutation = useMutation({
    mutationFn: async (types: { pickup: boolean; delivery: boolean }) => {
      return apiRequest("/api/restaurant/order-types", "PUT", { orderTypes: types });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Order types updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update order types", variant: "destructive" });
    },
  });

  const regionalSettingsMutation = useMutation({
    mutationFn: async (settings: { currency: string; country: string; platformLanguage: string; storefrontLanguage: string }) => {
      return apiRequest("/api/restaurant/regional-settings", "PUT", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Regional settings updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update regional settings", variant: "destructive" });
    },
  });

  const taxSettingsMutation = useMutation({
    mutationFn: async (settings: typeof taxSettings) => {
      return apiRequest("/api/restaurant/tax-settings", "PUT", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Tax settings updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update tax settings", variant: "destructive" });
    },
  });

  const payoutSettingsMutation = useMutation({
    mutationFn: async (data: { payoutSchedule: "daily" | "weekly" }) => {
      return apiRequest("/api/restaurant/payout-settings", "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/payout-settings"] });
      toast({ title: "Payout schedule saved successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to save payout schedule", variant: "destructive" });
    },
  });

  const marketingForm = useForm<z.infer<typeof marketingSchema>>({
    resolver: zodResolver(marketingSchema),
    defaultValues: {
      enableUpsells: false,
      upsellMessage: "",
      enableCrossSell: false,
      enableCountdownTimer: false,
      countdownMinutes: 30,
      countdownMessage: "",
      enableStockWarning: false,
      lowStockThreshold: 5,
      enableReservationTimer: false,
      reservationMinutes: 10,
      enableLimitedEdition: false,
      limitedEditionMessage: "",
      enableMonthlyLimit: false,
      monthlyUnits: 50,
      enableExclusiveOffer: false,
      exclusiveOfferMessage: "",
      enableRecentPurchases: false,
      recentPurchaseHours: 24,
      enableTopSeller: false,
      enableLiveNotifications: false,
      enableFreeShipping: false,
      freeShippingThreshold: 50,
      enableBuyXGetY: false,
      buyQuantity: 2,
      getQuantity: 1,
      enableMysteryGift: false,
      mysteryGiftThreshold: 50,
      enableSpinWheel: false,
      enablePostPurchaseUpsell: false,
      postUpsellMessage: "",
      postUpsellAmount: 5,
      enableThankYouCoupon: false,
      thankYouCouponCode: "",
      thankYouDiscount: 10,
    },
  });

  const updateMarketingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof marketingSchema>) => {
      if (!restaurant?.id) throw new Error("Restaurant not found");
      return apiRequest(`/api/restaurants/${restaurant.id}/marketing`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Marketing settings updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update marketing settings", variant: "destructive" });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      objectPath: data.objectPath,
    };
  };

  const handleLogoComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const file = result.successful[0];
      const objectPath = file.meta?.objectPath as string;
      if (objectPath) {
        logoMutation.mutate(objectPath);
      }
    }
  };

  const handleCoverComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const file = result.successful[0];
      const objectPath = file.meta?.objectPath as string;
      if (objectPath) {
        coverImageMutation.mutate(objectPath);
      }
    }
  };

  const handleDayToggle = (day: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: { ...prev[day], closed: !prev[day].closed }
    }));
  };

  const handleTimeChange = (day: string, type: 'open' | 'close', value: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [type]: value }
    }));
  };

  const handleSaveOpeningHours = () => {
    openingHoursMutation.mutate(openingHours);
  };

  // Load existing opening hours when restaurant data is available
  useEffect(() => {
    if (restaurant?.openingHours) {
      setOpeningHours(restaurant.openingHours as OpeningHours);
    }
  }, [restaurant?.openingHours]);

  // Load existing payment settings
  useEffect(() => {
    if (restaurant) {
      setPaymentSettings({
        stripePublicKey: restaurant.stripePublicKey || "",
        stripeSecretKey: restaurant.stripeSecretKey || "",
        paypalClientId: restaurant.paypalClientId || "",
        paypalClientSecret: restaurant.paypalClientSecret || "",
      });
    }
  }, [restaurant]);

  // Load existing payment methods
  useEffect(() => {
    if (restaurant?.paymentMethods) {
      setPaymentMethods(restaurant.paymentMethods as PaymentMethods);
    }
  }, [restaurant?.paymentMethods]);

  // Load existing order types
  useEffect(() => {
    if (restaurant?.orderTypes) {
      setOrderTypes(restaurant.orderTypes as { pickup: boolean; delivery: boolean });
    }
  }, [restaurant?.orderTypes]);

  // Load existing regional settings
  useEffect(() => {
    if (restaurant) {
      setCurrency(restaurant.currency || "USD");
      setCountry(restaurant.country || "United States");
      setPlatformLanguage(restaurant.platformLanguage || "en");
      setStorefrontLanguage(restaurant.storefrontLanguage || "en");
    }
  }, [restaurant?.currency, restaurant?.country, restaurant?.platformLanguage, restaurant?.storefrontLanguage]);

  // Load existing marketing settings
  useEffect(() => {
    if (restaurant?.marketingSettings) {
      marketingForm.reset(restaurant.marketingSettings as z.infer<typeof marketingSchema>);
    }
  }, [restaurant?.marketingSettings]);

  // Load existing tax settings
  useEffect(() => {
    if (restaurant) {
      setTaxSettings({
        taxRate: restaurant.taxRate || "0.00",
        taxIncludedInPrice: restaurant.taxIncludedInPrice || false,
        taxLabel: restaurant.taxLabel || "Tax",
      });
    }
  }, [restaurant?.taxRate, restaurant?.taxIncludedInPrice, restaurant?.taxLabel]);

  // Load existing brand colors
  useEffect(() => {
    if (restaurant) {
      setBrandColors({
        primaryColor: restaurant.primaryColor || "",
        secondaryColor: restaurant.secondaryColor || "",
        accentColor: restaurant.accentColor || "",
      });
    }
  }, [restaurant?.primaryColor, restaurant?.secondaryColor, restaurant?.accentColor]);

  // Fetch payout schedule
  const { data: payoutData } = useQuery<{ payoutSchedule: "daily" | "weekly" }>({
    queryKey: ["/api/restaurant/payout-settings"],
    enabled: !!restaurant,
  });

  // Load payout schedule when data is available
  useEffect(() => {
    if (payoutData) {
      setPayoutSettings(prev => ({
        ...prev,
        payoutSchedule: payoutData.payoutSchedule
      }));
    }
  }, [payoutData]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No business found. Please set up your business first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const storefrontUrl = restaurant.slug ? `/store/${restaurant.slug}` : '#';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">Online Store</h1>
          <p className="text-muted-foreground">Customize your online storefront</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.open(storefrontUrl, '_blank')}
          data-testid="button-preview-storefront"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Preview Storefront
        </Button>
      </div>

      {/* Branding Section */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Upload your {businessConfig.business.toLowerCase()} logo and cover photo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label>{businessConfig.business} Logo</Label>
              {restaurant.logoUrl ? (
                <div className="border rounded-lg p-4 space-y-3">
                  <img
                    src={restaurant.logoUrl}
                    alt={`${businessConfig.business} logo`}
                    className="h-24 w-24 object-cover rounded-lg mx-auto"
                    data-testid="img-restaurant-logo"
                  />
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleLogoComplete}
                    buttonClassName="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Logo
                  </ObjectUploader>
                </div>
              ) : (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5242880}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleLogoComplete}
                  buttonClassName="w-full"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Upload Logo
                </ObjectUploader>
              )}
              <p className="text-xs text-muted-foreground">Recommended: Square image, max 5MB</p>
            </div>

            {/* Cover Photo Upload */}
            <div className="space-y-3">
              <Label>Cover Photo</Label>
              {restaurant.coverImageUrl ? (
                <div className="border rounded-lg p-4 space-y-3">
                  <img 
                    src={restaurant.coverImageUrl} 
                    alt="Cover photo" 
                    className="h-24 w-full object-cover rounded-lg"
                    data-testid="img-cover-photo"
                  />
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleCoverComplete}
                    buttonClassName="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Cover Photo
                  </ObjectUploader>
                </div>
              ) : (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5242880}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleCoverComplete}
                  buttonClassName="w-full"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Upload Cover Photo
                </ObjectUploader>
              )}
              <p className="text-xs text-muted-foreground">Recommended: 1200x400px, max 5MB</p>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <div>
              <h3 className="font-semibold mb-2">Brand Colors</h3>
              <p className="text-sm text-muted-foreground">Customize your storefront colors to match your brand identity</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={brandColors.primaryColor || "#f97316"}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-10 w-20 cursor-pointer"
                    data-testid="input-primary-color"
                  />
                  <Input
                    type="text"
                    value={brandColors.primaryColor || "#f97316"}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#f97316"
                    className="flex-1"
                    data-testid="input-primary-color-text"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Used for buttons and links</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={brandColors.secondaryColor || "#fb923c"}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="h-10 w-20 cursor-pointer"
                    data-testid="input-secondary-color"
                  />
                  <Input
                    type="text"
                    value={brandColors.secondaryColor || "#fb923c"}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    placeholder="#fb923c"
                    className="flex-1"
                    data-testid="input-secondary-color-text"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Used for backgrounds</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={brandColors.accentColor || "#fdba74"}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="h-10 w-20 cursor-pointer"
                    data-testid="input-accent-color"
                  />
                  <Input
                    type="text"
                    value={brandColors.accentColor || "#fdba74"}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, accentColor: e.target.value }))}
                    placeholder="#fdba74"
                    className="flex-1"
                    data-testid="input-accent-color-text"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Used for highlights</p>
              </div>
            </div>
            <Button
              onClick={() => brandColorsMutation.mutate(brandColors)}
              disabled={brandColorsMutation.isPending}
              data-testid="button-save-brand-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              {brandColorsMutation.isPending ? "Saving..." : "Save Brand Colors"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>Configure currency, location, and language settings for your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={currencyOpen}
                    className="w-full justify-between"
                    data-testid="select-currency"
                  >
                    {currency ? CURRENCIES.find((c) => c.code === currency)?.code + " - " + CURRENCIES.find((c) => c.code === currency)?.name + " (" + CURRENCIES.find((c) => c.code === currency)?.symbol + ")" : "Select currency"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search currency..." />
                    <CommandList>
                      <CommandEmpty>No currency found.</CommandEmpty>
                      <CommandGroup>
                        {CURRENCIES.map((curr) => (
                          <CommandItem
                            key={curr.code}
                            value={`${curr.code} ${curr.name} ${curr.symbol}`}
                            onSelect={() => {
                              setCurrency(curr.code);
                              setCurrencyOpen(false);
                            }}
                            data-testid={`currency-option-${curr.code}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                currency === curr.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {curr.code} - {curr.name} ({curr.symbol})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Select your local currency</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryOpen}
                    className="w-full justify-between"
                    data-testid="select-country"
                  >
                    {country || "Select country"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {COUNTRIES.map((ctry) => (
                          <CommandItem
                            key={ctry.code}
                            value={ctry.name}
                            onSelect={() => {
                              setCountry(ctry.name);
                              setCountryOpen(false);
                            }}
                            data-testid={`country-option-${ctry.code}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                country === ctry.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {ctry.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Select your business's location</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformLanguage">Platform Language</Label>
              <Popover open={platformLanguageOpen} onOpenChange={setPlatformLanguageOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={platformLanguageOpen}
                    className="w-full justify-between"
                    data-testid="select-platform-language"
                  >
                    {platformLanguage ? LANGUAGES.find((l) => l.code === platformLanguage)?.name : "Select language"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search language..." />
                    <CommandList>
                      <CommandEmpty>No language found.</CommandEmpty>
                      <CommandGroup>
                        {LANGUAGES.map((lang) => (
                          <CommandItem
                            key={lang.code}
                            value={lang.name}
                            onSelect={() => {
                              setPlatformLanguage(lang.code);
                              setPlatformLanguageOpen(false);
                            }}
                            data-testid={`platform-language-option-${lang.code}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                platformLanguage === lang.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {lang.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Language for admin dashboard</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storefrontLanguage">Storefront Language</Label>
              <Popover open={storefrontLanguageOpen} onOpenChange={setStorefrontLanguageOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={storefrontLanguageOpen}
                    className="w-full justify-between"
                    data-testid="select-storefront-language"
                  >
                    {storefrontLanguage ? LANGUAGES.find((l) => l.code === storefrontLanguage)?.name : "Select language"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search language..." />
                    <CommandList>
                      <CommandEmpty>No language found.</CommandEmpty>
                      <CommandGroup>
                        {LANGUAGES.map((lang) => (
                          <CommandItem
                            key={lang.code}
                            value={lang.name}
                            onSelect={() => {
                              setStorefrontLanguage(lang.code);
                              setStorefrontLanguageOpen(false);
                            }}
                            data-testid={`storefront-language-option-${lang.code}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                storefrontLanguage === lang.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {lang.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Language for customer-facing menu</p>
            </div>
          </div>

          <Button 
            onClick={() => regionalSettingsMutation.mutate({ currency, country, platformLanguage, storefrontLanguage })}
            disabled={regionalSettingsMutation.isPending}
            data-testid="button-save-regional-settings"
          >
            Save Regional Settings
          </Button>
        </CardContent>
      </Card>

      {/* Opening Hours Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Opening Hours
          </CardTitle>
          <CardDescription>Set your business's operating hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(openingHours).map(([day, hours]) => (
            <div key={day} className="flex items-center gap-4" data-testid={`opening-hours-${day}`}>
              <div className="w-28">
                <Label className="capitalize">{day}</Label>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={hours.open}
                  onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                  disabled={hours.closed}
                  className="w-32"
                  data-testid={`input-${day}-open`}
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={hours.close}
                  onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                  disabled={hours.closed}
                  className="w-32"
                  data-testid={`input-${day}-close`}
                />
                <Button
                  variant={hours.closed ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => handleDayToggle(day)}
                  data-testid={`button-${day}-toggle`}
                >
                  {hours.closed ? "Closed" : "Open"}
                </Button>
              </div>
            </div>
          ))}
          <Button 
            onClick={handleSaveOpeningHours}
            disabled={openingHoursMutation.isPending}
            data-testid="button-save-opening-hours"
          >
            Save Opening Hours
          </Button>
        </CardContent>
      </Card>

      {/* Order Types Section */}
      <Card>
        <CardHeader>
          <CardTitle>Order Types</CardTitle>
          <CardDescription>Choose which order types your business accepts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between" data-testid="order-type-pickup">
            <div className="space-y-0.5">
              <Label htmlFor="enable-pickup">Pickup</Label>
              <p className="text-sm text-muted-foreground">Allow customers to pick up orders</p>
            </div>
            <Switch
              id="enable-pickup"
              checked={orderTypes.pickup}
              onCheckedChange={(checked) => setOrderTypes(prev => ({ ...prev, pickup: checked }))}
              data-testid="switch-pickup"
            />
          </div>

          <div className="flex items-center justify-between" data-testid="order-type-delivery">
            <div className="space-y-0.5">
              <Label htmlFor="enable-delivery">Delivery</Label>
              <p className="text-sm text-muted-foreground">Allow customers to order delivery</p>
            </div>
            <Switch
              id="enable-delivery"
              checked={orderTypes.delivery}
              onCheckedChange={(checked) => setOrderTypes(prev => ({ ...prev, delivery: checked }))}
              data-testid="switch-delivery"
            />
          </div>

          <Button 
            onClick={() => orderTypesMutation.mutate(orderTypes)}
            disabled={orderTypesMutation.isPending || (!orderTypes.pickup && !orderTypes.delivery)}
            data-testid="button-save-order-types"
          >
            Save Order Types
          </Button>
          {!orderTypes.pickup && !orderTypes.delivery && (
            <p className="text-sm text-destructive">At least one order type must be enabled</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods Section */}
      <Card>
        <CardHeader>
          <CardTitle>Enable Payment Methods</CardTitle>
          <CardDescription>Choose which payment methods to show on your online store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between" data-testid="payment-method-stripe">
            <div className="space-y-0.5">
              <Label htmlFor="enable-stripe">Stripe</Label>
              <p className="text-sm text-muted-foreground">Accept credit/debit card payments online</p>
            </div>
            <Switch
              id="enable-stripe"
              checked={paymentMethods.stripe}
              onCheckedChange={(checked) => setPaymentMethods(prev => ({ ...prev, stripe: checked }))}
              data-testid="switch-stripe"
            />
          </div>

          <div className="flex items-center justify-between" data-testid="payment-method-paypal">
            <div className="space-y-0.5">
              <Label htmlFor="enable-paypal">PayPal</Label>
              <p className="text-sm text-muted-foreground">Accept PayPal payments online</p>
            </div>
            <Switch
              id="enable-paypal"
              checked={paymentMethods.paypal}
              onCheckedChange={(checked) => setPaymentMethods(prev => ({ ...prev, paypal: checked }))}
              data-testid="switch-paypal"
            />
          </div>

          <div className="flex items-center justify-between" data-testid="payment-method-cash">
            <div className="space-y-0.5">
              <Label htmlFor="enable-cash">Cash on Delivery</Label>
              <p className="text-sm text-muted-foreground">Allow customers to pay with cash upon delivery</p>
            </div>
            <Switch
              id="enable-cash"
              checked={paymentMethods.cash}
              onCheckedChange={(checked) => setPaymentMethods(prev => ({ ...prev, cash: checked }))}
              data-testid="switch-cash"
            />
          </div>

          <Button 
            onClick={() => paymentMethodsMutation.mutate(paymentMethods)}
            disabled={paymentMethodsMutation.isPending}
            data-testid="button-save-payment-methods"
          >
            Save Payment Methods
          </Button>
        </CardContent>
      </Card>

      {/* Tax Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Configuration</CardTitle>
          <CardDescription>Configure tax rates and labels for your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxSettings.taxRate}
              onChange={(e) => setTaxSettings(prev => ({ ...prev, taxRate: e.target.value }))}
              placeholder="0.00"
              data-testid="input-tax-rate"
            />
            <p className="text-sm text-muted-foreground">Enter tax rate as a percentage (e.g., 13.50 for 13.5%)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax-label">Tax Label</Label>
            <Input
              id="tax-label"
              value={taxSettings.taxLabel}
              onChange={(e) => setTaxSettings(prev => ({ ...prev, taxLabel: e.target.value }))}
              placeholder="Tax"
              data-testid="input-tax-label"
            />
            <p className="text-sm text-muted-foreground">Display name for tax (e.g., "Tax", "VAT", "GST")</p>
          </div>

          <div className="flex items-center justify-between" data-testid="tax-included-toggle">
            <div className="space-y-0.5">
              <Label htmlFor="tax-included">Tax Included in Prices</Label>
              <p className="text-sm text-muted-foreground">If enabled, {businessConfig.catalog.toLowerCase()} prices already include tax</p>
            </div>
            <Switch
              id="tax-included"
              checked={taxSettings.taxIncludedInPrice}
              onCheckedChange={(checked) => setTaxSettings(prev => ({ ...prev, taxIncludedInPrice: checked }))}
              data-testid="switch-tax-included"
            />
          </div>

          <Button 
            onClick={() => taxSettingsMutation.mutate(taxSettings)}
            disabled={taxSettingsMutation.isPending}
            data-testid="button-save-tax-settings"
          >
            Save Tax Settings
          </Button>
        </CardContent>
      </Card>

      {/* Payout Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Engine Listing</CardTitle>
          <CardDescription>How your store appears in Google results and when shared on social media</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seo-title">Page title</Label>
            <Input
              id="seo-title"
              value={seo.seoTitle}
              onChange={(e) => setSeo({ ...seo, seoTitle: e.target.value })}
              placeholder={(restaurant as any)?.name || "Your store name"}
              maxLength={70}
              data-testid="input-seo-title"
            />
            <p className="text-xs text-muted-foreground">{seo.seoTitle.length}/70 — keep it under 60 for full display</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo-description">Meta description</Label>
            <Textarea
              id="seo-description"
              rows={3}
              value={seo.seoDescription}
              onChange={(e) => setSeo({ ...seo, seoDescription: e.target.value })}
              placeholder={(restaurant as any)?.description || "A short summary customers see in search results"}
              maxLength={320}
              data-testid="input-seo-description"
            />
            <p className="text-xs text-muted-foreground">{seo.seoDescription.length}/320 — aim for 150–160 characters</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo-image">Social preview image URL</Label>
            <Input
              id="seo-image"
              value={seo.seoImageUrl}
              onChange={(e) => setSeo({ ...seo, seoImageUrl: e.target.value })}
              placeholder="Falls back to your cover photo"
              data-testid="input-seo-image"
            />
          </div>
          <Button onClick={() => seoMutation.mutate(seo)} disabled={seoMutation.isPending} data-testid="button-save-seo">
            <Save className="mr-2 h-4 w-4" />
            {seoMutation.isPending ? "Saving…" : "Save SEO Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout Preferences</CardTitle>
          <CardDescription>Choose how frequently you want to receive your earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">Bank Account Connection</p>
            <p className="text-sm text-muted-foreground">
              Connect your bank account securely through Stripe in the <strong>Settings</strong> page. 
              Your bank details are never stored on our platform - Stripe handles all verification and payouts directly to your bank.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payout-schedule">Payout Schedule</Label>
            <div className="flex gap-2">
              <Button
                variant={payoutSettings.payoutSchedule === "daily" ? "default" : "outline"}
                onClick={() => setPayoutSettings(prev => ({ ...prev, payoutSchedule: "daily" }))}
                data-testid="button-payout-daily"
                className="flex-1"
              >
                Daily
              </Button>
              <Button
                variant={payoutSettings.payoutSchedule === "weekly" ? "default" : "outline"}
                onClick={() => setPayoutSettings(prev => ({ ...prev, payoutSchedule: "weekly" }))}
                data-testid="button-payout-weekly"
                className="flex-1"
              >
                Weekly
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {payoutSettings.payoutSchedule === "daily" 
                ? "You'll receive payouts every day (minimum $10)" 
                : "You'll receive payouts every Monday (minimum $10)"}
            </p>
          </div>

          <Button 
            onClick={() => payoutSettingsMutation.mutate({ payoutSchedule: payoutSettings.payoutSchedule })}
            disabled={payoutSettingsMutation.isPending}
            data-testid="button-save-payout-settings"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Payout Schedule
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

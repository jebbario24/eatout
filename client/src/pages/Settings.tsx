import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Merchant } from "@shared/schema";
import { BUSINESS_TYPE_CONFIG } from "@/lib/businessType";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { LogOut, Save, ExternalLink, Check, ChevronsUpDown, CreditCard, CheckCircle2, AlertCircle, Store, Clock, Globe } from "lucide-react";
import Staff from "@/pages/Staff";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import { CURRENCIES, COUNTRIES, TIMEZONES } from "@/lib/countries-currencies";

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

const merchantSchema = z.object({
  businessType: z.enum(["grocery", "pharmacy", "flowers", "retail"]),
  name: z.string().min(1, "Business name is required"),
  slug: z.string().min(1, "URL slug is required").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  subdomain: z.string().regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers, and hyphens allowed").optional().or(z.literal("")),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  timezone: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Regional settings
  const [currency, setCurrency] = useState("USD");
  const [country, setCountry] = useState("United States");
  const [platformLanguage, setPlatformLanguage] = useState("en");
  const [storefrontLanguage, setStorefrontLanguage] = useState("en");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [platformLanguageOpen, setPlatformLanguageOpen] = useState(false);
  const [storefrontLanguageOpen, setStorefrontLanguageOpen] = useState(false);

  // Opening hours
  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours);

  // Order types
  const [orderTypes, setOrderTypes] = useState({ pickup: true, shipping: true });

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>(defaultPaymentMethods);

  // Tax settings
  const [taxSettings, setTaxSettings] = useState({
    taxRate: "0.00",
    taxIncludedInPrice: false,
    taxLabel: "Tax",
  });

  // Payout settings
  const [payoutSettings, setPayoutSettings] = useState({
    payoutSchedule: "weekly" as "daily" | "weekly",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchants/me"],
  });

  // Query Stripe Connect status
  const { data: stripeStatus } = useQuery<{
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirementsCurrentlyDue?: string[];
    requirementsEventuallyDue?: string[];
  }>({
    queryKey: ["/api/merchant/connect/status"],
    enabled: !!merchant,
  });

  // Create Stripe Connect account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/merchant/connect/create-account", "POST", {});
    },
    onSuccess: async () => {
      // After creating account, generate onboarding link and redirect
      const linkResponse = await apiRequest("/api/merchant/connect/onboarding-link", "POST", {});
      const data = await linkResponse.json();
      window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Failed to create Stripe account", variant: "destructive" });
    },
  });

  // Generate onboarding link for existing account
  const onboardingLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/merchant/connect/onboarding-link", "POST", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Failed to generate onboarding link", variant: "destructive" });
    },
  });

  // Auto-detect timezone from browser
  const detectedTimezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return "UTC";
    }
  })();

  // Pre-select the business type chosen on the landing page (?type=grocery,
  // stashed by Signup.tsx). Otherwise leave it unselected, no vertical is the
  // "default" one, a brand-new merchant should make an explicit choice.
  const preselectedBusinessType = (() => {
    try {
      const stored = sessionStorage.getItem("eatout_signup_business_type");
      return stored && stored in BUSINESS_TYPE_CONFIG
        ? (stored as keyof typeof BUSINESS_TYPE_CONFIG)
        : undefined;
    } catch {
      return undefined;
    }
  })();

  const form = useForm({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      businessType: preselectedBusinessType as any,
      name: "",
      slug: "",
      subdomain: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      timezone: detectedTimezone,
    },
  });

  const businessType = form.watch("businessType");
  const labels = businessType
    ? BUSINESS_TYPE_CONFIG[businessType as keyof typeof BUSINESS_TYPE_CONFIG] || BUSINESS_TYPE_CONFIG.retail
    : { business: "Business", store: "business", catalog: "Products" };

  useEffect(() => {
    if (merchant) {
      form.reset({
        businessType: (merchant.businessType as any) || "retail",
        name: merchant.name || "",
        slug: merchant.slug || "",
        subdomain: merchant.subdomain || "",
        description: merchant.description || "",
        address: merchant.address || "",
        phone: merchant.phone || "",
        email: merchant.email || "",
        timezone: merchant.timezone || detectedTimezone,
      });
    }
  }, [merchant, form, detectedTimezone]);

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof merchantSchema>) => {
      if (merchant) {
        return await apiRequest(`/api/merchants/${merchant.id}`, "PUT", data);
      } else {
        return await apiRequest("/api/merchants", "POST", { ...data, currency: "USD" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants/me"] });
      const isFirstCreation = !merchant;
      if (isFirstCreation) {
        try {
          sessionStorage.removeItem("eatout_signup_business_type");
        } catch {
          // ignore — best-effort cleanup only
        }
      }
      toast({ title: merchant ? "Settings updated successfully" : `${labels.business} created successfully` });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/login", 500);
        return;
      }
      toast({
        title: "Failed to save settings",
        description: error.message || "Please check your information and try again.",
        variant: "destructive"
      });
    },
  });

  const openingHoursMutation = useMutation({
    mutationFn: async (hours: OpeningHours) => apiRequest("/api/merchant/opening-hours", "PUT", { openingHours: hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants/me"] });
      toast({ title: "Opening hours updated successfully!" });
    },
    onError: () => toast({ title: "Failed to update opening hours", variant: "destructive" }),
  });

  const paymentMethodsMutation = useMutation({
    mutationFn: async (methods: PaymentMethods) => apiRequest("/api/merchant/payment-methods", "PUT", { paymentMethods: methods }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants/me"] });
      toast({ title: "Payment methods updated successfully!" });
    },
    onError: () => toast({ title: "Failed to update payment methods", variant: "destructive" }),
  });

  const orderTypesMutation = useMutation({
    mutationFn: async (types: { pickup: boolean; shipping: boolean }) => apiRequest("/api/merchant/order-types", "PUT", { orderTypes: types }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants/me"] });
      toast({ title: "Order types updated successfully!" });
    },
    onError: () => toast({ title: "Failed to update order types", variant: "destructive" }),
  });

  const regionalSettingsMutation = useMutation({
    mutationFn: async (settings: { currency: string; country: string; platformLanguage: string; storefrontLanguage: string }) =>
      apiRequest("/api/merchant/regional-settings", "PUT", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants/me"] });
      toast({ title: "Regional settings updated successfully!" });
    },
    onError: () => toast({ title: "Failed to update regional settings", variant: "destructive" }),
  });

  const taxSettingsMutation = useMutation({
    mutationFn: async (settings: typeof taxSettings) => apiRequest("/api/merchant/tax-settings", "PUT", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants/me"] });
      toast({ title: "Tax settings updated successfully!" });
    },
    onError: () => toast({ title: "Failed to update tax settings", variant: "destructive" }),
  });

  const payoutSettingsMutation = useMutation({
    mutationFn: async (data: { payoutSchedule: "daily" | "weekly" }) => apiRequest("/api/merchant/payout-settings", "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/payout-settings"] });
      toast({ title: "Payout schedule saved successfully!" });
    },
    onError: () => toast({ title: "Failed to save payout schedule", variant: "destructive" }),
  });

  const handleDayToggle = (day: string) => {
    setOpeningHours(prev => ({ ...prev, [day]: { ...prev[day], closed: !prev[day].closed } }));
  };

  const handleTimeChange = (day: string, type: 'open' | 'close', value: string) => {
    setOpeningHours(prev => ({ ...prev, [day]: { ...prev[day], [type]: value } }));
  };

  const handleSaveOpeningHours = () => {
    openingHoursMutation.mutate(openingHours);
  };

  // Load existing opening hours when merchant data is available
  useEffect(() => {
    if (merchant?.openingHours) {
      setOpeningHours(merchant.openingHours as OpeningHours);
    }
  }, [merchant?.openingHours]);

  // Load existing payment methods
  useEffect(() => {
    if (merchant?.paymentMethods) {
      setPaymentMethods(merchant.paymentMethods as PaymentMethods);
    }
  }, [merchant?.paymentMethods]);

  // Load existing order types
  useEffect(() => {
    if (merchant?.orderTypes) {
      setOrderTypes(merchant.orderTypes as { pickup: boolean; shipping: boolean });
    }
  }, [merchant?.orderTypes]);

  // Load existing regional settings
  useEffect(() => {
    if (merchant) {
      setCurrency(merchant.currency || "USD");
      setCountry(merchant.country || "United States");
      setPlatformLanguage(merchant.platformLanguage || "en");
      setStorefrontLanguage(merchant.storefrontLanguage || "en");
    }
  }, [merchant?.currency, merchant?.country, merchant?.platformLanguage, merchant?.storefrontLanguage]);

  // Load existing tax settings
  useEffect(() => {
    if (merchant) {
      setTaxSettings({
        taxRate: merchant.taxRate || "0.00",
        taxIncludedInPrice: merchant.taxIncludedInPrice || false,
        taxLabel: merchant.taxLabel || "Tax",
      });
    }
  }, [merchant?.taxRate, merchant?.taxIncludedInPrice, merchant?.taxLabel]);

  // Fetch payout schedule
  const { data: payoutData } = useQuery<{ payoutSchedule: "daily" | "weekly" }>({
    queryKey: ["/api/merchant/payout-settings"],
    enabled: !!merchant,
  });

  // Load payout schedule when data is available
  useEffect(() => {
    if (payoutData) {
      setPayoutSettings(prev => ({ ...prev, payoutSchedule: payoutData.payoutSchedule }));
    }
  }, [payoutData]);

  if (authLoading || isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const storefrontUrl = merchant?.slug ? `${window.location.origin}/store/${merchant.slug}` : "";

  const businessInformationCard = (
    <Card>
      <CardHeader>
        <CardTitle>{labels.business} Information</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-business-type">
                        <SelectValue placeholder="Select a business type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="flowers">Flower Shop</SelectItem>
                      <SelectItem value="grocery">Grocery Store</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="retail">Retail Shop</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Determines your catalog's terminology and fields ({labels.catalog.toLowerCase()}, not just menu items).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.business} Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-merchant-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="my-store" data-testid="input-slug" />
                  </FormControl>
                  <FormDescription>
                    This will be used in your online {labels.catalog.toLowerCase()} URL: /store/your-slug
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subdomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subdomain</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input {...field} placeholder={`my${labels.store}`} data-testid="input-subdomain" className="flex-1" />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">.eatout.app</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {field.value ? (
                      <span>Your storefront will be accessible at: <code className="text-xs bg-muted px-1 py-0.5 rounded">https://{field.value}.eatout.app</code></span>
                    ) : (
                      `Choose a unique subdomain for your ${labels.store} (lowercase letters, numbers, and hyphens only)`
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="input-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Timezone</FormLabel>
                  <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={timezoneOpen}
                          className="w-full justify-between"
                          data-testid="select-timezone"
                        >
                          {field.value ? TIMEZONES.find((tz) => tz.value === field.value)?.label || field.value : "Select timezone"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search timezone..." />
                        <CommandList>
                          <CommandEmpty>No timezone found.</CommandEmpty>
                          <CommandGroup>
                            {TIMEZONES.map((tz) => (
                              <CommandItem
                                key={tz.value}
                                value={`${tz.value} ${tz.label} ${tz.offset}`}
                                onSelect={() => {
                                  field.onChange(tz.value);
                                  setTimezoneOpen(false);
                                }}
                                data-testid={`timezone-option-${tz.value}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === tz.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {tz.label} (UTC{tz.offset})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  if (!merchant) {
    return (
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">Complete your {labels.store} profile to get started</p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = "/api/logout"} data-testid="button-logout">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Alert>
          <Store className="h-4 w-4" />
          <AlertTitle>Welcome to EatOut! 🎉</AlertTitle>
          <AlertDescription>
            Let's set up your business profile. Fill out the form below to get started with your online store.
          </AlertDescription>
        </Alert>

        {businessInformationCard}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your {labels.store} profile and preferences</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.href = "/api/logout"}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
          <TabsTrigger value="regional" data-testid="tab-regional">Regional & Tax</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments & Payouts</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">
          {merchant.slug && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-semibold mb-1">Your Storefront URL</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      This is where your customers can browse your {labels.catalog.toLowerCase()} and place orders
                    </p>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {storefrontUrl}
                    </code>
                  </div>
                  <Button
                    onClick={() => window.open(storefrontUrl, '_blank')}
                    variant="default"
                    data-testid="button-preview-storefront"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Preview Storefront
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {businessInformationCard}

          {storefrontUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Online Storefront</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your online storefront is available at:
                </p>
                <div className="flex items-center gap-2">
                  <Input value={storefrontUrl} readOnly data-testid="input-storefront-url" />
                  <Button
                    variant="outline"
                    onClick={() => window.open(storefrontUrl, "_blank")}
                    data-testid="button-open-storefront"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this link with your customers to accept online orders
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="regional" className="space-y-6 mt-4">
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
                  <Label className="text-sm font-medium leading-none">Currency</Label>
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
                                <Check className={cn("mr-2 h-4 w-4", currency === curr.code ? "opacity-100" : "opacity-0")} />
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
                  <Label className="text-sm font-medium leading-none">Country</Label>
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
                                <Check className={cn("mr-2 h-4 w-4", country === ctry.name ? "opacity-100" : "opacity-0")} />
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
                  <Label className="text-sm font-medium leading-none">Platform Language</Label>
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
                                <Check className={cn("mr-2 h-4 w-4", platformLanguage === lang.code ? "opacity-100" : "opacity-0")} />
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
                  <Label className="text-sm font-medium leading-none">Storefront Language</Label>
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
                                <Check className={cn("mr-2 h-4 w-4", storefrontLanguage === lang.code ? "opacity-100" : "opacity-0")} />
                                {lang.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">Language for your customer-facing {labels.catalog.toLowerCase()}</p>
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

              <div className="flex items-center justify-between" data-testid="order-type-shipping">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-shipping">Shipping</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to have orders shipped</p>
                </div>
                <Switch
                  id="enable-shipping"
                  checked={orderTypes.shipping}
                  onCheckedChange={(checked) => setOrderTypes(prev => ({ ...prev, shipping: checked }))}
                  data-testid="switch-shipping"
                />
              </div>

              <Button
                onClick={() => orderTypesMutation.mutate(orderTypes)}
                disabled={orderTypesMutation.isPending || (!orderTypes.pickup && !orderTypes.shipping)}
                data-testid="button-save-order-types"
              >
                Save Order Types
              </Button>
              {!orderTypes.pickup && !orderTypes.shipping && (
                <p className="text-sm text-destructive">At least one order type must be enabled</p>
              )}
            </CardContent>
          </Card>

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
                  <p className="text-sm text-muted-foreground">If enabled, {labels.catalog.toLowerCase()} prices already include tax</p>
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
        </TabsContent>

        <TabsContent value="payments" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enable Payment Methods</CardTitle>
              <CardDescription>Choose which payment methods to show on your online store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between opacity-60" data-testid="payment-method-stripe">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-stripe">Stripe (Coming soon)</Label>
                  <p className="text-sm text-muted-foreground">
                    Card payment processing isn't built yet — online orders complete via Cash on Delivery or PayPal today.
                  </p>
                </div>
                <Switch
                  id="enable-stripe"
                  checked={false}
                  disabled
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
                onClick={() => paymentMethodsMutation.mutate({ ...paymentMethods, stripe: false })}
                disabled={paymentMethodsMutation.isPending}
                data-testid="button-save-payment-methods"
              >
                Save Payment Methods
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout Preferences</CardTitle>
              <CardDescription>Choose how frequently you want to receive your earnings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

          {/* Stripe Connect Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Account Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your bank account via Stripe to receive automated payouts from your sales. Funds are transferred automatically based on your payout schedule.
              </p>

              {stripeStatus?.connected ? (
                <div className="space-y-3">
                  {stripeStatus.payoutsEnabled ? (
                    <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900 dark:text-green-100">Bank account connected</p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Your account is fully set up and ready to receive payouts.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-amber-900 dark:text-amber-100">Additional information required</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Please complete your onboarding to enable payouts.
                        </p>
                      </div>
                    </div>
                  )}

                  {!stripeStatus.payoutsEnabled && (
                    <Button
                      onClick={() => onboardingLinkMutation.mutate()}
                      disabled={onboardingLinkMutation.isPending}
                      data-testid="button-complete-onboarding"
                    >
                      {onboardingLinkMutation.isPending ? "Generating link..." : "Complete Setup"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">No bank account connected</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Connect your bank account to start receiving automated payouts from your earnings.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => createAccountMutation.mutate()}
                    disabled={createAccountMutation.isPending}
                    data-testid="button-connect-bank"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {createAccountMutation.isPending ? "Setting up..." : "Connect Bank Account"}
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
                <p>
                  • Payouts are processed automatically based on your schedule
                </p>
                <p>
                  • Minimum payout amount: $10
                </p>
                <p>
                  • All payouts are handled securely through Stripe
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Staff />
        </TabsContent>
      </Tabs>
    </div>
  );
}

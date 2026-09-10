import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Restaurant } from "@shared/schema";
import { BUSINESS_TYPE_CONFIG } from "@/lib/businessType";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { LogOut, Save, ExternalLink, Check, ChevronsUpDown, CreditCard, CheckCircle2, AlertCircle, Store } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import { CURRENCIES, TIMEZONES } from "@/lib/countries-currencies";
const BUSINESS_TYPE_LABELS: Record<string, { business: string; store: string; catalog: string }> = {
  restaurant: { business: "Restaurant", store: "restaurant", catalog: "Menu" },
  grocery: { business: "Grocery Store", store: "store", catalog: "Products" },
  pharmacy: { business: "Pharmacy", store: "pharmacy", catalog: "Products" },
  flowers: { business: "Flower Shop", store: "shop", catalog: "Products" },
  retail: { business: "Retail Shop", store: "shop", catalog: "Products" },
};

const restaurantSchema = z.object({
  businessType: z.enum(["restaurant", "grocery", "pharmacy", "flowers", "retail"]),
  name: z.string().min(1, "Business name is required"),
  slug: z.string().min(1, "URL slug is required").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  subdomain: z.string().regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers, and hyphens allowed").optional().or(z.literal("")),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  currency: z.string().min(1, "Currency is required"),
  timezone: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

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

  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
  });

  // Query Stripe Connect status
  const { data: stripeStatus } = useQuery<{
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirementsCurrentlyDue?: string[];
    requirementsEventuallyDue?: string[];
  }>({
    queryKey: ["/api/restaurant/connect/status"],
    enabled: !!restaurant,
  });

  // Create Stripe Connect account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/restaurant/connect/create-account", "POST", {});
    },
    onSuccess: async () => {
      // After creating account, generate onboarding link and redirect
      const linkResponse: any = await apiRequest("/api/restaurant/connect/onboarding-link", "POST", {});
      window.location.href = linkResponse.url;
    },
    onError: () => {
      toast({ title: "Failed to create Stripe account", variant: "destructive" });
    },
  });

  // Generate onboarding link for existing account
  const onboardingLinkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/restaurant/connect/onboarding-link", "POST", {});
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
  // stashed by Signup.tsx) so a brand-new merchant isn't dumped back on
  // "Restaurant" after explicitly picking a different vertical to sign up for.
  const preselectedBusinessType = (() => {
    try {
      const stored = sessionStorage.getItem("eatout_signup_business_type");
      return stored && stored in BUSINESS_TYPE_CONFIG
        ? (stored as keyof typeof BUSINESS_TYPE_CONFIG)
        : "restaurant";
    } catch {
      return "restaurant" as const;
    }
  })();

  const form = useForm({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      businessType: preselectedBusinessType,
      name: "",
      slug: "",
      subdomain: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      currency: "USD",
      timezone: detectedTimezone,
    },
  });

  const businessType = form.watch("businessType") || "restaurant";
  const labels = BUSINESS_TYPE_LABELS[businessType] || BUSINESS_TYPE_LABELS.restaurant;

  useEffect(() => {
    if (restaurant) {
      form.reset({
        businessType: (restaurant.businessType as any) || "restaurant",
        name: restaurant.name || "",
        slug: restaurant.slug || "",
        subdomain: restaurant.subdomain || "",
        description: restaurant.description || "",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        email: restaurant.email || "",
        currency: restaurant.currency || "USD",
        timezone: restaurant.timezone || detectedTimezone,
      });
    }
  }, [restaurant, form, detectedTimezone]);

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof restaurantSchema>) => {
      if (restaurant) {
        return await apiRequest(`/api/restaurants/${restaurant.id}`, "PUT", data);
      } else {
        return await apiRequest("/api/restaurants", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      if (!restaurant) {
        try {
          sessionStorage.removeItem("eatout_signup_business_type");
        } catch {
          // ignore — best-effort cleanup only
        }
      }
      toast({ title: restaurant ? "Settings updated successfully" : `${labels.business} created successfully` });
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

  if (authLoading || isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const storefrontUrl = restaurant?.slug ? `${window.location.origin}/store/${restaurant.slug}` : "";

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            {restaurant ? `Manage your ${labels.store} profile and preferences` : `Complete your ${labels.store} profile to get started`}
          </p>
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

      {!restaurant && (
        <Alert>
          <Store className="h-4 w-4" />
          <AlertTitle>Welcome to EatOut! 🎉</AlertTitle>
          <AlertDescription>
            Let's set up your restaurant profile. Fill out the form below to get started with your online ordering platform.
          </AlertDescription>
        </Alert>
      )}

      {restaurant?.slug && (
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
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="grocery">Grocery Store</SelectItem>
                        <SelectItem value="pharmacy">Pharmacy</SelectItem>
                        <SelectItem value="flowers">Flower Shop</SelectItem>
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
                      <Input {...field} data-testid="input-restaurant-name" />
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
                        <Input {...field} placeholder="myrestaurant" data-testid="input-subdomain" className="flex-1" />
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Currency</FormLabel>
                      <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={currencyOpen}
                              className="w-full justify-between"
                              data-testid="select-currency"
                            >
                              {field.value ? CURRENCIES.find((c) => c.code === field.value)?.code + " - " + CURRENCIES.find((c) => c.code === field.value)?.name + " (" + CURRENCIES.find((c) => c.code === field.value)?.symbol + ")" : "Select currency"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
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
                                      field.onChange(curr.code);
                                      setCurrencyOpen(false);
                                    }}
                                    data-testid={`currency-option-${curr.code}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === curr.code ? "opacity-100" : "opacity-0"
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
              </div>

              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {restaurant && storefrontUrl && (
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

    </div>
  );
}

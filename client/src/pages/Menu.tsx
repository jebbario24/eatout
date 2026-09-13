import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MenuCategory, MenuItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Upload, FileText, DollarSign, Clock, Tag, ImagePlus, Edit, TrendingUp, AlertTriangle, Users, Zap, X, Copy, ListChecks, ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDescription } from "@/components/ui/form";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getBusinessTypeConfig } from "@/lib/businessType";
import { InlineImageUploader } from "@/components/InlineImageUploader";
import { VariantsEditor } from "@/components/menu/VariantsEditor";
import type { UploadResult } from "@uppy/core";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const itemSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  // Sale pricing (Compare-at) — shown as a strikethrough "was" price + a
  // percent-off badge on the storefront when it's higher than the real price.
  compareAtPrice: z.string().optional(),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().default(true),
  prepTimeMinutes: z.string().optional(),
  // Badges/Tags
  tags: z.array(z.string()).optional(),
  // Marketing tactics
  upsellItemIds: z.array(z.string()).optional(),
  crossSellItemIds: z.array(z.string()).optional(),
  downsellItemIds: z.array(z.string()).optional(),
  marketingTactics: z.object({
    enableUrgencyTimer: z.boolean().optional(),
    urgencyTimerMinutes: z.coerce.number().optional(),
    urgencyTimerMessage: z.string().optional(),
    enableScarcityNotice: z.boolean().optional(),
    scarcityThreshold: z.coerce.number().optional(),
    scarcityMessage: z.string().optional(),
    enableSocialProof: z.boolean().optional(),
    socialProofMessage: z.string().optional(),
    socialProofCount: z.coerce.number().optional(),
  }).optional(),
  // Item options/modifiers
  options: z.array(z.object({
    label: z.string(),
    type: z.enum(['single', 'multiple']),
    required: z.boolean(),
    minSelections: z.number().optional(),
    maxSelections: z.number().optional(),
    choices: z.array(z.object({
      label: z.string(),
      priceCents: z.number(),
    })),
    displayOrder: z.number(),
  })).optional(),
  // Vertical-specific fields — which of these apply depends on the store's business type
  attributes: z.object({
    // Pharmacy
    requiresPrescription: z.boolean().optional(),
    activeIngredient: z.string().optional(),
    dosageForm: z.string().optional(),
    packSize: z.string().optional(),
    // Flowers
    occasion: z.string().optional(),
    stemCount: z.string().optional(),
    careInstructions: z.string().optional(),
    // Grocery / Retail
    unit: z.string().optional(),
    requiresRefrigeration: z.boolean().optional(),
    brand: z.string().optional(),
  }).optional(),
  // Merchandising / SEO
  handle: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export default function Menu() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [translations, setTranslations] = useState<Record<string, {name: string, description: string}>>({});

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

  const { data: categories, isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu/categories"],
  });

  const { data: items, isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/items"],
  });

  const { data: restaurant } = useQuery<{ enabledLanguages: string[]; businessType?: string }>({
    queryKey: ["/api/restaurants/me"],
  });

  const businessType = restaurant?.businessType || 'restaurant';
  const businessConfig = getBusinessTypeConfig(businessType);
  const catalogLabel = businessConfig.catalog;
  const itemLabel = businessConfig.item;
  const ItemIcon = businessConfig.icon;
  const itemNamePlaceholder: Record<string, string> = {
    restaurant: 'e.g., Margherita Pizza',
    grocery: 'e.g., Organic Bananas (1kg)',
    pharmacy: 'e.g., Ibuprofen 200mg',
    flowers: 'e.g., Dozen Red Roses',
    retail: 'e.g., Classic White T-Shirt',
  };
  const itemDescriptionPlaceholder = businessType === 'restaurant'
    ? 'Describe your dish, its ingredients, and what makes it special...'
    : `Describe this ${itemLabel.toLowerCase()} and what makes it special...`;

  const categoryForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  });

  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      categoryId: "",
      name: "",
      description: "",
      price: "",
      compareAtPrice: "",
      imageUrl: "",
      isAvailable: true,
      prepTimeMinutes: "",
      tags: [] as string[],
      upsellItemIds: [] as string[],
      crossSellItemIds: [] as string[],
      downsellItemIds: [] as string[],
      marketingTactics: {
        enableUrgencyTimer: false,
        urgencyTimerMinutes: 30,
        urgencyTimerMessage: "",
        enableScarcityNotice: false,
        scarcityThreshold: 5,
        scarcityMessage: "",
        enableSocialProof: false,
        socialProofMessage: "",
        socialProofCount: 0,
      },
      options: [],
      attributes: {},
    },
  });

  useEffect(() => {
    if (editingMenuItem) {
      itemForm.reset({
        categoryId: editingMenuItem.categoryId,
        name: editingMenuItem.name,
        description: editingMenuItem.description || "",
        price: editingMenuItem.price,
        compareAtPrice: editingMenuItem.compareAtPrice || "",
        imageUrl: editingMenuItem.imageUrl || "",
        isAvailable: editingMenuItem.isAvailable,
        prepTimeMinutes: editingMenuItem.prepTimeMinutes ? String(editingMenuItem.prepTimeMinutes) : "",
        tags: editingMenuItem.tags || [],
        upsellItemIds: editingMenuItem.upsellItemIds || [],
        crossSellItemIds: editingMenuItem.crossSellItemIds || [],
        downsellItemIds: editingMenuItem.downsellItemIds || [],
        marketingTactics: editingMenuItem.marketingTactics || {
          enableUrgencyTimer: false,
          urgencyTimerMinutes: 30,
          urgencyTimerMessage: "",
          enableScarcityNotice: false,
          scarcityThreshold: 5,
          scarcityMessage: "",
          enableSocialProof: false,
          socialProofMessage: "",
          socialProofCount: 0,
        },
        options: (editingMenuItem.options as any) || [],
        attributes: (editingMenuItem.attributes as any) || {},
        handle: (editingMenuItem as any).handle || "",
        seoTitle: (editingMenuItem as any).seoTitle || "",
        seoDescription: (editingMenuItem as any).seoDescription || "",
      });
      setItemDialogOpen(true);

      // Load translations for the menu item
      fetch(`/api/translations?entityType=menu_item&entityId=${editingMenuItem.id}`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          // Parse translations into state object grouped by locale
          const translationsByLocale: Record<string, {name: string, description: string}> = {};
          if (Array.isArray(data)) {
            data.forEach((translation: any) => {
              if (!translationsByLocale[translation.locale]) {
                translationsByLocale[translation.locale] = { name: "", description: "" };
              }
              if (translation.field === "name") {
                translationsByLocale[translation.locale].name = translation.value;
              } else if (translation.field === "description") {
                translationsByLocale[translation.locale].description = translation.value;
              }
            });
          }
          setTranslations(translationsByLocale);
        })
        .catch((error) => {
          console.error("Failed to load translations:", error);
          setTranslations({});
        });
    }
  }, [editingMenuItem, itemForm]);

  useEffect(() => {
    if (editingCategory) {
      categoryForm.reset({
        name: editingCategory.name,
        description: editingCategory.description || "",
      });
      setCategoryDialogOpen(true);
    }
  }, [editingCategory, categoryForm]);

  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categorySchema>) => {
      return await apiRequest("/api/menu/categories", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      toast({ title: "Category created successfully" });
      setCategoryDialogOpen(false);
      categoryForm.reset();
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
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof categorySchema> }) => {
      return await apiRequest(`/api/menu/categories/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      toast({ title: "Category updated successfully" });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
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
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/menu/categories/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      toast({ title: "Category deleted successfully" });
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
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof itemSchema>) => {
      const priceValue = data.price?.toString() || '0';
      const priceCents = Math.round(parseFloat(priceValue) * 100);
      
      if (isNaN(priceCents)) {
        throw new Error("Invalid price value");
      }
      const compareAtPriceCents = data.compareAtPrice ? Math.round(parseFloat(data.compareAtPrice) * 100) : null;

      const { price, compareAtPrice, ...dataWithoutPrice } = data;
      const requestBody = {
        ...dataWithoutPrice,
        priceCents,
        compareAtPrice: compareAtPrice || null,
        compareAtPriceCents,
        prepTimeMinutes: data.prepTimeMinutes ? parseInt(data.prepTimeMinutes) : null,
      };
      console.log("[FRONTEND] Sending menu item create request:", requestBody);
      return await apiRequest("/api/menu/items", "POST", requestBody);
    },
    onSuccess: async (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storefront/items"] });
      
      // Save translations if any exist
      const itemId = response.id;
      const translationsToSave = [];
      
      for (const [locale, fields] of Object.entries(translations)) {
        if (fields.name) {
          translationsToSave.push({
            entityType: 'menu_item',
            entityId: itemId,
            locale,
            field: 'name',
            value: fields.name,
          });
        }
        if (fields.description) {
          translationsToSave.push({
            entityType: 'menu_item',
            entityId: itemId,
            locale,
            field: 'description',
            value: fields.description,
          });
        }
      }
      
      if (translationsToSave.length > 0) {
        try {
          await apiRequest("/api/translations/bulk", "POST", translationsToSave);
        } catch (error) {
          console.error("Failed to save translations:", error);
          toast({ 
            title: "Warning", 
            description: `${itemLabel} created but translations failed to save`,
            variant: "destructive"
          });
        }
      }

      toast({ title: `${itemLabel} created successfully` });
      setItemDialogOpen(false);
      setTranslations({});
      itemForm.reset();
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
      toast({ title: `Failed to create ${itemLabel.toLowerCase()}`, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof itemSchema> }) => {
      const priceValue = data.price?.toString() || '0';
      const priceCents = Math.round(parseFloat(priceValue) * 100);
      
      if (isNaN(priceCents)) {
        throw new Error("Invalid price value");
      }
      const compareAtPriceCents = data.compareAtPrice ? Math.round(parseFloat(data.compareAtPrice) * 100) : null;

      const { price, compareAtPrice, ...dataWithoutPrice } = data;
      return await apiRequest(`/api/menu/items/${id}`, "PUT", {
        ...dataWithoutPrice,
        priceCents,
        compareAtPrice: compareAtPrice || null,
        compareAtPriceCents,
        prepTimeMinutes: data.prepTimeMinutes ? parseInt(data.prepTimeMinutes) : null,
      });
    },
    onSuccess: async (_response: any, variables: { id: string; data: z.infer<typeof itemSchema> }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storefront/items"] });
      
      // Save translations if any exist
      const itemId = variables.id;
      const translationsToSave = [];
      
      for (const [locale, fields] of Object.entries(translations)) {
        if (fields.name) {
          translationsToSave.push({
            entityType: 'menu_item',
            entityId: itemId,
            locale,
            field: 'name',
            value: fields.name,
          });
        }
        if (fields.description) {
          translationsToSave.push({
            entityType: 'menu_item',
            entityId: itemId,
            locale,
            field: 'description',
            value: fields.description,
          });
        }
      }
      
      if (translationsToSave.length > 0) {
        try {
          await apiRequest("/api/translations/bulk", "POST", translationsToSave);
        } catch (error) {
          console.error("Failed to save translations:", error);
          toast({ 
            title: "Warning", 
            description: `${itemLabel} updated but translations failed to save`,
            variant: "destructive"
          });
        }
      }

      toast({ title: `${itemLabel} updated successfully` });
      setItemDialogOpen(false);
      setEditingMenuItem(null);
      setTranslations({});
      itemForm.reset();
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
      toast({ title: `Failed to update ${itemLabel.toLowerCase()}`, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/menu/items/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storefront/items"] });
      toast({ title: `${itemLabel} deleted successfully` });
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
      toast({ title: `Failed to delete ${itemLabel.toLowerCase()}`, variant: "destructive" });
    },
  });

  const duplicateItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/menu/items/${id}/duplicate`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storefront/items"] });
      toast({ title: `${itemLabel} duplicated successfully` });
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
      toast({ title: `Failed to duplicate ${itemLabel.toLowerCase()}`, variant: "destructive" });
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

  const handleItemImageComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const file = result.successful[0];
      // Get objectPath from file metadata
      const objectPath = file.meta?.objectPath as string;
      if (objectPath) {
        itemForm.setValue("imageUrl", objectPath);
        toast({ title: "Image uploaded successfully" });
      }
    }
  };

  const filteredItems = selectedCategory
    ? items?.filter((item) => item.categoryId === selectedCategory)
    : items;

  if (authLoading || categoriesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{catalogLabel} Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your {catalogLabel.toLowerCase()} categories and items
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog 
            open={categoryDialogOpen} 
            onOpenChange={(open) => {
              setCategoryDialogOpen(open);
              if (!open) {
                setEditingCategory(null);
                categoryForm.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-add-category">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
                <DialogDescription>
                  {editingCategory ? "Update category information" : `Create a new ${catalogLabel.toLowerCase()} category`}
                </DialogDescription>
              </DialogHeader>
              <Form {...categoryForm}>
                <form onSubmit={categoryForm.handleSubmit((data) => {
                  if (editingCategory) {
                    updateCategoryMutation.mutate({ id: editingCategory.id, data });
                  } else {
                    createCategoryMutation.mutate(data);
                  }
                })} className="space-y-4">
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-category-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={categoryForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-category-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending} 
                      data-testid="button-save-category"
                    >
                      {editingCategory 
                        ? (updateCategoryMutation.isPending ? "Updating..." : "Update Category")
                        : (createCategoryMutation.isPending ? "Creating..." : "Create Category")
                      }
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog 
            open={itemDialogOpen} 
            onOpenChange={(open) => {
              setItemDialogOpen(open);
              if (!open) {
                setEditingMenuItem(null);
                setTranslations({});
                itemForm.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-item">
                <Plus className="mr-2 h-4 w-4" />
                Add {itemLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <ItemIcon className="h-6 w-6 text-primary" />
                  {editingMenuItem ? `Edit ${itemLabel}` : `New ${itemLabel}`}
                </DialogTitle>
                <DialogDescription>
                  {editingMenuItem ? `Update ${itemLabel.toLowerCase()} information` : `Add a new ${itemLabel.toLowerCase()} to your ${catalogLabel.toLowerCase()}`}
                </DialogDescription>
              </DialogHeader>
              <Form {...itemForm}>
                <form onSubmit={itemForm.handleSubmit((data) => {
                  if (editingMenuItem) {
                    updateItemMutation.mutate({ id: editingMenuItem.id, data });
                  } else {
                    createItemMutation.mutate(data);
                  }
                })} className="space-y-6">
                  <Tabs defaultValue="main" className="w-full">
                    <TabsList className="w-full justify-start">
                      <TabsTrigger value="main" data-testid="tab-main" className="gap-2">
                        <ItemIcon className="h-4 w-4" />
                        Main
                      </TabsTrigger>
                      {restaurant?.enabledLanguages && restaurant.enabledLanguages.length > 1 && 
                        restaurant.enabledLanguages
                          .filter(lang => lang !== 'en')
                          .map(locale => (
                            <TabsTrigger 
                              key={locale} 
                              value={locale} 
                              data-testid={`tab-${locale}`}
                              className="gap-2"
                            >
                              <Languages className="h-4 w-4" />
                              {locale.toUpperCase()}
                              {translations[locale]?.name || translations[locale]?.description ? (
                                <Badge variant="secondary" className="ml-1 text-xs">1</Badge>
                              ) : null}
                            </TabsTrigger>
                          ))
                      }
                    </TabsList>

                    <TabsContent value="main" className="space-y-6 mt-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <span>Basic Information</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={itemForm.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-item-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={itemForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{itemLabel} Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={itemNamePlaceholder[businessType] || itemNamePlaceholder.restaurant}
                                data-testid="input-item-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={itemForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Description
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={itemDescriptionPlaceholder}
                              className="min-h-[100px]"
                              data-testid="input-item-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Badges/Tags */}
                    <FormField
                      control={itemForm.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Badges & Tags
                          </FormLabel>
                          <FormDescription>
                            Add badges to highlight special items on your storefront
                          </FormDescription>
                          <FormControl>
                            <div className="flex flex-wrap gap-2" data-testid="input-item-tags">
                              {(businessType === 'restaurant'
                                ? ['Bestseller', 'New', 'Chef\'s Special', 'Popular', 'Spicy', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Limited Time']
                                : ['Bestseller', 'New', 'Popular', 'Limited Time']
                              ).map((tagOption) => {
                                const isSelected = field.value?.includes(tagOption) || false;
                                return (
                                  <div
                                    key={tagOption}
                                    onClick={() => {
                                      const currentTags = field.value || [];
                                      if (isSelected) {
                                        field.onChange(currentTags.filter((t: string) => t !== tagOption));
                                      } else {
                                        field.onChange([...currentTags, tagOption]);
                                      }
                                    }}
                                    className={`cursor-pointer px-3 py-1.5 rounded-md border transition-colors ${
                                      isSelected
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background hover-elevate border-border'
                                    }`}
                                    data-testid={`tag-option-${tagOption.toLowerCase().replace(/\s+/g, '-')}`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <div className={`h-3 w-3 rounded-sm border ${
                                        isSelected 
                                          ? 'bg-primary-foreground border-primary-foreground' 
                                          : 'bg-background border-muted-foreground'
                                      }`}>
                                        {isSelected && (
                                          <svg className="h-full w-full text-primary" fill="currentColor" viewBox="0 0 12 12">
                                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        )}
                                      </div>
                                      <span className="text-sm font-medium">{tagOption}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Photo Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ImagePlus className="h-4 w-4" />
                      <span>Item Photo</span>
                    </div>
                    <FormField
                      control={itemForm.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InlineImageUploader
                              currentImageUrl={field.value}
                              maxFileSize={5242880}
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleItemImageComplete}
                              onRemove={() => field.onChange("")}
                              note="Add an appetizing photo of your dish (max 5MB, JPG or PNG)"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Pricing & Time */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Pricing & Preparation</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={itemForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Price
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00"
                                {...field} 
                                data-testid="input-item-price" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={itemForm.control}
                        name="compareAtPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Compare-at price
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                data-testid="input-item-compare-at-price"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Optional. Set higher than Price to show a sale badge and strikethrough price on the storefront.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {businessType === 'restaurant' && (
                        <FormField
                          control={itemForm.control}
                          name="prepTimeMinutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Preparation Time
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="15"
                                    {...field}
                                    data-testid="input-item-prep-time"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    minutes
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  {businessType !== 'restaurant' && <Separator />}

                  {businessType === 'pharmacy' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Tag className="h-4 w-4" />
                        <span>Pharmacy Details</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="attributes.activeIngredient"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Active Ingredient</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Ibuprofen" {...field} data-testid="input-item-active-ingredient" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="attributes.dosageForm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dosage Form</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Tablet, Syrup" {...field} data-testid="input-item-dosage-form" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="attributes.packSize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pack Size</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 20 tablets" {...field} data-testid="input-item-pack-size" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="attributes.requiresPrescription"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <FormLabel className="!mt-0">Requires Prescription</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-item-requires-prescription" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {businessType === 'flowers' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Tag className="h-4 w-4" />
                        <span>Flower Details</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="attributes.occasion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Occasion</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Birthday, Sympathy, Wedding" {...field} data-testid="input-item-occasion" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="attributes.stemCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stem Count</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 12" {...field} data-testid="input-item-stem-count" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="attributes.careInstructions"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Care Instructions</FormLabel>
                              <FormControl>
                                <Textarea placeholder="e.g. Trim stems, change water every 2 days" {...field} data-testid="input-item-care-instructions" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {(businessType === 'grocery' || businessType === 'retail') && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Tag className="h-4 w-4" />
                        <span>{businessType === 'grocery' ? 'Grocery Details' : 'Product Details'}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="attributes.unit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. per lb, per item, pack of 6" {...field} data-testid="input-item-unit" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="attributes.brand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Brand</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Kraft" {...field} data-testid="input-item-brand" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {businessType === 'grocery' && (
                          <FormField
                            control={itemForm.control}
                            name="attributes.requiresRefrigeration"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 md:col-span-2">
                                <FormLabel className="!mt-0">Requires Refrigeration</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-item-requires-refrigeration" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Marketing Triggers */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span>Marketing Triggers</span>
                    </div>

                    {/* Upsell Items */}
                    <FormField
                      control={itemForm.control}
                      name="upsellItemIds"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-2">
                            <FormLabel className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Upsell Items
                            </FormLabel>
                          </div>
                          <FormDescription className="mb-3">
                            Suggest premium alternatives when this item is viewed
                          </FormDescription>
                          <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                            {items?.filter(item => item.id !== editingMenuItem?.id).map((item) => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, item.id]);
                                    } else {
                                      field.onChange(current.filter(id => id !== item.id));
                                    }
                                  }}
                                  data-testid={`checkbox-upsell-${item.id}`}
                                />
                                <label className="text-sm cursor-pointer flex-1">
                                  {item.name} - ${item.price}
                                </label>
                              </div>
                            ))}
                            {!items?.length && (
                              <p className="text-sm text-muted-foreground">No other items available</p>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cross-Sell Items */}
                    <FormField
                      control={itemForm.control}
                      name="crossSellItemIds"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-2">
                            <FormLabel className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Cross-Sell / Frequently Bought Together
                            </FormLabel>
                          </div>
                          <FormDescription className="mb-3">
                            Suggest complementary items when this item is added to cart
                          </FormDescription>
                          <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                            {items?.filter(item => item.id !== editingMenuItem?.id).map((item) => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, item.id]);
                                    } else {
                                      field.onChange(current.filter(id => id !== item.id));
                                    }
                                  }}
                                  data-testid={`checkbox-cross-sell-${item.id}`}
                                />
                                <label className="text-sm cursor-pointer flex-1">
                                  {item.name} - ${item.price}
                                </label>
                              </div>
                            ))}
                            {!items?.length && (
                              <p className="text-sm text-muted-foreground">No other items available</p>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Downsell Items */}
                    <FormField
                      control={itemForm.control}
                      name="downsellItemIds"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-2">
                            <FormLabel className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Downsell / Drop-Sell Items
                            </FormLabel>
                          </div>
                          <FormDescription className="mb-3">
                            Suggest budget-friendly alternatives if customer hesitates
                          </FormDescription>
                          <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                            {items?.filter(item => item.id !== editingMenuItem?.id).map((item) => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, item.id]);
                                    } else {
                                      field.onChange(current.filter(id => id !== item.id));
                                    }
                                  }}
                                  data-testid={`checkbox-downsell-${item.id}`}
                                />
                                <label className="text-sm cursor-pointer flex-1">
                                  {item.name} - ${item.price}
                                </label>
                              </div>
                            ))}
                            {!items?.length && (
                              <p className="text-sm text-muted-foreground">No other items available</p>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Urgency Timer */}
                    <FormField
                      control={itemForm.control}
                      name="marketingTactics.enableUrgencyTimer"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Urgency Timer
                            </FormLabel>
                            <FormDescription>
                              Show countdown timer to create urgency
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-urgency-timer"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {itemForm.watch("marketingTactics.enableUrgencyTimer") && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <FormField
                          control={itemForm.control}
                          name="marketingTactics.urgencyTimerMinutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration (minutes)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  placeholder="30"
                                  data-testid="input-urgency-timer-minutes"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="marketingTactics.urgencyTimerMessage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Offer ends in"
                                  data-testid="input-urgency-timer-message"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Scarcity Notice */}
                    <FormField
                      control={itemForm.control}
                      name="marketingTactics.enableScarcityNotice"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              Scarcity Notice
                            </FormLabel>
                            <FormDescription>
                              Display low stock warnings
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-scarcity-notice"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {itemForm.watch("marketingTactics.enableScarcityNotice") && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <FormField
                          control={itemForm.control}
                          name="marketingTactics.scarcityThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Low Stock Threshold</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  placeholder="5"
                                  data-testid="input-scarcity-threshold"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="marketingTactics.scarcityMessage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Only X left in stock!"
                                  data-testid="input-scarcity-message"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Social Proof */}
                    <FormField
                      control={itemForm.control}
                      name="marketingTactics.enableSocialProof"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Social Proof Badge
                            </FormLabel>
                            <FormDescription>
                              Show popularity indicators
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-social-proof"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {itemForm.watch("marketingTactics.enableSocialProof") && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <FormField
                          control={itemForm.control}
                          name="marketingTactics.socialProofCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Orders/Views</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  placeholder="127"
                                  data-testid="input-social-proof-count"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="marketingTactics.socialProofMessage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="X people ordered this"
                                  data-testid="input-social-proof-message"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Modifiers & Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ListChecks className="h-4 w-4" />
                        <span>Modifiers & Options</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentOptions = itemForm.getValues("options") || [];
                          itemForm.setValue("options", [
                            ...currentOptions,
                            {
                              label: "",
                              type: "single" as const,
                              required: false,
                              choices: [],
                              displayOrder: currentOptions.length,
                            },
                          ]);
                        }}
                        data-testid="button-add-option-group"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Option Group
                      </Button>
                    </div>

                    <FormDescription>
                      Add modifiers like size, toppings, or special requests to let customers customize this item
                    </FormDescription>

                    {(itemForm.watch("options") as any[])?.map((option: any, optionIndex: number) => (
                      <div key={optionIndex} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">Option Group #{optionIndex + 1}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const currentOptions = itemForm.getValues("options") || [];
                              itemForm.setValue("options", currentOptions.filter((_, i) => i !== optionIndex));
                            }}
                            data-testid={`button-remove-option-group-${optionIndex}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Label</label>
                            <Input
                              placeholder="e.g., Size, Toppings"
                              value={option.label}
                              onChange={(e) => {
                                const currentOptions = itemForm.getValues("options") || [];
                                currentOptions[optionIndex].label = e.target.value;
                                itemForm.setValue("options", [...currentOptions]);
                              }}
                              data-testid={`input-option-label-${optionIndex}`}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <Select
                              value={option.type}
                              onValueChange={(value: "single" | "multiple") => {
                                const currentOptions = itemForm.getValues("options") || [];
                                currentOptions[optionIndex].type = value;
                                itemForm.setValue("options", [...currentOptions]);
                              }}
                            >
                              <SelectTrigger data-testid={`select-option-type-${optionIndex}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Single Choice</SelectItem>
                                <SelectItem value="multiple">Multiple Choice</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 hidden">
                          <Checkbox
                            checked={option.required}
                            onCheckedChange={(checked) => {
                              const currentOptions = itemForm.getValues("options") || [];
                              currentOptions[optionIndex].required = checked as boolean;
                              itemForm.setValue("options", [...currentOptions]);
                            }}
                            data-testid={`checkbox-option-required-${optionIndex}`}
                          />
                          <label className="text-sm">Required (customer must select)</label>
                        </div>

                        {option.type === 'multiple' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Min Selections</label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={option.minSelections || 0}
                                onChange={(e) => {
                                  const currentOptions = itemForm.getValues("options") || [];
                                  currentOptions[optionIndex].minSelections = parseInt(e.target.value) || 0;
                                  itemForm.setValue("options", [...currentOptions]);
                                }}
                                data-testid={`input-option-min-${optionIndex}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Max Selections</label>
                              <Input
                                type="number"
                                placeholder="Unlimited"
                                value={option.maxSelections || ""}
                                onChange={(e) => {
                                  const currentOptions = itemForm.getValues("options") || [];
                                  currentOptions[optionIndex].maxSelections = parseInt(e.target.value) || undefined;
                                  itemForm.setValue("options", [...currentOptions]);
                                }}
                                data-testid={`input-option-max-${optionIndex}`}
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Choices</label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentOptions = itemForm.getValues("options") || [];
                                currentOptions[optionIndex].choices.push({ label: "", priceCents: 0 });
                                itemForm.setValue("options", [...currentOptions]);
                              }}
                              data-testid={`button-add-choice-${optionIndex}`}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add Choice
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {option.choices.map((choice: any, choiceIndex: number) => (
                              <div key={choiceIndex} className="flex gap-2">
                                <Input
                                  placeholder="Choice name"
                                  value={choice.label}
                                  onChange={(e) => {
                                    const currentOptions = itemForm.getValues("options") || [];
                                    currentOptions[optionIndex].choices[choiceIndex].label = e.target.value;
                                    itemForm.setValue("options", [...currentOptions]);
                                  }}
                                  data-testid={`input-choice-label-${optionIndex}-${choiceIndex}`}
                                  className="flex-1"
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={(choice.priceCents / 100).toFixed(2)}
                                  onChange={(e) => {
                                    const currentOptions = itemForm.getValues("options") || [];
                                    currentOptions[optionIndex].choices[choiceIndex].priceCents = Math.round(parseFloat(e.target.value || "0") * 100);
                                    itemForm.setValue("options", [...currentOptions]);
                                  }}
                                  data-testid={`input-choice-price-${optionIndex}-${choiceIndex}`}
                                  className="w-24"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentOptions = itemForm.getValues("options") || [];
                                    currentOptions[optionIndex].choices.splice(choiceIndex, 1);
                                    itemForm.setValue("options", [...currentOptions]);
                                  }}
                                  data-testid={`button-remove-choice-${optionIndex}-${choiceIndex}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                    </TabsContent>

                    {/* Translation tabs for each enabled language */}
                    {restaurant?.enabledLanguages && restaurant.enabledLanguages.length > 1 && 
                      restaurant.enabledLanguages
                        .filter(lang => lang !== 'en')
                        .map(locale => (
                          <TabsContent key={locale} value={locale} className="space-y-6 mt-6">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Languages className="h-4 w-4" />
                                <span>Translate the {itemLabel.toLowerCase()} into {locale}</span>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Name ({locale.toUpperCase()})</label>
                                  <Input
                                    value={translations[locale]?.name || ""}
                                    onChange={(e) => {
                                      setTranslations(prev => ({
                                        ...prev,
                                        [locale]: {
                                          ...prev[locale],
                                          name: e.target.value,
                                          description: prev[locale]?.description || "",
                                        }
                                      }));
                                    }}
                                    placeholder={`Enter ${locale} translation for item name`}
                                    data-testid={`input-translation-name-${locale}`}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Description ({locale.toUpperCase()})</label>
                                  <Textarea
                                    value={translations[locale]?.description || ""}
                                    onChange={(e) => {
                                      setTranslations(prev => ({
                                        ...prev,
                                        [locale]: {
                                          name: prev[locale]?.name || "",
                                          description: e.target.value,
                                        }
                                      }));
                                    }}
                                    placeholder={`Enter ${locale} translation for item description`}
                                    className="min-h-[100px]"
                                    data-testid={`input-translation-description-${locale}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        ))
                    }
                  </Tabs>

                  {/* Merchandising / SEO */}
                  <div className="rounded-lg border p-4 space-y-4">
                    <p className="text-sm font-semibold">Search engine listing</p>
                    <FormField
                      control={itemForm.control}
                      name="handle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL handle</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="auto-generated from the name" className="font-mono text-sm" data-testid="input-item-handle" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="seoTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO title</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} maxLength={70} placeholder={itemForm.watch("name") || "Page title"} data-testid="input-item-seo-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="seoDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta description</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} maxLength={320} className="min-h-[70px]" data-testid="input-item-seo-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <VariantsEditor menuItemId={editingMenuItem?.id} />

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setItemDialogOpen(false)}
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createItemMutation.isPending || updateItemMutation.isPending} 
                      data-testid="button-save-item"
                      className="gap-2"
                    >
                      {editingMenuItem 
                        ? (updateItemMutation.isPending ? "Updating..." : "Update Item")
                        : (createItemMutation.isPending ? "Creating..." : "Create Item")
                      }
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          onClick={() => setSelectedCategory(null)}
          data-testid="filter-all"
        >
          All Items
        </Button>
        {categories?.map((category) => (
          <div key={category.id} className="relative group">
            <Button
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              data-testid={`filter-${category.name.toLowerCase()}`}
              className="pr-20"
            >
              {category.name}
            </Button>
            <div className="absolute top-1/2 -translate-y-1/2 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategory(category);
                }}
                data-testid={`button-edit-category-${category.id}`}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCategoryMutation.mutate(category.id);
                }}
                disabled={deleteCategoryMutation.isPending}
                data-testid={`button-delete-category-${category.id}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {itemsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredItems && filteredItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover-elevate overflow-hidden group relative" data-testid={`menu-item-${item.id}`}>
              <div className="aspect-video w-full overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(`Failed to load image for ${item.name}:`, item.imageUrl);
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-full h-full bg-muted/30 flex items-center justify-center"
                  style={{ display: item.imageUrl ? 'none' : 'flex' }}
                >
                  <ImagePlus className="h-16 w-16 text-muted-foreground/30" />
                </div>
              </div>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <Badge variant={item.isAvailable ? "default" : "secondary"}>
                    {item.isAvailable ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {item.description || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    ${parseFloat(item.price).toFixed(2)}
                  </span>
                  {item.prepTimeMinutes && (
                    <span className="text-sm text-muted-foreground">
                      {item.prepTimeMinutes} min
                    </span>
                  )}
                </div>
              </CardContent>
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingMenuItem(item)}
                  data-testid={`button-edit-menuitem-${item.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => duplicateItemMutation.mutate(item.id)}
                  disabled={duplicateItemMutation.isPending}
                  data-testid={`button-duplicate-menuitem-${item.id}`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteItemMutation.mutate(item.id)}
                  disabled={deleteItemMutation.isPending}
                  data-testid={`button-delete-menuitem-${item.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {selectedCategory ? `No ${itemLabel.toLowerCase()}s in this category` : `No ${itemLabel.toLowerCase()}s yet`}
            </p>
            <Button onClick={() => setItemDialogOpen(true)} data-testid="button-add-first-item">
              <Plus className="mr-2 h-4 w-4" />
              Add First {itemLabel}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

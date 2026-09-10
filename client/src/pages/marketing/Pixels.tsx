import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, Facebook, Sparkles, BarChart3, TrendingUp } from "lucide-react";
import { SiTiktok, SiGoogle } from "react-icons/si";

const pixelSchema = z.object({
  metaPixelId: z.string().optional(),
  tiktokPixelId: z.string().optional(),
  googleAnalyticsId: z.string().optional(),
  googleAdsId: z.string().optional(),
});

type PixelFormData = z.infer<typeof pixelSchema>;

interface Restaurant {
  id: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
}

export default function Pixels() {
  const { toast } = useToast();

  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants/me'],
  });

  const form = useForm<PixelFormData>({
    resolver: zodResolver(pixelSchema),
    defaultValues: {
      metaPixelId: restaurant?.metaPixelId || "",
      tiktokPixelId: restaurant?.tiktokPixelId || "",
      googleAnalyticsId: restaurant?.googleAnalyticsId || "",
      googleAdsId: restaurant?.googleAdsId || "",
    },
    values: {
      metaPixelId: restaurant?.metaPixelId || "",
      tiktokPixelId: restaurant?.tiktokPixelId || "",
      googleAnalyticsId: restaurant?.googleAnalyticsId || "",
      googleAdsId: restaurant?.googleAdsId || "",
    },
  });

  const updatePixelsMutation = useMutation({
    mutationFn: async (data: PixelFormData) => {
      if (!restaurant?.id) throw new Error("Restaurant not found");
      return apiRequest(`/api/restaurants/${restaurant.id}/pixels`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants/me'] });
      toast({
        title: "Success",
        description: "Pixel settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pixel settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PixelFormData) => {
    updatePixelsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pixels & Tracking</h1>
        <p className="text-muted-foreground">
          Connect your marketing pixels to track customer behavior and measure campaign performance
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Meta Pixel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                Meta Pixel (Facebook)
              </CardTitle>
              <CardDescription>
                Track visitors and conversions from Facebook and Instagram ads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="metaPixelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pixel ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="123456789012345" 
                        {...field}
                        data-testid="input-meta-pixel-id"
                      />
                    </FormControl>
                    <FormDescription>
                      Find your Pixel ID in Meta Events Manager
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* TikTok Pixel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiTiktok className="h-5 w-5" />
                TikTok Pixel
              </CardTitle>
              <CardDescription>
                Measure the effectiveness of your TikTok advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="tiktokPixelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pixel ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="C9XXXXXXXXXXXXXXXXXX" 
                        {...field}
                        data-testid="input-tiktok-pixel-id"
                      />
                    </FormControl>
                    <FormDescription>
                      Find your Pixel ID in TikTok Events Manager
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Google Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                Google Analytics 4
              </CardTitle>
              <CardDescription>
                Understand how customers interact with your online storefront
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="googleAnalyticsId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Measurement ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="G-XXXXXXXXXX" 
                        {...field}
                        data-testid="input-google-analytics-id"
                      />
                    </FormControl>
                    <FormDescription>
                      Find your Measurement ID in Google Analytics Admin
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Google Ads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiGoogle className="h-5 w-5" />
                Google Ads Conversion
              </CardTitle>
              <CardDescription>
                Track conversions and ROI from Google Ads campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="googleAdsId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversion ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="AW-XXXXXXXXXX" 
                        {...field}
                        data-testid="input-google-ads-id"
                      />
                    </FormControl>
                    <FormDescription>
                      Find your Conversion ID in Google Ads under Tools & Settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updatePixelsMutation.isPending}
              data-testid="button-save-pixels"
            >
              {updatePixelsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Pixel Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

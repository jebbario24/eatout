import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, Shield, Info, Copy, Check } from "lucide-react";

const verificationSchema = z.object({
  metaVerificationCode: z.string().optional(),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

interface Restaurant {
  id: string;
  metaVerificationCode?: string;
  subdomain?: string;
  customDomain?: string;
}

export default function DomainVerification() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants/me'],
  });

  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      metaVerificationCode: restaurant?.metaVerificationCode || "",
    },
    values: {
      metaVerificationCode: restaurant?.metaVerificationCode || "",
    },
  });

  const updateVerificationMutation = useMutation({
    mutationFn: async (data: VerificationFormData) => {
      if (!restaurant?.id) throw new Error("Restaurant not found");
      return apiRequest(`/api/restaurants/${restaurant.id}/domain-verification`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants/me'] });
      toast({
        title: "Success",
        description: "Domain verification settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update domain verification settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VerificationFormData) => {
    updateVerificationMutation.mutate(data);
  };

  const copyToClipboard = () => {
    const domain = restaurant?.customDomain || restaurant?.subdomain || "";
    navigator.clipboard.writeText(domain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentDomain = restaurant?.customDomain || restaurant?.subdomain || "your-store.eatout.app";

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Domain Verification</h1>
        <p className="text-muted-foreground">
          Verify your domain ownership for Meta Business Manager
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Current Domain</AlertTitle>
        <AlertDescription className="flex items-center gap-2 mt-2">
          <code className="bg-muted px-2 py-1 rounded text-sm">{currentDomain}</code>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={copyToClipboard}
            data-testid="button-copy-domain"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            How to Verify Your Domain with Meta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Step 1: Get Your Verification Code</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-2">
              <li>Go to <a href="https://business.facebook.com/settings/owned-domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta Business Settings</a></li>
              <li>Click "Add" under Brand Safety → Domains</li>
              <li>Enter your domain: <code className="bg-muted px-1 rounded">{currentDomain}</code></li>
              <li>Choose "Add meta tag to website" verification method</li>
              <li>Copy the verification meta tag code</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Step 2: Add Verification Code Below</h3>
            <p className="text-sm text-muted-foreground">
              Paste only the <code className="bg-muted px-1 rounded">content</code> attribute value from the meta tag
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Step 3: Verify in Meta</h3>
            <p className="text-sm text-muted-foreground">
              After saving, return to Meta Business Settings and click "Verify" to complete the process
            </p>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meta Verification Code</CardTitle>
              <CardDescription>
                The meta tag will be automatically added to your storefront's HTML
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="metaVerificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="abcdef1234567890abcdef1234567890abcdef12"
                        className="font-mono text-sm"
                        rows={3}
                        {...field}
                        data-testid="input-meta-verification-code"
                      />
                    </FormControl>
                    <FormDescription>
                      Example from meta tag: <code className="bg-muted px-1 rounded text-xs">
                        &lt;meta name="facebook-domain-verification" content="<span className="text-primary">your_code_here</span>" /&gt;
                      </code>
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
              disabled={updateVerificationMutation.isPending}
              data-testid="button-save-verification"
            >
              {updateVerificationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Verification Code
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

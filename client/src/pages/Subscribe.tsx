import { useEffect, useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Calendar, LogIn } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Don't throw at module load time — that would crash the entire app bundle
// (this file is imported eagerly from App.tsx) for pages that have nothing
// to do with billing. Missing key is handled where it's actually used below.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

type PlanType = 'withTrial' | 'immediate';

const SubscribeForm = ({ selectedPlan }: { selectedPlan: PlanType }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const planLabel = selectedPlan === 'withTrial' ? '7-day free trial - $79/month' : '$79/month - Start Immediately';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!stripe || isProcessing}
        data-testid="button-subscribe"
      >
        {isProcessing ? "Processing..." : `Subscribe Now - ${planLabel}`}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [initError, setInitError] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<{
    isSubscriptionActive?: boolean;
    isTrialActive?: boolean;
    trialEndsAt?: string;
  }>({
    queryKey: ['/api/subscription-status'],
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  const initializeSubscription = async (planType: PlanType) => {
    if (!subscriptionStatus) return;

    if (subscriptionStatus?.isSubscriptionActive) {
      // Already subscribed, redirect to dashboard
      window.location.href = "/dashboard";
      return;
    }

    try {
      setInitError(false);
      const res = await apiRequest("/api/create-subscription", "POST", { planType });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    } catch (error) {
      setInitError(true);
      toast({
        title: "Error",
        description: "Failed to initialize subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePlanSelect = (planType: PlanType) => {
    setSelectedPlan(planType);
    initializeSubscription(planType);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Show plan selection for unauthenticated users
  if (!isAuthenticated) {
    const features = [
      "Complete business management platform",
      "Online ordering with custom domain",
      "Payment processing (Stripe, PayPal, Apple Pay, Google Pay)",
      "Real-time analytics and reports",
      "Menu, orders, tables, staff, and inventory management"
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="max-w-6xl mx-auto space-y-6 py-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-display font-bold">Subscribe to EatOut</h1>
            <p className="text-lg text-muted-foreground">
              Choose your plan and sign in to get started
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mt-12">
            {/* Plan 1: With Trial */}
            <Card className="relative border-2 border-primary">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                Recommended
              </Badge>
              <CardHeader>
                <CardTitle className="text-2xl">Standard Plan</CardTitle>
                <CardDescription className="text-lg">For Restaurants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-primary/10 p-6 rounded-lg space-y-2">
                  <p className="text-3xl font-bold text-primary">7-day free trial</p>
                  <p className="text-2xl font-semibold">$79/month</p>
                  <p className="text-sm text-muted-foreground">after trial period</p>
                </div>

                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{feature}</p>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => window.location.href = '/login'}
                  data-testid="button-select-plan-trial"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In to Choose
                </Button>
              </CardContent>
            </Card>

            {/* Plan 2: Immediate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Immediate Access Plan</CardTitle>
                <CardDescription className="text-lg">For Restaurants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-primary/10 p-6 rounded-lg space-y-2">
                  <p className="text-3xl font-bold text-primary">$79/month</p>
                  <p className="text-sm text-muted-foreground">Start immediately - No trial</p>
                </div>

                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{feature}</p>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  variant="outline"
                  onClick={() => window.location.href = '/login'}
                  data-testid="button-select-plan-immediate"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In to Choose
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="text-sm text-center text-muted-foreground mt-8">
            New to EatOut? Signing in will create your account automatically.
          </p>
        </div>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Calculate trial days left
  const trialDaysLeft = subscriptionStatus?.trialEndsAt 
    ? Math.ceil((new Date(subscriptionStatus.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // Show error state with retry option
  if (initError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Initialization Failed</CardTitle>
            <CardDescription>
              We couldn't initialize your subscription. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => {
                setInitError(false);
                setSelectedPlan(null);
                setClientSecret("");
              }}
              className="w-full"
              data-testid="button-retry-subscription"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading only when a plan is selected but client secret is not ready yet
  if (selectedPlan && !clientSecret) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const features = [
    "Complete business management platform",
    "Online ordering with custom domain",
    "Payment processing (Stripe, PayPal, Apple Pay, Google Pay)",
    "Real-time analytics and reports",
    "Menu, orders, tables, staff, and inventory management"
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          {subscriptionStatus?.isTrialActive 
            ? `You have ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your trial. Subscribe now to ensure uninterrupted service.`
            : "Select a plan to continue using EatOut"}
        </p>
      </div>

      {subscriptionStatus?.isTrialActive && (
        <div className="bg-primary/10 p-4 rounded-lg flex items-center gap-2 max-w-2xl mx-auto">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-primary">Trial Active</p>
            <p className="text-sm text-muted-foreground">Subscribe early and your trial will continue until it expires</p>
          </div>
        </div>
      )}

      {!selectedPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Plan 1: With Trial */}
          <Card className="relative border-2 border-primary">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
              Recommended
            </Badge>
            <CardHeader>
              <CardTitle className="text-2xl">Standard Plan</CardTitle>
              <CardDescription className="text-lg">For Restaurants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/10 p-6 rounded-lg space-y-2">
                <p className="text-3xl font-bold text-primary">7-day free trial</p>
                <p className="text-2xl font-semibold">$79/month</p>
                <p className="text-sm text-muted-foreground">after trial period</p>
              </div>

              <div className="space-y-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{feature}</p>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handlePlanSelect('withTrial')}
                data-testid="button-select-plan-trial"
              >
                Choose Plan
              </Button>
            </CardContent>
          </Card>

          {/* Plan 2: Immediate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Immediate Access Plan</CardTitle>
              <CardDescription className="text-lg">For Restaurants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/10 p-6 rounded-lg space-y-2">
                <p className="text-3xl font-bold text-primary">$79/month</p>
                <p className="text-sm text-muted-foreground">Start immediately - No trial</p>
              </div>

              <div className="space-y-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{feature}</p>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full" 
                size="lg"
                variant="outline"
                onClick={() => handlePlanSelect('immediate')}
                data-testid="button-select-plan-immediate"
              >
                Choose Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedPlan && clientSecret && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium">
              Selected Plan: {selectedPlan === 'withTrial' ? 'Standard Plan (7-day free trial - $79/month)' : 'Immediate Access Plan ($79/month)'}
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedPlan(null);
                setClientSecret("");
              }}
              className="mt-2"
            >
              Change Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stripePromise ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <SubscribeForm selectedPlan={selectedPlan} />
                  </Elements>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Payments aren't configured yet (missing VITE_STRIPE_PUBLIC_KEY).
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
                <CardDescription>Everything you need to run your restaurant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-3xl font-bold text-primary">$79</p>
                  <p className="text-sm text-muted-foreground">per month, billed monthly</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Complete Restaurant Management</p>
                      <p className="text-sm text-muted-foreground">Menu, orders, tables, staff, inventory</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Online Ordering</p>
                      <p className="text-sm text-muted-foreground">Accept orders via custom domain</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Payment Processing</p>
                      <p className="text-sm text-muted-foreground">Stripe, PayPal, Google Pay, Apple Pay</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Analytics & Reports</p>
                      <p className="text-sm text-muted-foreground">Track sales and performance</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

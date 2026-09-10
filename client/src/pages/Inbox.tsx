import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Star, CheckCircle2, Mail, Phone, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CustomerReview, InboxMessage } from "@shared/schema";

export default function Inbox() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [reviewResponses, setReviewResponses] = useState<Record<string, string>>({});

  // Fetch real inbox messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<InboxMessage[]>({
    queryKey: ["/api/inbox/messages"],
  });

  // Fetch real reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<CustomerReview[]>({
    queryKey: ["/api/reviews"],
  });

  const isLoading = messagesLoading || reviewsLoading;

  // Respond to review mutation
  const respondToReviewMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      return await apiRequest(`/api/reviews/${reviewId}/respond`, "POST", { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "Success", description: "Review response submitted successfully" });
      setReviewResponses({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit review response",
        variant: "destructive",
      });
    },
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest(`/api/inbox/messages/${messageId}/status`, "PATCH", { status: 'read' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] });
    },
  });

  const unreadCount = messages.filter(m => m.status === 'new').length;
  const unansweredReviews = reviews.filter(r => !r.response).length;

  const handleRespondToReview = (reviewId: string) => {
    const response = reviewResponses[reviewId];
    if (!response || !response.trim()) {
      toast({
        title: "Error",
        description: "Please enter a response",
        variant: "destructive",
      });
      return;
    }
    respondToReviewMutation.mutate({ reviewId, response });
  };

  // Create mock resolutions from cancelled/refunded orders (keeping this as-is for now)
  const resolutions: any[] = [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inbox & Reviews</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer messages, reviews, and support resolution
        </p>
      </div>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList>
          <TabsTrigger value="messages" data-testid="tab-messages">
            Messages
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">
            Reviews
            {unansweredReviews > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unansweredReviews} new
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolution" data-testid="tab-resolution">Resolution Log</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : messages.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customer messages yet</p>
                  <p className="text-sm mt-2">Customer inquiries from orders will appear here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <Card 
                  key={message.id} 
                  className={message.status === 'new' ? 'border-primary' : ''}
                  data-testid={`message-${message.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {message.customerName?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{message.customerName || 'Unknown'}</CardTitle>
                            {message.status === 'new' && (
                              <Badge variant="default" className="text-xs">New</Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            {message.customerPhone && (
                              <>
                                <Phone className="h-3 w-3" />
                                {message.customerPhone}
                              </>
                            )}
                            {message.customerEmail && (
                              <span className="ml-2">{message.customerEmail}</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.createdAt || 0), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      {message.subject && <strong className="block mb-1">{message.subject}</strong>}
                      <p className="text-muted-foreground">{message.message}</p>
                    </div>
                    {message.response && (
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-2 font-medium">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Your Response
                        </div>
                        <p className="text-muted-foreground">{message.response}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {message.status === 'new' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => markAsReadMutation.mutate(message.id)}
                          data-testid={`button-mark-read-${message.id}`}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : reviews.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customer reviews yet</p>
                  <p className="text-sm mt-2">Reviews from completed orders will appear here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <Card key={review.id} data-testid={`review-${review.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {review.customerName?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{review.customerName || 'Anonymous'}</CardTitle>
                          <CardDescription>
                            {review.orderId && `Order #${review.orderId.substring(0, 8)}`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.createdAt || 0), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {review.comment && <p className="text-sm">{review.comment}</p>}
                    {review.response ? (
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-2 font-medium">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Your Response
                        </div>
                        <p className="text-muted-foreground">
                          {review.response}
                        </p>
                        {review.respondedAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Responded on {format(new Date(review.respondedAt), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Textarea 
                          placeholder="Write a response to this review..." 
                          className="min-h-20"
                          value={reviewResponses[review.id] || ''}
                          onChange={(e) => setReviewResponses(prev => ({
                            ...prev,
                            [review.id]: e.target.value
                          }))}
                          data-testid={`input-review-response-${review.id}`}
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleRespondToReview(review.id)}
                          disabled={respondToReviewMutation.isPending}
                          data-testid={`button-respond-${review.id}`}
                        >
                          {respondToReviewMutation.isPending ? 'Sending...' : 'Send Response'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolution" className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : resolutions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No resolution cases</p>
                  <p className="text-sm mt-2">Order issues and resolutions will be tracked here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Resolution Log</CardTitle>
                <CardDescription>
                  Track of resolved customer issues and support tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resolutions.map((resolution) => (
                    <div 
                      key={resolution.id} 
                      className="flex gap-4 p-4 border rounded-lg"
                      data-testid={`resolution-${resolution.id}`}
                    >
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{resolution.issue}</p>
                            <p className="text-sm text-muted-foreground">
                              Order #{resolution.orderNumber} - {resolution.customerName}
                            </p>
                          </div>
                          <Badge variant="default" className="bg-green-500">
                            {resolution.status}
                          </Badge>
                        </div>
                        <p className="text-sm">{resolution.resolution}</p>
                        <p className="text-xs text-muted-foreground">
                          Resolved on {format(new Date(resolution.createdAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

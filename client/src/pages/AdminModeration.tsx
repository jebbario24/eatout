import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Eye,
  EyeOff,
  Trash2,
  MoreHorizontal,
  Star,
  Reply,
} from "lucide-react";

export default function AdminModeration() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<{ type: string; review: any } | null>(null);
  const [responseText, setResponseText] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['/api/admin/reviews', statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? '/api/admin/reviews' 
        : `/api/admin/reviews?status=${statusFilter}`;
      return fetch(url).then(res => res.json());
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ reviewId, isPublished }: { reviewId: string; isPublished: boolean }) => {
      return apiRequest('POST', `/api/admin/reviews/${reviewId}/status`, { isPublished });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      toast({
        title: "Review Updated",
        description: "The review status has been updated successfully.",
      });
      setSelectedAction(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update review",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest('DELETE', `/api/admin/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      toast({
        title: "Review Deleted",
        description: "The review has been permanently deleted.",
      });
      setSelectedAction(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete review",
      });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      return apiRequest('POST', `/api/admin/reviews/${reviewId}/respond`, { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      toast({
        title: "Response Added",
        description: "Your response has been added to the review.",
      });
      setSelectedAction(null);
      setResponseText("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add response",
      });
    },
  });

  const stats = {
    total: reviews.length,
    published: reviews.filter((r: any) => r.isPublished).length,
    hidden: reviews.filter((r: any) => !r.isPublished).length,
    avgRating: reviews.length > 0 
      ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0',
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const handlePublish = (review: any) => {
    updateStatusMutation.mutate({ reviewId: review.id, isPublished: true });
  };

  const handleHide = (review: any) => {
    updateStatusMutation.mutate({ reviewId: review.id, isPublished: false });
  };

  const handleDelete = (review: any) => {
    setSelectedAction({ type: 'delete', review });
  };

  const handleRespond = (review: any) => {
    setResponseText(review.response || "");
    setSelectedAction({ type: 'respond', review });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <p className="text-muted-foreground">
          Manage and moderate customer reviews across all merchants
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-reviews">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground">
              All customer reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-published-reviews">
              {stats.published}
            </div>
            <p className="text-xs text-muted-foreground">
              Visible to customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hidden</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-hidden-reviews">
              {stats.hidden}
            </div>
            <p className="text-xs text-muted-foreground">
              Not visible to customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-rating">
              {stats.avgRating} / 5.0
            </div>
            <p className="text-xs text-muted-foreground">
              Platform average
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Customer Reviews</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review: any) => (
                <TableRow key={review.id} data-testid={`row-review-${review.id}`}>
                  <TableCell className="font-medium" data-testid={`text-merchant-${review.id}`}>
                    {review.merchantName}
                  </TableCell>
                  <TableCell data-testid={`text-customer-${review.id}`}>
                    {review.customerName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" data-testid={`rating-${review.id}`}>
                      {getRatingStars(review.rating)}
                      <span className="ml-1 text-sm text-muted-foreground">
                        ({review.rating})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" data-testid={`text-comment-${review.id}`}>
                      {review.comment || '-'}
                    </div>
                    {review.response && (
                      <div className="mt-1 text-xs text-muted-foreground italic">
                        Response: {review.response}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {review.isPublished ? (
                      <Badge variant="default" className="bg-green-500" data-testid={`badge-published-${review.id}`}>
                        <Eye className="w-3 h-3 mr-1" />Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" data-testid={`badge-hidden-${review.id}`}>
                        <EyeOff className="w-3 h-3 mr-1" />Hidden
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell data-testid={`text-date-${review.id}`}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          data-testid={`button-actions-${review.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {review.isPublished ? (
                          <DropdownMenuItem 
                            onClick={() => handleHide(review)}
                            data-testid="action-hide"
                          >
                            <EyeOff className="mr-2 h-4 w-4" />
                            Hide Review
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handlePublish(review)}
                            data-testid="action-publish"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Publish Review
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem 
                          onClick={() => handleRespond(review)}
                          data-testid="action-respond"
                        >
                          <Reply className="mr-2 h-4 w-4" />
                          {review.response ? 'Edit Response' : 'Add Response'}
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => handleDelete(review)}
                          className="text-destructive"
                          data-testid="action-delete"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Review
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {reviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No reviews found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedAction?.type === 'delete' && (
        <AlertDialog open onOpenChange={() => setSelectedAction(null)}>
          <AlertDialogContent data-testid="dialog-delete-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Review</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the review from {selectedAction.review.customerName} 
                for {selectedAction.review.merchantName}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteMutation.mutate(selectedAction.review.id)}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Review'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedAction?.type === 'respond' && (
        <Dialog open onOpenChange={() => { setSelectedAction(null); setResponseText(""); }}>
          <DialogContent data-testid="dialog-respond">
            <DialogHeader>
              <DialogTitle>
                {selectedAction.review.response ? 'Edit Response' : 'Add Response'}
              </DialogTitle>
              <DialogDescription>
                Respond to {selectedAction.review.customerName}'s review for {selectedAction.review.merchantName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Review</Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-1 mb-2">
                    {getRatingStars(selectedAction.review.rating)}
                  </div>
                  <p className="text-sm">{selectedAction.review.comment}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="response">Response</Label>
                <Textarea
                  id="response"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Enter your response to this review..."
                  rows={4}
                  data-testid="input-response"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => { setSelectedAction(null); setResponseText(""); }}
                data-testid="button-cancel-respond"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => respondMutation.mutate({ 
                  reviewId: selectedAction.review.id, 
                  response: responseText 
                })}
                disabled={respondMutation.isPending || !responseText.trim()}
                data-testid="button-confirm-respond"
              >
                {respondMutation.isPending ? 'Saving...' : 'Save Response'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

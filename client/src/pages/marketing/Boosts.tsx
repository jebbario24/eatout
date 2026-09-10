import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Eye, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Boost = {
  id: string;
  item: string;
  startTime: string;
  endTime: string;
  creditsUsed: number;
  impressions: number;
  clicks: number;
  ctr: number;
  isActive: boolean;
};

// Helper function to format 24-hour time to 12-hour format for display
const formatTime = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function Boosts() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [boosts, setBoosts] = useState<Boost[]>([
    {
      id: '1',
      item: 'Signature Burger',
      startTime: '12:00',
      endTime: '14:00',
      creditsUsed: 15,
      impressions: 342,
      clicks: 89,
      ctr: 26.0,
      isActive: true,
    },
    {
      id: '2',
      item: 'Special Pizza',
      startTime: '18:00',
      endTime: '20:00',
      creditsUsed: 20,
      impressions: 487,
      clicks: 134,
      ctr: 27.5,
      isActive: true,
    },
    {
      id: '3',
      item: 'Weekend Brunch',
      startTime: '10:00',
      endTime: '12:00',
      creditsUsed: 10,
      impressions: 256,
      clicks: 67,
      ctr: 26.2,
      isActive: false,
    },
  ]);

  // Edit boost dialog state
  const [editBoostDialogOpen, setEditBoostDialogOpen] = useState(false);
  const [editingBoost, setEditingBoost] = useState<Boost | null>(null);
  const [boostInputs, setBoostInputs] = useState({
    creditsUsed: '',
  });

  // Create boost dialog state
  const [createBoostDialogOpen, setCreateBoostDialogOpen] = useState(false);
  const [newBoost, setNewBoost] = useState({
    item: '',
    startTime: '',
    endTime: '',
    isActive: true,
  });
  const [newBoostInputs, setNewBoostInputs] = useState({
    creditsUsed: '',
  });

  const dailyCredits = 50;
  const creditsUsed = boosts.filter(b => b.isActive).reduce((sum, b) => sum + b.creditsUsed, 0);
  const creditsRemaining = dailyCredits - creditsUsed;
  const totalImpressions = boosts.reduce((sum, b) => sum + b.impressions, 0);

  // Edit boost handlers
  const handleEditBoostClick = (boost: Boost) => {
    setEditingBoost({ ...boost });
    setBoostInputs({
      creditsUsed: boost.creditsUsed.toString(),
    });
    setEditBoostDialogOpen(true);
  };

  const handleSaveBoostEdit = () => {
    if (editingBoost) {
      const creditsUsed = parseInt(boostInputs.creditsUsed);
      
      // Validate
      if (!editingBoost.item || editingBoost.item.trim() === '') {
        toast({
          variant: "destructive",
          title: "Invalid Item",
          description: "Item name is required.",
        });
        return;
      }
      if (!editingBoost.startTime || !editingBoost.endTime) {
        toast({
          variant: "destructive",
          title: "Invalid Time",
          description: "Start and end times are required.",
        });
        return;
      }
      if (isNaN(creditsUsed) || creditsUsed < 1) {
        toast({
          variant: "destructive",
          title: "Invalid Credits",
          description: "Credits per hour must be at least 1.",
        });
        return;
      }
      
      const updatedBoosts = boosts.map(b => 
        b.id === editingBoost.id ? { ...editingBoost, creditsUsed } : b
      );
      setBoosts(updatedBoosts);
      setEditBoostDialogOpen(false);
      setEditingBoost(null);
      
      toast({
        title: "Boost Updated",
        description: "The boost has been updated successfully.",
      });
    }
  };

  const handleCancelBoostEdit = () => {
    setEditBoostDialogOpen(false);
    setEditingBoost(null);
  };

  // Create boost handlers
  const handleScheduleBoostClick = () => {
    setNewBoost({
      item: '',
      startTime: '',
      endTime: '',
      isActive: true,
    });
    setNewBoostInputs({
      creditsUsed: '10',
    });
    setCreateBoostDialogOpen(true);
  };

  const handleSaveNewBoost = () => {
    const creditsUsed = parseInt(newBoostInputs.creditsUsed);
    
    // Validate
    if (!newBoost.item || newBoost.item.trim() === '') {
      toast({
        variant: "destructive",
        title: "Invalid Item",
        description: "Item name is required.",
      });
      return;
    }
    if (!newBoost.startTime || !newBoost.endTime) {
      toast({
        variant: "destructive",
        title: "Invalid Time",
        description: "Start and end times are required.",
      });
      return;
    }
    if (isNaN(creditsUsed) || creditsUsed < 1) {
      toast({
        variant: "destructive",
        title: "Invalid Credits",
        description: "Credits per hour must be at least 1.",
      });
      return;
    }
    
    const newBoostEntry: Boost = {
      id: Date.now().toString(),
      item: newBoost.item,
      startTime: newBoost.startTime,
      endTime: newBoost.endTime,
      creditsUsed,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      isActive: newBoost.isActive,
    };
    
    setBoosts([...boosts, newBoostEntry]);
    setCreateBoostDialogOpen(false);
    
    toast({
      title: "Boost Scheduled",
      description: "Your new boost has been scheduled successfully.",
    });
  };

  const handleCancelNewBoost = () => {
    setCreateBoostDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Boosts</h1>
          <p className="text-muted-foreground mt-1">
            Featured placement with FREE daily credits
          </p>
        </div>
        <Button 
          onClick={handleScheduleBoostClick}
          data-testid="button-schedule-boost"
        >
          <Zap className="h-4 w-4 mr-2" />
          Schedule Boost
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Credits</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-daily-credits">
              {dailyCredits}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Free every day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-credits-remaining">
              {creditsRemaining}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Resets daily
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-impressions">
              {totalImpressions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Boosts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-boosts">
              {boosts.filter(b => b.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently running
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How Boosts Work</CardTitle>
          <CardDescription>Maximize visibility during peak hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">Free Daily Credits</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Get {dailyCredits} free credits every day to boost your items. No payment required.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">Featured Placement</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Boosted items appear at the top of search results and category pages.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">Schedule Timing</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose peak hours when customers are most likely to order.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Boosts</CardTitle>
          <CardDescription>Manage your featured item placements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {boosts.map((boost) => (
              <div 
                key={boost.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
                data-testid={`boost-${boost.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{boost.item}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(boost.startTime)} - {formatTime(boost.endTime)} ({boost.creditsUsed} credits/hour)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{boost.impressions} impressions</p>
                    <p className="text-xs text-muted-foreground">{boost.ctr.toFixed(1)}% CTR</p>
                  </div>
                  {boost.isActive ? (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditBoostClick(boost)}
                    data-testid={`button-edit-boost-${boost.id}`}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Boost Dialog */}
      <Dialog open={editBoostDialogOpen} onOpenChange={setEditBoostDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-boost">
          <DialogHeader>
            <DialogTitle>Edit Boost</DialogTitle>
            <DialogDescription>
              Update the boost settings below
            </DialogDescription>
          </DialogHeader>
          {editingBoost && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-boost-item">Menu Item</Label>
                <Input
                  id="edit-boost-item"
                  value={editingBoost.item}
                  onChange={(e) => setEditingBoost({ ...editingBoost, item: e.target.value })}
                  placeholder="Signature Burger"
                  data-testid="input-edit-boost-item"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-boost-start-time">Start Time</Label>
                  <Input
                    id="edit-boost-start-time"
                    type="time"
                    value={editingBoost.startTime}
                    onChange={(e) => setEditingBoost({ ...editingBoost, startTime: e.target.value })}
                    data-testid="input-edit-boost-start-time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-boost-end-time">End Time</Label>
                  <Input
                    id="edit-boost-end-time"
                    type="time"
                    value={editingBoost.endTime}
                    onChange={(e) => setEditingBoost({ ...editingBoost, endTime: e.target.value })}
                    data-testid="input-edit-boost-end-time"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-boost-credits">Credits per Hour</Label>
                <Input
                  id="edit-boost-credits"
                  type="number"
                  value={boostInputs.creditsUsed}
                  onChange={(e) => setBoostInputs({ ...boostInputs, creditsUsed: e.target.value })}
                  placeholder="10"
                  min="1"
                  data-testid="input-edit-boost-credits"
                />
                <p className="text-xs text-muted-foreground">
                  Credits consumed per hour this boost is active
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="edit-boost-active">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable or disable this boost
                    </p>
                  </div>
                  <Switch
                    id="edit-boost-active"
                    checked={editingBoost.isActive}
                    onCheckedChange={(checked) => setEditingBoost({ ...editingBoost, isActive: checked })}
                    data-testid="switch-edit-boost-active"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelBoostEdit}
              data-testid="button-cancel-boost-edit"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveBoostEdit}
              data-testid="button-save-boost-edit"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule New Boost Dialog */}
      <Dialog open={createBoostDialogOpen} onOpenChange={setCreateBoostDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-schedule-boost">
          <DialogHeader>
            <DialogTitle>Schedule New Boost</DialogTitle>
            <DialogDescription>
              Create a new featured placement for your menu item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-boost-item">Menu Item</Label>
              <Input
                id="new-boost-item"
                value={newBoost.item}
                onChange={(e) => setNewBoost({ ...newBoost, item: e.target.value })}
                placeholder="Signature Burger"
                data-testid="input-new-boost-item"
              />
              <p className="text-xs text-muted-foreground">
                Name of the menu item to boost
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-boost-start-time">Start Time</Label>
                <Input
                  id="new-boost-start-time"
                  type="time"
                  value={newBoost.startTime}
                  onChange={(e) => setNewBoost({ ...newBoost, startTime: e.target.value })}
                  data-testid="input-new-boost-start-time"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-boost-end-time">End Time</Label>
                <Input
                  id="new-boost-end-time"
                  type="time"
                  value={newBoost.endTime}
                  onChange={(e) => setNewBoost({ ...newBoost, endTime: e.target.value })}
                  data-testid="input-new-boost-end-time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-boost-credits">Credits per Hour</Label>
              <Input
                id="new-boost-credits"
                type="number"
                value={newBoostInputs.creditsUsed}
                onChange={(e) => setNewBoostInputs({ ...newBoostInputs, creditsUsed: e.target.value })}
                placeholder="10"
                min="1"
                data-testid="input-new-boost-credits"
              />
              <p className="text-xs text-muted-foreground">
                Credits consumed per hour ({creditsRemaining} remaining today)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="new-boost-active">Start Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Begin boosting immediately when scheduled
                  </p>
                </div>
                <Switch
                  id="new-boost-active"
                  checked={newBoost.isActive}
                  onCheckedChange={(checked) => setNewBoost({ ...newBoost, isActive: checked })}
                  data-testid="switch-new-boost-active"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelNewBoost}
              data-testid="button-cancel-new-boost"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNewBoost}
              data-testid="button-save-new-boost"
            >
              Schedule Boost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

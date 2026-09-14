import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, Share2, Gift, TrendingUp, Users } from "lucide-react";
import { SiFacebook, SiInstagram, SiX } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getBusinessTypeConfig } from "@/lib/businessType";

interface Merchant {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  businessType?: string;
}

interface ReferralStats {
  totalReferrals: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

interface SocialChannel {
  name: string;
  icon: any;
  shares: number;
  clicks: number;
  orders: number;
  isConnected: boolean;
}

interface ReferralRewards {
  referrerReward: number;
  newCustomerReward: number;
}

export default function Social() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qrCodeRef = useRef<HTMLDivElement>(null);

  // Fetch merchant data
  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchants/me"],
  });
  const businessConfig = getBusinessTypeConfig(merchant?.businessType);

  // Generate storefront URL
  const getStorefrontUrl = () => {
    if (!merchant) return "";
    
    if (merchant.customDomain) {
      return `https://${merchant.customDomain}`;
    } else if (merchant.subdomain) {
      return `https://${merchant.subdomain}.eatout.app`;
    } else {
      return `${window.location.origin}/store/${merchant.slug}`;
    }
  };

  const storefrontUrl = getStorefrontUrl();

  const [qrScans, setQrScans] = useState(287);
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 145,
    conversions: 87,
    revenue: 3450,
    conversionRate: 60.0,
  });

  const [socialChannels, setSocialChannels] = useState<SocialChannel[]>([
    {
      name: 'Facebook',
      icon: SiFacebook,
      shares: 342,
      clicks: 876,
      orders: 45,
      isConnected: true,
    },
    {
      name: 'Instagram',
      icon: SiInstagram,
      shares: 567,
      clicks: 1234,
      orders: 78,
      isConnected: true,
    },
    {
      name: 'Twitter',
      icon: SiX,
      shares: 189,
      clicks: 423,
      orders: 23,
      isConnected: false,
    },
  ]);

  const [referralRewards, setReferralRewards] = useState<ReferralRewards>({
    referrerReward: 5,
    newCustomerReward: 10,
  });

  // Dialog states
  const [editStatsDialogOpen, setEditStatsDialogOpen] = useState(false);
  const [editQrScansDialogOpen, setEditQrScansDialogOpen] = useState(false);
  const [editChannelDialogOpen, setEditChannelDialogOpen] = useState(false);
  const [editRewardsDialogOpen, setEditRewardsDialogOpen] = useState(false);

  // Editing states
  const [editingStats, setEditingStats] = useState<ReferralStats | null>(null);
  const [statsInputs, setStatsInputs] = useState({ totalReferrals: '', conversions: '', revenue: '', conversionRate: '' });
  
  const [editingQrScans, setEditingQrScans] = useState<string>('');
  
  const [editingChannel, setEditingChannel] = useState<SocialChannel | null>(null);
  const [channelInputs, setChannelInputs] = useState({ shares: '', clicks: '', orders: '' });
  
  const [editingRewards, setEditingRewards] = useState<ReferralRewards | null>(null);
  const [rewardsInputs, setRewardsInputs] = useState({ referrerReward: '', newCustomerReward: '' });

  // Edit Stats handlers
  const handleEditStats = () => {
    setEditingStats({ ...referralStats });
    setStatsInputs({
      totalReferrals: referralStats.totalReferrals.toString(),
      conversions: referralStats.conversions.toString(),
      revenue: referralStats.revenue.toString(),
      conversionRate: referralStats.conversionRate.toString(),
    });
    setEditStatsDialogOpen(true);
  };

  const handleSaveStats = () => {
    if (!editingStats) return;

    // Validate
    const totalReferrals = parseInt(statsInputs.totalReferrals);
    const conversions = parseInt(statsInputs.conversions);
    const revenue = parseFloat(statsInputs.revenue);
    const conversionRate = parseFloat(statsInputs.conversionRate);

    if (isNaN(totalReferrals) || totalReferrals < 0) {
      toast({ variant: "destructive", title: "Invalid total referrals", description: "Must be a number >= 0" });
      return;
    }
    if (isNaN(conversions) || conversions < 0) {
      toast({ variant: "destructive", title: "Invalid conversions", description: "Must be a number >= 0" });
      return;
    }
    if (isNaN(revenue) || revenue < 0) {
      toast({ variant: "destructive", title: "Invalid revenue", description: "Must be a number >= 0" });
      return;
    }
    if (isNaN(conversionRate) || conversionRate < 0 || conversionRate > 100) {
      toast({ variant: "destructive", title: "Invalid conversion rate", description: "Must be between 0 and 100" });
      return;
    }

    setReferralStats({
      totalReferrals,
      conversions,
      revenue,
      conversionRate,
    });

    setEditStatsDialogOpen(false);
    toast({ title: "Success", description: "Referral stats updated successfully" });
  };

  const handleCancelStatsEdit = () => {
    setEditStatsDialogOpen(false);
    setEditingStats(null);
  };

  // Edit QR Scans handlers
  const handleEditQrScans = () => {
    setEditingQrScans(qrScans.toString());
    setEditQrScansDialogOpen(true);
  };

  const handleSaveQrScans = () => {
    const scans = parseInt(editingQrScans);
    if (isNaN(scans) || scans < 0) {
      toast({ variant: "destructive", title: "Invalid QR scans", description: "Must be a number >= 0" });
      return;
    }

    setQrScans(scans);
    setEditQrScansDialogOpen(false);
    toast({ title: "Success", description: "QR code scans updated successfully" });
  };

  const handleCancelQrScansEdit = () => {
    setEditQrScansDialogOpen(false);
    setEditingQrScans('');
  };

  // Edit Social Channel handlers
  const handleEditChannel = (channel: SocialChannel) => {
    setEditingChannel({ ...channel });
    setChannelInputs({
      shares: channel.shares.toString(),
      clicks: channel.clicks.toString(),
      orders: channel.orders.toString(),
    });
    setEditChannelDialogOpen(true);
  };

  const handleSaveChannel = () => {
    if (!editingChannel) return;

    const shares = parseInt(channelInputs.shares);
    const clicks = parseInt(channelInputs.clicks);
    const orders = parseInt(channelInputs.orders);

    if (isNaN(shares) || shares < 0) {
      toast({ variant: "destructive", title: "Invalid shares", description: "Must be a number >= 0" });
      return;
    }
    if (isNaN(clicks) || clicks < 0) {
      toast({ variant: "destructive", title: "Invalid clicks", description: "Must be a number >= 0" });
      return;
    }
    if (isNaN(orders) || orders < 0) {
      toast({ variant: "destructive", title: "Invalid orders", description: "Must be a number >= 0" });
      return;
    }

    setSocialChannels(prev => prev.map(ch =>
      ch.name === editingChannel.name
        ? { ...editingChannel, shares, clicks, orders }
        : ch
    ));

    setEditChannelDialogOpen(false);
    toast({ title: "Success", description: `${editingChannel.name} channel updated successfully` });
  };

  const handleCancelChannelEdit = () => {
    setEditChannelDialogOpen(false);
    setEditingChannel(null);
  };

  // Edit Referral Rewards handlers
  const handleEditRewards = () => {
    setEditingRewards({ ...referralRewards });
    setRewardsInputs({
      referrerReward: referralRewards.referrerReward.toString(),
      newCustomerReward: referralRewards.newCustomerReward.toString(),
    });
    setEditRewardsDialogOpen(true);
  };

  const handleSaveRewards = () => {
    if (!editingRewards) return;

    const referrerReward = parseFloat(rewardsInputs.referrerReward);
    const newCustomerReward = parseFloat(rewardsInputs.newCustomerReward);

    if (isNaN(referrerReward) || referrerReward < 0) {
      toast({ variant: "destructive", title: "Invalid referrer reward", description: "Must be a number >= 0" });
      return;
    }
    if (isNaN(newCustomerReward) || newCustomerReward < 0 || newCustomerReward > 100) {
      toast({ variant: "destructive", title: "Invalid new customer reward", description: "Must be between 0 and 100" });
      return;
    }

    setReferralRewards({
      referrerReward,
      newCustomerReward,
    });

    setEditRewardsDialogOpen(false);
    toast({ title: "Success", description: "Referral rewards updated successfully" });
  };

  const handleCancelRewardsEdit = () => {
    setEditRewardsDialogOpen(false);
    setEditingRewards(null);
  };

  // Action handlers
  const handleGenerateQR = () => {
    toast({ title: "QR Code Generated", description: "Your QR code has been generated successfully" });
  };

  const handleDownloadQR = () => {
    if (!qrCodeRef.current || !merchant) return;

    // Get the SVG element
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) {
      toast({ 
        title: "Error", 
        description: "QR code not found. Please wait for it to load.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      // Convert SVG to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Canvas context not available");
      }

      // Set canvas size (larger for better quality)
      const size = 1024;
      canvas.width = size;
      canvas.height = size;

      // Add white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);

      // Convert SVG to image with proper encoding
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
      const img = new Image();

      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, size, size);

          // Download as PNG
          canvas.toBlob((blob) => {
            if (!blob) {
              toast({ 
                title: "Error", 
                description: "Failed to generate image", 
                variant: "destructive" 
              });
              return;
            }
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${merchant.name.replace(/\s+/g, '-')}-qr-code.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            
            toast({ title: "Downloaded", description: "QR code saved successfully" });
          });
        } catch (error) {
          console.error('Error during canvas conversion:', error);
          toast({ 
            title: "Error", 
            description: "Failed to convert QR code to image", 
            variant: "destructive" 
          });
        }
      };

      img.onerror = () => {
        toast({ 
          title: "Error", 
          description: "Failed to load QR code image", 
          variant: "destructive" 
        });
      };

      img.src = `data:image/svg+xml;base64,${svgBase64}`;
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({ 
        title: "Error", 
        description: "Failed to download QR code", 
        variant: "destructive" 
      });
    }
  };

  const handlePrintTableTents = () => {
    if (!merchant || !storefrontUrl) return;

    // HTML escape function
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const escapedName = escapeHtml(merchant.name);
    const escapedUrl = escapeHtml(storefrontUrl);

    // Generate print-friendly table tent HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapedName} - Table Tent</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; }
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: white;
            }
            .table-tent {
              text-align: center;
              padding: 40px;
              border: 2px dashed #ccc;
              max-width: 600px;
            }
            h1 {
              font-size: 32px;
              margin-bottom: 10px;
              color: #333;
            }
            .subtitle {
              font-size: 18px;
              color: #666;
              margin-bottom: 30px;
            }
            .qr-container {
              background: white;
              padding: 20px;
              display: inline-block;
              margin: 20px 0;
            }
            .instructions {
              font-size: 16px;
              color: #666;
              margin-top: 20px;
            }
            .url-display {
              font-size: 12px;
              color: #999;
              margin-top: 10px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="table-tent">
            <h1>${escapedName}</h1>
            <p class="subtitle">Scan to View Menu & Order</p>
            <div class="qr-container" id="qr-container"></div>
            <p class="instructions">
              Point your phone camera at the QR code<br>
              to browse our menu and place an order
            </p>
            <p class="url-display">${escapedUrl}</p>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <script>
            const canvas = document.createElement('canvas');
            document.getElementById('qr-container').appendChild(canvas);
            QRCode.toCanvas(canvas, '${escapedUrl}', {
              width: 300,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    toast({ title: "Print Ready", description: `QR code points to: ${storefrontUrl}` });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://eatout.app/ref/ABC123");
    toast({ title: "Link Copied", description: "Referral link copied to clipboard" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Social Share</h1>
          <p className="text-muted-foreground mt-1">
            QR codes, referral links, and social media posts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateQR} data-testid="button-generate-qr">
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR
          </Button>
          <Button onClick={handleEditStats} data-testid="button-create-referral">
            <Share2 className="h-4 w-4 mr-2" />
            Edit Stats
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover-elevate cursor-pointer" onClick={handleEditStats}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-referrals">
              {referralStats.totalReferrals}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={handleEditStats}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversions">
              {referralStats.conversions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {referralStats.conversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={handleEditStats}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral Revenue</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-referral-revenue">
              ${referralStats.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From referred customers
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={handleEditQrScans}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Code Scans</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-qr-scans">
              {qrScans}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>QR Code Generator</CardTitle>
          <CardDescription>
            Create QR codes for table ordering and menu browsing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div 
              ref={qrCodeRef}
              className="h-48 w-48 border-2 rounded-lg flex items-center justify-center bg-white p-3"
              data-testid="qr-code-preview"
            >
              {storefrontUrl ? (
                <QRCodeSVG
                  value={storefrontUrl}
                  size={168}
                  level="H"
                  includeMargin={true}
                />
              ) : (
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold mb-2">{businessConfig.catalog} QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Customers can scan this code to view your {businessConfig.catalog.toLowerCase()} and place orders directly
                </p>
                {storefrontUrl && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                    {storefrontUrl}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleDownloadQR} 
                  disabled={!storefrontUrl}
                  data-testid="button-download-qr"
                >
                  Download QR Code
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handlePrintTableTents}
                  disabled={!storefrontUrl}
                  data-testid="button-print-table-tents"
                >
                  Print Table Tents
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Media Sharing</CardTitle>
          <CardDescription>
            Track performance across social platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {socialChannels.map((channel) => (
              <div 
                key={channel.name} 
                className="flex items-center justify-between p-4 border rounded-lg"
                data-testid={`social-${channel.name.toLowerCase()}`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <channel.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{channel.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {channel.shares} shares • {channel.clicks} clicks • {channel.orders} orders
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {channel.isConnected ? (
                    <Badge variant="default" className="bg-green-500">Connected</Badge>
                  ) : (
                    <Badge variant="secondary">Not Connected</Badge>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditChannel(channel)}
                    data-testid={`button-edit-${channel.name.toLowerCase()}`}
                  >
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Referral Program</CardTitle>
              <CardDescription>
                Reward customers for bringing friends
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleEditRewards} data-testid="button-edit-rewards">
              Edit Rewards
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Referrer Reward</p>
                <p className="text-sm text-muted-foreground">When friend makes first order</p>
              </div>
              <Badge variant="outline" className="text-lg" data-testid="text-referrer-reward">
                ${referralRewards.referrerReward} Credit
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">New Customer Reward</p>
                <p className="text-sm text-muted-foreground">Referred friend gets discount</p>
              </div>
              <Badge variant="outline" className="text-lg" data-testid="text-new-customer-reward">
                {referralRewards.newCustomerReward}% Off
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Referral Link</p>
                <p className="text-sm text-muted-foreground">Share with customers</p>
              </div>
              <Button size="sm" onClick={handleCopyLink} data-testid="button-copy-link">
                Copy Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Referral Stats Dialog */}
      <Dialog open={editStatsDialogOpen} onOpenChange={setEditStatsDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-stats">
          <DialogHeader>
            <DialogTitle>Edit Referral Statistics</DialogTitle>
            <DialogDescription>
              Update your referral program metrics
            </DialogDescription>
          </DialogHeader>
          {editingStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-total-referrals">Total Referrals</Label>
                  <Input
                    id="edit-total-referrals"
                    type="number"
                    value={statsInputs.totalReferrals}
                    onChange={(e) => setStatsInputs({ ...statsInputs, totalReferrals: e.target.value })}
                    placeholder="145"
                    min="0"
                    data-testid="input-edit-total-referrals"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-conversions">Conversions</Label>
                  <Input
                    id="edit-conversions"
                    type="number"
                    value={statsInputs.conversions}
                    onChange={(e) => setStatsInputs({ ...statsInputs, conversions: e.target.value })}
                    placeholder="87"
                    min="0"
                    data-testid="input-edit-conversions"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-revenue">Revenue ($)</Label>
                  <Input
                    id="edit-revenue"
                    type="number"
                    value={statsInputs.revenue}
                    onChange={(e) => setStatsInputs({ ...statsInputs, revenue: e.target.value })}
                    placeholder="3450"
                    min="0"
                    step="0.01"
                    data-testid="input-edit-revenue"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-conversion-rate">Conversion Rate (%)</Label>
                  <Input
                    id="edit-conversion-rate"
                    type="number"
                    value={statsInputs.conversionRate}
                    onChange={(e) => setStatsInputs({ ...statsInputs, conversionRate: e.target.value })}
                    placeholder="60.0"
                    min="0"
                    max="100"
                    step="0.1"
                    data-testid="input-edit-conversion-rate"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelStatsEdit} data-testid="button-cancel-stats">
              Cancel
            </Button>
            <Button onClick={handleSaveStats} data-testid="button-save-stats">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit QR Scans Dialog */}
      <Dialog open={editQrScansDialogOpen} onOpenChange={setEditQrScansDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-qr-scans">
          <DialogHeader>
            <DialogTitle>Edit QR Code Scans</DialogTitle>
            <DialogDescription>
              Update the number of QR code scans this month
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-qr-scans">QR Code Scans</Label>
              <Input
                id="edit-qr-scans"
                type="number"
                value={editingQrScans}
                onChange={(e) => setEditingQrScans(e.target.value)}
                placeholder="287"
                min="0"
                data-testid="input-edit-qr-scans"
              />
              <p className="text-xs text-muted-foreground">
                Number of times customers scanned your QR codes
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelQrScansEdit} data-testid="button-cancel-qr-scans">
              Cancel
            </Button>
            <Button onClick={handleSaveQrScans} data-testid="button-save-qr-scans">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Social Channel Dialog */}
      <Dialog open={editChannelDialogOpen} onOpenChange={setEditChannelDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-channel">
          <DialogHeader>
            <DialogTitle>Configure {editingChannel?.name}</DialogTitle>
            <DialogDescription>
              Update performance metrics and connection status
            </DialogDescription>
          </DialogHeader>
          {editingChannel && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-shares">Shares</Label>
                  <Input
                    id="edit-shares"
                    type="number"
                    value={channelInputs.shares}
                    onChange={(e) => setChannelInputs({ ...channelInputs, shares: e.target.value })}
                    placeholder="342"
                    min="0"
                    data-testid="input-edit-shares"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-clicks">Clicks</Label>
                  <Input
                    id="edit-clicks"
                    type="number"
                    value={channelInputs.clicks}
                    onChange={(e) => setChannelInputs({ ...channelInputs, clicks: e.target.value })}
                    placeholder="876"
                    min="0"
                    data-testid="input-edit-clicks"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-orders">Orders</Label>
                  <Input
                    id="edit-orders"
                    type="number"
                    value={channelInputs.orders}
                    onChange={(e) => setChannelInputs({ ...channelInputs, orders: e.target.value })}
                    placeholder="45"
                    min="0"
                    data-testid="input-edit-orders"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="edit-connected">Connected</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable integration with {editingChannel.name}
                    </p>
                  </div>
                  <Switch
                    id="edit-connected"
                    checked={editingChannel.isConnected}
                    onCheckedChange={(checked) => setEditingChannel({ ...editingChannel, isConnected: checked })}
                    data-testid="switch-edit-connected"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelChannelEdit} data-testid="button-cancel-channel">
              Cancel
            </Button>
            <Button onClick={handleSaveChannel} data-testid="button-save-channel">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Referral Rewards Dialog */}
      <Dialog open={editRewardsDialogOpen} onOpenChange={setEditRewardsDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-rewards">
          <DialogHeader>
            <DialogTitle>Edit Referral Rewards</DialogTitle>
            <DialogDescription>
              Configure rewards for referrers and new customers
            </DialogDescription>
          </DialogHeader>
          {editingRewards && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-referrer-reward">Referrer Reward ($)</Label>
                <Input
                  id="edit-referrer-reward"
                  type="number"
                  value={rewardsInputs.referrerReward}
                  onChange={(e) => setRewardsInputs({ ...rewardsInputs, referrerReward: e.target.value })}
                  placeholder="5"
                  min="0"
                  step="0.01"
                  data-testid="input-edit-referrer-reward"
                />
                <p className="text-xs text-muted-foreground">
                  Credit given to customer who refers a friend
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-new-customer-reward">New Customer Discount (%)</Label>
                <Input
                  id="edit-new-customer-reward"
                  type="number"
                  value={rewardsInputs.newCustomerReward}
                  onChange={(e) => setRewardsInputs({ ...rewardsInputs, newCustomerReward: e.target.value })}
                  placeholder="10"
                  min="0"
                  max="100"
                  step="0.1"
                  data-testid="input-edit-new-customer-reward"
                />
                <p className="text-xs text-muted-foreground">
                  Percentage discount for referred customers
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRewardsEdit} data-testid="button-cancel-rewards">
              Cancel
            </Button>
            <Button onClick={handleSaveRewards} data-testid="button-save-rewards">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

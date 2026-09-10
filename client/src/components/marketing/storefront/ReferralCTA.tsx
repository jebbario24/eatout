import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, Check, Share2 } from "lucide-react";
import { useState } from "react";

interface ReferralData {
  referralLink: string;
  referrerReward: string;
  refereeReward: string;
  totalReferrals: number;
  referralRevenue: number;
}

interface ReferralCTAProps {
  referralData: ReferralData | null;
  enabled: boolean;
}

export function ReferralCTA({ referralData, enabled }: ReferralCTAProps) {
  const [copied, setCopied] = useState(false);

  if (!enabled || !referralData) {
    return null;
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this amazing restaurant!',
        text: `Get ${referralData.refereeReward} off your first order!`,
        url: referralData.referralLink,
      });
    }
  };

  return (
    <div className="mb-12" data-testid="referral-cta">
      <Card className="bg-gradient-to-r from-primary/10 to-background border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 flex-wrap md:flex-nowrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold">Refer & Earn</h3>
              </div>

              <p className="text-muted-foreground mb-4">
                Give {referralData.refereeReward} to your friends and get {referralData.referrerReward} for each successful referral!
              </p>

              <div className="flex gap-2">
                <Input
                  value={referralData.referralLink}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-referral-link"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                {'share' in navigator && (
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="shrink-0"
                    data-testid="button-share"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {referralData.totalReferrals > 0 && (
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-primary">{referralData.totalReferrals}</span>
                    <span className="text-muted-foreground ml-1">referrals</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div>
                    <span className="font-semibold text-green-600">${referralData.referralRevenue.toFixed(2)}</span>
                    <span className="text-muted-foreground ml-1">earned</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

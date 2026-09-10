import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  Tag, 
  TrendingUp, 
  MessageSquare, 
  Share2, 
  Zap,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Marketing() {
  const { t } = useTranslation();

  const marketingTools = [
    {
      title: "Smart Promos",
      description: "Create auto-discount rules with intelligent conditions",
      icon: Tag,
      url: "/marketing/promos",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      title: "Boosts",
      description: "Featured placement with FREE daily credits",
      icon: Zap,
      url: "/marketing/boosts",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Upsells",
      description: "Smart add-to-cart suggestions and cross-sell rules",
      icon: TrendingUp,
      url: "/marketing/upsells",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Automated Messages",
      description: "Push notifications, SMS, and email templates",
      icon: MessageSquare,
      url: "/marketing/messages",
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10"
    },
    {
      title: "Social Share",
      description: "QR codes, referral links, and social media posts",
      icon: Share2,
      url: "/marketing/social",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10"
    },
    {
      title: "Bundles & Combos",
      description: "Create combo deals with special pricing",
      icon: Gift,
      url: "/marketing/bundles",
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketing Suite</h1>
        <p className="text-muted-foreground mt-1">
          Free marketing tools to grow your restaurant — all included with your subscription
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {marketingTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.url} href={tool.url}>
              <Card className="hover-elevate active-elevate-2 cursor-pointer h-full">
                <CardHeader>
                  <div className={`h-12 w-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-3`}>
                    <Icon className={`h-6 w-6 ${tool.color}`} />
                  </div>
                  <CardTitle className="text-lg">{tool.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="w-full" data-testid={`button-${tool.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    Open →
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Why Use Our Marketing Tools?</CardTitle>
          <CardDescription>
            All these features are included FREE with your subscription — tools that other platforms charge extra for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-primary mt-0.5" />
              <span><strong>Free Daily Boosts:</strong> Get featured placement credits every day</span>
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
              <span><strong>Analytics Included:</strong> Track performance, ROI, and customer insights</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

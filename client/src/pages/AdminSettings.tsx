import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, DollarSign, Clock, Shield, Zap } from "lucide-react";

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  valueType: string;
  description: string | null;
  category: string;
  isEditable: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data: settings = [], isLoading } = useQuery<PlatformSetting[]>({
    queryKey: ['/api/admin/settings'],
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return await apiRequest(`/api/admin/settings/${key}`, 'PATCH', { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: "Setting Updated",
        description: "Platform setting has been successfully updated.",
      });
      setEditedValues({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update setting.",
        variant: "destructive",
      });
    },
  });

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (setting: PlatformSetting) => {
    const newValue = editedValues[setting.key] ?? setting.value;
    updateSettingMutation.mutate({ key: setting.key, value: newValue });
  };

  const handleToggle = (setting: PlatformSetting, checked: boolean) => {
    updateSettingMutation.mutate({ key: setting.key, value: String(checked) });
  };

  const renderSettingInput = (setting: PlatformSetting) => {
    const currentValue = editedValues[setting.key] ?? setting.value;
    const hasChanged = editedValues[setting.key] !== undefined && editedValues[setting.key] !== setting.value;

    if (setting.valueType === 'boolean') {
      return (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor={setting.key}>{setting.description || setting.key}</Label>
            <p className="text-xs text-muted-foreground mt-1">Key: {setting.key}</p>
          </div>
          <Switch
            id={setting.key}
            checked={setting.value === 'true'}
            onCheckedChange={(checked) => handleToggle(setting, checked)}
            disabled={!setting.isEditable || updateSettingMutation.isPending}
            data-testid={`switch-${setting.key}`}
          />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={setting.key}>{setting.description || setting.key}</Label>
        <p className="text-xs text-muted-foreground">Key: {setting.key}</p>
        <div className="flex gap-2">
          <Input
            id={setting.key}
            type={setting.valueType === 'number' ? 'number' : 'text'}
            value={currentValue}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            disabled={!setting.isEditable}
            step={setting.valueType === 'number' ? '0.01' : undefined}
            data-testid={`input-${setting.key}`}
          />
          {hasChanged && (
            <Button
              onClick={() => handleSave(setting)}
              disabled={updateSettingMutation.isPending}
              data-testid={`button-save-${setting.key}`}
            >
              Save
            </Button>
          )}
        </div>
        {setting.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(setting.updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'billing':
        return <DollarSign className="h-4 w-4" />;
      case 'features':
        return <Zap className="h-4 w-4" />;
      case 'limits':
        return <Shield className="h-4 w-4" />;
      case 'general':
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const categories = [...new Set(settings.map(s => s.category))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Manage global platform configuration</p>
      </div>

      <Tabs defaultValue={categories[0] || 'general'}>
        <TabsList>
          {categories.map(category => (
            <TabsTrigger key={category} value={category} data-testid={`tab-${category}`}>
              <span className="flex items-center gap-2">
                {getCategoryIcon(category)}
                <span className="capitalize">{category}</span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid gap-4">
              {settings
                .filter(s => s.category === category)
                .map(setting => (
                  <Card key={setting.id} data-testid={`card-setting-${setting.key}`}>
                    <CardContent className="pt-6">
                      {renderSettingInput(setting)}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {settings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No platform settings configured
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, MessageSquare, Smartphone, TrendingUp } from "lucide-react";

type MessageTemplate = {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  trigger: string;
  sent: number;
  openRate: number;
  isActive: boolean;
};

export default function Messages() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<MessageTemplate[]>([
    {
      id: '1',
      name: 'Order Confirmed',
      type: 'email',
      trigger: 'Order Placed',
      sent: 542,
      openRate: 89.3,
      isActive: true,
    },
    {
      id: '2',
      name: 'Out for Delivery',
      type: 'push',
      trigger: 'Order Shipped',
      sent: 487,
      openRate: 76.4,
      isActive: true,
    },
    {
      id: '3',
      name: 'Order Delivered',
      type: 'sms',
      trigger: 'Delivery Complete',
      sent: 512,
      openRate: 95.1,
      isActive: true,
    },
    {
      id: '4',
      name: 'Feedback Request',
      type: 'email',
      trigger: '1 Day After Delivery',
      sent: 423,
      openRate: 45.2,
      isActive: false,
    },
  ]);

  // Edit template dialog state
  const [editTemplateDialogOpen, setEditTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateInputs, setTemplateInputs] = useState({ sent: '', openRate: '' });

  // Create template dialog state
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Omit<MessageTemplate, 'id'>>({
    name: '',
    type: 'email',
    trigger: '',
    sent: 0,
    openRate: 0,
    isActive: true,
  });
  const [newTemplateInputs, setNewTemplateInputs] = useState({ sent: '', openRate: '' });

  const activeTemplates = templates.filter(t => t.isActive).length;
  const totalSent = templates.reduce((sum, t) => sum + t.sent, 0);
  const avgOpenRate = templates.reduce((sum, t) => sum + t.openRate, 0) / templates.length;

  // Edit handlers
  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateInputs({
      sent: template.sent.toString(),
      openRate: template.openRate.toString(),
    });
    setEditTemplateDialogOpen(true);
  };

  const handleSaveTemplateEdit = () => {
    if (!editingTemplate) return;

    // Validation
    if (!editingTemplate.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (!editingTemplate.trigger.trim()) {
      toast({
        title: "Validation Error",
        description: "Trigger is required",
        variant: "destructive",
      });
      return;
    }

    const sent = parseInt(templateInputs.sent);
    if (isNaN(sent) || sent < 0) {
      toast({
        title: "Validation Error",
        description: "Sent count must be a non-negative number",
        variant: "destructive",
      });
      return;
    }

    const openRate = parseFloat(templateInputs.openRate);
    if (isNaN(openRate) || openRate < 0 || openRate > 100) {
      toast({
        title: "Validation Error",
        description: "Open rate must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    // Update the template
    const updatedTemplate: MessageTemplate = {
      ...editingTemplate,
      sent,
      openRate,
    };

    setTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
    setEditTemplateDialogOpen(false);
    toast({
      title: "Success",
      description: "Message template updated successfully",
    });
  };

  const handleCancelTemplateEdit = () => {
    setEditTemplateDialogOpen(false);
    setEditingTemplate(null);
  };

  // Create handlers
  const handleOpenCreateTemplate = () => {
    setNewTemplate({
      name: '',
      type: 'email',
      trigger: '',
      sent: 0,
      openRate: 0,
      isActive: true,
    });
    setNewTemplateInputs({ sent: '', openRate: '' });
    setCreateTemplateDialogOpen(true);
  };

  const handleSaveNewTemplate = () => {
    // Validation
    if (!newTemplate.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (!newTemplate.trigger.trim()) {
      toast({
        title: "Validation Error",
        description: "Trigger is required",
        variant: "destructive",
      });
      return;
    }

    const sent = parseInt(newTemplateInputs.sent || '0');
    if (isNaN(sent) || sent < 0) {
      toast({
        title: "Validation Error",
        description: "Sent count must be a non-negative number",
        variant: "destructive",
      });
      return;
    }

    const openRate = parseFloat(newTemplateInputs.openRate || '0');
    if (isNaN(openRate) || openRate < 0 || openRate > 100) {
      toast({
        title: "Validation Error",
        description: "Open rate must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    // Create the new template
    const templateToCreate: MessageTemplate = {
      ...newTemplate,
      id: `temp-${Date.now()}`,
      sent,
      openRate,
    };

    setTemplates([...templates, templateToCreate]);
    setCreateTemplateDialogOpen(false);
    toast({
      title: "Success",
      description: "Message template created successfully",
    });
  };

  const handleCancelNewTemplate = () => {
    setCreateTemplateDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automated Messages</h1>
          <p className="text-muted-foreground mt-1">
            Push notifications, SMS, and email templates
          </p>
        </div>
        <Button onClick={handleOpenCreateTemplate} data-testid="button-create-message">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-templates">
              {activeTemplates}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-messages-sent">
              {totalSent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-open-rate">
              {avgOpenRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all channels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Channel</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-best-channel">
              SMS
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              95.1% open rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message Templates</CardTitle>
          <CardDescription>Configure automated customer communications</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Open Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id} data-testid={`template-${template.id}`}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {template.type === 'email' && <Mail className="h-3 w-3 mr-1" />}
                      {template.type === 'sms' && <MessageSquare className="h-3 w-3 mr-1" />}
                      {template.type === 'push' && <Smartphone className="h-3 w-3 mr-1" />}
                      {template.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {template.trigger}
                  </TableCell>
                  <TableCell className="text-right">{template.sent}</TableCell>
                  <TableCell className="text-right font-medium">
                    {template.openRate.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    {template.isActive ? (
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditTemplate(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Template Dialog */}
      <Dialog open={editTemplateDialogOpen} onOpenChange={setEditTemplateDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-template">
          <DialogHeader>
            <DialogTitle>Edit Message Template</DialogTitle>
            <DialogDescription>
              Update the template settings below
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-template-name">Template Name</Label>
                <Input
                  id="edit-template-name"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Order Confirmed"
                  data-testid="input-edit-template-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-template-type">Channel Type</Label>
                <Select 
                  value={editingTemplate.type} 
                  onValueChange={(value: 'email' | 'sms' | 'push') => setEditingTemplate({ ...editingTemplate, type: value })}
                >
                  <SelectTrigger id="edit-template-type" data-testid="select-edit-template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-template-trigger">Trigger Event</Label>
                <Input
                  id="edit-template-trigger"
                  value={editingTemplate.trigger}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, trigger: e.target.value })}
                  placeholder="Order Placed"
                  data-testid="input-edit-template-trigger"
                />
                <p className="text-xs text-muted-foreground">
                  When should this message be sent
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-template-sent">Messages Sent</Label>
                  <Input
                    id="edit-template-sent"
                    type="number"
                    value={templateInputs.sent}
                    onChange={(e) => setTemplateInputs({ ...templateInputs, sent: e.target.value })}
                    placeholder="542"
                    min="0"
                    data-testid="input-edit-template-sent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-template-openrate">Open Rate (%)</Label>
                  <Input
                    id="edit-template-openrate"
                    type="number"
                    value={templateInputs.openRate}
                    onChange={(e) => setTemplateInputs({ ...templateInputs, openRate: e.target.value })}
                    placeholder="89.3"
                    min="0"
                    max="100"
                    step="0.1"
                    data-testid="input-edit-template-openrate"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="edit-template-active">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable or disable this template
                    </p>
                  </div>
                  <Switch
                    id="edit-template-active"
                    checked={editingTemplate.isActive}
                    onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isActive: checked })}
                    data-testid="switch-edit-template-active"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelTemplateEdit}
              data-testid="button-cancel-template-edit"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplateEdit}
              data-testid="button-save-template-edit"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={createTemplateDialogOpen} onOpenChange={setCreateTemplateDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-create-template">
          <DialogHeader>
            <DialogTitle>Create Message Template</DialogTitle>
            <DialogDescription>
              Set up a new automated message for your customers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-template-name">Template Name</Label>
              <Input
                id="new-template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Order Confirmed"
                data-testid="input-new-template-name"
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name for this template
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-template-type">Channel Type</Label>
              <Select 
                value={newTemplate.type} 
                onValueChange={(value: 'email' | 'sms' | 'push') => setNewTemplate({ ...newTemplate, type: value })}
              >
                <SelectTrigger id="new-template-type" data-testid="select-new-template-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How the message will be delivered
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-template-trigger">Trigger Event</Label>
              <Input
                id="new-template-trigger"
                value={newTemplate.trigger}
                onChange={(e) => setNewTemplate({ ...newTemplate, trigger: e.target.value })}
                placeholder="Order Placed"
                data-testid="input-new-template-trigger"
              />
              <p className="text-xs text-muted-foreground">
                When should this message be sent
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-template-sent">Initial Sent Count</Label>
                <Input
                  id="new-template-sent"
                  type="number"
                  value={newTemplateInputs.sent}
                  onChange={(e) => setNewTemplateInputs({ ...newTemplateInputs, sent: e.target.value })}
                  placeholder="0"
                  min="0"
                  data-testid="input-new-template-sent"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-template-openrate">Initial Open Rate (%)</Label>
                <Input
                  id="new-template-openrate"
                  type="number"
                  value={newTemplateInputs.openRate}
                  onChange={(e) => setNewTemplateInputs({ ...newTemplateInputs, openRate: e.target.value })}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                  data-testid="input-new-template-openrate"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="new-template-active">Start Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Begin sending messages immediately
                  </p>
                </div>
                <Switch
                  id="new-template-active"
                  checked={newTemplate.isActive}
                  onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, isActive: checked })}
                  data-testid="switch-new-template-active"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelNewTemplate}
              data-testid="button-cancel-new-template"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNewTemplate}
              data-testid="button-save-new-template"
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

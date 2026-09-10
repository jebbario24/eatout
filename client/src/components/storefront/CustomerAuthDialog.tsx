import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStorefrontCustomer } from "@/hooks/useStorefrontCustomer";
import { Loader2 } from "lucide-react";

interface Props {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthed?: () => void;
  defaultTab?: "login" | "register";
}

export function CustomerAuthDialog({ slug, open, onOpenChange, onAuthed, defaultTab = "login" }: Props) {
  const { login, register } = useStorefrontCustomer(slug);
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [err, setErr] = useState("");

  // login
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  // register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const busy = login.isPending || register.isPending;

  const done = () => {
    setErr("");
    onOpenChange(false);
    onAuthed?.();
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      await login.mutateAsync({ emailOrPhone: emailOrPhone.trim(), password: loginPassword });
      done();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (regPassword.length < 8) return setErr("Password must be at least 8 characters");
    try {
      await register.mutateAsync({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password: regPassword });
      done();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your account</DialogTitle>
          <DialogDescription>Sign in to track orders and reorder faster.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setErr(""); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <form onSubmit={submitLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sf-login-id">Email or phone</Label>
                <Input id="sf-login-id" value={emailOrPhone} onChange={(e) => setEmailOrPhone(e.target.value)} autoComplete="username" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sf-login-pw">Password</Label>
                <Input id="sf-login-pw" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" required />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form onSubmit={submitRegister} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sf-reg-name">Name</Label>
                <Input id="sf-reg-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sf-reg-email">Email</Label>
                <Input id="sf-reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sf-reg-phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="sf-reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sf-reg-pw">Password</Label>
                <Input id="sf-reg-pw" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

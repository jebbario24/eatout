import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { StorefrontShell, useResolvedSlug } from "@/components/storefront/StorefrontShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function StorefrontContact() {
  const slug = useResolvedSlug();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const send = useMutation({
    mutationFn: async () => apiRequest(`/api/storefront/${slug}/contact`, "POST", form),
    onSuccess: () => setForm({ name: "", email: "", subject: "", message: "" }),
  });

  return (
    <StorefrontShell slug={slug}>
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
        <motion.h1 variants={fadeUp} className="mb-2 text-3xl font-bold">Contact Us</motion.h1>
        <motion.p variants={fadeUp} className="mb-8 text-muted-foreground">
          Have a question about an order or a product? Send us a message and we'll get back to you.
        </motion.p>

        {send.isSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-lg border bg-muted/30 p-6"
            data-testid="contact-success"
          >
            <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Message sent</p>
              <p className="text-sm text-muted-foreground">Thanks for reaching out — we'll reply as soon as we can.</p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            variants={fadeUp}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              send.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="input-contact-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  data-testid="input-contact-email"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input
                id="contact-subject"
                placeholder="What's this about?"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                data-testid="input-contact-subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                rows={6}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                data-testid="input-contact-message"
              />
            </div>
            {send.isError && (
              <p className="text-sm text-destructive">Something went wrong sending your message. Please try again.</p>
            )}
            <Button type="submit" disabled={send.isPending} data-testid="button-contact-send">
              {send.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              {send.isPending ? "Sending…" : "Send message"}
            </Button>
          </motion.form>
        )}
      </motion.div>
    </StorefrontShell>
  );
}

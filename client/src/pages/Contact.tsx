import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UtensilsCrossed, Mail, Phone, MapPin, ArrowLeft, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ContactProps {
  userType?: "merchant" | "driver";
}

export default function Contact({ userType = "merchant" }: ContactProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactEmail = "driver@eatout.cloud";
  const title = userType === "driver" ? "Driver Support" : "Merchant Support";
  const description = userType === "driver"
    ? "Have questions about driving with EatOut? We're here to help!"
    : "Have questions about our platform? We're here to help!";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate sending email (in production, this would call an API)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create mailto link
    const mailtoLink = `mailto:${contactEmail}?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `From: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
    )}`;
    
    window.location.href = mailtoLink;

    toast({
      title: "Opening Email Client",
      description: "Your default email application will open with your message pre-filled.",
    });

    setIsSubmitting(false);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setLocation('/')}
              className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-3 py-2"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Home</span>
            </button>
            <div className="flex items-center gap-2">
              {userType === "driver" ? (
                <Truck className="h-6 w-6 text-primary" />
              ) : (
                <UtensilsCrossed className="h-6 w-6 text-primary" />
              )}
              <span className="text-xl font-display font-bold">EatOut</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contact Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Contact Information */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-display font-bold mb-4">Get in Touch</h1>
              <p className="text-lg text-muted-foreground">
                {description}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Us
                </CardTitle>
                <CardDescription>
                  Send us an email and we'll respond within 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a 
                  href={`mailto:${contactEmail}`}
                  className="text-primary hover:underline font-medium"
                  data-testid="link-email"
                >
                  {contactEmail}
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call Us
                </CardTitle>
                <CardDescription>
                  Available Monday to Friday, 9 AM - 6 PM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a 
                  href="tel:1-800-EATOUT"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-phone"
                >
                  1-800-EATOUT
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Visit Us
                </CardTitle>
                <CardDescription>
                  Our office location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  123 Restaurant Plaza<br />
                  San Francisco, CA 94102<br />
                  United States
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="What is this regarding?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    data-testid="input-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us how we can help..."
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    data-testid="input-message"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-send-message"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Your message will open in your default email client
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

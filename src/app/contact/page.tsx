"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader , MarketingLayout } from "@/components/marketing";
import { brand } from "@/content/site";

function ContactForm() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const subject = encodeURIComponent(`Website Inquiry from ${formData.get("name")}`);
    const body = encodeURIComponent(`
Name: ${formData.get("name")}
Email: ${formData.get("email")}
Phone: ${formData.get("phone")}

Message:
${formData.get("message")}
    `.trim());

    window.location.href = `mailto:${brand.email}?subject=${subject}&body=${body}`;
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Send Us a Message</CardTitle>
        <CardDescription>
          Fill out the form below and we&apos;ll get back to you within 1 business day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">How Can We Help? *</Label>
            <Textarea
              id="message"
              name="message"
              required
              placeholder="Tell us about your home maintenance needs, questions, or how we can help..."
              rows={5}
            />
          </div>

          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Send Message
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const contactInfo = [
  {
    icon: Phone,
    label: "Phone",
    value: brand.phone,
    href: brand.phoneHref,
  },
  {
    icon: Mail,
    label: "Email",
    value: brand.email,
    href: brand.emailHref,
  },
  {
    icon: MapPin,
    label: "Service Area",
    value: brand.serviceArea,
    href: null,
  },
  {
    icon: Clock,
    label: "Response Time",
    value: "Within 1 business day",
    href: null,
  },
];

export default function ContactPage() {
  return (
    <MarketingLayout>
    <>
      <PageHeader
        title="Get in Touch"
        subtitle="Have questions about RegularUpkeep? Ready to get started? We'd love to hear from you."
      />

      <section className="section-padding">
        <div className="container-marketing">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Let&apos;s Talk
              </h2>
              <p className="mt-4 text-muted-foreground">
                Whether you&apos;re a homeowner looking to simplify your maintenance, a property manager juggling multiple properties, or a service provider interested in joining our network—we&apos;re here to help.
              </p>

              <div className="mt-8 space-y-6">
                {contactInfo.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {item.value}
                        </Link>
                      ) : (
                        <p className="font-medium">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-6 bg-muted/30 rounded-lg border border-border/50">
                <h3 className="font-semibold">Looking to Join Our Provider Network?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  If you&apos;re a service provider interested in connecting with quality customers, visit our provider page to learn more and apply.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/providers">Provider Information</Link>
                </Button>
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Common Next Steps
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3 text-left">
              {[
                {
                  title: "New to RegularUpkeep?",
                  desc: "Learn how our service works and what's included in each plan.",
                  link: "/how-it-works",
                  cta: "How It Works",
                },
                {
                  title: "Ready to Sign Up?",
                  desc: "View our pricing and choose the plan that fits your needs.",
                  link: "/pricing",
                  cta: "View Pricing",
                },
                {
                  title: "Have Questions?",
                  desc: "Check our FAQ for answers to common questions.",
                  link: "/faq",
                  cta: "Read FAQ",
                },
              ].map((item, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                    <Button asChild variant="link" className="mt-4 p-0 h-auto">
                      <Link href={item.link}>{item.cta} →</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
    </MarketingLayout>
  );
}

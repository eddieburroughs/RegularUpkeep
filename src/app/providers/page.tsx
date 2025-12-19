"use client";

import type { FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, ProviderBenefitsGrid, CtaBand , MarketingLayout } from "@/components/marketing";
import { brand } from "@/content/site";

function ProviderApplicationForm() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const subject = encodeURIComponent("Provider Network Application");
    const body = encodeURIComponent(`
Provider Network Application

Name: ${formData.get("name")}
Company: ${formData.get("company")}
Email: ${formData.get("email")}
Phone: ${formData.get("phone")}
Services Offered: ${formData.get("services")}
Service Area: ${formData.get("serviceArea")}
Additional Information: ${formData.get("additional")}
    `.trim());

    window.location.href = `mailto:${brand.email}?subject=${subject}&body=${body}`;
  };

  return (
    <MarketingLayout>
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Apply to Join Our Network</CardTitle>
        <CardDescription>
          Fill out the form below and we'll be in touch within 2 business days.
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
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                name="company"
                type="text"
                required
                placeholder="Smith's HVAC Services"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john@smithhvac.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="services">Services Offered *</Label>
            <Textarea
              id="services"
              name="services"
              required
              placeholder="HVAC repair and installation, preventive maintenance, duct cleaning..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceArea">Service Area *</Label>
            <Input
              id="serviceArea"
              name="serviceArea"
              type="text"
              required
              placeholder="Greenville, Pitt County, and surrounding areas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional">Additional Information</Label>
            <Textarea
              id="additional"
              name="additional"
              placeholder="Years in business, certifications, anything else you'd like us to know..."
              rows={3}
            />
          </div>

          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Submit Application
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-sm text-muted-foreground">
            By submitting, you agree to be contacted about joining our provider network.
          </p>
        </form>
      </CardContent>
    </Card>
    </MarketingLayout>
  );
}

export default function ProvidersPage() {
  return (
    <MarketingLayout>
    <>
      <PageHeader
        title="Join Our Provider Network"
        subtitle="Partner with RegularUpkeep to reach quality customers, grow your business, and focus on what you do best."
      />

      <section className="section-padding">
        <div className="container-marketing">
          <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl">
            Why Partner With Us?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-center max-w-2xl mx-auto">
            We connect you with homeowners who value quality work and are ready to invest in their properties.
          </p>

          <div className="mt-12">
            <ProviderBenefitsGrid />
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-marketing">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                What We Look For
              </h2>
              <p className="mt-4 text-muted-foreground">
                We're selective about our network because our reputation depends on the quality of work our providers deliver. Here's what we value:
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  {
                    title: "Professional Quality",
                    desc: "Consistent, high-quality work that meets customer expectations",
                  },
                  {
                    title: "Reliability",
                    desc: "Show up on time, communicate clearly, and follow through",
                  },
                  {
                    title: "Fair Pricing",
                    desc: "Competitive rates that reflect the value you provide",
                  },
                  {
                    title: "Proper Credentials",
                    desc: "Valid licensing and insurance where required by law",
                  },
                  {
                    title: "Good Communication",
                    desc: "Responsive to inquiries and clear about timelines and costs",
                  },
                ].map((item, index) => (
                  <li key={index} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <ProviderApplicationForm />
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How It Works for Providers
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3 text-left">
              {[
                {
                  step: "1",
                  title: "Apply",
                  desc: "Submit your application with your services and service area",
                },
                {
                  step: "2",
                  title: "Get Verified",
                  desc: "We review your credentials and confirm your qualifications",
                },
                {
                  step: "3",
                  title: "Start Getting Jobs",
                  desc: "Receive job referrals from members in your service area",
                },
              ].map((step) => (
                <div key={step.step} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                    {step.step}
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to grow your business?"
        subtitle="Join our network and connect with homeowners who value quality service."
        primaryCta="Apply Now"
        primaryHref="#apply"
        showPhone={false}
      />
    </>
    </MarketingLayout>
  );
}

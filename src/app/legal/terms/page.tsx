import type { Metadata } from "next";
import { PageHeader , MarketingLayout } from "@/components/marketing";
import { brand } from "@/content/site";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${brand.name}. Please read these terms carefully before using our home maintenance management service.`,
};

export default function TermsPage() {
  return (
    <MarketingLayout>
    <>
      <PageHeader
        title="Terms of Service"
        subtitle={`Last updated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
      />

      <section className="section-padding">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert">
            <p className="lead">
              Welcome to {brand.name}. These Terms of Service ("Terms") govern your use of our website and home maintenance management services. By using our services, you agree to these Terms.
            </p>

            <Separator className="my-8" />

            <h2>1. Description of Service</h2>
            <p>
              {brand.name} provides a home maintenance management platform that includes:
            </p>
            <ul>
              <li>Maintenance scheduling and reminders</li>
              <li>Service provider recommendations and connections</li>
              <li>Coordination and concierge assistance</li>
              <li>Maintenance record keeping</li>
            </ul>
            <p>
              <strong>Important:</strong> {brand.name} is not a contractor and does not perform maintenance or repair work directly. We connect you with independent service providers who are responsible for the quality of their work.
            </p>

            <Separator className="my-8" />

            <h2>2. Account Registration</h2>
            <p>
              To use our services, you must create an account and provide accurate, complete information. You are responsible for:
            </p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
            <p>
              You must be at least 18 years old to create an account and use our services.
            </p>

            <Separator className="my-8" />

            <h2>3. Membership and Billing</h2>
            <h3>Subscription Plans</h3>
            <p>
              We offer various membership plans with different features and pricing. Plan details and pricing are available on our website and may be updated from time to time.
            </p>
            <h3>Billing</h3>
            <p>
              Memberships are billed on a recurring basis according to the plan you select. By subscribing, you authorize us to charge your payment method for the applicable fees.
            </p>
            <h3>Cancellation</h3>
            <p>
              You may cancel your membership at any time. Upon cancellation, your membership will remain active until the end of your current billing period. No refunds are provided for partial billing periods.
            </p>

            <Separator className="my-8" />

            <h2>4. Service Providers</h2>
            <h3>Independent Contractors</h3>
            <p>
              Service providers in our network are independent businesses, not employees or agents of {brand.name}. While we evaluate providers for inclusion in our network, we do not guarantee or warranty their work.
            </p>
            <h3>Your Responsibility</h3>
            <p>
              You are responsible for:
            </p>
            <ul>
              <li>Evaluating and selecting service providers</li>
              <li>Agreeing to terms and pricing with providers directly</li>
              <li>Payment to providers for their services</li>
              <li>Any disputes arising from provider services</li>
            </ul>
            <h3>Provider Quality</h3>
            <p>
              We encourage you to report any issues with provider quality. We use this feedback to maintain our network standards but cannot guarantee resolution of disputes between you and providers.
            </p>

            <Separator className="my-8" />

            <h2>5. Acceptable Use</h2>
            <p>
              You agree not to:
            </p>
            <ul>
              <li>Use our services for any unlawful purpose</li>
              <li>Provide false or misleading information</li>
              <li>Interfere with or disrupt our services</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use our services to harass or harm others</li>
              <li>Resell or redistribute our services without authorization</li>
            </ul>

            <Separator className="my-8" />

            <h2>6. Intellectual Property</h2>
            <p>
              All content, features, and functionality of our services—including text, graphics, logos, and software—are owned by {brand.name} or our licensors and are protected by intellectual property laws.
            </p>
            <p>
              You may not copy, modify, distribute, or create derivative works from our content without our express written permission.
            </p>

            <Separator className="my-8" />

            <h2>7. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law:
            </p>
            <ul>
              <li>
                {brand.name} is not liable for any damages arising from your use of our services or from the acts or omissions of service providers
              </li>
              <li>
                Our total liability shall not exceed the amount you paid to us in the twelve months preceding the claim
              </li>
              <li>
                We are not responsible for any indirect, incidental, special, or consequential damages
              </li>
            </ul>

            <Separator className="my-8" />

            <h2>8. Disclaimer of Warranties</h2>
            <p>
              Our services are provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that our services will be uninterrupted, error-free, or completely secure.
            </p>
            <p>
              We do not endorse or guarantee the work of any service provider, and any reliance on provider recommendations is at your own risk.
            </p>

            <Separator className="my-8" />

            <h2>9. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless {brand.name}, its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of our services, your violation of these Terms, or your violation of any rights of another party.
            </p>

            <Separator className="my-8" />

            <h2>10. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on our website and updating the "Last updated" date. Your continued use of our services after changes constitutes acceptance of the modified Terms.
            </p>

            <Separator className="my-8" />

            <h2>11. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our discretion. Upon termination, your right to use our services will immediately cease.
            </p>

            <Separator className="my-8" />

            <h2>12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of North Carolina, without regard to its conflict of law principles.
            </p>

            <Separator className="my-8" />

            <h2>13. Contact Information</h2>
            <p>
              If you have questions about these Terms, please contact us:
            </p>
            <ul>
              <li>Email: {brand.email}</li>
              <li>Phone: {brand.phone}</li>
            </ul>
          </div>
        </div>
      </section>
    </>
    </MarketingLayout>
  );
}

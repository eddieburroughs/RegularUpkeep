import type { Metadata } from "next";
import { PageHeader , MarketingLayout } from "@/components/marketing";
import { brand } from "@/content/site";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${brand.name}. Learn how we collect, use, and protect your personal information.`,
};

export default function PrivacyPage() {
  return (
    <MarketingLayout>
    <>
      <PageHeader
        title="Privacy Policy"
        subtitle={`Last updated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
      />

      <section className="section-padding">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert">
            <p className="lead">
              At {brand.name}, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>

            <Separator className="my-8" />

            <h2>Information We Collect</h2>
            <h3>Personal Information</h3>
            <p>
              We may collect personal information that you voluntarily provide to us when you:
            </p>
            <ul>
              <li>Create an account or sign up for our services</li>
              <li>Fill out a contact form or request information</li>
              <li>Subscribe to our newsletter or communications</li>
              <li>Communicate with us via email, phone, or other channels</li>
            </ul>
            <p>
              This information may include your name, email address, phone number, property address, and payment information.
            </p>

            <h3>Property Information</h3>
            <p>
              To provide our maintenance management services, we collect information about your properties, including:
            </p>
            <ul>
              <li>Property addresses and basic characteristics</li>
              <li>Home systems and appliances</li>
              <li>Maintenance history and records</li>
              <li>Service provider interactions</li>
            </ul>

            <h3>Automatically Collected Information</h3>
            <p>
              When you visit our website, we may automatically collect certain information about your device and usage, including:
            </p>
            <ul>
              <li>IP address and browser type</li>
              <li>Pages viewed and time spent on pages</li>
              <li>Referring website or source</li>
              <li>Device and operating system information</li>
            </ul>

            <Separator className="my-8" />

            <h2>How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our services</li>
              <li>Create and manage your account</li>
              <li>Send maintenance reminders and service notifications</li>
              <li>Connect you with service providers in our network</li>
              <li>Process transactions and send related information</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Monitor and analyze usage and trends to improve user experience</li>
              <li>Detect, prevent, and address technical issues and fraud</li>
            </ul>

            <Separator className="my-8" />

            <h2>Information Sharing</h2>
            <p>
              We may share your information in the following circumstances:
            </p>
            <h3>With Service Providers</h3>
            <p>
              When you request services or coordination, we share relevant information with service providers in our network to facilitate the work. This includes your contact information, property address, and service details.
            </p>
            <h3>With Third-Party Service Providers</h3>
            <p>
              We may share information with third parties that provide services on our behalf, such as payment processing, email delivery, and analytics. These providers are contractually obligated to protect your information.
            </p>
            <h3>For Legal Purposes</h3>
            <p>
              We may disclose information if required by law or if we believe disclosure is necessary to protect our rights, comply with legal process, or ensure the safety of our users.
            </p>
            <h3>Business Transfers</h3>
            <p>
              If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
            </p>

            <Separator className="my-8" />

            <h2>Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>

            <Separator className="my-8" />

            <h2>Your Rights and Choices</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access, update, or delete your personal information</li>
              <li>Opt out of promotional communications</li>
              <li>Request a copy of your data</li>
              <li>Close your account at any time</li>
            </ul>
            <p>
              To exercise these rights, please contact us at {brand.email}.
            </p>

            <Separator className="my-8" />

            <h2>Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to collect information about your browsing activities. You can control cookie preferences through your browser settings.
            </p>

            <Separator className="my-8" />

            <h2>Children's Privacy</h2>
            <p>
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
            </p>

            <Separator className="my-8" />

            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
            </p>

            <Separator className="my-8" />

            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our privacy practices, please contact us:
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

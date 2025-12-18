# RegularUpkeep Marketing Website

A modern, fast, responsive, SEO-friendly marketing website for RegularUpkeep.com - a home maintenance management service.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** lucide-react

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The site will be available at `http://localhost:3000`.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── about/             # About page
│   ├── contact/           # Contact page
│   ├── faq/               # FAQ page
│   ├── how-it-works/      # How It Works page
│   ├── legal/
│   │   ├── privacy/       # Privacy Policy
│   │   └── terms/         # Terms of Service
│   ├── pricing/           # Pricing page
│   ├── providers/         # Provider recruitment page
│   ├── services/          # Services page
│   ├── layout.tsx         # Root layout with header/footer
│   ├── page.tsx           # Home page
│   └── sitemap.ts         # Auto-generated sitemap
├── components/
│   ├── marketing/         # Marketing-specific components
│   │   ├── cta-band.tsx
│   │   ├── faq-accordion.tsx
│   │   ├── feature-grid.tsx
│   │   ├── footer.tsx
│   │   ├── header.tsx
│   │   ├── hero.tsx
│   │   ├── how-it-works.tsx
│   │   ├── mobile-cta-bar.tsx
│   │   ├── pricing-cards.tsx
│   │   ├── provider-benefits.tsx
│   │   ├── services-grid.tsx
│   │   ├── testimonials.tsx
│   │   └── index.ts
│   └── ui/                # shadcn/ui components
├── content/
│   └── site.ts            # Single source of truth for all content
├── lib/
│   └── utils.ts           # Utility functions
public/
└── brand/
    └── regularupkeep-logo.svg  # Placeholder logo (replace with your logo)
```

## Editing Content

### Pricing, FAQs, and Copy

All editable content is centralized in **`src/content/site.ts`**. This includes:

- **Brand info:** Name, phone, email, tagline
- **Navigation:** Main nav and footer links
- **Pricing:** Plans, features, add-ons, disclaimer
- **Services:** Service categories and descriptions
- **How It Works:** Step-by-step process
- **Features:** Feature grid content
- **Testimonials:** Customer quotes
- **FAQs:** Questions and answers
- **Provider benefits:** For the provider recruitment page
- **SEO:** Title, description, keywords

To update pricing:

```typescript
// src/content/site.ts
export const pricing = {
  plans: [
    {
      name: "Essential",
      price: "$19",
      period: "/month",
      // ... update features
    },
    // ... other plans
  ],
  addons: [...],
  disclaimer: "...",
};
```

### Logo and Branding

1. Replace the placeholder logo at `public/brand/regularupkeep-logo.svg`
2. For OG images, add a PNG version at `public/brand/regularupkeep-logo.png` (1200x630 recommended)
3. Update logo path in `src/content/site.ts` if using a different filename

### Favicon

**TODO:** Generate favicon files and place them in `/public`:
- `favicon.ico`
- `favicon-16x16.png`
- `apple-touch-icon.png`

Use a tool like [RealFaviconGenerator](https://realfavicongenerator.net/) to generate these from your logo.

## Contact Form

The contact form currently uses a `mailto:` link as a fallback. This opens the user's email client with a pre-filled message.

### Wiring to a Backend (Future)

To connect to Supabase/Resend or another backend:

1. Create an API route at `src/app/api/contact/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const data = await request.json();

  // TODO: Send to Supabase, Resend, or email service
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'onboarding@resend.dev',
  //   to: 'info@regularupkeep.com',
  //   subject: `Contact from ${data.name}`,
  //   text: data.message,
  // });

  return NextResponse.json({ success: true });
}
```

2. Update the form in `src/app/contact/page.tsx` to POST to this endpoint instead of using mailto.

## Color System

The brand colors are defined in `src/app/globals.css`:

| Color | Hex | Usage |
|-------|-----|-------|
| Brand Blue | `#0178C7` | Primary buttons, links, accents |
| Brand Navy | `#013A5E` | Text, headings, dark elements |
| Brand Mid Blue | `#186899` | Secondary elements |
| Accent Red | `#D64E46` | CTA highlights, destructive actions |
| Warm Cream | `#F8D096` | Soft backgrounds, accents |
| Near White | `#FBFCFD` | Page backgrounds |

## SEO Features

- Per-page metadata with title templates
- OpenGraph and Twitter card tags
- JSON-LD Organization schema
- Auto-generated sitemap at `/sitemap.xml`
- Semantic HTML with proper heading hierarchy
- Alt text for images

## Accessibility

- ARIA labels on interactive elements
- Proper heading structure
- Keyboard navigation support
- Color contrast meets WCAG guidelines

## Performance

- Static page generation for all pages
- Optimized images with Next.js Image component
- Font optimization with next/font
- Minimal client-side JavaScript

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home page with hero, features, testimonials |
| `/how-it-works` | Detailed explanation of the service |
| `/services` | Service categories and descriptions |
| `/pricing` | Pricing plans and add-ons |
| `/providers` | Provider recruitment with application form |
| `/faq` | Frequently asked questions |
| `/contact` | Contact form and information |
| `/about` | Company story and values |
| `/legal/privacy` | Privacy policy |
| `/legal/terms` | Terms of service |

## Deployment

The site can be deployed to any platform that supports Next.js:

- **Vercel** (recommended): Zero-config deployment
- **Netlify:** Supported with Next.js runtime
- **Self-hosted:** Run `npm run build && npm start`

## License

Proprietary - RegularUpkeep

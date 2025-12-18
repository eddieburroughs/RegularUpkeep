// ============================================
// RegularUpkeep Site Content - Single Source of Truth
// Edit this file to update pricing, copy, FAQs, etc.
// ============================================

// Brand Constants
export const brand = {
  name: "RegularUpkeep",
  tagline: "One place to manage home maintenance",
  phone: "888-502-UPKEEP (8753)",
  phoneHref: "tel:+18885028753",
  email: "info@regularupkeep.com",
  emailHref: "mailto:info@regularupkeep.com",
  logo: "/brand/regularupkeep-logo.svg",
  url: "https://regularupkeep.com",
  serviceArea: "Eastern North Carolina (and growing)",
  mission: "Making home maintenance simple, predictable, and stress-free for homeowners and property managers.",
  authUrl: "https://app.regularupkeep.com/auth/register",
  loginUrl: "https://app.regularupkeep.com/auth/login",
} as const;

// Navigation
export const navigation = {
  main: [
    { name: "Home", href: "/" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Services", href: "/services" },
    { name: "Pricing", href: "/pricing" },
    { name: "Providers", href: "/providers" },
    { name: "FAQ", href: "/faq" },
    { name: "Contact", href: "/contact" },
  ],
  footer: [
    { name: "About", href: "/about" },
    { name: "Privacy Policy", href: "/legal/privacy" },
    { name: "Terms of Service", href: "/legal/terms" },
  ],
} as const;

// Pricing Plans
export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  badge?: string;
}

export interface PricingAddon {
  name: string;
  price: string;
  description: string;
}

export const pricing: {
  plans: PricingPlan[];
  addons: PricingAddon[];
  disclaimer: string;
} = {
  plans: [
    {
      name: "Essential",
      price: "$19",
      period: "/month",
      description: "Perfect for single homeowners who want organized maintenance",
      features: [
        "Up to 2 properties",
        "Maintenance calendar & reminders",
        "Seasonal task checklists",
        "Provider recommendations",
        "Email support",
        "Basic maintenance records",
      ],
      cta: "Get Started",
    },
    {
      name: "Standard",
      price: "$39",
      period: "/month",
      description: "Ideal for homeowners who want hands-on help",
      features: [
        "Up to 4 properties",
        "Everything in Essential",
        "Priority scheduling assistance",
        "Concierge coordination",
        "Phone & email support",
        "Provider quality follow-up",
        "Annual home maintenance review",
      ],
      cta: "Get Started",
      popular: true,
      badge: "Most Popular",
    },
    {
      name: "Premium",
      price: "$79",
      period: "/month",
      description: "White-glove service for busy property owners",
      features: [
        "Up to 8 properties",
        "Everything in Standard",
        "White-glove coordination",
        "Emergency priority line",
        "Dedicated account manager",
        "Quarterly property check-ins",
        "Vendor payment coordination",
        "Full maintenance documentation",
      ],
      cta: "Get Started",
      badge: "Best Value",
    },
  ],
  addons: [
    {
      name: "Additional Properties",
      price: "+$5/property/mo",
      description: "Add more properties beyond your plan limit",
    },
    {
      name: "Rental Property Add-on",
      price: "+$5/rental/mo",
      description: "Tenant coordination and rental-specific features",
    },
  ],
  disclaimer: "Prices shown are for membership only. Service provider costs are separate and paid directly to providers. Availability varies by location.",
};

// Services
export interface ServiceCategory {
  name: string;
  icon: string;
  description: string;
  services: string[];
}

export const services: ServiceCategory[] = [
  {
    name: "HVAC & Climate",
    icon: "Thermometer",
    description: "Keep your home comfortable year-round",
    services: [
      "AC maintenance & tune-ups",
      "Heating system service",
      "Filter replacement reminders",
      "Duct cleaning coordination",
    ],
  },
  {
    name: "Plumbing",
    icon: "Droplets",
    description: "Prevent leaks and water damage",
    services: [
      "Water heater maintenance",
      "Pipe inspections",
      "Drain cleaning",
      "Fixture repairs",
    ],
  },
  {
    name: "Electrical",
    icon: "Zap",
    description: "Safe and reliable electrical systems",
    services: [
      "Panel inspections",
      "Outlet & switch repairs",
      "Lighting upgrades",
      "Safety checks",
    ],
  },
  {
    name: "Exterior & Roofing",
    icon: "Home",
    description: "Protect your home from the elements",
    services: [
      "Roof inspections",
      "Gutter cleaning",
      "Pressure washing",
      "Siding maintenance",
    ],
  },
  {
    name: "Lawn & Landscape",
    icon: "Trees",
    description: "Beautiful outdoor spaces",
    services: [
      "Lawn care scheduling",
      "Irrigation system maintenance",
      "Tree & shrub care",
      "Seasonal cleanup",
    ],
  },
  {
    name: "Appliances",
    icon: "Refrigerator",
    description: "Keep appliances running efficiently",
    services: [
      "Appliance maintenance scheduling",
      "Warranty tracking",
      "Repair coordination",
      "Replacement planning",
    ],
  },
  {
    name: "Pest Control",
    icon: "Bug",
    description: "Keep unwanted guests out",
    services: [
      "Preventive treatments",
      "Seasonal inspections",
      "Wildlife management",
      "Termite prevention",
    ],
  },
  {
    name: "Safety & Security",
    icon: "Shield",
    description: "Peace of mind for your family",
    services: [
      "Smoke detector checks",
      "Security system maintenance",
      "Lock & key services",
      "Fire extinguisher inspections",
    ],
  },
  {
    name: "General Repairs",
    icon: "Wrench",
    description: "Everything else around the house",
    services: [
      "Handyman services",
      "Painting touch-ups",
      "Drywall repairs",
      "Fixture installations",
    ],
  },
];

// How It Works Steps
export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
  icon: string;
}

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Sign Up & Add Your Properties",
    description: "Create your account, add your home details, and tell us about your properties. We'll set up a personalized maintenance calendar based on your home's age, systems, and local climate.",
    icon: "UserPlus",
  },
  {
    step: 2,
    title: "Get Reminders & Recommendations",
    description: "Receive timely reminders for seasonal tasks and preventive maintenance. We'll recommend vetted local pros when you need work done, taking the guesswork out of finding reliable help.",
    icon: "Bell",
  },
  {
    step: 3,
    title: "We Handle the Details",
    description: "Need help scheduling or coordinating? Our concierge team handles communication with providers, follows up on quality, and keeps your maintenance records organized in one place.",
    icon: "CheckCircle",
  },
];

// Features
export interface Feature {
  title: string;
  description: string;
  icon: string;
}

export const features: Feature[] = [
  {
    title: "Maintenance Calendar",
    description: "Never miss important maintenance with smart reminders tailored to your home and local climate.",
    icon: "Calendar",
  },
  {
    title: "Multi-Property Support",
    description: "Manage your primary home, vacation property, and rentals all from one dashboard.",
    icon: "Building2",
  },
  {
    title: "Trusted Provider Network",
    description: "Access vetted local pros who meet our standards for quality, reliability, and communication.",
    icon: "Users",
  },
  {
    title: "Concierge Coordination",
    description: "Let us handle scheduling, follow-ups, and provider communication so you don't have to.",
    icon: "Headphones",
  },
  {
    title: "Maintenance Records",
    description: "Keep all your service history, receipts, and warranty info organized and accessible.",
    icon: "FileText",
  },
  {
    title: "Transparent Pricing",
    description: "Know what you're paying for membership. Provider costs are quoted separately with no hidden fees.",
    icon: "DollarSign",
  },
];

// Testimonials
export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export const testimonials: Testimonial[] = [
  {
    quote: "I used to forget about HVAC maintenance until something broke. Now I get reminders and they even help me schedule with a reliable tech. Worth every penny.",
    author: "Jordan R.",
    role: "Homeowner",
  },
  {
    quote: "Managing two rental properties was chaos before RegularUpkeep. The maintenance calendar and provider coordination alone save me hours every month.",
    author: "Michelle T.",
    role: "Property Owner",
  },
  {
    quote: "As a first-time homeowner, I had no idea what maintenance I should be doing. Their seasonal checklists and recommendations made it easy to stay on top of everything.",
    author: "David K.",
    role: "Homeowner",
  },
  {
    quote: "The concierge service is a game-changer. I just tell them what I need, and they handle getting quotes and scheduling. I've gotten back so much of my time.",
    author: "Sarah M.",
    role: "Busy Professional",
  },
  {
    quote: "We have a beach house that's two hours away. Having RegularUpkeep coordinate maintenance while we're not there gives us real peace of mind.",
    author: "Robert & Linda P.",
    role: "Second Home Owners",
  },
  {
    quote: "The providers they recommend actually show up on time and do quality work. That alone sets them apart from what I've experienced trying to find help on my own.",
    author: "Amanda H.",
    role: "Homeowner",
  },
];

// FAQs
export interface FAQ {
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
  {
    question: "What exactly is RegularUpkeep?",
    answer: "RegularUpkeep is a home maintenance management service. We help you stay on top of routine maintenance with smart reminders, connect you with vetted local service providers, and offer concierge support to coordinate repairs and upkeep. Think of us as your personal home maintenance assistant.",
  },
  {
    question: "How is this different from just hiring contractors myself?",
    answer: "You can always hire contractors directly, but RegularUpkeep adds value by: (1) reminding you about maintenance you might forget, (2) recommending providers we've vetted for quality and reliability, (3) handling scheduling and coordination so you don't have to make endless phone calls, and (4) keeping all your maintenance records organized in one place.",
  },
  {
    question: "Do you actually do the maintenance work?",
    answer: "No, we don't perform maintenance or repairs ourselves. We connect you with qualified local service providers and help coordinate the work. The providers are independent businesses, and you pay them directly for their services. Our membership fee covers the platform, reminders, and concierge coordination.",
  },
  {
    question: "What areas do you serve?",
    answer: "We currently serve Eastern North Carolina and are actively expanding. Our provider network grows as we add new service areas. If you're outside our current coverage, you can still use our maintenance calendar and reminders\u2014we just may not have local provider recommendations yet.",
  },
  {
    question: "Can I use RegularUpkeep for rental properties?",
    answer: "Yes! Our platform supports multiple properties, including rental homes. The rental add-on includes features like tenant coordination and rental-specific maintenance tracking. Many property owners use us to manage maintenance across their entire portfolio.",
  },
  {
    question: "How do you vet your service providers?",
    answer: "We evaluate providers based on licensing (where required), insurance, customer reviews, response time, and communication quality. We also gather feedback from members after each service. Providers who don't meet our standards are removed from our network.",
  },
  {
    question: "What if I'm not happy with a provider's work?",
    answer: "Let us know! Part of our service is following up on quality. If there's an issue, we'll work with the provider to make it right and use that feedback to maintain our network quality. Your satisfaction helps us improve recommendations for everyone.",
  },
  {
    question: "Can I cancel my membership anytime?",
    answer: "Yes, you can cancel your membership at any time. There are no long-term contracts or cancellation fees. Your membership continues until the end of your current billing period.",
  },
  {
    question: "What maintenance tasks do you track?",
    answer: "We cover the full range of home maintenance: HVAC, plumbing, electrical, roofing, gutters, lawn care, pest control, appliances, safety equipment, and more. We customize reminders based on your home's age, systems, and local climate conditions.",
  },
  {
    question: "Is my home information secure?",
    answer: "Yes, we take data security seriously. Your property information is encrypted and stored securely. We never sell your personal data to third parties. See our Privacy Policy for complete details on how we protect your information.",
  },
  {
    question: "How do I get started?",
    answer: "Click 'Get Started' to create your account. You'll add your property details, and we'll set up your personalized maintenance calendar. Most members are fully set up within 15 minutes.",
  },
  {
    question: "Do you offer any guarantees?",
    answer: "We guarantee the quality of our platform and concierge service. While we can't guarantee the work of independent service providers, we do vet them carefully and follow up on quality. If you're not satisfied with our service, contact us and we'll make it right.",
  },
];

// Provider Benefits (for /providers page)
export interface ProviderBenefit {
  title: string;
  description: string;
  icon: string;
}

export const providerBenefits: ProviderBenefit[] = [
  {
    title: "Steady Job Flow",
    description: "Connect with homeowners in your service area who are actively looking for quality help. No more slow seasons.",
    icon: "TrendingUp",
  },
  {
    title: "Quality Customers",
    description: "Our members are engaged homeowners who value maintenance and are ready to invest in their properties.",
    icon: "Star",
  },
  {
    title: "Less Admin Work",
    description: "We handle initial coordination and scheduling. You focus on what you do best\u2014the actual work.",
    icon: "ClipboardCheck",
  },
  {
    title: "Featured Placement",
    description: "Get a profile in our provider directory with your service area, specialties, and member reviews.",
    icon: "Award",
  },
  {
    title: "Clear Communication",
    description: "Know exactly what the job entails before you show up. No surprises, no wasted trips.",
    icon: "MessageSquare",
  },
  {
    title: "Reliable Payments",
    description: "Work with customers who understand the value of your services and pay promptly.",
    icon: "CreditCard",
  },
];

// SEO Metadata
export const seo = {
  title: "RegularUpkeep | Home Maintenance Made Simple",
  description: "One place to manage all your home maintenance. Get reminders, find trusted providers, and let our concierge handle the coordination. Serving Eastern North Carolina.",
  keywords: [
    "home maintenance",
    "property management",
    "home repairs",
    "maintenance reminders",
    "trusted contractors",
    "home services",
    "property maintenance",
    "North Carolina home services",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "RegularUpkeep",
  },
};

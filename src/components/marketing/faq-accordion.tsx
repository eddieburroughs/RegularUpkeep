import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs, type FAQ } from "@/content/site";

interface FaqAccordionProps {
  items?: FAQ[];
  showAll?: boolean;
}

export function FaqAccordion({ items, showAll = false }: FaqAccordionProps) {
  const faqItems = items || (showAll ? faqs : faqs.slice(0, 8));

  return (
    <Accordion type="single" collapsible className="w-full">
      {faqItems.map((faq, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger className="text-left">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function FaqSection() {
  return (
    <section className="section-padding">
      <div className="container-marketing">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Got questions? We&apos;ve got answers. If you don&apos;t see what you&apos;re looking for, reach out to us directly.
          </p>
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          <FaqAccordion />
        </div>
      </div>
    </section>
  );
}

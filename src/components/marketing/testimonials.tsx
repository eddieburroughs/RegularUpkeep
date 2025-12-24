import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { testimonials, type Testimonial } from "@/content/site";

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="pt-6">
        <Quote className="h-8 w-8 text-primary/30" />
        <blockquote className="mt-4">
          <p className="text-muted-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
        </blockquote>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {testimonial.author.charAt(0)}
          </div>
          <div>
            <p className="font-semibold">{testimonial.author}</p>
            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestimonialsSection() {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-marketing">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What Our Members Say
          </h2>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Homeowners and property managers trust RegularUpkeep to simplify their maintenance.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.slice(0, 6).map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { testimonials } from "@/data/marketing";
import { initials } from "@/utils/format";
import { cn } from "@/lib/utils";

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = testimonials.length;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % total), 6000);
    return () => clearInterval(id);
  }, [paused, total]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + total) % total);

  return (
    <div
      className="mx-auto max-w-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Testimoni pengguna"
    >
      <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {testimonials.map((t, i) => (
            <figure key={t.id} className="w-full shrink-0 p-8 sm:p-12" aria-hidden={i !== index}>
              <Quote className="h-9 w-9 text-accent" />
              <blockquote className="mt-4 text-lg font-medium leading-relaxed sm:text-xl">{t.quote}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials(t.name)}</AvatarFallback>
                </Avatar>
                <span>
                  <span className="block text-sm font-bold">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Testimoni sebelumnya"><ChevronLeft /></Button>
        <div className="flex gap-2">
          {testimonials.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Testimoni ${i + 1}`}
              aria-current={i === index}
              className={cn("h-2 rounded-full transition-all", i === index ? "w-7 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40")}
            />
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Testimoni berikutnya"><ChevronRight /></Button>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

import { LegalLayout } from "@/components/shared/Legal";
import { jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers about repairs, warranties, payments, delivery and stock at Krishna Mobile Repairing Center, Kathmandu.",
  alternates: { canonical: "/faq" },
};

const GROUPS = [
  {
    id: "repairs",
    title: "Repairs & warranties",
    items: [
      {
        q: "How long does a typical repair take?",
        a: "Screen replacements and battery swaps are usually finished in 20–45 minutes while you wait. Motherboard-level work and liquid ingress recovery take longer — we give you a firm timeframe when we quote.",
      },
      {
        q: "What is your repair warranty?",
        a: "Every repair carries a 90-day component warranty covering the part we fitted and the workmanship. It does not cover new physical damage or liquid ingress after the repair.",
      },
      {
        q: "What happens if my device cannot be repaired?",
        a: "We tell you honestly and charge nothing. There is no diagnostic fee for cases where we cannot proceed.",
      },
      {
        q: "Do I need to leave my passcode?",
        a: "No, not for most jobs. If a passcode is needed for testing after the repair we will ask you at drop-off.",
      },
      {
        q: "Can you repair while I wait?",
        a: "Yes for most screen, battery and charging port jobs. Board-level repairs usually need to be collected the same or next day.",
      },
    ],
  },
  {
    id: "orders",
    title: "Orders & delivery",
    items: [
      {
        q: "Do you deliver outside Kathmandu?",
        a: "We deliver nationwide. Delivery within the ring road is NPR 150, outside it NPR 150 as well, and free above NPR 5,000.",
      },
      {
        q: "How do I track my order?",
        a: "Every order appears in your account under Orders, with live status from confirmed through to delivered.",
      },
      {
        q: "Can I return an item?",
        a: "Unused items in original packaging can be returned within 7 days for a full refund. Consumables that have been fitted are not returnable.",
      },
      {
        q: "Are the products genuine?",
        a: "Yes. Every accessory is sourced as OEM or equivalent-grade and checked before it goes on the shelf. We do not stock counterfeit goods.",
      },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    items: [
      {
        q: "Which payment methods do you accept?",
        a: "Cash on delivery is always available. eSewa appears at checkout once the merchant keys are configured.",
      },
      {
        q: "Are card payments accepted?",
        a: "Not through this website. We do not store card details — eSewa handles all online payment security.",
      },
      {
        q: "Can I pay by bank transfer?",
        a: "For larger orders, yes. Contact us and we will share our merchant details and confirm the order on receipt.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & privacy",
    items: [
      {
        q: "Do I need an account to order?",
        a: "No. Guest checkout works. An account simply saves your cart, addresses and repair history.",
      },
      {
        q: "What data do you keep?",
        a: "Your contact details, delivery addresses, order history and repair tickets — all of which we need to serve you. See our privacy policy for the full detail.",
      },
      {
        q: "How do I reset my password?",
        a: "Use the Forgot password link on the sign-in page. We email a one-time link that expires after an hour.",
      },
    ],
  },
];

export default async function FaqPage() {
  const faq = GROUPS.flatMap((g) => g.items);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <LegalLayout
        eyebrow="Support"
        title="Frequently Asked Questions"
        intro="The things people ask most often at the counter. If your question is not here, just call or send us a message."
      >
        <div className="flex flex-col gap-10">
          {GROUPS.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-28">
              <h2 className="border-b border-border-subtle pb-4 font-headline-md text-headline-md text-text-primary">
                {group.title}
              </h2>
              <div className="mt-2 flex flex-col">
                {group.items.map((item) => (
                  <details
                    key={item.q}
                    className="group border-b border-border-subtle"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-headline-sm text-headline-sm text-text-primary transition-colors hover:text-tertiary">
                      {item.q}
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-border-subtle text-text-muted transition-transform group-open:rotate-45">
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </span>
                    </summary>
                    <p className="pb-5 pr-10 font-body-md text-body-md text-text-secondary text-pretty">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </LegalLayout>
    </>
  );
}
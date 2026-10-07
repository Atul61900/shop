import type { Metadata } from "next";
import { LegalLayout } from "@/components/shared/Legal";
import { siteConfig } from "@/lib/config";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that apply when you shop or book a repair at Krishna Mobile Repairing Center, Kathmandu.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      intro="Plain-language terms. If something here is unclear, ask us before ordering — we would rather explain it now than have a dispute later."
      updated="January 2026"
    >
      <div className="flex flex-col gap-8">
        <Section title="Orders">
          <p>
            Placing an order is an offer to buy. It becomes a contract when we confirm dispatch or
            hand the goods over. We may decline an order — for example if an item is mispriced or
            out of stock after you ordered it — and if we do, any payment taken is refunded in full.
          </p>
          <p>
            Prices shown are in Nepali Rupees and include VAT. Delivery is{" "}
            {formatMoney(150)} within the ring road and free on orders above{" "}
            {formatMoney(500000)}.
          </p>
        </Section>

        <Section title="Payment">
          <p>
            Cash on delivery is available nationwide. For online payment we use eSewa —
            we never receive or store your card details. An order is treated as paid only once the
            gateway confirms it, not when you are redirected back to this site.
          </p>
        </Section>

        <Section title="Delivery">
          <p>
            Delivery dates are estimates, not guarantees. Risk and title in the goods pass to you on
            delivery. If nobody is available we will attempt contact and, after three failed
            attempts, return the parcel. We will not leave goods unattended.
          </p>
        </Section>

        <Section title="Repairs">
          <p>These terms apply specifically to repair work booked through this site or the counter.</p>
          <List
            items={[
              "We diagnose first and send you a firm quote. No work begins until you approve it.",
              "If we find additional damage once the device is open, we stop and contact you with a revised price.",
              "Where a repair proves impossible we charge nothing for it.",
              "Devices left unclaimed for more than 90 days after notification may be disposed of. We will try hard to reach you first.",
              "Please back up your data before handing over a device. We are not responsible for data loss.",
              "Devices left with us must be collected during store hours with your ticket reference.",
            ]}
          />
        </Section>

        <Section title="Warranty">
          <p>
            Repairs carry a 90-day component warranty. New products carry the manufacturer warranty
            stated on their listing. In both cases the warranty does not cover physical damage after
            sale, liquid ingress, or work performed by a third party.
          </p>
        </Section>

        <Section title="Returns">
          <p>
            Unused goods in original packaging may be returned within 7 days of delivery. Fitted
            consumables — screen protectors, cables, cases — cannot be returned. Faulty goods are
            replaced or refunded at our option.
          </p>
        </Section>

        <Section title="Liability">
          <p>
            We are not liable for indirect or consequential loss, including loss of data or loss of
            profit. Our total liability in any case is limited to the amount you paid us for the
            relevant order or repair.
          </p>
          <p>
            Nothing here limits your rights under Nepalese consumer protection law.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            {siteConfig.name}
            <br />
            {siteConfig.address.line1}, {siteConfig.address.line2}
            <br />
            {siteConfig.contact.phoneDisplay} ·{" "}
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="text-tertiary underline-offset-4 hover:underline"
            >
              {siteConfig.contact.email}
            </a>
          </p>
        </Section>
      </div>
    </LegalLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-border-subtle pb-3 font-headline-sm text-headline-sm text-text-primary">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-3 [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:font-body-md [&_li]:text-body-md [&_li]:text-text-secondary [&_p]:font-body-md [&_p]:text-body-md [&_p]:text-text-secondary [&_p]:text-pretty [&_span]:mt-1.5 [&_span]:h-1 [&_span]:w-1 [&_span]:shrink-0 [&_span]:bg-border-active [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2.5">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>
          <span aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}
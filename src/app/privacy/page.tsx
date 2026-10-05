import type { Metadata } from "next";
import { LegalLayout } from "@/components/shared/Legal";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Krishna Mobile Repairing Center collects, uses and protects your personal information when you shop, book a repair or contact us.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      intro="We collect the minimum we need to serve you, we never sell your data, and you can ask us to delete it at any time."
      updated="January 2026"
    >
      <div className="flex flex-col gap-8">
        <Section title="What we collect">
          <List
            items={[
              "Contact details you give us — name, email address and phone number.",
              "Delivery addresses you save or enter at checkout.",
              "Order history, including what you bought and where it went.",
              "Repair tickets, including your device model, the fault you describe and the accessories you handed over.",
              "Basic technical data such as IP address, used to prevent abuse of our forms.",
            ]}
          />
        </Section>

        <Section title="Why we collect it">
          <List
            items={[
              "To take payment and deliver your order.",
              "To diagnose, quote for and warranty your repair.",
              "To send you order and repair notifications — the messages that matter.",
              "To answer your messages and support requests.",
              "To keep our forms and login secure from abuse.",
            ]}
          />
          <p>
            We do not use your data for third-party advertising and we do not sell or rent your
            details to anyone.
          </p>
        </Section>

        <Section title="Who else sees it">
          <p>
            Only the parties who genuinely need it to fulfil your request:
          </p>
          <List
            items={[
              "Our payment gateway (eSewa or Khalti) for online payments — we never see or store your card details.",
              "Our delivery rider, who receives just the name, phone number and address needed to hand the parcel over.",
              "Our email provider, if you have asked to receive messages from us.",
            ]}
          />
        </Section>

        <Section title="How long we keep it">
          <p>
            Order records are kept for as long as the warranty period plus the time needed to meet
            our accounting obligations. Repair tickets are kept for the same reason. Marketing
            emails stop the moment you unsubscribe.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use one essential cookie to keep you signed in. It is httpOnly, so it cannot be read
            by scripts, and it is scoped to this site. Your cart is stored locally in your browser
            until you sign in, at which point it moves to your account so it follows you across
            devices.
          </p>
        </Section>

        <Section title="Your rights">
          <p>You can, at any time:</p>
          <List
            items={[
              "Ask us what we hold about you.",
              "Ask us to correct anything that is wrong.",
              "Ask us to delete your account and its data.",
              "Opt out of marketing messages with one click.",
            ]}
          />
          <p>
            Write to{" "}
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="text-tertiary underline-offset-4 hover:underline"
            >
              {siteConfig.contact.email}
            </a>{" "}
            or call {siteConfig.contact.phoneDisplay} and we will action it.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we change how we handle your data we will update this page and adjust the date at
            the top. Material changes affecting existing customers will be announced by email.
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
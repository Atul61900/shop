import type { Metadata } from "next";

import { ServiceForm } from "@/components/admin/ServiceForm";

export const metadata: Metadata = {
  title: "Add service",
  robots: { index: false, follow: false },
};

export default function NewServicePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-headline-md text-headline-md text-text-primary">
          New service
        </h2>
        <p className="font-body-md text-body-md text-text-secondary text-pretty">
          It appears in the repair matrix and gets its own page straight away.
        </p>
      </div>

      <ServiceForm />
    </div>
  );
}

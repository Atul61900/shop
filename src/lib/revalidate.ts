import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Catalogue pages read the database during render but do not use any dynamic
 * API, so Next prerenders them and serves that HTML until it is invalidated.
 *
 * That is why an admin edit appeared to "come back": the admin pages are
 * dynamic (they read the session cookie) so they updated immediately, while
 * the public pages were still serving output baked in at build time.
 *
 * Every catalogue mutation calls this so the change is visible at once,
 * instead of after the next deploy.
 */
export function revalidateCatalogue(input?: {
  productSlug?: string | null;
  serviceSlug?: string | null;
}) {
  // Anything that counts or lists the catalogue.
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/services");
  revalidatePath("/sitemap.xml");

  // The record's own detail page, plus its siblings, because listings embed it.
  if (input?.productSlug) {
    revalidatePath("/shop");
    revalidatePath(`/shop/${input.productSlug}`);
  }
  if (input?.serviceSlug) {
    revalidatePath("/services");
    revalidatePath(`/services/${input.serviceSlug}`);
  }
}
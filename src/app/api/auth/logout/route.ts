import { destroySession } from "@/lib/auth";
import { ok, guarded } from "@/lib/api";

export async function POST() {
  return guarded(async () => {
    await destroySession();
    return ok({ loggedOut: true });
  });
}
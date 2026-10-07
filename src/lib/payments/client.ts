"use client";

/**
 * Starts (or restarts) a gateway checkout for an EXISTING order.
 *
 * Shared by the checkout form and the failure page's Retry button so the
 * redirect-vs-form branching lives in exactly one place. Returns an error
 * string on failure, or never returns on success (the browser leaves the page).
 */

export type GatewayMethod = "ESEWA";

export async function startGatewayPayment(
  method: GatewayMethod,
  orderNumber: string,
): Promise<string | null> {
  const res = await fetch(`/api/payments/${method.toLowerCase()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber }),
  });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    data?: { redirectUrl?: string; mode?: string; formUrl?: string; fields?: Record<string, string> };
  } | null;

  if (!res.ok || !json?.ok) {
    return json?.error ?? "Payment could not be started.";
  }

  if (json.data?.redirectUrl) {
    window.location.href = json.data.redirectUrl;
    return null;
  }

  // eSewa hands us a complete, server-signed form: POST it straight to them.
  if (json.data?.mode === "esewa-form" && json.data.formUrl && json.data.fields) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = json.data.formUrl;
    for (const [name, value] of Object.entries(json.data.fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = String(value);
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    return null;
  }

  return "The gateway returned an unexpected response.";
}

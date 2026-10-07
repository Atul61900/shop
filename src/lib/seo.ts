/**
 * Shared SEO helpers.
 */

/**
 * Serializes JSON-LD for injection via dangerouslySetInnerHTML.
 *
 * `JSON.stringify` does NOT escape `<`, so a value like `</script>` in a
 * product name or description would break out of the script tag and allow
 * script injection. Escaping `<` as `\u003c` is safe inside both JSON strings
 * and HTML script blocks, and parsers decode it back transparently.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

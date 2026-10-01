import { load } from "cheerio";
import { getLegacyPage } from "../../lib/pasadena-pages";
export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const $ = load(getLegacyPage([kind + ".php"])?.html || "");
  // Preserve the legacy policy's list clauses, not just its paragraphs.
  // Only repository-owned text is extracted; no legacy HTML/scripts are injected.
  const blocks = $("#content").children("p,ul,ol").toArray();
  return (
    <article className="mx-auto max-w-content px-5 py-16 md:px-6">
      <h1 className="font-display text-4xl">
        {kind === "privacy" ? "Privacy Policy" : "Terms of Use"}
      </h1>
      <div className="mt-8 max-w-3xl space-y-5 leading-relaxed text-stone">
        {blocks.map((block, i) => {
          if (block.name === "ul" || block.name === "ol") {
            const items = $(block)
              .find("li")
              .map((_, item) => {
                const copy = $(item).clone();
                copy.children("ul,ol").remove();
                return copy.text().trim();
              })
              .get();
            const List = block.name;
            return (
              <List
                key={i}
                className={
                  "space-y-3 pl-6 " +
                  (block.name === "ol" ? "list-decimal" : "list-disc")
                }
              >
                {items.map((text, n) => (
                  <li key={n}>{text}</li>
                ))}
              </List>
            );
          }
          return (
            <p
              key={i}
              className={
                $(block).children("strong").length ? "font-semibold" : undefined
              }
            >
              {$(block).text().trim()}
            </p>
          );
        })}
      </div>
      {kind === "privacy" && (
        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-2xl">Contact and photo requests</h2>
          <p className="mt-4 leading-relaxed text-stone">
            When you send a request, your contact details, project information,
            and any photos are used to respond to your inquiry. Photos are
            stored privately for project review. Transactional confirmations and
            manager notifications may be sent through our email provider.
            Submitting a request does not subscribe you to marketing. Call
            818-618-5288 with privacy questions or requests.
          </p>
        </section>
      )}
    </article>
  );
}

import { load } from "cheerio";
export function LegacyContent({
  html,
  privacy = false,
}: {
  html: string;
  privacy?: boolean;
}) {
  const $ = load(html);
  const root = $("#content").first();
  root.find("#breadcrumb,script,style").remove();
  root.find("a[href]").each((_i, e) => {
    const link = $(e);
    const href = link.attr("href");
    if (
      href?.startsWith("/") &&
      !href.startsWith("//") &&
      !href.startsWith("/pasadena-shades-and-shutters/")
    )
      link.attr("href", `/pasadena-shades-and-shutters${href}`);
  });
  root
    .find('[id^="wufoo-"]')
    .replaceWith(
      '<p>Please call <a href="tel:+18186185288">818-618-5288</a> for assistance, or <a href="/pasadena-shades-and-shutters/send-photos">send window photos to request a quote</a>.</p>',
    );
  root.find("*").each((_i, e) => {
    const el = $(e);
    el.removeAttr("style")
      .removeAttr("class")
      .removeAttr("width")
      .removeAttr("height")
      .removeAttr("onclick");
  });
  return (
    <article className="legacy-article mx-auto max-w-content px-5 py-14 md:px-6">
      <>
        {privacy && (
          <section className="mb-8 rounded-2xl border border-linen bg-sand p-6">
            <h2>Photo quote requests</h2>
            <p>
              This website is a preview. Photo requests are not enabled while
              storage, review access and retention arrangements are awaiting
              confirmation. The final privacy notice will describe the actual
              providers and data practices before this service opens. Call
              818-618-5288 to discuss your project.
            </p>
          </section>
        )}
        <div
          dangerouslySetInnerHTML={{
            __html:
              root
                .html()
                ?.replace(
                  /Sign up for our online newsletter!/gi,
                  "Contact us to ask about news and updates.",
                )
                .replace(/online request form/gi, "contact page") ||
              "<h1>Pasadena Shades &amp; Shutters</h1><p>Please call 818-618-5288 to discuss your project.</p>",
          }}
        />
      </>
    </article>
  );
}

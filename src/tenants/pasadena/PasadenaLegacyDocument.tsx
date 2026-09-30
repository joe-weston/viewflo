/* eslint-disable @next/next/no-css-tags */
import { LegacyWufooEmbeds } from "../../../app/legacy-wufoo-embeds";

export function PasadenaLegacyDocument({
  html,
  sourceId,
}: {
  html: string;
  sourceId: string;
}) {
  return (
    <>
      <link rel="stylesheet" href="/tenants/pasadena/style.css" />
      <link
        rel="stylesheet"
        href="/tenants/pasadena/lightbox/css/lightbox.css"
      />
      <div
        className="next-migration-note"
        data-source={sourceId}
        aria-hidden="true"
      />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <LegacyWufooEmbeds />
    </>
  );
}

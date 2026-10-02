import Link from "next/link";
export const metadata = {
  title: "ViewFlow | Your business, online",
  robots: { index: false, follow: false },
};
export default function Home() {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <strong>ViewFlow</strong>
        <Link href="/auth">Sign in</Link>
      </header>
      <section className="portal-hero">
        <p className="eyebrow">BUSINESS WEBSITES. ROOM TO GROW.</p>
        <h1>
          A place for your business.
          <br />A platform for what’s next.
        </h1>
        <p>
          Your website and account, brought together. ViewFlow builds on the
          Pasadena foundation with a dedicated home for each business.
        </p>
        <Link className="portal-button" href="/auth">
          Open your workspace
        </Link>
      </section>
      <section className="portal-card">
        <h2>Pasadena Shades &amp; Shutters</h2>
        <p>
          Explore the website preview, or sign in to the authorized business
          workspace to review agreements and manage billing.
        </p>
        <div className="portal-nav">
          <Link href="/pasadena-shades-and-shutters">View website preview</Link>
          <Link href="/pasadena-shades-and-shutters/admin">
            Open business workspace
          </Link>
        </div>
      </section>
      <p>ViewFlow · Valinor / Pasadena platform foundation</p>
    </div>
  );
}

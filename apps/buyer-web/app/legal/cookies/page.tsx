export const metadata = { title: "Cookie Policy — Prive Exchange" };

export default function CookiesPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p className="!text-ink-faint !text-sm">Last updated: 9 July 2026 · Version 1.0</p>

      <p>
        Prive Exchange uses a deliberately small number of cookies and similar technologies. This
        page lists every one of them and what it does. You can change your choice at any time by
        clearing the consent entry in your browser storage — the banner will re-appear.
      </p>

      <h2>1. Strictly necessary (always on)</h2>
      <ul>
        <li>
          <strong>prive_session</strong> — an encrypted, httpOnly authentication cookie holding
          your signed session token. Without it you cannot stay signed in. Lifetime: 7 days,
          renewed on activity, revocable from Settings → Active sessions.
        </li>
        <li>
          <strong>prive-cookie-consent</strong> — local-storage entry remembering your consent
          choice so we don't ask on every visit. Lifetime: 12 months.
        </li>
      </ul>

      <h2>2. Preferences</h2>
      <ul>
        <li>
          <strong>Local UI state</strong> — non-identifying local-storage entries such as selected
          market, chart interval, and dismissed notices. These never leave your device.
        </li>
      </ul>

      <h2>3. Analytics & marketing</h2>
      <p>
        <strong>None.</strong> This build ships no third-party analytics, advertising, or
        cross-site tracking cookies. If that ever changes, they will be off by default, listed
        here, and gated behind explicit opt-in consent.
      </p>

      <h2>4. Third parties</h2>
      <p>
        Payment, identity-verification, or embedded-content providers may set their own cookies
        when you use those specific features; each is disclosed at the point of use.
      </p>

      <h2>5. Managing cookies</h2>
      <p>
        Browsers let you block or delete cookies entirely — note that blocking the strictly
        necessary ones will sign you out. Questions → <strong>privacy@prive.exchange</strong>.
      </p>
    </>
  );
}

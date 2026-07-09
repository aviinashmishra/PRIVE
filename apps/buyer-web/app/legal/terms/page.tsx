export const metadata = { title: "Terms of Service — Prive Exchange" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="!text-ink-faint !text-sm">Last updated: 9 July 2026 · Version 1.0</p>

      <p>
        These Terms govern your access to and use of Prive Exchange — the platform, APIs, mobile
        experiences, and smart-contract services operated by Prive Exchange (&ldquo;Prive&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the platform you agree
        to these Terms and to our Privacy and Cookie Policies.
      </p>

      <h2>1. The service</h2>
      <p>
        Prive operates a marketplace for <strong>tokenised carbon credits</strong>: each token
        represents one tonne of CO₂e whose underlying registry serial has been retired at source
        before minting. The platform provides trading, portfolio, retirement (offsetting),
        project-listing, and verification services. Some environments — including this
        demonstration build — use simulated market data; where simulation is active it is
        disclosed in-product.
      </p>

      <h2>2. Eligibility & accounts</h2>
      <ul>
        <li>You must be at least 18 years old and legally able to enter binding contracts.</li>
        <li>Account registration requires a verified email address. Identity (KYC) and company
          (KYB) verification tiers gate trading, withdrawal and listing limits.</li>
        <li>You are responsible for safeguarding your credentials. We support session revocation
          in <strong>Settings → Active sessions</strong>; revoke anything you don't recognise.</li>
        <li>One account per person or entity. Market manipulation, wash trading, spoofing and
          layering are prohibited and surveilled.</li>
      </ul>

      <h2>3. Trading & settlement</h2>
      <ul>
        <li>Orders, once matched, are binding. Settlement is recorded on-chain in Merkle-anchored
          batches; a matched trade cannot be silently reversed — corrections produce a visible
          on-chain correction record.</li>
        <li>Retirement (offsetting) burns the credit irrevocably and issues a non-transferable
          certificate. Retired credits can never re-enter the market.</li>
        <li>We may halt a market (circuit breakers), cancel manifestly erroneous trades, or freeze
          assets pending investigation, as described in our market-integrity rules.</li>
      </ul>

      <h2>4. Fees</h2>
      <p>
        Trading, retirement, and withdrawal fees are shown before you confirm any action. We may
        change the fee schedule with 14 days' notice.
      </p>

      <h2>5. Risk disclosure</h2>
      <p>
        Carbon-credit prices are volatile and may go to zero. Tokenised instruments carry
        technology risk (smart-contract defects, chain outages) and regulatory risk
        (classification varies by jurisdiction). Nothing on the platform is investment, legal, or
        tax advice. <strong>Trade only what you can afford to lose.</strong>
      </p>

      <h2>6. Prohibited use</h2>
      <ul>
        <li>Sanctions-listed persons and restricted jurisdictions may not use the platform.</li>
        <li>No money laundering, terrorist financing, fraud, or evasion of our controls.</li>
        <li>No scraping at abusive rates, no interference with the matching engine, no
          exploitation of defects — report vulnerabilities to security@prive.exchange.</li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>
        The platform, its design system, and its documentation are our property or licensed to
        us. Open-source components remain under their own licences. You retain rights to content
        you submit (e.g. project documentation) and grant us a licence to display it for
        verification and transparency purposes.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the maximum extent permitted by law, the platform is provided &ldquo;as is&rdquo;. Our
        aggregate liability for any claim is limited to the greater of the fees you paid us in the
        12 months before the claim or USD 100. We are not liable for indirect or consequential
        loss, chain forks, or force majeure.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may close your account at any time after settling open obligations. We may suspend or
        terminate accounts that breach these Terms, subject to applicable law; balances of
        lawfully held assets remain withdrawable unless frozen by legal process.
      </p>

      <h2>10. Changes & contact</h2>
      <p>
        We may update these Terms; material changes are notified by email and in-product at least
        14 days before they take effect. Questions → <strong>legal@prive.exchange</strong> or open
        a ticket in the Support center.
      </p>
    </>
  );
}

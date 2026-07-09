export const metadata = { title: "Privacy Policy — Prive Exchange" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="!text-ink-faint !text-sm">Last updated: 9 July 2026 · Version 1.0</p>

      <p>
        This policy explains what personal data Prive Exchange collects, why, and the choices you
        have. It is written to meet GDPR and India DPDP standards; where local law grants you more
        rights, those apply.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data</strong> — email, display name, hashed password (Argon2id; we can
          never read your password), role, and account identifiers.</li>
        <li><strong>Verification data</strong> — KYC/KYB documents and screening results, processed
          under legal-compliance obligations and encrypted at rest.</li>
        <li><strong>Activity data</strong> — orders, trades, retirements, project submissions,
          support tickets, and the device/IP metadata of your sign-in sessions (shown to you in
          Settings → Active sessions).</li>
        <li><strong>Technical data</strong> — logs and diagnostics needed to run the service
          securely (rate limiting, fraud and abuse detection).</li>
      </ul>

      <h2>2. What never goes on-chain</h2>
      <p>
        Personally identifiable information is <strong>never written to the blockchain</strong>.
        On-chain records contain pseudonymous addresses and content hashes only. One deliberate
        exception: a retirement certificate carries the <em>beneficiary name you choose to
        publish</em> as ESG proof — you may use a pseudonym, and we tell you at the moment of
        retirement that this string is public and permanent.
      </p>

      <h2>3. Why we process data (legal bases)</h2>
      <ul>
        <li>To provide the service you contracted for (account, trading, certificates).</li>
        <li>To comply with law — AML/CFT, sanctions screening, records retention.</li>
        <li>Legitimate interest — platform security, abuse prevention, service improvement.</li>
        <li>Consent — optional communications and non-essential cookies (see Cookie Policy).</li>
      </ul>

      <h2>4. Sharing</h2>
      <p>
        We share data only with: identity-verification and sanctions-screening providers; our
        infrastructure processors (hosting, email delivery) under data-processing agreements;
        auditors and authorities where legally required. <strong>We do not sell personal
        data.</strong>
      </p>

      <h2>5. Security</h2>
      <p>
        Argon2id password hashing, TLS 1.3 in transit, encryption at rest for sensitive fields,
        revocable server-side sessions, deny-by-default role access, rate limiting and lockout on
        authentication, and audit logging of administrative actions.
      </p>

      <h2>6. Retention</h2>
      <p>
        Account data is kept while your account is active. Financial and KYC records are retained
        for the statutory period after closure (typically 5–8 years depending on jurisdiction),
        then deleted or irreversibly anonymised. Support tickets are kept for 24 months.
      </p>

      <h2>7. Your rights</h2>
      <ul>
        <li>Access, rectify, export, and erase your data (subject to statutory retention).</li>
        <li>Object to or restrict processing based on legitimate interest.</li>
        <li>Withdraw consent at any time without affecting prior processing.</li>
        <li>Complain to your supervisory authority.</li>
      </ul>
      <p>
        Exercise any right via <strong>privacy@prive.exchange</strong> or a Support ticket —
        we respond within 30 days. Note that blockchain records are immutable by design; that is
        why no PII is written there in the first place.
      </p>

      <h2>8. International transfers & children</h2>
      <p>
        Data may be processed in regions with adequate safeguards (SCCs or equivalent). Residency
        pinning is applied where required (e.g. India DPDP). The platform is not directed at
        children and we do not knowingly process data of anyone under 18.
      </p>

      <h2>9. Changes</h2>
      <p>
        Material changes are announced by email and in-product before they take effect. Data
        Protection Officer: <strong>dpo@prive.exchange</strong>.
      </p>
    </>
  );
}

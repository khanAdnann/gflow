export default function PrivacyPage() {
  const items = [
    ["What we store", "An anonymous participant ID, a random referral code, and referral records (who joined through which code, status and timestamps). We don't ask for your name, email or phone number."],
    ["What we don't do", "We don't access your contacts and we never send messages for you. Sharing opens your chosen app or share sheet; you decide what to send."],
    ["Abuse protection", "To limit abuse we apply rate limits using a one-way hash of your IP address. The raw IP address is not stored."],
    ["On your device", "Your anonymous session, a pending referral code, your theme preference and local simulation progress are kept in your browser's local storage."],
    ["Template notice", "This page describes the demo's default behaviour. If you operate your own deployment, review and adapt it to your own legal requirements."],
  ];
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-bold">Privacy</h1>
      <div className="mt-8 space-y-5">
        {items.map(([h, p]) => (
          <section key={h} className="card">
            <h2 className="font-display text-xl font-bold">{h}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{p}</p>
          </section>
        ))}
      </div>
    </article>
  );
}


import { Link } from "react-router-dom";

export default function AboutPage() {
  const sections = [
    ["What this website does", "AI Credits Demo is an interactive product demo. It shows how a referral challenge could work: you get a unique link, invite friends, and watch a progress tracker fill up as the backend verifies referrals."],
    ["How the demo works", "Opening the challenge page gives you an anonymous participant identity issued by our backend (no sign-up form). The server creates a random referral code for you. When a friend opens your link, the server records a pending referral for them."],
    ["How referrals are verified", "A visit is never a referral. A friend counts only when the server confirms all of the following: they are a new participant, their code is valid and not their own, they haven't been attributed before, they confirmed the demo notice, they generated their own link, and a short time has passed. Sharing buttons never change your count. Five verified referrals mark the challenge as completed — calculated on the server, never by the browser."],
    ["The reward is simulated", "The 1,00,000 AI credits are a simulated number used for demonstration. Nothing is redeemable and no real credits, money or prizes are issued."],
    ["No affiliation", "This is an independent, unofficial project. It is not affiliated with, sponsored by or endorsed by Google or Google Flow, and it makes no claim of any official promotion."],
  ];
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">About <span className="gradient-text">this demo</span></h1>
      <div className="mt-10 space-y-5">
        {sections.map(([h, p]) => (
          <section key={h} className="card">
            <h2 className="font-display text-2xl font-bold">{h}</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{p}</p>
          </section>
        ))}
      </div>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link to="/challenge" className="btn-primary">START THE CHALLENGE</Link>
        <Link to="/demo" className="btn-secondary">TRY THE SIMULATION</Link>
      </div>
    </article>
  );
}


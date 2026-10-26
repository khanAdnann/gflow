import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Share2, Trophy, ShieldCheck, BarChart3, PlayCircle } from "lucide-react";
import { RewardCard } from "../components/RewardCard";

const features = [
  { icon: Compass, title: "Explore the Demo", text: "Walk through an interactive AI credits experience with a clearly simulated reward." },
  { icon: Share2, title: "Share With Friends", text: "Get your own unique referral link and invite friends to try the demo — no contacts accessed, nothing sent automatically." },
  { icon: Trophy, title: "Complete the Challenge", text: "When five friends complete verified onboarding, the server marks your challenge as completed." },
];

const steps = [
  {
    n: "01",
    icon: PlayCircle,
    title: "Step 1: Start Your Challenge",
    text: "Create a participant session and receive your unique referral link.",
  },
  {
    n: "02",
    icon: Share2,
    title: "Step 2: Share With Friends",
    text: "Share your link using the Web Share API where available, with copy-link and WhatsApp sharing fallbacks.",
  },
  {
    n: "03",
    icon: BarChart3,
    title: "Step 3: Track Your Progress",
    text: "View the number of valid referrals recorded by the backend.",
  },
  {
    n: "04",
    icon: Trophy,
    title: "Step 4: Complete the Challenge",
    text: "Complete the five-referral requirement and see the demo completion screen.",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div>
      <section className="grid items-center gap-12 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-block rounded-full border border-electric-400/40 bg-electric-500/10 px-4 py-1.5 text-xs font-bold tracking-[0.25em] text-electric-400">
            AI CREATOR CHALLENGE
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Explore the Google Flow Credits Challenge
            <span className="mt-2 block gradient-text">1,00,000 AI Credits</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Discover our interactive AI credits demo, invite friends to participate, and complete the five-referral challenge.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary" onClick={() => navigate("/challenge")}>
              START THE CHALLENGE <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <a className="btn-secondary" href="#how-it-works">HOW IT WORKS</a>
          </div>
        </motion.div>
        <RewardCard />
      </section>

      <section className="mt-24 grid gap-5 md:grid-cols-3" aria-label="Features">
        {features.map((f, i) => (
          <motion.article
            key={f.title} className="card"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.1 }} whileHover={{ y: -6 }}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-electric-500 to-violet-500 shadow-glow">
              <f.icon className="h-6 w-6 text-white" aria-hidden />
            </span>
            <h3 className="mt-5 font-display text-xl font-bold">{f.title}</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{f.text}</p>
          </motion.article>
        ))}
      </section>

      <section id="how-it-works" className="mt-24 scroll-mt-24">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">How It Works</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Completing the challenge does not grant actual Google Flow credits.
          </p>
        </div>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="gradient-text font-display text-4xl font-bold">{s.n}</span>
                  <s.icon className="h-6 w-6 text-violet-400" aria-hidden />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card mt-16 flex flex-col gap-4 border-violet-400/30 sm:flex-row sm:items-start" aria-labelledby="disclaimer">
        <ShieldCheck className="h-8 w-8 shrink-0 text-violet-400" aria-hidden />
        <div>
          <h2 id="disclaimer" className="font-display text-xl font-bold">Important disclaimer</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Completing the challenge does not grant actual Google Flow credits. The 1,00,000 credits shown here are{" "}
            <strong>simulated</strong> for demonstration only. This is an unofficial demo that is not issued, sponsored, or
            endorsed by Google or Google Flow, and no real credits, money, or prizes are awarded.{" "}
            <Link to="/about" className="font-semibold text-electric-400 underline-offset-4 hover:underline">Learn more</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}

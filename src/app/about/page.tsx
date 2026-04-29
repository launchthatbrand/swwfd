import { Cinzel, Plus_Jakarta_Sans } from "next/font/google";

import Link from "next/link";
import type { Metadata } from "next";

const displayFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-launchthatbot-display",
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-launchthatbot-body",
});

export const metadata: Metadata = {
  title: "About LaunchThatBot | Rise of the Bots",
  description:
    "What is LaunchThatBot? Why it exists, what it does, how it went from idea to platform in 7 days, where it runs, and why it wouldn't exist without AI and Convex.",
};

const timelineSteps = [
  {
    day: "Day 1",
    label: "Schema & deployment engine",
    detail:
      "Designed the Convex schema, wrote the deployment workflow, and got the first container spinning up on Portainer via API.",
  },
  {
    day: "Day 2",
    label: "Provider abstraction",
    detail:
      "Built the provider layer so deployments work across Hetzner, DigitalOcean, and custom infrastructure without config changes.",
  },
  {
    day: "Day 3",
    label: "Security baseline",
    detail:
      "Cloudflare tunnel integration, subdomain isolation, container-level network policies. The security template that ships with every deployment.",
  },
  {
    day: "Day 4",
    label: "Dashboard & observability",
    detail:
      "Real-time deployment status, agent activity feeds, structured event logging. The management surface that replaces SSH.",
  },
  {
    day: "Day 5",
    label: "Agent discovery & sync",
    detail:
      "Automatic detection of running agents, configuration sync across instances, health check orchestration.",
  },
  {
    day: "Day 6",
    label: "Templates & reusability",
    detail:
      "Deployment templates that capture working configurations. Deploy your second instance in minutes, not hours.",
  },
  {
    day: "Day 7",
    label: "Convex Mode & detach flow",
    detail:
      "User-owned Convex instances for operational data, scheduled functions, and the clean detach workflow. Ship it.",
  },
] as const;

export default function AboutPage() {
  return (
    <main
      className={`${displayFont.variable} ${bodyFont.variable} relative min-h-screen w-full overflow-y-auto bg-white text-gray-900 dark:bg-[#09070f] dark:text-[#f7f4ef]`}
    >
      {/* Background effects */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 12%, rgba(188, 135, 56, 0.2), transparent 35%), radial-gradient(circle at 78% 88%, rgba(121, 85, 255, 0.18), transparent 40%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-size-[48px_48px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)]" />

      <div className="relative container max-w-7xl pt-32 z-10 mx-auto flex w-full flex-col px-6 pb-20 pt-12 sm:px-10">
        {/* ── Hero ── */}
        <section className="mb-20">
          <p className="inline-flex border border-[#d8a95f]/40 bg-[#d8a95f]/8 px-3 py-1 text-[10px] font-semibold tracking-[0.24em] uppercase text-[#a07830] dark:text-[#f0d3a0]">
            About
          </p>
          <h1 className="mt-6 max-w-3xl font-(--font-launchthatbot-display) text-4xl leading-[1.08] tracking-tight text-gray-900 sm:text-5xl dark:text-[#fff7ea]">
            Rise of the Bots.
            <br />
            <span className="text-[#b8892f] dark:text-[#d8a95f]">What is LaunchThatBot?</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-700 dark:text-[#e7ded0]/90">
            LaunchThatBot is a deployment and management platform for AI Agents, currently focused on OpenClaw --
            the open-source AI agent runtime. It handles the infrastructure,
            security, and operational tooling so you can focus entirely on
            building your agents. Free for most users and usecases.
          </p>
        </section>

        {/* ── WHY ── */}
        <section className="mb-20">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8a95f]/50 bg-[#d8a95f]/15 font-(--font-launchthatbot-display) text-xs font-bold text-[#a07830] dark:text-[#f0d3a0]">
              1
            </span>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#a07830] dark:text-[#f0d3a0]">
              Why
            </p>
          </div>
          <h2 className="mb-6 font-(--font-launchthatbot-display) text-2xl text-gray-900 sm:text-3xl dark:text-[#fff1dc]">
            The journey from one agent to &ldquo;I need to build a
            platform&rdquo;
          </h2>

          {/* Phase 1: Single agent on DO */}
          <div className="space-y-5 text-base leading-relaxed text-gray-700 dark:text-[#e7ded0]/90">
            <p>
              I come from a background of integrating AI systems into existing
              platforms. So when I first deployed an OpenClaw agent directly on a
              DigitalOcean VPS, it was actually pretty straightforward -- easier
              than I expected. One agent, one server, and it just worked.
            </p>
            <p>
              But pretty quickly I wanted more. More agents. Observability into
              what they were doing. Insight into how much I was spending on AI
              provider credits and whether the agents were actually making
              progress. A single agent on a bare VPS does not give you any of
              that.
            </p>
          </div>

          {/* Phase 2: Docker stack */}
          <div className="mt-8 border-l-2 border-[#d8a95f]/40 bg-[#d8a95f]/5 py-5 pl-6 pr-5 dark:bg-white/2">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#b8892f] dark:text-[#d8a95f]">
              Phase two: containers and monitoring
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-[#e9dfd1]/85">
              I moved to a Docker-based setup with Portainer for container
              management, Grafana for dashboards, and Prometheus for metrics. A
              better system by far. But now I was running multiple containers for
              the infrastructure stack itself, and the server was running out of
              resources. DigitalOcean started getting expensive for what was
              supposed to be a side project.
            </p>
          </div>

          {/* Phase 3: Hetzner migration */}
          <div className="mt-5 space-y-5 text-base leading-relaxed text-gray-700 dark:text-[#e7ded0]/90">
            <p>
              So I moved to Hetzner for cheaper compute. That meant setting
              everything up all over again -- Hetzner does not have great
              infrastructure-as-code tooling, so it was a manual migration.
              Containers sometimes had issues and I needed to log into Portainer
              to restart the OpenClaw container. The operational overhead was
              creeping up.
            </p>
            <p>
              And the resource costs were not just about running agents. When you
              use natural language to set up OpenClaw infrastructure, the AI has
              your VPS doing heavy work in the background -- building Docker
              images, compiling dependencies, pulling containers. I went from a
              1GB server to a 3-4GB server just so the build processes could run
              without starving my agents of CPU and memory. That is real money.
              A 1GB VPS costs $4-6 a month. A 4GB VPS costs $16-24 a month. I
              was paying four times more, not because my agents needed the
              resources, but because the setup process did.
            </p>
          </div>

          {/* Phase 4: Thinking at scale */}
          <div className="mt-8 border-l-2 border-[#7a5bff]/40 bg-[#7a5bff]/5 py-5 pl-6 pr-5 dark:bg-white/2">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#6a4de0] dark:text-[#7a5bff]">
              The long-term question
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-[#e9dfd1]/85">
              I started thinking about the long term. 10 agents. 50. 100. The
              current setup was already complex at 3. I needed a real system for
              centralized logs, emergency stop buttons for runaway agents, and
              insight into how much each individual agent was costing me in
              provider credits. None of that existed.
            </p>
          </div>

          {/* Phase 5: Convex */}
          <div className="mt-5 space-y-5 text-base leading-relaxed text-gray-700 dark:text-[#e7ded0]/90">
            <p>
              I use{" "}
              <a
                href="https://www.convex.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#b8892f] underline decoration-[#d8a95f]/40 underline-offset-2 hover:decoration-[#d8a95f] dark:text-[#d8a95f]"
              >
                Convex
              </a>{" "}
              daily for other apps I build. Real-time database, scheduled
              functions, server-side logic -- all without managing database
              infrastructure. Then I saw Convex launch their{" "}
              <a
                href="https://www.convex.dev/claw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#b8892f] underline decoration-[#d8a95f]/40 underline-offset-2 hover:decoration-[#d8a95f] dark:text-[#d8a95f]"
              >
                Convex for Claw
              </a>{" "}
              program -- backing developers building in the OpenClaw ecosystem.
            </p>
            <p>
              That was the spark. A real-time backend I already knew and trusted,
              with first-class support for the OpenClaw ecosystem. I could build
              the operational layer I needed -- deployment state, agent
              monitoring, cost tracking, scheduled maintenance, emergency
              controls -- all on Convex. And every user could connect their own
              Convex instance, so they would own their data completely.
            </p>
            <p>
              I opened my IDE and started building.
            </p>
          </div>

          {/* VPS savings callout */}
          <div className="mt-8 rounded border border-[#d8a95f]/25 bg-[#d8a95f]/6 p-5">
            <p className="text-sm font-semibold text-[#a07830] dark:text-[#f0d3a0]">
              The VPS savings
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-[#e9dfd1]/85">
              Because LaunchThatBot handles the heavy infrastructure work --
              container builds, image management, orchestration -- your VPS only
              needs enough resources for your agents themselves. Smaller server,
              lower bill, same performance where it matters.
            </p>
          </div>
        </section>

        {/* ── WHAT ── */}
        <section className="mb-20 border-t border-gray-200 pt-12 dark:border-white/10">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8a95f]/50 bg-[#d8a95f]/15 font-(--font-launchthatbot-display) text-xs font-bold text-[#a07830] dark:text-[#f0d3a0]">
              2
            </span>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#a07830] dark:text-[#f0d3a0]">
              What
            </p>
          </div>
          <h2 className="mb-6 font-(--font-launchthatbot-display) text-2xl text-gray-900 sm:text-3xl dark:text-[#fff1dc]">
            A deployment and management platform for OpenClaw
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-gray-700 dark:text-[#e7ded0]/90">
            <p>
              LaunchThatBot gives you a bulletproof OpenClaw configuration out of
              the box -- for free. No AI credits burned on setup. No guessing
              which defaults are safe and which will leave your instance exposed.
            </p>
            <p>
              Beyond the initial deployment, it is the management layer that
              OpenClaw does not ship with:
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Tested deployment templates",
                body: "Start from a working, hardened configuration instead of a blank file. Customize from a secure baseline, not from zero.",
              },
              {
                title: "Real management dashboard",
                body: "See all your deployments, their health, their configs, and their agents in one place. No SSH. No terminal. No grepping logs.",
              },
              {
                title: "Multi-instance at scale",
                body: "Your second deployment takes minutes. Your fiftieth inherits the same security baseline. Templates capture what works and reuse it.",
              },
              {
                title: "Clean detach, zero lock-in",
                body: "Disconnect LaunchThatBot anytime. Your deployment keeps running on your infrastructure. Your data stays in your Convex instance.",
              },
            ].map((card) => (
              <article
                key={card.title}
                className="border border-gray-200 bg-gray-50 p-5 dark:border-white/12 dark:bg-white/2"
              >
                <h3 className="font-(--font-launchthatbot-display) text-base text-gray-900 dark:text-[#fff0db]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-[#e8decf]/80">
                  {card.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded border border-[#d8a95f]/25 bg-[#d8a95f]/6 p-5">
            <p className="text-sm font-semibold text-[#a07830] dark:text-[#f0d3a0]">
              The goal is simple
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-[#e9dfd1]/85">
              Get you to a working, secure, observable deployment for free -- so
              you can spend your AI credits on building agents that do
              interesting, valuable work instead of fighting with
              infrastructure.
            </p>
          </div>
        </section>

        {/* ── WHEN ── */}
        <section className="mb-20 border-t border-gray-200 pt-12 dark:border-white/10">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8a95f]/50 bg-[#d8a95f]/15 font-(--font-launchthatbot-display) text-xs font-bold text-[#a07830] dark:text-[#f0d3a0]">
              3
            </span>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#a07830] dark:text-[#f0d3a0]">
              When
            </p>
          </div>
          <h2 className="mb-3 font-(--font-launchthatbot-display) text-2xl text-gray-900 sm:text-3xl dark:text-[#fff1dc]">
            Built for myself, then realized everyone needed it
          </h2>
          <div className="mb-8 max-w-2xl space-y-4 text-base leading-relaxed text-gray-700 dark:text-[#e7ded0]/85">
            <p>
              After the $40 setup experience, I set off to build something for
              myself -- a tool to make my own OpenClaw deployments painless. A
              few days in, I realized every solo builder deploying OpenClaw was
              hitting the exact same walls. This was not a personal problem. It
              was an ecosystem problem.
            </p>
            <p>
              So I kept building. Seven days of intense, focused development.
              Here is what each day produced:
            </p>
          </div>

          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#d8a95f]/25" />

            {timelineSteps.map((step) => (
              <div key={step.day} className="relative flex gap-5 pb-6 last:pb-0">
                <div className="relative z-10 mt-1.5 flex h-[31px] w-[31px] shrink-0 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#d8a95f]" />
                </div>

                <div className="min-w-0 pb-1">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-xs font-bold tracking-wider uppercase text-[#b8892f] dark:text-[#d8a95f]">
                      {step.day}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-[#fff0db]">
                      {step.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-[#e8decf]/75">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-l-2 border-[#7a5bff]/40 bg-[#7a5bff]/5 py-5 pl-6 pr-5 dark:bg-white/2">
            <p className="text-sm leading-relaxed text-gray-600 dark:text-[#e9dfd1]/85">
              Seven days is fast. It was possible because I had already spent
              months building custom{" "}
              <a
                href="https://www.convex.dev/components"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6a4de0] underline decoration-[#7a5bff]/40 underline-offset-2 hover:decoration-[#7a5bff] dark:text-[#d4c5ff]"
              >
                Convex components
              </a>{" "}
              that I can reuse across multiple standalone apps. Most of the
              patterns in LaunchThatBot -- deployment workflows, real-time state
              management, scheduled operations, dashboard architecture -- I had
              already built for other platforms I work on:{" "}
              <a
                href="https://traderlaunchpad.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6a4de0] underline decoration-[#7a5bff]/40 underline-offset-2 hover:decoration-[#7a5bff] dark:text-[#d4c5ff]"
              >
                TraderLaunchpad
              </a>{" "}
              and{" "}
              <a
                href="https://launchthat.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6a4de0] underline decoration-[#7a5bff]/40 underline-offset-2 hover:decoration-[#7a5bff] dark:text-[#d4c5ff]"
              >
                LaunchThat.app
              </a>
              . The seven days were not about figuring things out from scratch --
              they were about applying proven patterns to a new problem.
            </p>
          </div>
        </section>

        {/* ── WHERE ── */}
        <section className="mb-20 border-t border-gray-200 pt-12 dark:border-white/10">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8a95f]/50 bg-[#d8a95f]/15 font-(--font-launchthatbot-display) text-xs font-bold text-[#a07830] dark:text-[#f0d3a0]">
              4
            </span>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#a07830] dark:text-[#f0d3a0]">
              Where
            </p>
          </div>
          <h2 className="mb-6 font-(--font-launchthatbot-display) text-2xl text-gray-900 sm:text-3xl dark:text-[#fff1dc]">
            On your infrastructure. Always.
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-gray-700 dark:text-[#e7ded0]/90">
            <p>
              LaunchThatBot is not a hosting platform. It does not run your
              agents on our servers. It does not store your data in our database.
              It does not trap you in our ecosystem.
            </p>
            <p>
              When you deploy through LaunchThatBot:
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {[
              {
                label: "Your VPS",
                text: "You choose the provider. Hetzner, DigitalOcean, your own hardware. The server belongs to you.",
              },
              {
                label: "Your data",
                text: "If you enable Convex Mode, the database tables, scheduled functions, and operational state run in your Convex project. Not ours.",
              },
              {
                label: "Your exit",
                text: "Disconnect from LaunchThatBot anytime. No migration. No export. Everything keeps running because it was always running on your infrastructure.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex gap-4 border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/2"
              >
                <span className="mt-0.5 shrink-0 text-sm font-bold text-[#b8892f] dark:text-[#d8a95f]">
                  {item.label}
                </span>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-[#e8decf]/85">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-base leading-relaxed text-gray-700 dark:text-[#e7ded0]/90">
            OpenClaw is open source because its creators believe developers
            should own their tools. LaunchThatBot is built in that same spirit.
            You own the deployment. You own the data. You own the decision to
            stay or leave.
          </p>
        </section>

        {/* ── HOW ── */}
        <section className="mb-20 border-t border-gray-200 pt-12 dark:border-white/10">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8a95f]/50 bg-[#d8a95f]/15 font-(--font-launchthatbot-display) text-xs font-bold text-[#a07830] dark:text-[#f0d3a0]">
              5
            </span>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#a07830] dark:text-[#f0d3a0]">
              How
            </p>
          </div>
          <h2 className="mb-6 font-(--font-launchthatbot-display) text-2xl text-gray-900 sm:text-3xl dark:text-[#fff1dc]">
            This would not exist without AI and Convex
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-gray-700 dark:text-[#e7ded0]/90">
            <p>
              Building a deployment platform from scratch in seven days sounds
              impossible. It would be -- without the tools I used to build it.
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="border border-[#7a5bff]/30 bg-[#7a5bff]/6 p-6">
              <h3 className="font-(--font-launchthatbot-display) text-lg text-[#6a4de0] dark:text-[#d4c5ff]">
                AI as a development multiplier
              </h3>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-[#e8decf]/85">
                <p>
                  I used AI coding assistants extensively to build LaunchThatBot
                  itself. Not for setup and configuration -- for actual
                  development. Writing deployment workflows, designing the
                  schema, building the dashboard, iterating on security
                  templates.
                </p>
                <p>
                  This is the right use of AI credits: building real things, not
                  fighting with infrastructure. That distinction is the entire
                  thesis of LaunchThatBot.
                </p>
              </div>
            </div>

            <div className="border border-[#d8a95f]/30 bg-[#d8a95f]/6 p-6">
              <h3 className="font-(--font-launchthatbot-display) text-lg text-[#a07830] dark:text-[#f0d3a0]">
                Convex as the operational backbone
              </h3>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-[#e8decf]/85">
                <p>
                  Convex gave me a real-time database, scheduled functions, and
                  server-side logic without managing any database infrastructure.
                  The deployment engine, agent sync, and operational state all
                  run on Convex.
                </p>
                <p>
                  When users enable Convex Mode, they get the same power: a
                  structured backend for their agents with tables, crons, and
                  queries -- on their own Convex instance.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-5 text-base leading-relaxed text-gray-700 dark:text-[#e7ded0]/90">
            <p>
              The irony is not lost on me. I built a platform to save people
              from spending AI credits on setup -- and I used AI credits to build
              it. The difference is that those credits went into creating
              something permanent, reusable, and available to everyone. That is
              what AI tokens should be spent on.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden border border-[#d8a95f]/30 bg-[linear-gradient(135deg,rgba(216,169,95,0.12),rgba(255,255,255,0.02)_50%,rgba(121,85,255,0.12))] p-8 sm:p-10">
          <div className="absolute -left-6 top-0 h-24 w-24 rounded-full bg-[#d8a95f]/25 blur-2xl" />
          <div className="absolute -bottom-6 right-0 h-24 w-24 rounded-full bg-[#7a5bff]/25 blur-2xl" />
          <div className="relative">
            <p className="text-xs tracking-[0.18em] uppercase text-[#a07830] dark:text-[#f3d9ab]">
              Ready to build?
            </p>
            <h2 className="mt-3 max-w-2xl font-(--font-launchthatbot-display) text-2xl leading-tight text-gray-900 sm:text-3xl dark:text-[#fff7eb]">
              Stop spending tokens on setup. Start building agents.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-[#efe6d8]/90">
              LaunchThatBot gives you a tested, hardened OpenClaw deployment with
              a real management dashboard -- so every dollar you spend on AI goes
              toward creating something great, not configuring infrastructure.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/openclaw"
                className="inline-flex items-center border border-[#d8a95f] bg-[#d8a95f] px-5 py-2.5 text-xs font-extrabold tracking-[0.12em] uppercase text-white transition hover:bg-[#c4963a] dark:text-[#281f11]"
              >
                Deploy OpenClaw
              </Link>
              <Link
                href="/blog/spend-tokens-on-building-not-setup"
                className="inline-flex items-center border border-gray-300 bg-white/80 px-5 py-2.5 text-xs font-bold tracking-[0.12em] uppercase text-gray-800 transition hover:bg-gray-100 dark:border-white/25 dark:bg-black/20 dark:text-[#f8f3ea] dark:hover:border-white/40 dark:hover:bg-black/30"
              >
                Read the Full Story
              </Link>
            </div>
          </div>
        </section>

        {/* ── Blog links ── */}
        <section className="mt-16 border-t border-gray-200 pt-12 dark:border-white/10">
          <h2 className="mb-6 font-(--font-launchthatbot-display) text-2xl text-gray-900 sm:text-3xl dark:text-[#fff1dc]">
            Go deeper
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/blog/built-this-because-deploying-openclaw-is-painful"
              className="group border border-gray-200 bg-gray-50 p-5 transition hover:border-[#d8a95f]/45 hover:bg-gray-100 dark:border-white/12 dark:bg-white/2 dark:hover:bg-white/5"
            >
              <p className="text-xs uppercase tracking-widest text-[#a07830] dark:text-[#f0d3a0]">
                Origin Story
              </p>
              <h3 className="mt-2 font-semibold text-gray-900 group-hover:underline dark:text-[#fff0db]">
                I Built This Because Deploying OpenClaw Shouldn&apos;t Be This
                Hard
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-[#e8decf]/80">
                The afternoon that started it all, and the three frustrations
                that kept breaking me.
              </p>
            </Link>
            <Link
              href="/blog/spend-tokens-on-building-not-setup"
              className="group border border-gray-200 bg-gray-50 p-5 transition hover:border-[#d8a95f]/45 hover:bg-gray-100 dark:border-white/12 dark:bg-white/2 dark:hover:bg-white/5"
            >
              <p className="text-xs uppercase tracking-widest text-[#a07830] dark:text-[#f0d3a0]">
                AI Credits
              </p>
              <h3 className="mt-2 font-semibold text-gray-900 group-hover:underline dark:text-[#fff0db]">
                Spend Your AI Tokens on Building, Not Setup
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-[#e8decf]/80">
                The $40 wake-up call and why your credits belong on agents, not
                infrastructure.
              </p>
            </Link>
            <Link
              href="/blog/deploy-now-detach-whenever"
              className="group border border-gray-200 bg-gray-50 p-5 transition hover:border-[#d8a95f]/45 hover:bg-gray-100 dark:border-white/12 dark:bg-white/2 dark:hover:bg-white/5"
            >
              <p className="text-xs uppercase tracking-widest text-[#a07830] dark:text-[#f0d3a0]">
                Portability
              </p>
              <h3 className="mt-2 font-semibold text-gray-900 group-hover:underline dark:text-[#fff0db]">
                Deploy Now, Detach Whenever
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-[#e8decf]/80">
                Why we designed LaunchThatBot to let you leave, and why that
                matters for open source.
              </p>
            </Link>
            <Link
              href="/blog"
              className="group border border-gray-200 bg-gray-50 p-5 transition hover:border-[#d8a95f]/45 hover:bg-gray-100 dark:border-white/12 dark:bg-white/2 dark:hover:bg-white/5"
            >
              <p className="text-xs uppercase tracking-widest text-[#a07830] dark:text-[#f0d3a0]">
                All Articles
              </p>
              <h3 className="mt-2 font-semibold text-gray-900 group-hover:underline dark:text-[#fff0db]">
                Read the Full Blog
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-[#e8decf]/80">
                Security deep-dives, Convex guides, and more from the
                LaunchThatBot team.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

import { Reveal } from "@/components/marketing/reveal";
import { AgentIdentityCard } from "@/components/marketing/agent-identity-card";
import { AGENT_CAST, AGENT_ROSTER_TAGLINE } from "@/lib/marketing-content";

export function AgentsRosterSection() {
  return (
    <section id="agents" className="mkt-section">
      <div className="mkt-container">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mkt-eyebrow">Agentic AI team</p>
          <h2 className="mkt-heading mt-4 text-3xl sm:text-4xl lg:text-5xl">
            Meet your{" "}
            <span className="mkt-gradient-text">autonomous growth cast</span>
          </h2>
          <p className="mkt-body mx-auto mt-4 max-w-2xl">
            {AGENT_ROSTER_TAGLINE} Each specialist plans, executes, and reports back —
            frontier agentic intelligence built for local businesses.
          </p>
        </Reveal>

        <div className="mt-16 space-y-6">
          {AGENT_CAST.map((agent, i) => (
            <Reveal key={agent.id} delay={i * 80}>
              <AgentIdentityCard agent={agent} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

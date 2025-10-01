// app/page.tsx
export default function Page() {
  return (
    <main
      style={{
        margin: "0 auto",
        maxWidth: "760px",
        padding: "2rem 1rem",
        fontFamily: "ui-monospace, monospace, sans-serif",
        color: "#111",
        lineHeight: "1.6",
      }}
    >
      {/* Top navigation */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "1rem" }}>EnvKit</div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
          <a href="#features" style={{ textDecoration: "none", color: "#000" }}>
            Features
          </a>
          <a href="#why" style={{ textDecoration: "none", color: "#000" }}>
            Why
          </a>
          <a href="#docs" style={{ textDecoration: "none", color: "#000" }}>
            Docs
          </a>
          <a
            href="https://github.com"
            style={{ textDecoration: "none", color: "#000" }}
          >
            GitHub
          </a>
          <a href="#contact" style={{ textDecoration: "none", color: "#000" }}>
            Contact
          </a>
        </div>
      </nav>

      {/* Date */}
      <div
        style={{
          fontSize: "0.85rem",
          color: "#666",
          marginBottom: "2rem",
          textAlign: "right",
        }}
      >
        {new Date().toDateString()}
      </div>

      {/* Hero */}
      <section style={{ marginBottom: "3rem" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            marginBottom: "0.5rem",
          }}
        >
          EnvKit
        </h1>
        <p style={{ fontSize: "1.2rem", marginBottom: "1.5rem" }}>
          Environment Management Made Simple
        </p>
        <button
          style={{
            border: "1px solid #000",
            padding: "0.75rem 1.25rem",
            fontSize: "0.95rem",
            background: "none",
          }}
        >
          Get Started
        </button>
        <blockquote
          style={{
            margin: "2rem 0",
            paddingLeft: "1rem",
            borderLeft: "3px solid #000",
            fontStyle: "italic",
          }}
        >
          "There has to be a better way to manage my vars, even better, I'll
          make one"
        </blockquote>
      </section>

      {/* Features */}
      <section id="features" style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          Features
        </h2>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {[
            {
              title: "Secure Variables",
              desc: "Keep your environment variables safe and encrypted. Never commit secrets to your repository again.",
            },
            {
              title: "Team Collaboration",
              desc: "Share environment configurations seamlessly across your team while maintaining security standards.",
            },
            {
              title: "Multi-Environment",
              desc: "Manage development, staging, and production environments effortlessly from a single dashboard.",
            },
            {
              title: "Easy Integration",
              desc: "Works with your existing workflow. Compatible with all major frameworks and deployment platforms.",
            },
            {
              title: "Version Control",
              desc: "Track changes to your environment variables with full history and rollback capabilities.",
            },
            {
              title: "CLI & API",
              desc: "Powerful command-line tools and REST API for automation and advanced workflows.",
            },
          ].map((f, i) => (
            <li key={i} style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "500" }}>
                {f.title}
              </h3>
              <p style={{ margin: 0 }}>{f.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Why EnvKit */}
      <section id="why" style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          Why EnvKit?
        </h2>
        <p>
          Developers waste time reinventing secrets management. EnvKit strips
          away the friction. No cloud lock-in, no bloated dashboards. Just a
          clear, auditable, portable system for your vars.
        </p>
        <p style={{ marginTop: "1rem" }}>
          Start with the CLI. Invite your team. Scale into production without
          changing tools.
        </p>
      </section>

      {/* Docs placeholder */}
      <section id="docs" style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          Documentation
        </h2>
        <p>
          Coming soon: Learn how to install EnvKit, set up environments, and
          integrate into your CI/CD pipelines with simple step-by-step guides.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          Contact
        </h2>
        <p>
          Questions, ideas, or feedback? Reach out via{" "}
          <a href="mailto:support@envkit.dev" style={{ color: "#000" }}>
            support@envkit.dev
          </a>
        </p>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #000",
          paddingTop: "1rem",
          fontSize: "0.8rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>&copy; 2025 EnvKit. All rights reserved.</span>
          <span style={{ display: "flex", gap: "1rem" }}>
            <a
              href="#features"
              style={{ color: "#000", textDecoration: "none" }}
            >
              Features
            </a>
            <a href="#why" style={{ color: "#000", textDecoration: "none" }}>
              Why
            </a>
            <a
              href="https://github.com"
              style={{ color: "#000", textDecoration: "none" }}
            >
              GitHub
            </a>
            <a
              href="#contact"
              style={{ color: "#000", textDecoration: "none" }}
            >
              Contact
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}

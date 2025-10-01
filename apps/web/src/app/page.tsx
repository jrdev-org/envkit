// app/page.tsx
export default function Page() {
  return (
    <main
      style={{
        margin: "0 auto",
        maxWidth: "860px",
        padding: "2rem 1rem",
        fontFamily: "ui-monospace, monospace",
        background: "#111",
        color: "#e5e5e5",
        lineHeight: "1.7",
        minHeight: "100vh",
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
        <div style={{ fontWeight: "bold", fontSize: "1rem", color: "#0f0" }}>
          $ EnvKit
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
          <a href="#features" style={{ color: "#0f0", textDecoration: "none" }}>
            features/
          </a>
          <a href="#why" style={{ color: "#0f0", textDecoration: "none" }}>
            why/
          </a>
          <a href="#docs" style={{ color: "#0f0", textDecoration: "none" }}>
            docs/
          </a>
          <a
            href="https://github.com"
            style={{ color: "#0f0", textDecoration: "none" }}
          >
            github/
          </a>
          <a href="#contact" style={{ color: "#0f0", textDecoration: "none" }}>
            contact/
          </a>
        </div>
      </nav>

      {/* Date */}
      <div
        style={{
          fontSize: "0.85rem",
          color: "#888",
          marginBottom: "2rem",
          textAlign: "right",
        }}
      >
        {new Date().toDateString()}
      </div>

      {/* Hero */}
      <section style={{ marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "2rem", color: "#0f0" }}>EnvKit</h1>
        <p style={{ fontSize: "1rem", marginBottom: "1.5rem", color: "#bbb" }}>
          Environment Management Made Simple
        </p>
        <button
          style={{
            border: "1px solid #0f0",
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            background: "black",
            color: "#0f0",
            cursor: "pointer",
          }}
        >
          $ get-started
        </button>
        <blockquote
          style={{
            margin: "2rem 0",
            paddingLeft: "1rem",
            borderLeft: "3px solid #0f0",
            fontStyle: "italic",
            color: "#bbb",
          }}
        >
          "There has to be a better way to manage my vars, even better, I'll
          make one"
        </blockquote>
      </section>

      {/* Features */}
      <section id="features" style={{ marginBottom: "3rem" }}>
        <h2
          style={{ fontSize: "1.25rem", color: "#0f0", marginBottom: "1rem" }}
        >
          ~/features
        </h2>
        <pre
          style={{
            background: "#000",
            padding: "1rem",
            overflowX: "auto",
            border: "1px solid #333",
          }}
        >
          {`> secure-variables    # Encrypted vars, never commit secrets
> team-collaboration  # Share configs safely
> multi-environment   # dev / stage / prod
> easy-integration    # works with any workflow
> version-control     # history + rollback
> cli-and-api         # automate everything`}
        </pre>
      </section>

      {/* Why EnvKit */}
      <section id="why" style={{ marginBottom: "3rem" }}>
        <h2
          style={{ fontSize: "1.25rem", color: "#0f0", marginBottom: "1rem" }}
        >
          ~/why
        </h2>
        <p style={{ color: "#bbb" }}>
          Developers waste time reinventing secrets management. EnvKit strips
          away the friction. No cloud lock-in, no bloated dashboards. Just a
          clear, auditable, portable system for your vars.
        </p>
        <p style={{ marginTop: "1rem", color: "#bbb" }}>
          Start with the CLI. Invite your team. Scale into production without
          changing tools.
        </p>
      </section>

      {/* Docs */}
      <section id="docs" style={{ marginBottom: "3rem" }}>
        <h2
          style={{ fontSize: "1.25rem", color: "#0f0", marginBottom: "1rem" }}
        >
          ~/docs
        </h2>
        <pre
          style={{
            background: "#000",
            padding: "1rem",
            border: "1px solid #333",
            overflowX: "auto",
          }}
        >
          {`$ npm install -g envkit
$ envkit init
$ envkit push --env production`}
        </pre>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>
          Full documentation coming soon.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" style={{ marginBottom: "3rem" }}>
        <h2
          style={{ fontSize: "1.25rem", color: "#0f0", marginBottom: "1rem" }}
        >
          ~/contact
        </h2>
        <p>
          Reach us at{" "}
          <a href="mailto:support@envkit.sh" style={{ color: "#0f0" }}>
            support@envkit.sh
          </a>
        </p>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #333",
          paddingTop: "1rem",
          fontSize: "0.8rem",
          color: "#555",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>&copy; 2025 EnvKit</span>
          <span style={{ color: "#0f0" }}>exit 0</span>
        </div>
      </footer>
    </main>
  );
}

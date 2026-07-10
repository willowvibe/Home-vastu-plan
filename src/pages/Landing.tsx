import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent, EVENTS } from '../services/analytics';
import './landing.css';

export function Landing() {
  const { isAuthenticated, sendMagicLink, signInWithGoogle } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [invalid, setInvalid] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Smooth-scroll for in-page anchor links, scoped to the landing's lifetime.
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  // Document title for the landing page (the planner sets its own elsewhere).
  useEffect(() => {
    const prev = document.title;
    document.title = 'VastuPlan 2D — Design Indian homes that feel right';
    return () => {
      document.title = prev;
    };
  }, []);

  // Active-section highlighting in the topnav.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]'));
    const onScroll = () => {
      let current = '';
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top <= 120) current = sec.id;
      }
      setActiveId(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Signed-in users skip the marketing page. Kept AFTER the useEffects above so
  // the hook order stays stable regardless of the auth flag (Rules-of-Hooks).
  if (isAuthenticated) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setInvalid(false);
    setMessageType('');
    setMessage('');
    if (!value) {
      setInvalid(true);
      setMessageType('error');
      setMessage('Please enter your email address.');
      return;
    }
    if (!valid) {
      setInvalid(true);
      setMessageType('error');
      setMessage('Please enter a valid email address.');
      return;
    }
    trackEvent(EVENTS.LANDING_SIGNUP_SUBMIT);
    setIsSending(true);
    const { error } = await sendMagicLink(value);
    setIsSending(false);
    if (error) {
      setMessageType('error');
      setMessage(error.message || 'Could not send magic link. Please try again.');
      return;
    }
    trackEvent(EVENTS.LANDING_MAGIC_LINK_SENT);
    setMessageType('success');
    setMessage('Check your inbox for a magic link to sign in.');
    setEmail('');
  };

  const handleGoogle = () => {
    trackEvent(EVENTS.LANDING_GOOGLE_CLICK);
    void signInWithGoogle();
  };

  return (
    <div className="landing-scope">
      <header className="topnav" data-od-id="topnav">
        <div className="container topnav-inner">
          <span className="logo">VastuPlan</span>
          <button
            className="nav-toggle"
            id="navToggle"
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls="topnavNav"
            onClick={() => setNavOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <nav id="topnavNav" className={navOpen ? 'is-open' : ''}>
            <a
              href="#how-it-works"
              className={activeId === 'how-it-works' ? 'is-active' : ''}
              onClick={() => setNavOpen(false)}
            >
              How it works
            </a>
            <a
              href="#features"
              className={activeId === 'features' ? 'is-active' : ''}
              onClick={() => setNavOpen(false)}
            >
              Features
            </a>
            <a
              href="#pricing"
              className={activeId === 'pricing' ? 'is-active' : ''}
              onClick={() => setNavOpen(false)}
            >
              Pricing
            </a>
            <a
              className="btn btn-accent btn-mobile"
              href="#signup"
              onClick={() => setNavOpen(false)}
            >
              Sign up
            </a>
          </nav>
          <div
            className="topnav-actions"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)' }}
          >
            <a className="btn btn-ghost" href="#signup">
              Sign in
            </a>
            <a className="btn btn-primary" href="#signup">
              Sign up free
            </a>
          </div>
        </div>
      </header>

      <main id="content">
        <section className="section hero" id="hero" data-od-id="hero">
          <div className="container hero-center">
            <p className="eyebrow">Vastu-first home design</p>
            <h1>Design Indian homes that feel&nbsp;right.</h1>
            <p className="lead">
              Drag, drop, and align rooms to Vastu Shastra — with live scoring, zone guides, and AI
              feedback in one simple 2D planner.
            </p>
            <div className="hero-cta">
              <a className="btn btn-accent" href="#signup">
                Sign up free
              </a>
              <a className="btn btn-secondary" href="#how-it-works">
                See how it works
              </a>
            </div>
          </div>
        </section>

        <section className="section" id="features" data-od-id="features">
          <div className="container stack">
            <div className="section-header center">
              <p className="eyebrow">What’s different</p>
              <h2>Everything you need to plan a Vastu-aware home.</h2>
            </div>
            <div className="grid-3">
              <div className="feature card">
                <div className="feature-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4l3 2" />
                  </svg>
                </div>
                <h3>Live Vastu score</h3>
                <p>
                  Every room is scored out of 100 as you move it. Green, yellow, and red zones show
                  exactly where your layout aligns with Vastu Shastra.
                </p>
              </div>
              <div className="feature card">
                <div className="feature-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path d="M4 7h16M4 12h10M4 17h16" />
                  </svg>
                </div>
                <h3>Smart floor plans</h3>
                <p>
                  Drag, resize, and snap rooms from a library of 12 room types. Add multiple floors,
                  toggle plumbing and sun-path overlays, and keep walls flush automatically.
                </p>
              </div>
              <div className="feature card">
                <div className="feature-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path d="M12 3v18M3 12h18" />
                  </svg>
                </div>
                <h3>AI design review</h3>
                <p>
                  Ask Gemini for an instant Vastu + architecture report with plain-language fixes,
                  construction tips, and cost estimates you can act on right away.
                </p>
              </div>
              <div className="feature card">
                <div className="feature-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <path d="m16 6-4-4-4 4" />
                    <path d="M12 2v13" />
                  </svg>
                </div>
                <h3>Export & share</h3>
                <p>
                  Save PNG, SVG, or JSON instantly. Generate a vector PDF or a password-protected
                  share link for your architect, contractor, or family.
                </p>
              </div>
              <div className="feature card">
                <div className="feature-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path d="M3 7v14a2 2 0 0 0 2 2h14" />
                    <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
                    <path d="M7 5v16" />
                    <path d="M11 5v16" />
                    <path d="M15 5v16" />
                    <path d="M19 5v16" />
                  </svg>
                </div>
                <h3>Projects & versions</h3>
                <p>
                  Save projects locally with named versions, compare floor-plan diffs, and revert to
                  an earlier layout whenever you want.
                </p>
              </div>
              <div className="feature card">
                <div className="feature-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2" />
                    <path d="M12 21v2" />
                    <path d="M4.22 4.22l1.42 1.42" />
                    <path d="M18.36 18.36l1.42 1.42" />
                    <path d="M1 12h2" />
                    <path d="M21 12h2" />
                    <path d="M4.22 19.78l1.42-1.42" />
                    <path d="M18.36 5.64l1.42-1.42" />
                  </svg>
                </div>
                <h3>Sun path & plumbing</h3>
                <p>
                  Overlay the Vastu grid, plumbing layout, and animated sun path by date and time so
                  you can validate light, airflow, and utility runs before you build.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works" data-od-id="how-it-works">
          <div className="container">
            <div className="section-header center">
              <p className="eyebrow">How it works</p>
              <h2>Set your plot, place your rooms, check your score.</h2>
            </div>
            <div className="grid-2" style={{ alignItems: 'center' }}>
              <ul className="split-list">
                <li>Enter plot width, length, road facing, north angle, and display unit.</li>
                <li>
                  Add bedrooms, kitchen, pooja room, parking, and more from the 12-room library.
                </li>
                <li>
                  Toggle the Vastu grid, plumbing, and sun-path overlays to see zones instantly.
                </li>
                <li>
                  Export PNG, SVG, JSON, or a vector PDF — or share a view-only link with your
                  architect.
                </li>
              </ul>
              <div className="product-mock" aria-label="Floor plan canvas mockup with Vastu zones">
                <div className="energy-ring" aria-hidden="true">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <g fill="none" stroke="var(--accent)" strokeWidth={0.6}>
                      <circle
                        cx="100"
                        cy="100"
                        r="78"
                        className="pulse pulse-delay-1"
                        opacity={0.35}
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="64"
                        className="pulse pulse-delay-2"
                        opacity={0.45}
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="50"
                        className="pulse pulse-delay-3"
                        opacity={0.55}
                      />
                    </g>
                    <g fill="none" stroke="var(--accent)" strokeWidth={0.4} opacity={0.25}>
                      <line x1="100" y1="14" x2="100" y2="186" />
                      <line x1="14" y1="100" x2="186" y2="100" />
                      <line x1="35" y1="35" x2="165" y2="165" />
                      <line x1="165" y1="35" x2="35" y2="165" />
                    </g>
                  </svg>
                </div>
                <svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="20"
                    y="20"
                    width="600"
                    height="360"
                    fill="var(--bg)"
                    stroke="var(--border)"
                    strokeWidth={2}
                    rx="12"
                  />
                  <g opacity={0.12}>
                    <line
                      x1="220"
                      y1="20"
                      x2="220"
                      y2="380"
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                    <line
                      x1="420"
                      y1="20"
                      x2="420"
                      y2="380"
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                    <line
                      x1="20"
                      y1="146"
                      x2="620"
                      y2="146"
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                    <line
                      x1="20"
                      y1="272"
                      x2="620"
                      y2="272"
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                  </g>
                  <rect
                    x="60"
                    y="180"
                    width="120"
                    height="140"
                    fill="var(--surface-400)"
                    stroke="var(--fg)"
                    strokeWidth={2}
                    rx="4"
                    className="energy-zone pulse-delay-1"
                  />
                  <rect
                    x="240"
                    y="60"
                    width="140"
                    height="100"
                    fill="var(--surface-400)"
                    stroke="var(--fg)"
                    strokeWidth={2}
                    rx="4"
                    className="energy-zone pulse-delay-2"
                  />
                  <rect
                    x="460"
                    y="180"
                    width="120"
                    height="140"
                    fill="var(--surface-400)"
                    stroke="var(--fg)"
                    strokeWidth={2}
                    rx="4"
                    className="energy-zone pulse-delay-3"
                  />
                  <text
                    x="120"
                    y="255"
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize={13}
                    fill="var(--muted)"
                  >
                    Bedroom
                  </text>
                  <text
                    x="310"
                    y="115"
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize={13}
                    fill="var(--muted)"
                  >
                    Kitchen
                  </text>
                  <text
                    x="520"
                    y="255"
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize={13}
                    fill="var(--muted)"
                  >
                    Pooja
                  </text>
                  <circle
                    cx="320"
                    cy="310"
                    r="18"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                  />
                  <path d="M320 298 l6 12 h-12 z" fill="var(--accent)" />
                </svg>
                <span className="mock-label n">North</span>
                <span className="mock-label ne">NE — Water</span>
                <span className="mock-label se">SE — Fire</span>
                <span className="mock-label sw">SW — Earth</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" data-od-id="quote">
          <div className="container">
            <div className="section-header center">
              <div className="quote-mark">&ldquo;</div>
              <blockquote className="quote">
                We used VastuPlan to finalize our 35×45 ft layout in one evening. The score made the
                family discussion objective instead of circular.
              </blockquote>
              <p className="quote-author">— Ananya R., Bengaluru</p>
            </div>
          </div>
        </section>

        <section className="section" id="pricing" data-od-id="pricing">
          <div className="container">
            <div className="section-header center">
              <p className="eyebrow">Pricing</p>
              <h2>Free to plan. Fair to grow.</h2>
            </div>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="num-col">Free</th>
                  <th className="num-col">Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Drag-and-drop floor plans (12 room types)</td>
                  <td className="num-col">✓</td>
                  <td className="num-col">✓</td>
                </tr>
                <tr>
                  <td>Vastu grid + live score</td>
                  <td className="num-col">✓</td>
                  <td className="num-col">✓</td>
                </tr>
                <tr>
                  <td>Plumbing + sun-path overlays</td>
                  <td className="num-col">✓</td>
                  <td className="num-col">✓</td>
                </tr>
                <tr>
                  <td>PNG / SVG / JSON export</td>
                  <td className="num-col">✓</td>
                  <td className="num-col">✓</td>
                </tr>
                <tr>
                  <td>Share view / comment links</td>
                  <td className="num-col">✓</td>
                  <td className="num-col">✓</td>
                </tr>
                <tr>
                  <td>Save projects & versions locally</td>
                  <td className="num-col">✓</td>
                  <td className="num-col">✓</td>
                </tr>
                <tr>
                  <td>Multi-floor projects (up to 9 floors)</td>
                  <td className="num-col">1 floor</td>
                  <td className="num-col">All floors</td>
                </tr>
                <tr>
                  <td>Vector PDF export</td>
                  <td className="num-col">Watermarked</td>
                  <td className="num-col">Watermark-free</td>
                </tr>
                <tr>
                  <td>AI design review + cost estimates</td>
                  <td className="num-col">3/month</td>
                  <td className="num-col">Unlimited</td>
                </tr>
                <tr>
                  <td>AI image editor</td>
                  <td className="num-col">—</td>
                  <td className="num-col">✓</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--border-strong)' }}>
                  <td>
                    <strong>Monthly</strong>
                  </td>
                  <td className="num-col">
                    <strong>₹0</strong>
                  </td>
                  <td className="num-col">
                    <strong>₹499</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="section" id="signup" data-od-id="signup">
          <div className="container">
            <div className="section-header center">
              <p className="eyebrow">Create your account</p>
              <h2>Start your first Vastu plan today.</h2>
              <p className="lead" style={{ margin: '16px auto 32px' }}>
                Sign up free and start designing floor plans with live Vastu scoring. No credit card
                needed.
              </p>
            </div>
            <div
              className="signup-form-wrapper"
              style={{ maxWidth: '520px', marginInline: 'auto' }}
            >
              <form className="signup-form" onSubmit={handleSubmit} noValidate>
                <input
                  className={`input ${invalid ? 'is-invalid' : ''}`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                />
                <button className="btn btn-accent" type="submit" disabled={isSending}>
                  {isSending ? 'Sending…' : 'Sign up free'}
                </button>
              </form>
              <p className={`form-message ${messageType}`} aria-live="polite">
                {message}
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGoogle}
                style={{ width: '100%', marginTop: '8px' }}
              >
                Continue with Google
              </button>
              <p className="meta" style={{ marginTop: '18px' }}>
                Already have an account?{' '}
                <a href="#signup" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="pagefoot" data-od-id="footer">
        <div className="container row-between">
          <span>© 2026 VastuPlan · Built for Indian homes</span>
          <span className="meta">contact@vastuplan.app</span>
        </div>
      </footer>
    </div>
  );
}

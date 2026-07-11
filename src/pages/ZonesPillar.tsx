import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowRight, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { getAllZonePages, DIRECTION_BY_ZONE, ZONE_NAMES } from '../constants/zonePages';
import { getVastuZoneInfo } from '../constants/vastuZones';
import { IDEAL_ZONES } from '../services/vastu';
import { trackPageView } from '../services/analytics';

const allPages = getAllZonePages();

function bucketFor(page: ReturnType<typeof getAllZonePages>[number]): 'best' | 'neutral' | 'avoid' {
  const dir = DIRECTION_BY_ZONE[page.zoneName as keyof typeof DIRECTION_BY_ZONE];
  const rules = IDEAL_ZONES[page.roomType];
  if (!rules || !dir) return 'neutral';
  if (rules.best.includes(dir as never)) return 'best';
  if (rules.neutral.includes(dir as never)) return 'neutral';
  return 'avoid';
}

function bucketBadge(bucket: 'best' | 'neutral' | 'avoid') {
  const config = {
    best: {
      text: 'Ideal',
      icon: CheckCircle2,
      class: 'bg-success/10 text-success border-success/20',
    },
    neutral: { text: 'OK', icon: Info, class: 'bg-warn/10 text-warn border-warn/20' },
    avoid: { text: 'Avoid', icon: AlertCircle, class: 'bg-danger/10 text-danger border-danger/20' },
  };
  const { text, icon: Icon, class: cls } = config[bucket];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}

export function ZonesPillar() {
  useEffect(() => {
    trackPageView('/zones');
  }, []);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <SEOHead
        title="Vastu zones explained — room-by-room direction guide | VastuPlan"
        description="Free Vastu zone guides for Indian homes. Check kitchen, master bedroom, pooja room, bathroom, study and more across all 9 Vastu directions."
        keywords="vastu zones, vastu directions, vastu room placement, vastu guide, indian home vastu, vastuplan"
      />

      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold text-fg-2 hover:text-accent transition-colors"
          >
            <Compass className="w-5 h-5 text-accent" />
            VastuPlan
          </Link>
          <Link
            to="/app"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            Open planner →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <section>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg-2 mb-4">
            Vastu zones explained
          </h1>
          <p className="text-lg text-muted leading-relaxed max-w-3xl">
            A room-by-room direction guide for Indian homes. See which directions are ideal,
            acceptable, or avoided for kitchen, bedrooms, pooja room, study, bathroom, and more —
            based on the transparent matrix used inside VastuPlan.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-surface border border-border-soft">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-fg-2 mb-1">Try the free Vastu planner</h2>
              <p className="text-muted">
                Draw your layout and get a live Vastu score as you move rooms.
              </p>
            </div>
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-accent text-accent-on font-medium hover:bg-accent-hover transition-colors shrink-0"
            >
              Start planning
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fg-2 mb-4">The nine Vastu zones</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {ZONE_NAMES.map((name) => {
              const zone = getVastuZoneInfo(name);
              return (
                <div key={name} className="p-4 rounded-xl bg-surface border border-border-soft">
                  <h3 className="font-semibold text-fg-2 mb-1">
                    {zone.name} <span className="text-meta font-normal">— {zone.element}</span>
                  </h3>
                  <p className="text-sm text-muted">{zone.idealFor}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fg-2 mb-4">Room-by-room zone guides</h2>
          <p className="text-muted mb-6">
            Click any guide to see the Vastu rule, practical tips, and the exact score used by
            VastuPlan.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {allPages.map((page) => {
              const bucket = bucketFor(page);
              return (
                <Link
                  key={page.slug}
                  to={`/zones/${page.slug}`}
                  aria-label={`${page.roomType} in the ${page.zoneName}`}
                  className="group p-5 rounded-xl bg-surface border border-border-soft hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-fg-2 group-hover:text-accent transition-colors">
                      {page.roomType} in the {page.zoneName}
                    </h3>
                    {bucketBadge(bucket)}
                  </div>
                  <p className="text-sm text-muted line-clamp-2">{page.description}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-meta">
          <span>© 2026 VastuPlan · Built for Indian homes</span>
          <div className="flex items-center gap-4">
            <Link to="/methodology" className="hover:text-fg-2 transition-colors">
              Methodology
            </Link>
            <Link to="/" className="hover:text-fg-2 transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

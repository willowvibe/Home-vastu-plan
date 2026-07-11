import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Compass, CheckCircle2, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { getZonePageBySlug, getAllZonePages, DIRECTION_BY_ZONE } from '../constants/zonePages';
import { getVastuZoneInfo } from '../constants/vastuZones';
import { IDEAL_ZONES } from '../services/vastu';
import { trackPageView } from '../services/analytics';
import type { RoomType } from '../types';

const directionLabels: Record<string, string> = {
  N: 'North',
  NE: 'North-East',
  E: 'East',
  SE: 'South-East',
  S: 'South',
  SW: 'South-West',
  W: 'West',
  NW: 'North-West',
  CENTER: 'Brahmasthan',
};

function getBucket(roomType: RoomType, zoneName: string): 'best' | 'neutral' | 'avoid' {
  const dir = DIRECTION_BY_ZONE[zoneName as keyof typeof DIRECTION_BY_ZONE];
  const rules = IDEAL_ZONES[roomType];
  if (!rules || !dir) return 'neutral';
  if (rules.best.includes(dir as never)) return 'best';
  if (rules.neutral.includes(dir as never)) return 'neutral';
  return 'avoid';
}

function bestDirections(roomType: RoomType): string {
  const rules = IDEAL_ZONES[roomType];
  if (!rules) return '';
  return rules.best.map((d) => directionLabels[d]).join(', ');
}

interface RuleCardProps {
  bucket: 'best' | 'neutral' | 'avoid';
  roomType: RoomType;
  zoneName: string;
}

function RuleCard({ bucket, roomType, zoneName }: RuleCardProps) {
  const ideal = bestDirections(roomType);
  const config = {
    best: {
      icon: CheckCircle2,
      label: 'Ideal placement',
      tone: 'success',
      lead: `${roomType} in the ${zoneName} is an ideal placement according to VastuPlan's transparent direction matrix.`,
      follow: `The zone's energy supports the intended use of this room. Wherever possible, keep ${roomType.toLowerCase()} here or in one of the other ideal directions: ${ideal}.`,
    },
    neutral: {
      icon: Info,
      label: 'Acceptable placement',
      tone: 'warn',
      lead: `${roomType} in the ${zoneName} is acceptable, though not the strongest choice.`,
      follow: `It will not create a major Vastu conflict, but if you have the flexibility, move the ${roomType.toLowerCase()} toward ${ideal} for the best score.`,
    },
    avoid: {
      icon: AlertCircle,
      label: 'Avoided placement',
      tone: 'danger',
      lead: `${roomType} in the ${zoneName} is flagged as avoided in our matrix.`,
      follow: `The zone's element and energy tend to conflict with this room's function. If possible, relocate the ${roomType.toLowerCase()} to ${ideal}.`,
    },
  }[bucket];

  const toneClasses = {
    success: 'bg-success/10 text-success border-success/20',
    warn: 'bg-warn/10 text-warn border-warn/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
  };

  const Icon = config.icon;
  return (
    <div
      className={`p-5 rounded-xl border ${toneClasses[config.tone as keyof typeof toneClasses]} mb-6`}
    >
      <div className="flex items-center gap-2 font-semibold mb-2">
        <Icon className="w-5 h-5" />
        {config.label}
      </div>
      <p className="text-fg-2">{config.lead}</p>
      <p className="text-muted mt-2">{config.follow}</p>
    </div>
  );
}

export function ZonePage() {
  const { slug } = useParams<{ slug: string }>();
  const entry = slug ? getZonePageBySlug(slug) : undefined;

  useEffect(() => {
    trackPageView(entry ? `/zones/${entry.slug}` : '/zones/not-found');
  }, [entry]);

  if (!entry) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        <SEOHead
          title="Zone not found — VastuPlan"
          description="Explore Vastu zone guides for Indian home planning."
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
              to="/zones"
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              ← All zones
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-12">
          <div className="p-8 rounded-xl bg-surface border border-border-soft text-center">
            <h1 className="text-2xl font-bold text-fg-2 mb-2">Zone guide not found</h1>
            <p className="text-muted mb-6">The page you are looking for is not in our guide yet.</p>
            <Link
              to="/zones"
              className="inline-flex items-center gap-2 text-accent hover:text-accent-hover font-medium"
            >
              Browse all Vastu zone guides →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { zoneName, roomType, title, description, keywords } = entry;
  const zone = getVastuZoneInfo(zoneName);
  const bucket = getBucket(roomType, zoneName);
  const allPages = getAllZonePages();
  const relatedSameRoom = allPages.filter((p) => p.roomType === roomType && p.slug !== entry.slug);
  const relatedSameZone = allPages.filter((p) => p.zoneName === zoneName && p.slug !== entry.slug);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <SEOHead title={title} description={description} keywords={keywords} />

      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold text-fg-2 hover:text-accent transition-colors"
          >
            <Compass className="w-5 h-5 text-accent" />
            VastuPlan
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/zones"
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors hidden sm:inline"
            >
              All zones
            </Link>
            <Link
              to="/app"
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Open planner →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <nav aria-label="Breadcrumb" className="text-sm text-meta">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/zones" className="hover:text-fg-2 transition-colors">
                Vastu zones
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-fg-2">
              {zone.name} — {roomType}
            </li>
          </ol>
        </nav>

        <section>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg-2 mb-3">
            {roomType} in the {zone.name}
          </h1>
          <p className="text-lg text-muted leading-relaxed max-w-3xl">{description}</p>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-surface border border-border-soft">
            <h2 className="font-semibold text-fg-2 mb-3">About the {zone.name} zone</h2>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <span className="font-medium text-fg-2">Element: </span>
                {zone.element}
              </li>
              <li>
                <span className="font-medium text-fg-2">Ideal for: </span>
                {zone.idealFor}
              </li>
              <li className="italic">{zone.tip}</li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border-soft">
            <h2 className="font-semibold text-fg-2 mb-3">Vastu rule for {roomType}</h2>
            <p className="text-sm text-muted mb-2">
              <span className="font-medium text-fg-2">Best directions: </span>
              {bestDirections(roomType)}
            </p>
            <p className="text-sm text-muted">
              Our score is a deterministic lookup: 100 points for best, 60 for acceptable, 20 for
              avoided. See the full matrix on the{' '}
              <Link to="/methodology" className="text-accent hover:text-accent-hover">
                methodology page
              </Link>
              .
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fg-2 mb-4">What the placement means</h2>
          <RuleCard bucket={bucket} roomType={roomType} zoneName={zone.name} />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-surface border border-border-soft">
              <h3 className="font-semibold text-fg-2 mb-2">Practical do’s</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted">
                <li>Place heavier furniture toward the South/South-West side if possible.</li>
                <li>Keep the room well ventilated and let morning light into East-facing rooms.</li>
                <li>
                  Use the VastuPlan planner to check the exact center of the room against your plot
                  center.
                </li>
              </ul>
            </div>
            <div className="p-5 rounded-xl bg-surface border border-border-soft">
              <h3 className="font-semibold text-fg-2 mb-2">Common mistakes</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted">
                <li>Putting water features or toilets in the North-East corner.</li>
                <li>Building heavy walls or staircases in the Brahmasthan (center).</li>
                <li>
                  Ignoring the plot North angle — VastuPlan lets you rotate it so the score stays
                  accurate.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="p-6 rounded-2xl bg-surface border border-border-soft">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-fg-2 mb-1">Try this layout in VastuPlan</h2>
              <p className="text-muted">Drag, drop, and check the live Vastu score for free.</p>
            </div>
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-accent text-accent-on font-medium hover:bg-accent-hover transition-colors shrink-0"
            >
              Open the planner
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {(relatedSameRoom.length > 0 || relatedSameZone.length > 0) && (
          <section>
            <h2 className="text-2xl font-bold text-fg-2 mb-4">Related guides</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {relatedSameRoom.length > 0 && (
                <div className="p-5 rounded-xl bg-surface border border-border-soft">
                  <h3 className="font-semibold text-fg-2 mb-2">Other directions for {roomType}</h3>
                  <ul className="space-y-1">
                    {relatedSameRoom.map((p) => (
                      <li key={p.slug}>
                        <Link
                          to={`/zones/${p.slug}`}
                          className="text-sm text-accent hover:text-accent-hover"
                        >
                          {p.roomType} in the {p.zoneName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {relatedSameZone.length > 0 && (
                <div className="p-5 rounded-xl bg-surface border border-border-soft">
                  <h3 className="font-semibold text-fg-2 mb-2">Other rooms in {zone.name}</h3>
                  <ul className="space-y-1">
                    {relatedSameZone.map((p) => (
                      <li key={p.slug}>
                        <Link
                          to={`/zones/${p.slug}`}
                          className="text-sm text-accent hover:text-accent-hover"
                        >
                          {p.roomType} in the {p.zoneName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border bg-surface mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-meta">
          <span>© 2026 VastuPlan · Built for Indian homes</span>
          <div className="flex items-center gap-4">
            <Link to="/zones" className="hover:text-fg-2 transition-colors">
              Vastu zones
            </Link>
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

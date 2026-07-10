import { Link } from 'react-router-dom';
import { Compass, BookOpen, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { IDEAL_ZONES } from '../services/vastu';
import { getVastuZoneInfo } from '../constants/vastuZones';
import { ROOM_TYPES } from '../constants/floorPlanConstants';
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
  CENTER: 'Brahmasthan (center)',
};

function ScorePill({ score }: { score: number }) {
  const status = score >= 80 ? 'good' : score >= 50 ? 'average' : 'poor';
  const classes = {
    good: 'bg-success/10 text-success',
    average: 'bg-warn/10 text-warn',
    poor: 'bg-danger/10 text-danger',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classes[status]}`}
    >
      {status === 'good' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'average' && <Info className="w-3 h-3" />}
      {status === 'poor' && <AlertCircle className="w-3 h-3" />}
      {score}
    </span>
  );
}

export function Methodology() {
  return (
    <div className="min-h-screen bg-bg text-fg">
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
            How VastuPlan scores a floor plan
          </h1>
          <p className="text-lg text-muted leading-relaxed max-w-3xl">
            VastuPlan 2D translates classical Vastu Shastra direction rules into a live,
            room-by-room score. This page explains what we measure, where the rules come from, and
            how to read the feedback.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-surface border border-border-soft">
            <h3 className="font-semibold text-fg-2 mb-2 flex items-center gap-2">
              <Compass className="w-4 h-4 text-accent" />
              16-zone compass
            </h3>
            <p className="text-sm text-muted">
              The plot is divided into the eight cardinal and inter-cardinal directions plus the
              central Brahmasthan.
            </p>
          </div>
          <div className="p-5 rounded-xl bg-surface border border-border-soft">
            <h3 className="font-semibold text-fg-2 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Per-room fit
            </h3>
            <p className="text-sm text-muted">
              Each room type has a set of ideal, acceptable, and avoided directions derived from
              canonical texts.
            </p>
          </div>
          <div className="p-5 rounded-xl bg-surface border border-border-soft">
            <h3 className="font-semibold text-fg-2 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-warn" />
              North-angle aware
            </h3>
            <p className="text-sm text-muted">
              You can rotate the plot’s North angle, and every direction calculation updates in real
              time.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fg-2 mb-4">Scoring system</h2>
          <div className="overflow-x-auto rounded-xl border border-border-soft bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-bg border-b border-border-soft">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Bucket</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Score</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">What it means</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                <tr>
                  <td className="px-4 py-3 font-medium text-success">Ideal direction</td>
                  <td className="px-4 py-3">
                    <ScorePill score={100} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    The room sits in a direction traditionally recommended for that use.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-warn">Acceptable direction</td>
                  <td className="px-4 py-3">
                    <ScorePill score={60} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    Not the strongest placement, but it does not conflict with the primary rule.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-danger">Avoided direction</td>
                  <td className="px-4 py-3">
                    <ScorePill score={20} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    The direction is considered unsuitable for the room type in the texts we cite.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            The overall Vastu score is the simple average of every room’s score on the current
            floor. Empty floors score 0.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fg-2 mb-4">Direction matrix</h2>
          <p className="text-muted mb-4">
            Below is the exact rule set used by the app. “Best” gives 100 points, “Neutral” gives 60
            points, and “Avoid” gives 20 points.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border-soft bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-bg border-b border-border-soft">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2 sticky left-0 bg-bg">
                    Room type
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-success">Best</th>
                  <th className="text-left px-4 py-3 font-semibold text-warn">Neutral</th>
                  <th className="text-left px-4 py-3 font-semibold text-danger">Avoid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {ROOM_TYPES.map((rt) => {
                  const type = rt.type as RoomType;
                  const rule = IDEAL_ZONES[type];
                  if (!rule) return null;
                  return (
                    <tr key={type}>
                      <td className="px-4 py-3 font-medium text-fg-2 sticky left-0 bg-surface">
                        {type}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {rule.best.map((d) => directionLabels[d]).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {rule.neutral.map((d) => directionLabels[d]).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {rule.avoid.map((d) => directionLabels[d]).join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fg-2 mb-4">What the zones mean</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'North',
              'North-East',
              'East',
              'South-East',
              'South',
              'South-West',
              'West',
              'North-West',
              'Brahmasthan',
            ].map((name) => {
              const zone = getVastuZoneInfo(name);
              return (
                <div key={name} className="p-4 rounded-xl bg-surface border border-border-soft">
                  <h3 className="font-semibold text-fg-2 mb-1">
                    {zone.name} <span className="text-meta font-normal">— {zone.element}</span>
                  </h3>
                  <p className="text-sm text-muted mb-1">
                    <span className="font-medium text-fg-2">Ideal for:</span> {zone.idealFor}
                  </p>
                  <p className="text-sm text-meta">{zone.tip}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fg-2 mb-4">Sources & methodology</h2>
          <div className="prose prose-sm max-w-none text-muted">
            <p>
              The matrix above is a synthesis of directional rules found in the classical texts of
              Vastu Shastra, interpreted for modern apartments and plotted homes:
            </p>
            <ul>
              <li>
                <strong className="text-fg-2">Manasara Shilpa Shastra</strong> — directional
                placement of rooms, relative weight, and the importance of the Brahmasthan.
              </li>
              <li>
                <strong className="text-fg-2">Mayamata</strong> — zone-element associations and the
                principle that active rooms belong in lighter (East/North) zones while restful rooms
                belong in heavier (South/West) zones.
              </li>
              <li>
                <strong className="text-fg-2">Vastu Vidya</strong> — the 3×3 grid (Padas) and the
                eight directional deities that inform our zone labels.
              </li>
              <li>
                <strong className="text-fg-2">Brihat Samhita</strong> — orientation and solar
                geometry, which we apply through the configurable North angle and sun-path overlay.
              </li>
            </ul>
            <p>
              We have deliberately kept the scoring transparent: there is no hidden AI deciding what
              is “good.” The score is a deterministic lookup based on room center, plot center, and
              the direction matrix. If your school of Vastu disagrees with a rule, the consultant
              tier will let you override it (M-12).
            </p>
            <p>
              This is a cultural-guidance tool, not a substitute for a licensed architect,
              structural engineer, or a Vastu consultant. Always verify local building bylaws before
              construction.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-meta">
          <span>© 2026 VastuPlan · Built for Indian homes</span>
          <Link to="/" className="hover:text-fg-2 transition-colors">
            ← Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}

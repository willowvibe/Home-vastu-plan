# VastuPlan 2D — Market Viability, ROI & Go-To-Market Deep-Dive

> **Verdict:** VastuPlan 2D remains structurally viable, but the competitive landscape has shifted materially since the June 26 baseline. The niche is no longer "uncontested" — 2026 has seen a wave of AI-first Vastu tools (GrehYug, VastuIQ, VastuAnalyzer, Vaastu Bhav, VastuCheck) enter at ₹99–₹2,499 price points. The honest monetization path is narrower and more defensible around **free editor → ₹499 Pro Export → ₹999/yr Consultant tier**, with a hard 90-day hypothesis test. Spiritual-tech is a validated large market (AstroTalk ₹1,176 Cr FY25), but Vastu-specific demand percentages remain unverifiable.

- **Date:** 2026-07-10
- **Research depth:** deep (interactive prompt; 3-vote adversarial verification on 5 key claims; 23+ sources fetched/searched)
- **Baseline:** Existing `market_research/` docs from 2026-06-26
- **Key update:** New AI Vastu competitors and a verified spiritual-tech market benchmark change both the threat model and the fundraising story.

---

## 1. Executive Summary

### 1.1 The question you asked

You wanted a realistic assessment of whether VastuPlan 2D can work, what ROI is possible, which features are in demand, what to update or remove, competitor analysis, and marketing strategy.

### 1.2 One-paragraph answer

VastuPlan 2D can work as a **bootstrapped, niche SaaS** but not as a venture-scale play without first proving a 90-day hypothesis. The app sits at the intersection of a real cultural need (Vastu-aware home design), a validated willingness to pay for spiritual/astrological services in India (AstroTalk ₹1,176 Cr FY25), and a structurally distinct open-source/free-editor wedge. However, since June 2026 the competitive space has crowded quickly: AI-powered Vastu tools now offer floor-plan upload + report generation at ₹99–₹499, and GrehYug is building a free interactive plan builder directly adjacent to your canvas. The defensible differentiation is **live 16-zone scoring inside a true drag-and-drop editor**, open-source trust, and consultant-tier customization. The monetization sweet spot is a **₹499 one-time Pro Export Pack** and a **₹999/year Consultant tier** — anything higher competes with Foyr Neo or loses to AI report generators. Realistic Year-1 revenue is **₹3L–₹20L** depending on SEO traction and Hindi i18n; this does not cover a full-time team, so the right path is founder-sweat bootstrapping or a small pre-seed after the 90-day test passes.

### 1.3 Verdict matrix (updated)

| Dimension                           | Verdict                          | Confidence | What changed since Jun 26                                                                                           |
| ----------------------------------- | -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| **Product-market fit (structural)** | Viable                           | High       | Still unique combo, but GrehYug's free plan builder narrows the "uncontested" claim.                                |
| **Demand-side evidence**            | Real but unquantified            | Medium     | AstroTalk validates spiritual-tech spend; Vastu-specific percentages still unverifiable.                            |
| **Monetization viability**          | Narrowly viable                  | Medium     | AI tools create a ₹99–₹499 report tier; Pro Export at ₹499 is still defensible as a _deliverable_ for editor users. |
| **Competitive intensity**           | Rising                           | High       | 8+ new AI Vastu tools discovered; GrehYug is the most credible direct threat.                                       |
| **Engineering readiness**           | High                             | High       | 0.1.1 alpha core is solid; gaps well-mapped.                                                                        |
| **Distribution wedge**              | SEO + WhatsApp share             | Medium     | Same as baseline; must ship now before AI tools own the SERP.                                                       |
| **Cost-to-launch v0.2**             | ₹6L–₹12L one-time + ₹30K–₹50K/mo | Medium     | Unchanged.                                                                                                          |
| **Time-to-PMF signal**              | 90 days                          | Hypothesis | Unchanged.                                                                                                          |
| **Path to "real product"**          | 12–18 months, ₹72L–₹1.8Cr        | Medium     | Unchanged.                                                                                                          |

---

## 2. What's New Since the June 26 Baseline

The previous `market_research/` pass was excellent but missed a wave of 2026 AI-first Vastu products. This refresh surfaces them and re-runs adversarial verification.

### 2.1 New direct competitors (not in prior research)

| Competitor                       | Core offering                                                                    | Pricing                                                              | Threat level                      |
| -------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------- |
| **GrehYug**                      | AI Vastu floor plans + free Interactive Plan Builder + Drishti AI report         | Free builder; Drishti ₹999; Standard plan ₹2,499; Builder ₹14,999/mo | **High** — closest direct overlap |
| **Vaastu Bhav**                  | AI Vastu analysis, 16-zone + 32 Devtas, SVG plan generation                      | Not fully clear from site                                            | Medium                            |
| **VastuAnalyzer**                | Consultant-focused SaaS: upload floor plan → branded PDF, multiple Vastu systems | ₹299/3-day trial; ₹4,999/yr; ₹29,999 lifetime                        | **High** for consultant tier      |
| **VastuCheck.in**                | Upload plan → pay-per-report PDF with non-demolition remedies                    | Free preview; paid PDF                                               | Medium                            |
| **Vastu Zone Mapper**            | Satellite-aligned 16-zone grid + 32 padas JPG                                    | ₹149/floor plan                                                      | Low-Medium                        |
| **VastuIQ / GarahPravesh**       | Geo-adaptive AI Vastu, multi-floor analysis, DishaAI chat                        | Free score; reports ₹149–₹599                                        | **High** on price pressure        |
| **360Ghar**                      | Free 3D floor planner + AI Vastu checker, no signup                              | Free                                                                 | Medium                            |
| **Speak Arch**                   | Free Vastu floor plan designer, 9-zone overlay                                   | Free                                                                 | Low                               |
| **Vaastu-AI (vastushastras.in)** | AI floor-plan report, 10-language                                                | ₹99/report                                                           | Medium                            |

### 2.2 What this changes

- **The "uncontested niche" framing is now "contested but differentiated."** GrehYug's free Interactive Plan Builder is functionally similar to VastuPlan 2D's canvas. VastuPlan 2D's remaining structural advantages are: (a) live 16-zone scoring while dragging, (b) open-source MIT distribution, (c) sub-0.1ft precision, (d) multi-floor, (e) no signup required.
- **Pricing floor has dropped.** AI Vastu reports are now ₹99–₹499. A ₹499 Pro Export must be framed as a _deliverable_ (vector PDF, watermark-free, presentation export) not as "analysis" — analysis is commoditizing.
- **Consultant SaaS competition exists.** VastuAnalyzer (₹4,999/yr) and Vastuteq (₹5,100/yr) target the same consultants VastuPlan 2D hoped to monetize at ₹999/yr. VastuPlan 2D needs a clearer consultant value prop.

### 2.3 Verified vs. still uncertain claims

| Claim                                              | Status              | Notes                                                            |
| -------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| AstroTalk FY25 revenue ₹1,176 Cr, 81% growth       | **Verified** (3-0)  | Multiple business outlets + RoC filings align.                   |
| India PropTech market $1.5–3.0B, double-digit CAGR | **Verified** (2-1)  | Commercial research consensus; treat as estimate range.          |
| 99acres 62% prefer Vastu / 44% pay premium         | **Uncertain** (0-3) | Directional signal real; specific stats unverifiable.            |
| MagicBricks 80% consider Vastu important           | **Uncertain** (0-3) | Likely conflated with search-share data.                         |
| GrehYug free plan builder + ₹999 Drishti report    | **Uncertain** (0-3) | ₹999 report confirmed; free/paid builder contradictions on site. |
| AI Vastu reports ₹99–₹499                          | **Uncertain** (1-2) | Pattern plausible; specific tool attributions mixed.             |

---

## 3. Market Context

### 3.1 Macro housing demand (verified)

| Signal                   | Value                                                | Source                                                                    | Confidence           |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------- | -------------------- |
| MagicBricks HSI Q2 FY26  | **142** (up from 138)                                | MagicBricks/IIMB via Financial Express, Economic Times, Business Standard | High                 |
| Hottest price segment    | **₹1–1.5 Cr** (HSI 149)                              | MagicBricks HSI Q2 FY26                                                   | High                 |
| Strongest buyer income   | **₹10–30 LPA**                                       | MagicBricks HSI Q2 FY26                                                   | High                 |
| Preferred property type  | Builder floors > plots; 500–1,000 sqft compact units | MagicBricks HSI Q2 FY26                                                   | High                 |
| Top cities by sentiment  | Chennai, Noida/Greater Noida, Kolkata                | MagicBricks HSI Q2 FY26                                                   | High                 |
| Homeownership preference | 80%; 34% renters plan to buy in 12 mo                | Knight Frank "Beyond Bricks" 2025                                         | High (from baseline) |
| Apartment preference     | 71% prefer apartments/flats                          | MagicBricks HSI 2025                                                      | High (from baseline) |
| ₹10–20L cohort HSI       | **157** (most bullish)                               | MagicBricks HSI 2025                                                      | High (from baseline) |

**Implication:** The addressable audience is the mid-income metro buyer in the ₹10–30 LPA bracket buying a ₹50L–₹1.5Cr compact home. This is exactly the user who wants to sketch a layout before hiring an architect or interior designer.

### 3.2 Spiritual-tech market validation (new, strong signal)

AstroTalk's FY25 numbers validate that Indians will pay digitally for spiritual/astrological services at scale:

| Metric                    | AstroTalk FY25    | FY24      | Change |
| ------------------------- | ----------------- | --------- | ------ |
| Operating revenue         | ₹1,176 Cr         | ₹651 Cr   | +81%   |
| Total income              | ₹1,214 Cr         | ₹656 Cr   | +85%   |
| Adjusted PBT              | ₹285 Cr           | ₹127 Cr   | +125%  |
| Reported net profit       | ₹32.84 Cr         | ₹85.38 Cr | -62%\* |
| Users                     | 8 Cr (80M)        | —         | —      |
| Paid consultations        | 1.8 Cr (18M)      | —         | —      |
| Monthly transacting users | 15 Lakh (1.5M)    | —         | —      |
| Ad spend FY24             | ₹162.7 Cr         | —         | —      |
| AstroStore revenue (CY25) | ₹140 Cr in Year 1 | —         | —      |

\* Net profit fell due to one-time employee expense (~₹120 Cr) and non-cash CCPS mark-to-market (~₹80 Cr) from Ind-AS adoption.

**Implication:** There is a large, paying Indian market for culturally rooted digital services. Vastu sits adjacent to astrology/numerology and can ride the same trust wave, but VastuPlan 2D must still prove willingness-to-pay for _floor-plan tools_ specifically.

### 3.3 PropTech market size

| Source         | 2025 base                | Forecast        | CAGR   |
| -------------- | ------------------------ | --------------- | ------ |
| IMARC          | $1.31B                   | $3.82B by 2034  | 12.26% |
| MarkNtel       | $1.72B                   | $5.98B by 2032  | 19.48% |
| TechSci        | $1.66B                   | $4.29B by 2031  | 16.95% |
| MRFR           | $2.88B                   | $12–14B by 2035 | 15.33% |
| ETRealty/ICICI | ~$1.5B (online PropTech) | $3.0B by 2030   | ~15%   |

**Verdict:** Verified as a reasonable estimate range. The wide spread reflects different definitions of "PropTech." VastuPlan 2D is a tiny slice of this; do not size the opportunity by TAM.

### 3.4 Vastu demand — the honest read

The baseline research correctly refuted the most-cited Vastu statistics (95% Vastu matters, 62% prefer, 44% pay premium). This refresh re-tested them and found the same result:

- **Directional truth:** Vastu is a real search/filter criterion on property portals, and regional/city-level data shows strong interest in South Indian and some West/Central markets.
- **Specific percentages:** The 62%/44% 99acres figures and the 80% MagicBricks figure cannot be traced to retrievable first-party reports with methodology.
- **Practical implication:** Use Vastu as a strong SEO/content hook and category-defining feature, not as a quantified demand multiplier.

---

## 4. Competitive Landscape

### 4.1 Direct competitors matrix

| Competitor                | Free editor?    | Live Vastu scoring?   | AI report?      | Multi-floor? | Open source? | Pricing                              | Threat             |
| ------------------------- | --------------- | --------------------- | --------------- | ------------ | ------------ | ------------------------------------ | ------------------ |
| **VastuPlan 2D**          | ✅              | ✅ 16-zone            | ✅ (Gemini)     | ✅           | ✅ MIT       | Free / ₹499 / ₹999yr                 | —                  |
| **GrehYug**               | ✅ (builder)    | ✅                    | ✅ Drishti ₹999 | ✅           | ❌           | Free; ₹999; ₹2,499; ₹14,999/mo       | **High**           |
| **VastuIQ**               | ❌ (upload)     | ✅                    | ✅              | ✅           | ❌           | Free score; ₹149–₹599 reports        | High               |
| **VastuAnalyzer**         | ❌ (upload)     | ✅                    | ✅              | ?            | ❌           | ₹299 trial / ₹4,999yr / ₹29,999 life | High (consultants) |
| **Vaastu Bhav**           | ❌ (upload)     | ✅ 16+32              | ✅              | ?            | ❌           | unclear                              | Medium             |
| **VastuCheck.in**         | ❌ (upload)     | ✅                    | ✅              | ?            | ❌           | free preview + paid PDF              | Medium             |
| **Vastu Zone Mapper**     | ❌ (upload)     | ✅ 16+32              | ❌              | ?            | ❌           | ₹149/plan                            | Low-Medium         |
| **360Ghar**               | ✅ 3D editor    | ❌ (separate checker) | ✅              | ?            | ❌           | Free                                 | Medium             |
| **Speak Arch**            | ✅ 2D editor    | ✅ 9-zone             | ❌              | ?            | ❌           | Free                                 | Low                |
| **MagicBricks Home Plan** | ✅              | ❌ guidance only      | ?               | ✅           | ❌           | Free                                 | Medium             |
| **Bonito Vastu Tool**     | ✅ web          | ❌ advisory           | ❌              | ?            | ❌           | Free                                 | Low                |
| **Foyr Neo**              | ❌ 14-day trial | ❌ templates          | ❌              | ✅           | ❌           | ₹1,583–3,717/mo                      | Medium             |
| **Vasthu Plan**           | ✅ Android      | ✅ 9-square           | ❌              | ?            | ❌           | Free + ads/IAP                       | Low (stale)        |
| **AppliedVastu Compass**  | ✅              | ✅ overlay            | ❌              | ❌           | ❌           | Free                                 | Low                |

### 4.2 Competitor pricing pressure

AI Vastu tools have collapsed the price of a _basic floor-plan Vastu report_ to ₹99–₹499. This means:

- **Do not compete on "Vastu analysis" alone.** Analysis is now a commodity.
- **Compete on the editor + deliverable workflow.** Homeowners use VastuPlan 2D to _create and iterate_ a plan, not just analyze one.
- **The ₹499 Pro Export is still defensible** because it includes vector PDF, watermark-free PNG, presentation export, and compliance report — i.e., a file they can hand to a contractor/family member.
- **The ₹999 Consultant tier needs sharpening.** VastuAnalyzer already offers branded multi-system reports for ₹4,999/yr. At ₹999/yr, VastuPlan 2D must offer something VastuAnalyzer cannot: the ability to _edit_ the plan with the client, share annotated links, and override the Vastu matrix per the consultant's school.

### 4.3 What users complain about (feature demand signals)

From app reviews and competitor teardowns:

1. **Aggressive upsells / "fake free" apps** — users hate paying and getting nothing.
2. **Generic advice, not personalized** — they want room-by-room fixes for _their_ plan.
3. **No real floor-plan AI** — they want to upload a builder PDF/hand sketch and get analysis.
4. **Compass/UI accuracy issues** — they want degrees, direction names, no watermark blocking the center.
5. **Multi-floor / duplex / triplex analysis** — whole-building view, not per-floor.
6. **Practical, no-demolition remedies** — ranked by cost/effort.
7. **Offline mode & fewer ads** — usable at construction sites.
8. **Transparent pricing & responsive support.**
9. **Regional language support + PDF/WhatsApp sharing.**
10. **Side-by-side property compare** for flat buyers.
11. **Optional expert consultation** for complex cases.

---

## 5. Feature Triage — Ship / Enhance / Optimize / Remove

This updates the June 26 `80_feature_triage.md` with the new competitive context.

### 5.1 SHIP — v0.2 (next 60–90 days)

These gate the 90-day hypothesis test.

| Feature                                               | Effort | Value  | Why now                                                                                  |
| ----------------------------------------------------- | ------ | ------ | ---------------------------------------------------------------------------------------- |
| **Vector PDF export + watermark gate**                | M      | High   | Core ₹499 deliverable; differentiates from free screenshots.                             |
| **Razorpay / Instamojo payment integration**          | S      | High   | Monetization hypothesis is blocked without this.                                         |
| **QR-code share export**                              | XS     | High   | On-ramp for in-person sharing (contractor/family WhatsApp groups).                       |
| **Wire up `?mode=comment` annotation UI**             | S      | High   | Unique viral loop: homeowner ↔ consultant/architect/spouse. No competitor has this well. |
| **PWA basics: manifest + service worker + IndexedDB** | S      | High   | Required for offline use at construction sites; competitors lack this.                   |
| **SEO content: 16 zone pages + pillar + landing**     | L      | High   | Primary acquisition channel; must ship before AI tools own the SERP.                     |
| **Mobile UX polish (touch targets, property panel)**  | S      | High   | Persona A is mobile-web-first.                                                           |
| **Vastu matrix source citation + methodology page**   | S      | Medium | Builds trust vs. AI black-box competitors; cultural product needs cited methodology.     |

### 5.2 SHIP — v0.3 (90–180 days)

| Feature                                        | Effort | Value  | Why                                                                         |
| ---------------------------------------------- | ------ | ------ | --------------------------------------------------------------------------- |
| **Hindi i18n**                                 | L      | High   | Tier-2/3 expansion; but only after v0.2 metrics prove English wedge.        |
| **Auth + cross-device sync**                   | L      | High   | Required for Consultant tier and Persona A phone→desktop flow.              |
| **Consultant tier landing + referral program** | S      | Medium | Operationalize the ₹999/yr channel.                                         |
| **Custom Vastu matrix override**               | M      | Medium | Key differentiator vs. VastuAnalyzer; consultants follow different schools. |
| **Sketch/PDF upload → auto-room detection**    | L      | High   | Matches user demand signal #3; closes gap with VastuIQ/VastuAnalyzer.       |
| **Side-by-side property compare**              | M      | Medium | Targets flat buyers (71% apartment preference).                             |

### 5.3 ENHANCE

| Feature                                       | Effort | Value  | Why                                                |
| --------------------------------------------- | ------ | ------ | -------------------------------------------------- |
| **Brahmasthan / CENTER scoring clarity**      | S      | High   | Most common user confusion; fix before scaling.    |
| **Multi-user undo in collab**                 | M      | Medium | Differentiator vs. Foyr/MagicPlan; polish matters. |
| **Per-room rotation + multi-room transforms** | S      | Medium | Basic CAD primitives users expect.                 |

### 5.4 OPTIMIZE

| Work                                      | Effort | Value  |
| ----------------------------------------- | ------ | ------ |
| Bundle size / FCP / canvas virtualization | S      | High   |
| Test coverage ≥80% on critical paths      | M      | High   |
| Accessibility (WCAG 2.1 AA)               | S      | Medium |
| Sentry + Plausible event tracking         | S      | Medium |

### 5.5 DO NOT DO — updated rejections

| Rejected                                         | Reason                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **3D rendering / walkthroughs / VR**             | Saturated (Foyr, Planner 5D, Coohom, 360Ghar).                                                       |
| **Native Android in v0.2**                       | PWA-first; share-link loop is web-only. Revisit if viral coefficient > 0.5.                          |
| **Native iOS**                                   | Small Indian market share; high cost.                                                                |
| **Per-month SaaS > ₹1,500**                      | Loses to Foyr Neo Basic (₹1,583/mo annual).                                                          |
| **Vastu consultant marketplace**                 | Two-sided liquidity problem at small scale.                                                          |
| **In-app ads for consultants**                   | Cluttered UX, unverified demand.                                                                     |
| **AI "auto-Vastu" floor-plan generator in v0.2** | Cultural authenticity risk; GrehYug already doing this. Differentiate on _editor + scoring_ instead. |
| **AR / LiDAR scanning**                          | MagicPlan/360Ghar serve this; different surface.                                                     |
| **Generic interior-design content / catalogs**   | Livspace/HomeLane own this.                                                                          |
| **Fundraising before 90-day test**               | New AI competitors make unverified TAM even more dangerous.                                          |
| **Compete on AI report price (₹99–₹499)**        | You will lose to dedicated AI tools on cost; compete on editor + deliverable workflow.               |

---

## 6. Monetization & ROI Model

### 6.1 Updated pricing architecture

| Tier                | Price             | What's included                                                                                                   | Rationale                                                                                           |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Free**            | ₹0 forever        | Canvas, 16-zone live scoring, multi-floor, share link, JSON/SVG export, PWA offline                               | Wedge + SEO + virality.                                                                             |
| **Pro Export Pack** | **₹499 one-time** | Vector PDF, watermark-free PNG, compliance report PDF, presentation export                                        | Below ClickAstro (₹2,310) and any consultant written report (₹5,000+). One-time = project purchase. |
| **Consultant**      | **₹999/year**     | Multi-plan library, custom Vastu matrix override, branded reports, comment-mode share, QR share, priority support | 5–10× cheaper than one consultant session; differentiate via editor + collaboration.                |

### 6.2 Pricing pressure from AI tools

AI Vastu reports are now ₹99–₹599. VastuPlan 2D should **not** try to match them on analysis price. Instead, frame the ₹499 IAP as:

> "Buy the export — the file you take to your architect, contractor, and family WhatsApp group."

The value is in the _editable canvas + deliverable_, not the analysis.

### 6.3 ROI scenarios (unchanged structure, updated context)

| Scenario                              | MAU    | Pro Export conversion | Pro revenue | Consultant signups | Consultant revenue | Year-1 revenue |
| ------------------------------------- | ------ | --------------------- | ----------- | ------------------ | ------------------ | -------------- |
| **A — Conservative (90d)**            | 1,000  | 5% (50)               | ₹24,950     | 5 (0.5%)           | ₹4,995/yr          | ~₹3L           |
| **B — Moderate (180d)**               | 5,000  | 7% (350)              | ₹1,74,650   | 50 (1%)            | ₹49,950/yr         | ~₹6L           |
| **C — Optimistic (365d, Hindi i18n)** | 25,000 | 8% (2,000)            | ₹9,98,000   | 500 (2%)           | ₹4,99,500/yr       | ~₹20L          |

**Caveats:**

- These are scenarios, not forecasts.
- Scenario A does not cover a 3-person team.
- Scenario C requires Hindi i18n, offline PWA, and at least one SEO channel hitting.
- New AI competitors may compress Pro Export conversion; monitor closely.

### 6.4 Cost-to-launch reality

From the baseline codebase audit: a production-grade VastuPlan 2D with auth + i18n + offline + CRDT + vector PDF is ~25,000–40,000 LOC, i.e., 12–18 months for a 3–4 person team.

| Team     | Duration  | Burn (₹2L/mo/engineer) | Total  |
| -------- | --------- | ---------------------- | ------ |
| 3-person | 12 months | ₹6L/mo                 | ₹72L   |
| 4-person | 18 months | ₹10L/mo                | ₹1.8Cr |

**Honest paths:**

1. **Bootstrap with founder sweat equity** to Scenario A revenue (₹3L/yr).
2. **Raise a small pre-seed (₹50L–₹1Cr)** only _after_ the 90-day hypothesis passes.
3. **Stay part-time** and treat it as ₹3–6L/yr side income.

---

## 7. Marketing Strategy & Go-To-Market

### 7.1 Target persona (sharpened)

**Primary — Persona A:**

- Metro/Tier-1 Indian, age 28–45, household income ₹10–30 LPA.
- Buying or building a ₹50L–₹1.5Cr compact home (500–1,000 sqft).
- Uses mobile web + WhatsApp heavily.
- Wants to validate layout with family/contractor before paying an architect or Vastu consultant.

**Secondary — Persona B:**

- Vastu consultants, architects, interior designers who want a fast, shareable tool to review client plans.

**Tertiary — Persona C:**

- Tier-2/3 Hindi-primary users; only after i18n.

### 7.2 Channel mix

| Channel                              | Role                       | Budget / Effort                            | Expected CAC                  |
| ------------------------------------ | -------------------------- | ------------------------------------------ | ----------------------------- |
| **SEO (16 zone pages + pillar)**     | Primary acquisition        | ₹25K–₹50K per zone × 16 = ₹4L–₹8L one-time | Near zero (amortized)         |
| **YouTube shorts/reels**             | Awareness + trust          | ₹50K–₹1L production                        | ₹5–₹20 per view               |
| **WhatsApp share-link virality**     | Retention + organic growth | Engineering only                           | ₹0 if viral coefficient > 0.3 |
| **Google Search Ads**                | Backup if SEO lags         | ₹30K test budget                           | ₹10–₹50 per click             |
| **Reddit / Quora / Facebook groups** | Community validation       | Founder time                               | ₹0                            |
| **Consultant outreach**              | B2B tier                   | ₹20K–₹50K for 50 interviews + landing      | High-touch                    |

### 7.3 Messaging

Lead with the problem, not the feature:

> **"Plan your home layout the way your family actually discusses it — on WhatsApp, with Vastu clarity, before you pay the architect."**

Secondary angles:

- "Free 2D floor planner with live Vastu score."
- "Export a professional PDF for ₹499 — not ₹5,000 for a consultant visit."
- "Open-source. Your plan, your data, your device."

### 7.4 90-day hypothesis test (updated)

> **Hypothesis:** VastuPlan 2D can acquire 1,000 MAU and 50 paid Pro-export conversions (₹499 one-time) within 90 days of v0.2 launch, with <₹30,000 paid acquisition spend, by ranking for "Vastu floor plan," "free 2D home design India," and "Vastu compliant layout," and by embedding a one-click share-link-to-WhatsApp in every exported plan.

**Decision rule:**

- ✅ Pass 4 of 6 checklist items → proceed to v0.3 + raise pre-seed.
- ⚠️ 2–3 green → iterate v0.2 another 90 days.
- ❌ 0–1 green → pivot or stay part-time.

### 7.5 90-day go/no-go checklist

| Metric                       | Threshold   | Why                            |
| ---------------------------- | ----------- | ------------------------------ |
| MAU                          | ≥ 1,000     | Organic SEO proof.             |
| Pro Export conversion        | ≥ 3%        | Willingness-to-pay signal.     |
| Marketing spend              | ≤ ₹30K paid | Capital-efficient wedge.       |
| Share-link viral coefficient | ≥ 0.3       | WhatsApp loop working.         |
| D30 retention from SEO       | ≥ 10%       | Not just one-off visits.       |
| Consultant Tier signups      | ≥ 1 paying  | Early B2B signal (not gating). |

---

## 8. Risk Register

| Risk                                                     | Likelihood | Impact | Mitigation                                                                 |
| -------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------- |
| GrehYug or 360Ghar out-SEO VastuPlan 2D                  | Medium     | High   | Ship 16 zone pages immediately; lean on open-source + MIT differentiation. |
| AI Vastu report pricing compresses Pro Export conversion | Medium     | High   | Reframe ₹499 as "deliverable export," not analysis.                        |
| Hindi i18n doesn't expand TAM                            | Low-Medium | Medium | English wedge is viable on its own.                                        |
| Vastu consultants don't adopt Consultant tier            | High       | Medium | Tier 3 is upside; free + Pro Export is the floor.                          |
| MagicBricks/NoBroker add live Vastu scoring              | Medium     | High   | MIT open-source is a defensive moat; partner outreach now.                 |
| Payment integration friction                             | Low        | Low    | Razorpay standard; Instamojo fallback.                                     |
| Google SEO algorithm change                              | Medium     | Medium | Diversify into YouTube + Reddit + Quora.                                   |
| Founder burnout                                          | Medium     | High   | Hard 90-day go/no-go; don't stretch to 12 months.                          |

---

## 9. Final Recommendation

### 9.1 What to do now (next 30 days)

1. **Ship vector PDF + Razorpay + watermark gate.** This unblocks the ₹499 Pro Export hypothesis.
2. **Publish the 16 SEO zone pages.** This is the highest-leverage marketing action and is now urgent because AI competitors are entering the same keywords.
3. **Add QR-code share + wire up comment mode.** These are unique viral/differentiation features.
4. **Add PWA manifest + offline IndexedDB storage.** Construction-site usability is a real differentiator.
5. **Run 5–10 customer discovery calls with Vastu consultants.** Validate the ₹999/yr Consultant tier before building custom matrix override.

### 9.2 What to stop / defer

1. **Stop calling the niche "uncontested."** Update pitch deck/website to "differentiated in a crowded AI Vastu market."
2. **Defer 3D rendering / VR / native iOS/Android.** These are resource sinks with no verified advantage.
3. **Defer AI auto-Vastu generator.** Let GrehYug fight that commoditized battle; focus on the editor + scoring + collaboration.
4. **Do not raise pre-seed yet.** Run the 90-day test first. The new AI entrants make the TAM story weaker, not stronger.

### 9.3 Bottom line

VastuPlan 2D can make money, but the realistic path is **small, bootstrapped, and hypothesis-driven**: ₹3L–₹20L Year-1 revenue from a lean free→Pro Export→Consultant tier, driven by SEO and WhatsApp virality. The new AI competitors raise the bar on speed and pricing but also validate the market. Your structural advantages — live 16-zone scoring inside a real editor, open-source trust, no signup, PWA offline — are still real. Ship the v0.2 monetization wedge in the next 60–90 days and measure; everything else follows from that data.

---

## 10. Sources

### Market / demand

- [MagicBricks Consumer Sentiment Index](https://property.magicbricks.com/microsite/research-insights/consumer-sentiment-index/index.html)
- [Financial Express — HSI rebounds, ₹1–1.5 Cr segment HSI 149](https://www.financialexpress.com/money/millennials-gen-y-drive-housing-demand-rs-11-5-crore-homes-see-highest-buyer-sentiment-report-4010339/)
- [Economic Times — HSI rebounds despite high prices](https://economictimes.indiatimes.com/industry/services/property-/-cstruction/housing-sentiment-index-rebounds-despite-the-prices-staying-high/articleshow/124586948.cms)
- [Business Standard — buyer confidence rebounds](https://www.business-standard.com/industry/news/buyer-confidence-rebounds-in-india-s-housing-market-magicbricks-report-125101401270_1.html)

### Spiritual-tech validation

- [The Economic Times — AstroTalk FY25 revenue ₹1,176 Cr](https://economictimes.indiatimes.com/tech/startups/online-astrology-service-astrotalks-fy25-revenue-surges-81-to-rs-1176-crore/articleshow/127691241.cms)
- [The Hindu BusinessLine — AstroTalk net profit plunge FY25](https://www.thehindubusinessline.com/companies/spritual-tech-startup-astrotalks-net-profit-plunges-by-62-per-cent-to-3284-crore-for-fy25/article70562036.ece)
- [Storyboard18 — astrology apps turning faith into fortune](https://www.storyboard18.com/how-it-works/biz-of-belief-how-indias-astrology-apps-are-turning-faith-into-fortune-amid-rising-regulatory-concerns-83027.htm)
- [YourStory — Can AstroTalk build Amazon of spiritual commerce?](https://yourstory.com/2026/05/can-astrotalk-build-the-amazon-of-spiritual-commerce)

### PropTech market size

- [IMARC — India PropTech Market](https://www.imarcgroup.com/india-proptech-market)
- [MarkNtel Advisors — India PropTech Outlook](https://www.marknteladvisors.com/research-library/proptech-market-india.html)
- [TechSci Research — India PropTech Market](https://www.techsciresearch.com/news/8753-india-proptech-market.html)
- [Market Research Future — India PropTech](https://www.marketresearchfuture.com/reports/india-proptech-market-46504)
- [ETRealty / ICICI — India's PropTech market booming but unprofitable](https://realty.economictimes.indiatimes.com/news/allied-industries/indias-proptech-market-booming-sales-yet-struggling-for-profitability/131037742)

### Vastu demand / psychology

- [Times Now — Bengaluru searched Vastu-compliant homes in 2024](https://www.timesnownews.com/city/indians-searched-homes-in-2024-year-ender-magicbricks-bengaluru-vastu-delhi-parking-spaces-mini-metros-religious-article-116504869)
- [99acres — Why Vastu compliance matters](https://www.99acres.com/articles/why-is-vastu-compliance-of-a-property-important.html)
- [Puravankara — Homebuyer psychology citing 99acres](https://www.puravankara.com/real-estate-blog/the-psychology-of-homebuyers-how-indians-decide-on-their-dream-home)
- [Openplot — Vastu-compliant plots investment](https://blog.openplot.com/investment-tips/vastu-compliant-plots/)

### Direct competitors

- [GrehYug](https://grehyug.com/)
- [GrehYug Products](https://grehyug.com/products)
- [GrehYug Drishti AI](https://grehyug.com/tools/dristi-ai)
- [Vaastu Bhav](https://vaastubhav.com/)
- [VastuAnalyzer](https://www.vastuanalyzer.com/)
- [VastuCheck.in](https://vastucheck.in/)
- [Vastu Zone Mapper](https://vastubyanchal.com/)
- [VastuIQ](https://vastuiq.com/)
- [360Ghar Design Blueprint](https://360ghar.com/design-blueprint)
- [Speak Arch Tools](https://speakarch.com/tools/)
- [Vaastu-AI (vastushastras.in)](https://vastushastras.in/)
- [Vasthu Plan — Google Play](https://play.google.com/store/apps/details?id=com.vaasthu.free&hl=en_IN)
- [Vastu Compass by AppliedVastu — Google Play](https://play.google.com/store/apps/details?id=com.appliedvastu.compass&hl=en_IN)
- [Foyr Neo Pricing](https://foyr.com/pricing/)
- [MagicBricks Property Services](https://www.magicbricks.com/property-services/)

### Consultant software / B2B pricing

- [Vastuteq](https://vastuteq.com/)
- [Vastu 360](https://vastu360.com/)
- [VastuGrid](https://vastugrid.com/)
- [AECORD — Vastu consultation cost India](https://aecord.com/blog/how-much-does-vastu-consultation-cost-india)
- [AlignAura Vastu Pricing](https://www.alignaura.in/pricing/)

### Guides / adjacent tools

- [Studio Matrx — AI Floor Plan Generator India guide](https://www.studiomatrx.org/guides/ai-floor-plan-generator)
- [Grihafy](https://www.grihafy.com/)
- [GharVaastu](https://www.gharvaastu.com/)
- [SpaceFlowMap AI](https://spaceflowmapai.com/)
- [Saral Vaastu](https://play.google.com/store/apps/details?hl=en_US&id=com.cgp.saral)

### Baseline research (from `Home-vastu-plan/market_research/`)

- `00_executive_summary.md` — prior verdict + 90-day hypothesis
- `30_competitors.md` — 14 global + 12 Indian + 10 Vastu app audit
- `40_monetization.md` — realistic ₹ pricing + revenue scenarios
- `80_feature_triage.md` — what to ship / what not to do
- `99_verdict.md` — final feasibility verdict

---

_Prepared by Harish's Research Engine · output/2026-07-10/vastuplan-market-dig.md_

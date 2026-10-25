#!/usr/bin/env node
// Mesure de vitesse et de qualité d'une page avec Google PageSpeed Insights.
//
//   node seo/scripts/pagespeed.mjs <url> [mobile|desktop]
//
// PAGESPEED_API_KEY est facultative (sans clé, Google limite le nombre d'appels).

const [url, strategy = "mobile"] = process.argv.slice(2);
if (!url) {
  console.error("usage : pagespeed.mjs <url> [mobile|desktop]");
  process.exit(1);
}

const params = new URLSearchParams({ url, strategy, locale: "fr" });
for (const c of ["performance", "seo", "accessibility", "best-practices"]) params.append("category", c);
if (process.env.PAGESPEED_API_KEY) params.set("key", process.env.PAGESPEED_API_KEY);

const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`);
const json = await res.json();
if (!res.ok) {
  console.error(`Erreur PageSpeed ${res.status} : ${json.error?.message ?? ""}`);
  process.exit(1);
}

const lh = json.lighthouseResult;
const score = (id) => Math.round((lh.categories[id]?.score ?? 0) * 100);
const metric = (id) => lh.audits[id]?.displayValue ?? null;

// Audits ratés, classés par gain estimé, pour savoir quoi corriger en premier.
const failing = Object.values(lh.audits)
  .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "notApplicable")
  .map((a) => ({ id: a.id, title: a.title, displayValue: a.displayValue ?? null, savingsMs: a.details?.overallSavingsMs ?? 0 }))
  .sort((a, b) => b.savingsMs - a.savingsMs)
  .slice(0, 15);

console.log(
  JSON.stringify(
    {
      url: lh.finalDisplayedUrl ?? url,
      strategy,
      scores: { performance: score("performance"), seo: score("seo"), accessibility: score("accessibility"), bestPractices: score("best-practices") },
      metrics: {
        lcp: metric("largest-contentful-paint"),
        cls: metric("cumulative-layout-shift"),
        tbt: metric("total-blocking-time"),
        fcp: metric("first-contentful-paint"),
      },
      fieldData: json.loadingExperience?.overall_category ?? "pas assez de visites pour des données réelles",
      failing,
    },
    null,
    2,
  ),
);

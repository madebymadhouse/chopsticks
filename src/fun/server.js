import express from "express";
import {
  clampIntensity,
  findVariants,
  listVariantStats,
  randomVariantId,
  renderFunVariant
} from "./variants.js";

const app = express();
const port = Number(process.env.FUNHUB_PORT || 8790);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "funhub", stats: listVariantStats() });
});

app.get("/api/fun/catalog", (req, res) => {
  const query = String(req.query.q || "");
  const limit = Math.min(25, Math.max(1, Number(req.query.limit || 20) || 20));
  const matches = findVariants(query, limit);
  res.json({ ok: true, query, total: listVariantStats().total, matches });
});

app.get("/api/fun/random", (req, res) => {
  const target = String(req.query.target || "guest");
  const intensity = clampIntensity(req.query.intensity || 3);
  const variantId = randomVariantId();
  const rendered = renderFunVariant({
    variantId,
    actorTag: String(req.query.actor || "funhub"),
    target,
    intensity
  });
  res.json({ ok: rendered.ok, variantId, ...rendered });
});

app.listen(port, () => {
  console.log(`[funhub] listening on :${port}`);
});

// Builds web/src/lib/world-dots.json: a dotted world map (equirectangular grid of points on land).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../web/package.json", import.meta.url));
const { geoContains } = require("d3-geo");
const { feature } = require("topojson-client");
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));
const land = feature(topo, topo.objects.land);
const dots = [];
const STEP = 2.4;
for (let lat = 78; lat >= -56; lat -= STEP)
  for (let lon = -170; lon <= 180; lon += STEP) if (geoContains(land, [lon, lat])) dots.push([Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]);
writeFileSync(new URL("../web/src/lib/world-dots.json", import.meta.url), JSON.stringify(dots));
console.log(dots.length, "dots");

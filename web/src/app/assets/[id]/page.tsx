import fs from "node:fs";
import path from "node:path";
import AssetPageView from "./view";

// Every asset page is pre-rendered, so the static demo (GitHub Pages) works without a server.
export function generateStaticParams() {
  const file = path.join(process.cwd(), "..", "data", "catalog", "assets.json");
  const assets = JSON.parse(fs.readFileSync(file, "utf8")) as { id: string }[];
  return assets.map((a) => ({ id: a.id.toLowerCase() }));
}

export default function AssetPage() {
  return <AssetPageView />;
}

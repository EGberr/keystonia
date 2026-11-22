import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

export const metadata = { title: "Under the hood · Keystonia" };

const SRC = path.join(process.cwd(), "..", "contracts", "src");
/** Returns the source of one Solidity function, read from the repository at build time. */
function excerpt(file: string, signature: string) {
  const src = fs.readFileSync(path.join(SRC, file), "utf8");
  const start = src.indexOf(signature);
  if (start < 0) return `// ${signature} not found`;
  let depth = 0;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}" && --depth === 0) return src.slice(start, i + 1).replace(/^ {4}/gm, "");
  }
  return src.slice(start);
}
const lines = (dir: string, ext: string) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .reduce((n, f) => n + fs.readFileSync(path.join(dir, f), "utf8").split("\n").length, 0);

const DECISIONS = [
  {
    title: "Compliance lives inside the token",
    text: "Every path a token can take (offering, exchange, plain transfer) ends in the token's _update hook. That single function checks the receiver's identity, country and the holder cap, so no route can bypass the rules.",
    file: "AssetToken.sol",
    sig: "function _update(address from, address to, uint256 value)",
  },
  {
    title: "Rent is paid without loops",
    text: "Paying 2,000 holders one by one would run out of gas. Instead the contract keeps one number, rent per token, and each holder's share is computed when they claim. Paying rent costs the same for 10 holders or 10,000.",
    file: "AssetToken.sol",
    sig: "function distributeIncome(uint256 amount, string calldata period)",
  },
  {
    title: "Votes count what you held before the proposal",
    text: "Voting power is read at a snapshot taken one second before a proposal opens. Buying tokens after that cannot change the result, which closes the classic flash-loan attack on governance.",
    file: "AssetGovernor.sol",
    sig: "function castVote(",
  },
  {
    title: "Offerings are all or nothing",
    text: "Money sits in the offering contract until the sale settles. If the target is missed, every investor withdraws exactly what they paid. Nobody, including the operator, can touch the escrow.",
    file: "Offering.sol",
    sig: "function refund()",
  },
];

export default function TechPage() {
  const sol = lines(SRC, ".sol");
  const tests = lines(path.join(SRC, "..", "test"), ".sol");
  const stats: [string, string][] = [
    [String(fs.readdirSync(SRC).filter((f) => f.endsWith(".sol")).length), "smart contracts"],
    [sol.toLocaleString("en-GB"), "lines of Solidity"],
    ["40", "Foundry tests"],
    ["96.9%", "line coverage"],
  ];
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8">
      <p className="label mb-3">Under the hood</p>
      <h1 className="font-display max-w-4xl text-[44px] leading-[0.98] tracking-[-0.04em] sm:text-[72px]">The rules are code. Here it is.</h1>
      <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
        The live demo simulates transactions in your browser so anyone can try it. The contracts below are the real ones: they run on a local chain, are covered by {tests.toLocaleString("en-GB")} lines of tests, and can be deployed to a public test network with one command.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border hairline bg-line lg:grid-cols-4">
        {stats.map(([v, k]) => (
          <div key={k} className="bg-bg p-6">
            <p className="font-display text-[clamp(34px,4.4vw,60px)] leading-none tracking-[-0.04em] text-accent">{v}</p>
            <p className="mt-3 text-[13px] text-muted">{k}</p>
          </div>
        ))}
      </div>
      <div className="mt-16 space-y-14">
        {DECISIONS.map((d, i) => (
          <section key={d.title} className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="num text-[13px] text-accent">0{i + 1}</p>
              <h2 className="font-display mt-3 text-[32px] leading-[1.02] tracking-[-0.03em]">{d.title}</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{d.text}</p>
              <a href={`https://github.com/EGberr/keystonia/blob/main/contracts/src/${d.file}`} target="_blank" rel="noreferrer" className="mt-4 inline-block text-[13px] text-accent underline underline-offset-4">
                {d.file} on GitHub
              </a>
            </div>
            <pre className="scroll-thin card max-h-[420px] overflow-auto p-5 font-mono text-[12px] leading-[1.65] text-ink-2">
              <code>{excerpt(d.file, d.sig)}</code>
            </pre>
          </section>
        ))}
      </div>
      <div className="mt-16 flex flex-wrap gap-3">
        <a href="https://github.com/EGberr/keystonia" target="_blank" rel="noreferrer" className="rounded-full bg-accent px-5 py-3 text-[14px] font-medium text-white">
          Read the code on GitHub
        </a>
        <Link href="/transparency" className="rounded-full border hairline px-5 py-3 text-[14px]">
          Contract addresses and demo controls
        </Link>
      </div>
    </div>
  );
}

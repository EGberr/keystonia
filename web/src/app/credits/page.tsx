import credits from "../../../public/img/credits.json";

type Credit = { file: string; title: string; creator: string | null; license: string; license_url: string; source: string; url: string };

export const metadata = { title: "Photo credits · Keystonia" };

export default function CreditsPage() {
  const list = Object.values(credits as unknown as Record<string, Credit>);
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12 sm:px-8">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-accent-ink">Credits</p>
      <h1 className="font-serif text-[44px] leading-tight tracking-tight">Photo credits</h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2">
        All assets on Keystonia are fictional. Photos are openly licensed images found through the Openverse API and are used for illustration only; they do not depict the
        fictional properties. Market references come from open data: DVF (data.gouv.fr, Licence Ouverte 2.0) and HM Land Registry Price Paid Data (OGL v3.0). Map tiles © OpenStreetMap contributors.
      </p>
      <ul className="mt-8 divide-y divide-line text-[13px]">
        {list.map((c) => (
          <li key={c.file} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
            <span className="num w-56 shrink-0 text-[11.5px] text-muted">{c.file}</span>
            <a href={c.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">{c.title}</a>
            <span className="text-ink-2">{c.creator ?? "Unknown author"}</span>
            <a href={c.license_url} target="_blank" rel="noreferrer" className="text-accent-ink hover:underline">{c.license}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

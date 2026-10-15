import type { ReactNode } from "react";
import Footer from "@/components/Footer";

export type LegalSection = {
  title: string;
  body: ReactNode;
};

// Shared layout for the public legal pages (/terms, /privacy, /accessibility):
// a numbered list of sections, with the footer linking between them.
export default function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 sm:py-16">
        <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <header className="border-b border-slate-200 pb-6">
            <p className="text-sm font-medium text-indigo-600">I R Sidurim</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
            {intro && <p className="mt-4 leading-relaxed text-slate-600">{intro}</p>}
          </header>

          <ol className="mt-8 space-y-8">
            {sections.map((section, i) => (
              <li key={section.title}>
                <section aria-labelledby={`section-${i + 1}`}>
                  <h2
                    id={`section-${i + 1}`}
                    className="flex items-baseline gap-3 text-xl font-semibold text-slate-900"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-base text-indigo-700">
                      {i + 1}
                    </span>
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-3 pr-11 leading-relaxed text-slate-700">
                    {section.body}
                  </div>
                </section>
              </li>
            ))}
          </ol>
        </article>
      </main>
      <Footer />
    </>
  );
}

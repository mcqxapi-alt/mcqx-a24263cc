import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, BookOpen, Zap, Target, Link2 } from "lucide-react";

const RichText = lazy(() => import("@/components/RichText").then(m => ({ default: m.RichText })));

const SITE = "https://mcqx.lovable.app";

interface SeoPage {
  id: string;
  chapter_id: string;
  slug: string;
  board_name: string;
  class_name: string;
  subject_name: string;
  chapter_name: string;
  title: string;
  meta_description: string;
  intro_md: string;
  faq: Array<{ q: string; a: string }>;
  question_ids: string[];
}

interface PreviewQ {
  id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface RelatedPage {
  slug: string;
  chapter_name: string;
}

export default function LearnChapter() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<SeoPage | null>(null);
  const [questions, setQuestions] = useState<PreviewQ[]>([]);
  const [prev, setPrev] = useState<RelatedPage | null>(null);
  const [next, setNext] = useState<RelatedPage | null>(null);
  const [related, setRelated] = useState<RelatedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_seo_page", { p_slug: slug });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) { setNotFound(true); setLoading(false); return; }
      setPage({ ...row, faq: Array.isArray(row.faq) ? row.faq : [] } as unknown as SeoPage);
      if (row.question_ids?.length) {
        const { data: qs } = await supabase.rpc("get_questions_by_ids", { p_question_ids: row.question_ids });
        setQuestions((qs ?? []).slice(0, 5) as PreviewQ[]);
      }

      // Fetch sibling chapters in same board/class/subject for internal linking
      const { data: siblings } = await supabase
        .from("seo_pages")
        .select("slug, chapter_name")
        .eq("published", true)
        .eq("board_name", row.board_name)
        .eq("class_name", row.class_name)
        .eq("subject_name", row.subject_name)
        .order("chapter_name", { ascending: true })
        .limit(200);
      if (siblings && siblings.length) {
        const idx = siblings.findIndex(s => s.slug === row.slug);
        setPrev(idx > 0 ? siblings[idx - 1] : null);
        setNext(idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null);
        setRelated(siblings.filter(s => s.slug !== row.slug).slice(0, 8));
      }

      setLoading(false);
      // Fire-and-forget view counter
      supabase.rpc("increment_seo_view", { p_slug: slug }).then(() => {});
    })();
  }, [slug]);

  if (notFound) return <Navigate to="/404" replace />;
  if (loading || !page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const canonical = `${SITE}/learn/${page.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${page.chapter_name} — ${page.board_name} ${page.class_name} ${page.subject_name}`,
    description: page.meta_description,
    provider: { "@type": "Organization", name: "MCQX", url: SITE },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.meta_description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.meta_description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.title} />
        <meta name="twitter:description" content={page.meta_description} />
        <script type="application/ld+json">{JSON.stringify(courseLd)}</script>
        {page.faq.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        )}
      </Helmet>

      <main className="container max-w-3xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">MCQX</Link>
          <ChevronRight className="w-3 h-3" />
          <span>{page.board_name}</span>
          <ChevronRight className="w-3 h-3" />
          <span>{page.class_name}</span>
          <ChevronRight className="w-3 h-3" />
          <span>{page.subject_name}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{page.chapter_name}</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-primary mb-2">
            {page.board_name} · {page.class_name} · {page.subject_name}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {page.chapter_name} — MCQs &amp; Practice
          </h1>
          <p className="text-base text-muted-foreground">{page.meta_description}</p>
        </header>

        <Link to={`/practice?utm_source=seo&utm_medium=learn&utm_campaign=${page.slug}`}>
          <Button size="lg" className="w-full md:w-auto mb-10">
            <Zap className="w-4 h-4 mr-2" /> Practice {page.chapter_name} MCQs
          </Button>
        </Link>

        {/* Intro */}
        <section className="prose prose-invert max-w-none mb-12">
          {page.intro_md.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="text-foreground/90 leading-relaxed">{p.trim()}</p>
          ))}
        </section>

        {/* Sample questions */}
        {questions.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Sample Questions
            </h2>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <Card key={q.id} className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-xs font-mono text-primary mt-1">Q{idx + 1}</span>
                    <div className="flex-1 font-medium">
                      <Suspense fallback={<span>{q.text}</span>}><RichText text={q.text} /></Suspense>
                    </div>
                  </div>
                  <ol className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground pl-7">
                    {[q.option_a, q.option_b, q.option_c, q.option_d].map((opt, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-mono">{String.fromCharCode(65 + i)}.</span>
                        <Suspense fallback={<span>{opt}</span>}><RichText text={opt} /></Suspense>
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>
            <Link to={`/practice?utm_source=seo&utm_medium=learn_after_samples&utm_campaign=${page.slug}`}>
              <Button variant="outline" className="mt-4">
                <Target className="w-4 h-4 mr-2" /> Get instant feedback — start practising
              </Button>
            </Link>
          </section>
        )}

        {/* FAQ */}
        {page.faq.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Frequently asked questions</h2>
            <div className="space-y-4">
              {page.faq.map((f, i) => (
                <Card key={i} className="p-5">
                  <h3 className="font-semibold mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Prev / Next chapter navigation */}
        {(prev || next) && (
          <nav className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10" aria-label="Chapter navigation">
            {prev ? (
              <Link to={`/learn/${prev.slug}`} className="block">
                <Card className="p-4 hover:border-primary transition-colors h-full">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <ChevronLeft className="w-3 h-3" /> Previous chapter
                  </p>
                  <p className="font-semibold">{prev.chapter_name}</p>
                </Card>
              </Link>
            ) : <div />}
            {next ? (
              <Link to={`/learn/${next.slug}`} className="block md:text-right">
                <Card className="p-4 hover:border-primary transition-colors h-full">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 md:justify-end mb-1">
                    Next chapter <ChevronRight className="w-3 h-3" />
                  </p>
                  <p className="font-semibold">{next.chapter_name}</p>
                </Card>
              </Link>
            ) : <div />}
          </nav>
        )}

        {/* Related chapters from the same subject */}
        {related.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" /> More {page.subject_name} chapters · {page.class_name}
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {related.map(r => (
                <li key={r.slug}>
                  <Link
                    to={`/learn/${r.slug}`}
                    className="block p-3 rounded-md border border-border hover:border-primary hover:bg-accent/30 transition-colors text-sm"
                  >
                    {r.chapter_name} MCQs
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="text-center border-t border-border pt-8 mt-12">
          <p className="text-sm text-muted-foreground mb-3">Ready to test yourself?</p>
          <Link to={`/practice?utm_source=seo&utm_medium=learn_footer&utm_campaign=${page.slug}`}>
            <Button size="lg">Start free practice</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

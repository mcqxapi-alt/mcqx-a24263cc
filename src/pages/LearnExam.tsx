import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Zap, BookOpen, Target } from "lucide-react";

const SITE = "https://mcqx.lovable.app";

interface ExamPage {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  intro_md: string;
  syllabus_md: string;
  faq: Array<{ q: string; a: string }>;
  question_ids: string[];
  language: string;
  published: boolean;
}

interface ExamTarget {
  name: string;
  region: string | null;
  language: string;
}

export default function LearnExam() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<ExamPage | null>(null);
  const [target, setTarget] = useState<ExamTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: row, error } = await supabase
        .from("exam_pages")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error || !row) { setNotFound(true); setLoading(false); return; }
      setPage({ ...row, faq: Array.isArray(row.faq) ? row.faq as Array<{q:string;a:string}> : [] } as ExamPage);

      const { data: t } = await supabase
        .from("exam_targets")
        .select("name, region, language")
        .eq("id", row.exam_id)
        .maybeSingle();
      if (t) setTarget(t as ExamTarget);

      setLoading(false);
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

  const canonical = `${SITE}/exam/${page.slug}`;
  const hreflang = page.language === "hi" ? "hi-IN" : page.language === "ta" ? "ta-IN" : page.language === "bn" ? "bn-IN" : "en-IN";

  const faqLd = page.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: page.title,
    description: page.meta_description,
    inLanguage: hreflang,
    provider: { "@type": "Organization", name: "MCQX", url: SITE },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <html lang={page.language} />
        <title>{page.title}</title>
        <meta name="description" content={page.meta_description} />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang={hreflang} href={canonical} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.meta_description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(courseLd)}</script>
        {faqLd && <script type="application/ld+json">{JSON.stringify(faqLd)}</script>}
      </Helmet>

      <main className="container max-w-3xl mx-auto px-4 py-10">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">MCQX</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Exams</span>
          {target?.region && <><ChevronRight className="w-3 h-3" /><span>{target.region}</span></>}
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{target?.name ?? page.slug}</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-primary mb-2">
            Free MCQ practice {target?.region ? `· ${target.region}` : ""}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{target?.name ?? page.title}</h1>
          <p className="text-base text-muted-foreground">{page.meta_description}</p>
        </header>

        <Link to={`/practice?utm_source=seo&utm_medium=exam&utm_campaign=${page.slug}`}>
          <Button size="lg" className="w-full md:w-auto mb-10">
            <Zap className="w-4 h-4 mr-2" /> Start free practice
          </Button>
        </Link>

        <section className="prose prose-invert max-w-none mb-12">
          {page.intro_md.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="text-foreground/90 leading-relaxed">{p.trim()}</p>
          ))}
        </section>

        {page.syllabus_md && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Syllabus
            </h2>
            <div className="prose prose-invert max-w-none">
              {page.syllabus_md.split(/\n{2,}/).map((p, i) => (
                <p key={i} className="text-foreground/90 leading-relaxed">{p.trim()}</p>
              ))}
            </div>
          </section>
        )}

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

        <div className="text-center border-t border-border pt-8 mt-12">
          <p className="text-sm text-muted-foreground mb-3">Ready to start?</p>
          <Link to={`/practice?utm_source=seo&utm_medium=exam_footer&utm_campaign=${page.slug}`}>
            <Button size="lg"><Target className="w-4 h-4 mr-2" />Practice MCQs free</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

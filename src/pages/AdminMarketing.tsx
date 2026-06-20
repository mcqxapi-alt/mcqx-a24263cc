import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Play, ArrowLeft, Sparkles, TrendingUp, TrendingDown, Target, Users, Zap, Check, X, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

type Decision = {
  id: string;
  run_date: string;
  reasoning: string | null;
  metrics_snapshot: any;
  actions: any[];
  status: string;
  triggered_by: string;
  created_at: string;
};

type Content = {
  id: string;
  decision_id: string | null;
  type: string;
  channel: string | null;
  title: string | null;
  body: string;
  metadata: any;
  status: string;
  created_at: string;
};

type ExamTarget = {
  id: string;
  slug: string;
  name: string;
  language: string;
  region: string | null;
  tier: number;
  annual_aspirants: number | null;
  status: string;
  quality_score: number | null;
  word_count: number | null;
  mcq_count: number | null;
  last_quality_check: string | null;
};

export default function AdminMarketing() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminCheck();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: target } = useQuery({
    queryKey: ["amm-target"],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("amm_targets")
        .select("*")
        .eq("month", monthStart.toISOString().slice(0, 10))
        .eq("metric", "signups")
        .maybeSingle();
      return data;
    },
    enabled: !!isAdmin,
  });

  const { data: monthSignups = 0 } = useQuery({
    queryKey: ["amm-signups-month"],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString());
      return count ?? 0;
    },
    enabled: !!isAdmin,
  });

  const { data: decisions = [], isLoading: decLoading } = useQuery({
    queryKey: ["amm-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("amm_decisions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Decision[];
    },
    enabled: !!isAdmin,
  });

  const { data: content = [] } = useQuery({
    queryKey: ["amm-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("amm_content")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Content[];
    },
    enabled: !!isAdmin,
  });

  const updateContentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("amm_content").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["amm-content"] });
      toast({ title: "Updated" });
    },
  });

  const runCycle = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("amm-daily-cycle", { body: {} });
      if (error) throw error;
      toast({ title: "AMM cycle complete", description: `${data?.action_count ?? 0} actions queued` });
      qc.invalidateQueries({ queryKey: ["amm-decisions"] });
      qc.invalidateQueries({ queryKey: ["amm-content"] });
    } catch (e: any) {
      toast({ title: "Cycle failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const [seoRunning, setSeoRunning] = useState(false);
  const runSeo = async () => {
    setSeoRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("amm-generate-seo-page", { body: { batch_size: 5 } });
      if (error) throw error;
      const okCount = (data?.results ?? []).filter((r: any) => r.ok).length;
      toast({ title: "SEO pages generated", description: `${okCount} new landing pages live` });
    } catch (e: any) {
      toast({ title: "SEO generation failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSeoRunning(false);
    }
  };

  const [gscRunning, setGscRunning] = useState(false);
  const runGsc = async () => {
    setGscRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("amm-gsc-submit", { body: {} });
      if (error) throw error;
      toast({ title: "Submitted to Google", description: `Sitemap + IndexNow pinged for ${data?.steps?.find?.((s: any) => s.step === "fresh_urls")?.count ?? 0} fresh URLs` });
    } catch (e: any) {
      toast({ title: "GSC submit failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setGscRunning(false);
    }
  };

  const [krRunning, setKrRunning] = useState(false);
  const runKeywordRank = async () => {
    setKrRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("amm-keyword-rank", { body: { limit: 20 } });
      if (error) throw error;
      toast({ title: "Keyword research done", description: `${data?.count ?? 0} chapters ranked by search volume` });
    } catch (e: any) {
      toast({ title: "Keyword research failed", description: e?.message ?? "Link Semrush connector first", variant: "destructive" });
    } finally {
      setKrRunning(false);
    }
  };

  const { data: examTargets = [] } = useQuery({
    queryKey: ["exam-targets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_targets")
        .select("*")
        .order("tier", { ascending: true })
        .order("annual_aspirants", { ascending: false });
      if (error) throw error;
      return data as ExamTarget[];
    },
    enabled: !!isAdmin,
  });

  const [genId, setGenId] = useState<string | null>(null);
  const generateExam = async (examId: string) => {
    setGenId(examId);
    try {
      const { data, error } = await supabase.functions.invoke("amm-generate-exam-page", { body: { exam_id: examId } });
      if (error) throw error;
      if (data?.gate_passed) {
        toast({ title: "Draft generated — ready for review", description: `Score ${data.quality_score}/100 · ${data.word_count} words · ${data.mcq_count} MCQs` });
      } else {
        toast({
          title: "Draft saved — quality gate NOT passed",
          description: (data?.gate_reasons ?? []).join(" · ") || "Fix issues then regenerate",
          variant: "destructive",
        });
      }
      qc.invalidateQueries({ queryKey: ["exam-targets"] });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setGenId(null);
    }
  };

  const publishExam = useMutation({
    mutationFn: async (exam: ExamTarget) => {
      if (exam.status !== "ready_for_review") throw new Error("Quality gate must pass first");
      const { error: pErr } = await supabase.from("exam_pages").update({ published: true }).eq("slug", exam.slug);
      if (pErr) throw pErr;
      const { error: tErr } = await supabase.from("exam_targets").update({ status: "published" }).eq("id", exam.id);
      if (tErr) throw tErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam-targets"] });
      toast({ title: "Published live", description: "Page is now indexable. Sitemap updates on next deploy." });
    },
    onError: (e: any) => toast({ title: "Publish failed", description: e?.message, variant: "destructive" }),
  });

  const unpublishExam = useMutation({
    mutationFn: async (exam: ExamTarget) => {
      await supabase.from("exam_pages").update({ published: false }).eq("slug", exam.slug);
      await supabase.from("exam_targets").update({ status: "ready_for_review" }).eq("id", exam.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam-targets"] });
      toast({ title: "Unpublished" });
    },
  });

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const goal = target?.goal ?? 500;
  const pct = Math.min(100, Math.round((monthSignups / goal) * 100));
  const now = new Date();
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getDate();
  const daysElapsed = now.getUTCDate();
  const runRate = monthSignups / Math.max(1, daysElapsed);
  const projected = Math.round(runRate * daysInMonth);
  const onTrack = projected >= goal;

  return (
    <div className="min-h-screen gradient-mesh-animated">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border/30">
        <div className="container max-w-6xl flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
            </Button>
            <h1 className="font-display text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Marketing Cockpit
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={runKeywordRank} disabled={krRunning} variant="outline" size="sm">
              {krRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
              Rank keywords
            </Button>
            <Button onClick={runSeo} disabled={seoRunning} variant="outline" size="sm">
              {seoRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate SEO pages
            </Button>
            <Button onClick={runGsc} disabled={gscRunning} variant="outline" size="sm">
              {gscRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Submit to Google
            </Button>
            <Button onClick={runCycle} disabled={running} variant="neon" size="sm">
              {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Run AMM now
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl px-4 py-8 space-y-8">
        {/* North star */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" /> Monthly signup goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <div className="text-5xl font-display font-bold">
                    {monthSignups}<span className="text-muted-foreground text-3xl"> / {goal}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Day {daysElapsed} of {daysInMonth} · {runRate.toFixed(1)}/day run rate
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={onTrack ? "default" : "destructive"} className="text-sm">
                    {onTrack ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    Projected EOM: {projected}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {onTrack ? `+${projected - goal} above goal` : `${goal - projected} short`}
                  </div>
                </div>
              </div>
              <Progress value={pct} className="h-3" />
            </CardContent>
          </Card>
        </motion.section>

        {/* Latest decision */}
        <section>
          <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Latest AI decision
          </h2>
          {decLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : decisions.length === 0 ? (
            <Card className="glass"><CardContent className="py-8 text-center text-muted-foreground">
              No decisions yet. Click <strong>Run AMM now</strong> to generate the first action plan.
            </CardContent></Card>
          ) : (
            <Card className="glass">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{decisions[0].triggered_by}</Badge>
                    <Badge variant="secondary">{decisions[0].status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(decisions[0].created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed mb-4">{decisions[0].reasoning || <em className="text-muted-foreground">No reasoning recorded.</em>}</p>
                <div className="grid sm:grid-cols-4 gap-2 text-xs">
                  {Object.entries(decisions[0].metrics_snapshot ?? {}).filter(([k]) => ["signups_24h", "sessions_24h", "run_rate_per_day", "gap_to_goal"].includes(k)).map(([k, v]) => (
                    <div key={k} className="glass rounded-lg p-2">
                      <div className="text-muted-foreground">{k.replace(/_/g, " ")}</div>
                      <div className="font-bold">{String(v)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Content queue */}
        <section>
          <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Action queue
          </h2>
          {content.length === 0 ? (
            <Card className="glass"><CardContent className="py-8 text-center text-muted-foreground text-sm">
              No drafts yet.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {content.map((c) => (
                <Card key={c.id} className="glass">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{c.type}</Badge>
                        {c.channel && <Badge variant="secondary">{c.channel}</Badge>}
                        <Badge variant={c.status === "published" ? "default" : c.status === "rejected" ? "destructive" : "outline"}>
                          {c.status}
                        </Badge>
                      </div>
                      {c.status === "draft" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => updateContentStatus.mutate({ id: c.id, status: "scheduled" })}>
                            <Check className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateContentStatus.mutate({ id: c.id, status: "rejected" })}>
                            <X className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    {c.title && <div className="font-semibold text-sm mb-1">{c.title}</div>}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* History */}
        {decisions.length > 1 && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3">History</h2>
            <div className="space-y-2">
              {decisions.slice(1).map((d) => (
                <Card key={d.id} className="glass">
                  <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
                      <span className="mx-2">·</span>
                      <span>{(d.actions ?? []).length} actions</span>
                    </div>
                    <Badge variant="outline">{d.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Edit, Flag, Loader2 } from "lucide-react";
import mcqxLogo from "@/assets/mcqx-logo.png";

type ReportWithQuestion = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  question_id: string;
  user_id: string | null;
  question: {
    id: string;
    text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: number;
    explanation: string | null;
    source: string;
    status: string;
  } | null;
};

export default function AdminReview() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminCheck();
  const queryClient = useQueryClient();

  const [editingQuestion, setEditingQuestion] = useState<ReportWithQuestion | null>(null);
  const [editForm, setEditForm] = useState({
    text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: 1,
    explanation: "",
  });

  // Fetch all pending reports with their questions
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          id,
          reason,
          status,
          created_at,
          question_id,
          user_id
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch questions separately
      const questionIds = data.map(r => r.question_id);
      const { data: questions, error: qError } = await supabase
        .from("questions")
        .select("*")
        .in("id", questionIds);

      if (qError) throw qError;

      const questionsMap = new Map(questions?.map(q => [q.id, q]) || []);
      
      return data.map(report => ({
        ...report,
        question: questionsMap.get(report.question_id) || null,
      })) as ReportWithQuestion[];
    },
    enabled: isAdmin,
  });

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ questionId, updates }: { questionId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("questions")
        .update(updates)
        .eq("id", questionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Question updated successfully" });
      setEditingQuestion(null);
    },
    onError: (error) => {
      toast({ title: "Failed to update question", description: error.message, variant: "destructive" });
    },
  });

  // Resolve report mutation
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Report resolved" });
    },
    onError: (error) => {
      toast({ title: "Failed to resolve report", description: error.message, variant: "destructive" });
    },
  });

  // Promote to verified mutation
  const promoteToVerifiedMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from("questions")
        .update({ source: "verified" })
        .eq("id", questionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Question promoted to verified bank" });
    },
    onError: (error) => {
      toast({ title: "Failed to promote question", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (report: ReportWithQuestion) => {
    if (!report.question) return;
    setEditingQuestion(report);
    setEditForm({
      text: report.question.text,
      option_a: report.question.option_a,
      option_b: report.question.option_b,
      option_c: report.question.option_c,
      option_d: report.question.option_d,
      correct_answer: report.question.correct_answer,
      explanation: report.question.explanation || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingQuestion?.question) return;
    updateQuestionMutation.mutate({
      questionId: editingQuestion.question.id,
      updates: editForm,
    });
  };

  // Loading states
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Please log in to access this page.</p>
        <Button onClick={() => navigate("/login")}>Go to Login</Button>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={mcqxLogo} alt="MCQX Logo" className="h-20 sm:h-28 w-auto rounded-lg" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Review</h1>
                <p className="text-sm text-muted-foreground">Manage reported questions</p>
              </div>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              <Flag className="h-3 w-3 mr-1" />
              {reports.length} Pending
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {reportsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
              <p className="text-muted-foreground">No pending reports to review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => (
              <Card key={report.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Reported Question</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Reported on {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={report.question?.source === "verified" ? "default" : "secondary"}>
                      {report.question?.source || "unknown"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Report Reason */}
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-destructive mb-1">Report Reason:</p>
                    <p className="text-sm">{report.reason}</p>
                  </div>

                  {/* Question Details */}
                  {report.question && (
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium mb-2">{report.question.text}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {["A", "B", "C", "D"].map((letter, idx) => {
                            const optionKey = `option_${letter.toLowerCase()}` as keyof typeof report.question;
                            const isCorrect = report.question!.correct_answer === idx + 1;
                            return (
                              <div
                                key={letter}
                                className={`p-3 rounded-lg border ${
                                  isCorrect
                                    ? "bg-green-500/10 border-green-500/30"
                                    : "bg-muted/30 border-border"
                                }`}
                              >
                                <span className="font-medium mr-2">{letter}.</span>
                                {report.question![optionKey]}
                                {isCorrect && (
                                  <Badge className="ml-2 bg-green-500">Correct</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {report.question.explanation && (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <p className="text-sm font-medium mb-1">Explanation:</p>
                          <p className="text-sm text-muted-foreground">{report.question.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => openEditDialog(report)}
                      disabled={!report.question}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Question
                    </Button>
                    {report.question?.source !== "verified" && (
                      <Button
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-600/10"
                        onClick={() => promoteToVerifiedMutation.mutate(report.question!.id)}
                        disabled={!report.question || promoteToVerifiedMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Promote to Verified
                      </Button>
                    )}
                    <Button
                      variant="default"
                      onClick={() => resolveReportMutation.mutate({ reportId: report.id, status: "resolved" })}
                      disabled={resolveReportMutation.isPending}
                    >
                      Mark Resolved
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => resolveReportMutation.mutate({ reportId: report.id, status: "dismissed" })}
                      disabled={resolveReportMutation.isPending}
                    >
                      Dismiss Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Question Text</label>
              <Textarea
                value={editForm.text}
                onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {["A", "B", "C", "D"].map((letter) => {
                const key = `option_${letter.toLowerCase()}` as keyof typeof editForm;
                return (
                  <div key={letter}>
                    <label className="text-sm font-medium">Option {letter}</label>
                    <Input
                      value={editForm[key] as string}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                );
              })}
            </div>
            <div>
              <label className="text-sm font-medium">Correct Answer</label>
              <Select
                value={String(editForm.correct_answer)}
                onValueChange={(v) => setEditForm({ ...editForm, correct_answer: Number(v) })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">A</SelectItem>
                  <SelectItem value="2">B</SelectItem>
                  <SelectItem value="3">C</SelectItem>
                  <SelectItem value="4">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Explanation</label>
              <Textarea
                value={editForm.explanation}
                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateQuestionMutation.isPending}>
              {updateQuestionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

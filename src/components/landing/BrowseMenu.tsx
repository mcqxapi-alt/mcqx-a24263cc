import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, ChevronRight, ChevronDown, GraduationCap, 
  Trophy, MapPin, Loader2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Board {
  id: string;
  name: string;
  type: string;
  icon: string;
  display_order: number;
}

interface ClassRecord {
  id: string;
  board_id: string;
  name: string;
  display_order: number;
}

interface Subject {
  id: string;
  name: string;
  icon: string;
  class_id: string | null;
}

const tabConfig = [
  { value: "board", label: "Board Exams", icon: GraduationCap },
  { value: "competitive", label: "Competitive", icon: Trophy },
  { value: "state", label: "State Boards", icon: MapPin },
];

export function BrowseMenu() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBoard, setExpandedBoard] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAll() {
      const [boardsRes, classesRes, subjectsRes] = await Promise.all([
        supabase.from("boards").select("*").order("display_order"),
        supabase.from("classes").select("*").order("display_order"),
        supabase.from("subjects").select("id, name, icon, class_id").order("display_order"),
      ]);
      if (boardsRes.data) setBoards(boardsRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data as Subject[]);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const boardsByType = (type: string) => boards.filter((b) => b.type === type);
  const classesForBoard = (boardId: string) => classes.filter((c) => c.board_id === boardId);
  const subjectsForClass = (classId: string) => subjects.filter((s) => s.class_id === classId);

  const handleSubjectClick = (subjectId: string) => {
    navigate(`/practice?subject=${subjectId}`);
  };

  const toggleBoard = (boardId: string) => {
    if (expandedBoard === boardId) {
      setExpandedBoard(null);
      setExpandedClass(null);
    } else {
      setExpandedBoard(boardId);
      setExpandedClass(null);
    }
  };

  const toggleClass = (classId: string) => {
    setExpandedClass(expandedClass === classId ? null : classId);
  };

  if (loading) {
    return (
      <section className="py-12 sm:py-16 px-4">
        <div className="container flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 px-4">
      <div className="container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Explore & <span className="neon-text">Practice</span>
          </h2>
          <p className="text-muted-foreground text-sm">
            Choose your board, class, and subject
          </p>
        </motion.div>

        <Tabs defaultValue="board" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-secondary/50 backdrop-blur-sm border border-border/30 h-12">
            {tabConfig.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabConfig.map((tab) => {
            const typeBoards = boardsByType(tab.value);
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {typeBoards.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 glass rounded-2xl"
                  >
                    <tab.icon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Coming soon! We're adding {tab.label.toLowerCase()} content.
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {typeBoards.map((board) => {
                      const isExpanded = expandedBoard === board.id;
                      const boardClasses = classesForBoard(board.id);

                      return (
                        <motion.div
                          key={board.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass rounded-2xl overflow-hidden border border-border/30"
                        >
                          {/* Board header */}
                          <button
                            onClick={() => toggleBoard(board.id)}
                            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-secondary/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-primary" />
                              </div>
                              <div className="text-left">
                                <h3 className="font-display font-semibold text-base">
                                  {board.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {boardClasses.length} classes available
                                </p>
                              </div>
                            </div>
                            <motion.div
                              animate={{ rotate: isExpanded ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </motion.div>
                          </button>

                          {/* Classes list */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 space-y-2">
                                  {boardClasses.map((cls) => {
                                    const isClassExpanded = expandedClass === cls.id;
                                    const classSubjects = subjectsForClass(cls.id);

                                    return (
                                      <div key={cls.id}>
                                        <button
                                          onClick={() => toggleClass(cls.id)}
                                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/40 transition-colors"
                                        >
                                          <div className="flex items-center gap-2">
                                            <GraduationCap className="w-4 h-4 text-accent" />
                                            <span className="font-medium text-sm">
                                              {cls.name}
                                            </span>
                                            {classSubjects.length > 0 && (
                                              <span className="text-xs text-muted-foreground">
                                                ({classSubjects.length} subjects)
                                              </span>
                                            )}
                                          </div>
                                          <motion.div
                                            animate={{ rotate: isClassExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                          </motion.div>
                                        </button>

                                        {/* Subjects grid */}
                                        <AnimatePresence>
                                          {isClassExpanded && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.25 }}
                                              className="overflow-hidden"
                                            >
                                              {classSubjects.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-4">
                                                  No subjects added yet. Coming soon!
                                                </p>
                                              ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                                                  {classSubjects.map((subject, i) => (
                                                    <motion.button
                                                      key={subject.id}
                                                      initial={{ opacity: 0, scale: 0.9 }}
                                                      animate={{ opacity: 1, scale: 1 }}
                                                      transition={{ delay: i * 0.04 }}
                                                      whileHover={{ scale: 1.04, y: -2 }}
                                                      whileTap={{ scale: 0.96 }}
                                                      onClick={() => handleSubjectClick(subject.id)}
                                                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary/30 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all group"
                                                    >
                                                      <span className="text-2xl group-hover:scale-110 transition-transform">
                                                        {subject.icon}
                                                      </span>
                                                      <span className="text-xs font-medium text-center leading-tight group-hover:text-primary transition-colors">
                                                        {subject.name}
                                                      </span>
                                                    </motion.button>
                                                  ))}
                                                </div>
                                              )}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}

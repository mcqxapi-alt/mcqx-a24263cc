import { useState } from "react";
import { Share2, MessageCircle, Linkedin, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

type ShareScoreButtonProps = {
  score: number;
  totalQuestions: number;
  accuracy: number;
  subjectName: string;
  chapterName: string;
};

export function ShareScoreButton({
  score,
  totalQuestions,
  accuracy,
  subjectName,
  chapterName,
}: ShareScoreButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getEmoji = () => {
    if (accuracy >= 90) return "🔥";
    if (accuracy >= 70) return "⚡";
    if (accuracy >= 50) return "💪";
    return "📚";
  };

  const getFlexMessage = () => {
    if (accuracy === 100) return "Perfect score, no cap! 💯";
    if (accuracy >= 90) return "Absolutely cooked this quiz! 🔥";
    if (accuracy >= 70) return "Pretty solid run tbh 😎";
    if (accuracy >= 50) return "Not bad, warming up! 💪";
    return "Just getting started! 📈";
  };

  const shareMessage = `${getEmoji()} I just scored ${score}/${totalQuestions} (${accuracy}%) on MCQX!

📖 Subject: ${subjectName}
📚 Chapter: ${chapterName}

${getFlexMessage()}

Think you can beat me? 👀
https://mcqx.lovable.app/practice`;

  const handleWhatsAppShare = () => {
    const encodedMessage = encodeURIComponent(shareMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
    setOpen(false);
  };

  const handleLinkedInShare = () => {
    // LinkedIn share URL with pre-filled text
    const linkedInMessage = `${getEmoji()} Just scored ${score}/${totalQuestions} (${accuracy}%) on MCQX practicing ${subjectName} - ${chapterName}! ${getFlexMessage()} #MCQX #Learning #CBSE`;
    const encodedMessage = encodeURIComponent(linkedInMessage);
    const url = encodeURIComponent("https://mcqx.lovable.app/practice");
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${encodedMessage}`,
      "_blank"
    );
    setOpen(false);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Share2 className="w-4 h-4" />
        Share Score
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <Share2 className="w-5 h-5 text-primary" />
              Flex Your Score 💪
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Preview Card */}
            <div className="glass rounded-xl p-4 text-sm space-y-2 bg-secondary/30">
              <div className="flex items-center gap-2 text-lg font-bold">
                <span>{getEmoji()}</span>
                <span>
                  {score}/{totalQuestions} ({accuracy}%)
                </span>
              </div>
              <div className="text-muted-foreground text-xs space-y-1">
                <p>📖 {subjectName}</p>
                <p>📚 {chapterName}</p>
              </div>
              <p className="text-xs italic text-primary">{getFlexMessage()}</p>
            </div>

            {/* Share Options */}
            <div className="grid grid-cols-3 gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleWhatsAppShare}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors border border-[#25D366]/30"
              >
                <MessageCircle className="w-6 h-6 text-[#25D366]" />
                <span className="text-xs font-medium">WhatsApp</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLinkedInShare}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 transition-colors border border-[#0A66C2]/30"
              >
                <Linkedin className="w-6 h-6 text-[#0A66C2]" />
                <span className="text-xs font-medium">LinkedIn</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyToClipboard}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/30 relative"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="w-6 h-6 text-accent" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Copy className="w-6 h-6 text-primary" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="text-xs font-medium">
                  {copied ? "Copied!" : "Copy"}
                </span>
              </motion.button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

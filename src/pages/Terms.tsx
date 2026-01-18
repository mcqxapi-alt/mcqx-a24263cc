import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, FileText, Users, AlertTriangle, Scale, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import mcqxLogo from "@/assets/mcqx-logo.png";

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function Terms() {
  const sections = [
    {
      icon: Sparkles,
      title: "1. The Vibe Check (Acceptance)",
      content: `By using MCQX, you're agreeing to these terms. It's like a digital handshake 🤝 — if you're not cool with it, no hard feelings, but you'll need to bounce.
      
These terms apply to all users, whether you're just browsing, practicing MCQs, or challenging your friends to epic brain battles.`,
      legal: "By accessing or using MCQX ('the Service'), you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not use the Service."
    },
    {
      icon: Users,
      title: "2. Who Can Join the Party?",
      content: `MCQX is for students grinding for their exams. You need to be at least 13 years old to use our platform. If you're under 18, your parents/guardians should probably know you're here (they'll be proud, we promise).`,
      legal: "Users must be at least 13 years of age. Users between 13-18 years must have parental or guardian consent. By using the Service, you represent that you meet these requirements."
    },
    {
      icon: Shield,
      title: "3. Your Account = Your Responsibility",
      content: `Your account is like your phone — keep it safe! Don't share your password, don't let your annoying sibling use it, and definitely don't blame us if someone guesses your password is 'password123'.
      
Pro tip: Use a strong password. Your future self will thank you.`,
      legal: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized access."
    },
    {
      icon: FileText,
      title: "4. Content Rules (Keep It Clean)",
      content: `Our questions are curated with love (and NCERT textbooks). When you report questions or interact with the platform:

• No spam, hate, or weirdness
• No cheating or exploiting bugs
• No pretending to be someone you're not
• No using bots (we see you, script kiddies 👀)

Basically: don't be that person.`,
      legal: "Users agree not to: (a) upload malicious content, (b) attempt to circumvent security measures, (c) impersonate others, (d) use automated systems without permission, (e) violate any applicable laws."
    },
    {
      icon: Scale,
      title: "5. Our Content & IP",
      content: `All the questions, designs, code, and that sick logo? They belong to MCQX. You can use them for learning (that's the whole point!), but please don't:

• Scrape our questions for your own app
• Sell or redistribute our content
• Claim you made this (we put in the work 💪)`,
      legal: "All content, trademarks, and intellectual property on MCQX are owned by or licensed to us. You are granted a limited, non-exclusive, non-transferable license to access and use the Service for personal, non-commercial educational purposes only."
    },
    {
      icon: AlertTriangle,
      title: "6. The Reality Check (Disclaimers)",
      content: `We work hard to keep MCQX accurate and running smoothly, but we're not perfect (no one is, bestie). Here's the deal:

• AI-generated questions are reviewed but might have errors
• We're not responsible for your exam results (study hard!)
• Sometimes servers go down, bugs happen, life happens
• Our content is supplementary — don't skip your textbooks!`,
      legal: "THE SERVICE IS PROVIDED 'AS IS' WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE ACCURACY OF CONTENT OR UNINTERRUPTED SERVICE. MCQX IS NOT RESPONSIBLE FOR ACADEMIC OUTCOMES."
    },
    {
      icon: Shield,
      title: "7. Privacy Matters",
      content: `We respect your data like we respect our own. We collect minimal info to make the app work:

• Your email (for account stuff)
• Your practice data (to track your glow-up)
• Anonymous usage stats (to make MCQX better)

We never sell your data. Period. No cap. 🔒`,
      legal: "We collect and process personal data as described in our Privacy Policy. Data is used solely for service operation, improvement, and communication. We do not sell personal information to third parties."
    },
    {
      icon: Scale,
      title: "8. Changes & Updates",
      content: `We might update these terms sometimes (apps evolve, you know?). If we make big changes, we'll let you know. Continuing to use MCQX after changes means you're cool with them.`,
      legal: "We reserve the right to modify these terms at any time. Material changes will be communicated via the Service or email. Continued use after modifications constitutes acceptance of updated terms."
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon-green/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={mcqxLogo} 
              alt="MCQX" 
              className="h-8 w-8 rounded-lg group-hover:scale-105 transition-transform"
            />
            <span className="font-display font-bold text-lg">MCQX</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 mb-6">
            <FileText className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-medium text-neon-cyan">Legal Stuff</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The boring-but-important stuff, made slightly less boring ✨
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: January 2025
          </p>
        </motion.div>

        {/* TL;DR Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glass rounded-2xl p-6 mb-10 border border-neon-green/20"
          style={{ boxShadow: "0 0 30px hsl(var(--neon-green) / 0.1)" }}
        >
          <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-green" />
            TL;DR (The Quick Version)
          </h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>✅ Use MCQX to study and improve</li>
            <li>✅ Challenge your friends, have fun</li>
            <li>✅ Report bugs and wrong questions</li>
            <li>❌ Don't cheat, scrape, or be weird</li>
            <li>❌ Don't redistribute our content</li>
            <li>🔒 We protect your data, always</li>
          </ul>
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, i) => (
            <motion.section
              key={section.title}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              className="glass rounded-2xl p-6 sm:p-8"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <section.icon className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-xl">{section.title}</h2>
              </div>
              
              <div className="space-y-4 pl-0 sm:pl-12">
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {section.content}
                </p>
                
                {/* Legal Fine Print (Collapsible feel) */}
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-2">
                    <Scale className="w-3 h-3" />
                    <span>Legal language</span>
                  </summary>
                  <p className="mt-3 text-xs text-muted-foreground/50 bg-muted/30 rounded-lg p-4 border border-white/5">
                    {section.legal}
                  </p>
                </details>
              </div>
            </motion.section>
          ))}
        </div>

        {/* Contact Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center glass rounded-2xl p-8"
        >
          <Mail className="w-8 h-8 mx-auto mb-4 text-neon-cyan" />
          <h2 className="font-display font-bold text-xl mb-2">Questions?</h2>
          <p className="text-muted-foreground mb-4">
            If you have any questions about these terms, hit us up!
          </p>
          <a 
            href="mailto:mcqxapi@gmail.com" 
            className="text-neon-cyan hover:underline font-medium"
          >
            mcqxapi@gmail.com
          </a>
        </motion.section>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-sm text-muted-foreground mt-12"
        >
          Thanks for reading! Now go ace those MCQs 🚀
        </motion.p>
      </main>
    </div>
  );
}

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Database, Lock, Share2, Cookie, Bell, Trash2, Globe, Mail, Sparkles } from "lucide-react";
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

export default function Privacy() {
  const sections = [
    {
      icon: Eye,
      title: "1. What We Collect (The Tea ☕)",
      content: `We keep it minimal — no creepy surveillance here. Here's what we actually collect:

• **Account info**: Email, display name, avatar (if you add one)
• **Practice data**: Your scores, streaks, and progress (so you can flex later)
• **Usage stats**: Which subjects you practice, time spent (anonymous stuff)
• **Device info**: Browser type, screen size (to make the app look 🔥 on your device)

That's it. No reading your DMs, no tracking your location, no selling your soul.`,
      legal: "We collect personal information that you voluntarily provide when registering, including email address, display name, and optional profile photo. We automatically collect usage data, device information, browser type, and interaction patterns to improve our services."
    },
    {
      icon: Database,
      title: "2. How We Use Your Data",
      content: `Your data helps us make MCQX better for you:

✅ Track your progress and keep your streaks alive
✅ Show you smart suggestions based on what you struggle with
✅ Make the app faster and fix bugs
✅ Send you important updates (no spam, promise)
✅ Power the challenge mode leaderboards

We're not building a profile to sell you stuff. We're building features to help you study.`,
      legal: "Personal data is processed for: (a) providing and maintaining the Service, (b) personalizing user experience, (c) analyzing usage patterns, (d) communicating service updates, (e) preventing fraud and ensuring security. Legal basis: contract performance, legitimate interests, and user consent."
    },
    {
      icon: Lock,
      title: "3. How We Protect Your Data",
      content: `Security is not a joke to us:

🔐 All data is encrypted in transit (HTTPS everywhere)
🔐 Passwords are hashed (we can't even see them)
🔐 Database access is restricted and logged
🔐 Regular security audits (we check ourselves)
🔐 No storing payment info (we use secure processors)

Is any system 100% unhackable? Nope. But we do everything reasonable to keep your data safe.`,
      legal: "We implement industry-standard security measures including TLS encryption, secure password hashing (bcrypt), access controls, audit logging, and regular security assessments. Despite our efforts, no method of electronic transmission is 100% secure, and we cannot guarantee absolute security."
    },
    {
      icon: Share2,
      title: "4. Who We Share With (Spoiler: Almost No One)",
      content: `We don't sell your data. Period. But we might share with:

• **Service providers**: Hosting, analytics, email (they're bound by contracts)
• **Legal stuff**: If the law makes us (court orders, etc.)
• **Your consent**: If you explicitly ask us to share something

We'll never sell your email to random companies. No "partners" spamming you. No data brokers. That's a promise.`,
      legal: "We may disclose personal information to: (a) third-party service providers under contractual obligations, (b) legal authorities when required by law or valid legal process, (c) third parties with your explicit consent. We do not sell personal information to third parties for marketing purposes."
    },
    {
      icon: Cookie,
      title: "5. Cookies & Tracking",
      content: `Yes, we use cookies. But the good kind:

🍪 **Essential cookies**: Keep you logged in, remember your preferences
🍪 **Analytics cookies**: Help us understand how people use the app (anonymous)

No creepy retargeting cookies. No ads following you around the internet. We're not that company.

You can disable cookies in your browser, but some features might break.`,
      legal: "We use essential cookies for authentication and session management, and analytics cookies for aggregated usage statistics. We do not use third-party advertising cookies or cross-site tracking. Users may disable cookies through browser settings, which may affect functionality."
    },
    {
      icon: Bell,
      title: "6. Communications",
      content: `We might email you about:

📧 Account stuff (password resets, security alerts)
📧 Major app updates (new features, changes)
📧 Your practice stats (weekly summaries, if you want them)

No marketing spam. No "check out this deal!" nonsense. You can unsubscribe from non-essential emails anytime.`,
      legal: "We send transactional emails for account management and security purposes. Promotional communications are optional and require consent. Users may opt-out of non-essential communications at any time through account settings or unsubscribe links."
    },
    {
      icon: Trash2,
      title: "7. Your Rights (You're in Control)",
      content: `Your data, your rules:

✨ **Access**: Ask us what data we have on you
✨ **Correct**: Fix any wrong info
✨ **Delete**: Request we delete your account and data
✨ **Export**: Get a copy of your data
✨ **Object**: Opt out of certain processing

Hit us up at mcqxapi@gmail.com and we'll handle it within 30 days.`,
      legal: "Under applicable data protection laws (including GDPR and CCPA), you have rights to: access, rectification, erasure, data portability, restriction of processing, and objection. To exercise these rights, contact us at mcqxapi@gmail.com. We will respond within 30 days."
    },
    {
      icon: Globe,
      title: "8. International Users",
      content: `MCQX is based in India, but students use us worldwide. If you're accessing from:

🌍 **EU/UK**: We comply with GDPR
🇺🇸 **California**: We comply with CCPA
🌏 **Everywhere else**: We apply the same high standards

Your data might be processed in India or other countries where our servers are. We ensure appropriate safeguards are in place.`,
      legal: "Data may be transferred to and processed in India or other jurisdictions. For EU/EEA users, transfers are conducted under Standard Contractual Clauses or other approved mechanisms. We comply with GDPR, CCPA, and applicable international data protection regulations."
    },
    {
      icon: Shield,
      title: "9. Children's Privacy",
      content: `MCQX is for students 13+. If you're under 13, please don't sign up (get your parents to help if you really want to practice).

If we discover we've collected data from someone under 13, we'll delete it ASAP.

Parents: If you think your child signed up, email us and we'll sort it out.`,
      legal: "Our Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will promptly delete the information. Parents may contact us to request deletion of their child's data."
    },
    {
      icon: Bell,
      title: "10. Changes to This Policy",
      content: `We might update this policy sometimes. When we do:

• We'll update the "Last updated" date
• For major changes, we'll notify you via email or in-app
• Continuing to use MCQX means you accept the changes

We won't suddenly start selling your data. Any major privacy changes will be clearly communicated.`,
      legal: "We reserve the right to modify this Privacy Policy at any time. Material changes will be communicated via email or prominent notice on the Service. Continued use after modifications constitutes acceptance. We encourage periodic review of this policy."
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={mcqxLogo} 
              alt="MCQX" 
              className="h-10 sm:h-12 w-auto group-hover:scale-105 transition-transform"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Your Privacy Matters</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            How we handle your data (spoiler: we respect it) 🔒
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
          className="glass rounded-2xl p-6 mb-10 border border-primary/20"
          style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.1)" }}
        >
          <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            TL;DR (The Quick Version)
          </h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>🔒 We collect minimal data to make the app work</li>
            <li>📊 Your practice data helps personalize your experience</li>
            <li>🚫 We never sell your data to anyone. Ever.</li>
            <li>🛡️ Your data is encrypted and protected</li>
            <li>✨ You can delete your account and data anytime</li>
            <li>📧 Questions? Email mcqxapi@gmail.com</li>
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
                <div 
                  className="text-muted-foreground whitespace-pre-line leading-relaxed prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: section.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                  }}
                />
                
                {/* Legal Fine Print */}
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-2">
                    <Shield className="w-3 h-3" />
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
          <Mail className="w-8 h-8 mx-auto mb-4 text-primary" />
          <h2 className="font-display font-bold text-xl mb-2">Privacy Questions?</h2>
          <p className="text-muted-foreground mb-4">
            If you have any questions about how we handle your data, reach out!
          </p>
          <a 
            href="mailto:mcqxapi@gmail.com" 
            className="text-primary hover:underline font-medium"
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
          Your privacy is safe with us. Now go crush those MCQs! 🚀
        </motion.p>
      </main>
    </div>
  );
}

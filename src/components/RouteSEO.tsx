import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE = "https://mcqx.lovable.app";

const META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "MCQX — Smart MCQ Practice for CBSE, ICSE, CUET, JEE & NEET",
    description:
      "Practice MCQs for CBSE, ICSE, CUET, JEE, NEET & more. Instant feedback, AI-powered questions, and friend challenges on MCQX.",
  },
  "/practice": {
    title: "Practice MCQs — Boards & Competitive Exams | MCQX",
    description:
      "Pick your board, class, subject and chapter. Instant feedback, adaptive difficulty and AI-powered MCQs across CBSE, ICSE, CUET, JEE & NEET.",
  },
  "/challenge": {
    title: "1v1 MCQ Challenges — Duel Your Friends | MCQX",
    description:
      "Real-time multiplayer MCQ duels. Challenge friends across any subject and climb the MCQX leaderboard.",
  },
  "/leaderboard": {
    title: "Leaderboard — Top MCQ Students | MCQX",
    description:
      "See the top scorers, longest streaks and most challenge wins on MCQX across boards and competitive exams.",
  },
  "/dashboard": {
    title: "Your Dashboard — Streaks & Performance | MCQX",
    description:
      "Track your streak, accuracy, weak areas and recent practice sessions on MCQX.",
  },
  "/login": {
    title: "Sign in to MCQX",
    description:
      "Sign in or create an MCQX account to track streaks, accuracy and join 1v1 MCQ challenges.",
  },
  "/analytics": {
    title: "Performance Analytics | MCQX",
    description:
      "Deep performance analytics, subject and chapter accuracy, trends and AI-powered study coaching.",
  },
  "/admin": {
    title: "Admin Review | MCQX",
    description: "Moderate and verify MCQ content on MCQX.",
  },
  "/terms": {
    title: "Terms of Service | MCQX",
    description: "Read the MCQX terms of service.",
  },
  "/privacy": {
    title: "Privacy Policy | MCQX",
    description: "Read the MCQX privacy policy.",
  },
};

export function RouteSEO() {
  const { pathname } = useLocation();
  const key = pathname.startsWith("/challenge") ? "/challenge" : pathname;
  const meta = META[key] ?? META["/"];
  const url = `${SITE}${pathname}`;
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
    </Helmet>
  );
}

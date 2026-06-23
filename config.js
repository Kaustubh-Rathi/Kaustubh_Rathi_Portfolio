/* =============================================================================
 * config.js — THE SINGLE FILE YOU EDIT to make this portfolio your own.
 * =============================================================================
 *
 *   HOW TO USE THIS AS YOUR OWN PORTFOLIO  (see README.md for full steps)
 *   ---------------------------------------------------------------------
 *   1. Edit the values below — your name, links, stats, projects, etc.
 *   2. Drop your résumé PDFs into  shared/assets/  and point `personas` at them.
 *   3. (Optional) tweak `theme` colors and `features`.
 *   4. Push to GitHub Pages (or Vercel/Netlify). That's it — no build step.
 *
 *   Everything in the game (the world, the buildings, the chatbot, the
 *   résumé buttons, the mini-games) is generated from THIS object. Change a
 *   fact here once and it updates everywhere.
 *
 *   NOTE on confidentiality: keep employer work described in GENERIC terms.
 *   No internal system names, org specifics, or real production metrics.
 * ============================================================================= */
(function () {
  "use strict";

  const CONFIG = {
    /* ====================================================================== *
     *  1. WHO YOU ARE
     * ====================================================================== */
    person: {
      name: "Kaustubh Rathi",
      handle: "kcr",
      role: "SDE @ Amazon",
      tagline: "Building autonomous AI agents that don't sleep.",
      blurb:
        "Amazon SDE shipping production backend services and autonomous LLM-agent " +
        "systems on AWS. Codeforces Expert and LeetCode Knight with strong DS/algo, " +
        "distributed-systems, and applied-GenAI fundamentals.",
      location: "Bengaluru, India",
      education: "B.Tech (IT), IIIT Allahabad — CGPA 8.52/10, graduating 2026",
      email: "1.0manydreams@gmail.com",
      // Headshot from LinkedIn (saved locally so no expiring CDN URL). Path is relative
      // to pages under world/; the root page strips the leading ../ when it consumes it.
      avatar: { photo: "../shared/assets/headshot.jpg", alt: "Kaustubh Rathi" },
      links: {
        github: "https://github.com/Kaustubh-Rathi",
        linkedin: "https://linkedin.com/in/kaustubh-rathi-9228ab255",
        codeforces: "https://codeforces.com/profile/pathu7525",
        leetcode: null, // no public LeetCode link — leave null so nothing renders a dead link
      },
    },

    /* ====================================================================== *
     *  2. THEME  (colors — based on researched "Amazon Ember Arcade" palette)
     *     accent  = "DO THIS" (warm, grabs attention)   ember
     *     accent2 = "GO HERE" (cool, signals interactive) cyan
     *     reward  = collectibles / achievement only        gold
     * ====================================================================== */
    theme: {
      bg: "#0B0D17",
      bgFloor: "#0A0D16",
      panel: "#111826",
      line: "#233044",
      text: "#ECEDEE",
      muted: "#8A99B0",
      accent: "#FF9900",
      accent2: "#22D3EE",
      reward: "#FBBF24",
    },

    /* ====================================================================== *
     *  3. FEATURE TOGGLES
     * ====================================================================== */
    features: {
      miniGames: true,          // play a mini-game to unlock each room (false = open instantly)
      sound: true,              // synthesized SFX (user can still mute in HUD)
      npcBannerIntervalSec: 14, // how often the "Ask me anything" nudge pops
      npcBannerFirstDelaySec: 6,
    },

    /* ====================================================================== *
     *  4. THE WORLD  — six buildings, laid out automatically in a 6-spoke hub.
     *     Each maps to a content section (by `key`) and a mini-game (by `game`).
     *     game: "shoot" | "catch" | "whack" | "lock" | "dodge" | "connect"
     * ====================================================================== */
    world: {
      hubLabel: "SPAWN",
      sections: [
        { key: "systems",    label: "AMAZON HQ",      sub: "Systems I Operate", icon: "▣", color: "#FF9900", game: "shoot",   gameTitle: "🔫 Bug Blaster",  gameHint: "Tap the 3 bugs to deploy clean." },
        { key: "projects",   label: "BUILDS ARCADE",  sub: "Projects",          icon: "◈", color: "#22D3EE", game: "catch",   gameTitle: "◆ Shard Catch",   gameHint: "Catch 4 falling data-shards. Drag / arrows." },
        { key: "skills",     label: "SKILLS ARMORY",  sub: "Loadout",           icon: "✦", color: "#9D4EFF", game: "lock",    gameTitle: "🛡️ Skill Lock",    gameHint: "Tap when the scanner lights a tile. Lock 3." },
        { key: "contact",    label: "COMMS TERMINAL", sub: "Contact + NPC",     icon: "✉", color: "#4ADE80", game: "connect", gameTitle: "📟 Connect",       gameHint: "Tap when your beam crosses the recruiter node." },
        { key: "experience", label: "RUN LOGS",       sub: "Experience",        icon: "❯", color: "#2DD4BF", game: "dodge",   gameTitle: "📜 Uptime Run",    gameHint: "Drag to dodge the spikes. Survive the timer!" },
        { key: "stats",      label: "LEADERBOARD",    sub: "High Scores",       icon: "▲", color: "#FBBF24", game: "whack",   gameTitle: "⚡ Merge Masher",  gameHint: "Tap 5 merge-conflicts to clear the board." },
      ],
    },

    /* ====================================================================== *
     *  5. RÉSUMÉ PERSONAS  (one URL, multiple audiences — the toggle in the HUD)
     *     Put your PDFs in shared/assets/ and point `file` at them.
     * ====================================================================== */
    personas: [
      { id: "sde",     label: "SDE",            file: "../shared/assets/resume-sde.pdf",   pitch: "Production backend + distributed systems on AWS." },
      { id: "genai",   label: "GenAI / LLM",    file: "../shared/assets/resume-genai.pdf", pitch: "Production LLM-agent systems: orchestration, tool use, RAG." },
      { id: "quant",   label: "Quant",          file: "../shared/assets/resume-quant.pdf", pitch: "Stochastic processes, derivative pricing, statistical modeling." },
      { id: "applied", label: "Applied Sci/ML", file: "../shared/assets/resume-as.pdf",    pitch: "From-scratch deep learning + applied ML research." },
    ],

    /* ====================================================================== *
     *  6. STATS  (the "Leaderboard" — real, verifiable numbers)
     * ====================================================================== */
    stats: [
      { key: "codeforces", label: "Codeforces", rank: "Expert",      value: 1751,  max: 2100, sub: "max rating · handle Pathu7525",       href: "https://codeforces.com/profile/pathu7525" },
      { key: "leetcode",   label: "LeetCode",   rank: "Knight",      value: 2000,  max: 2400, sub: "rating · 800+ problems solved",       href: null },
      { key: "jee",        label: "JEE Mains",  rank: "Top 0.55%",   value: 99.45, max: 100,  sub: "percentile · 1M+ candidates (2022)",  href: null },
      { key: "cgpa",       label: "CGPA",       rank: "8.52 / 10",   value: 8.52,  max: 10,   sub: "B.Tech IT · IIIT Allahabad",          href: null },
      { key: "mentored",   label: "Mentored",   rank: "100+ juniors", value: 100,  max: 120,  sub: "Robita Club · GenAI coordinator",     href: null },
    ],

    /* ====================================================================== *
     *  7. EXPERIENCE  (the "Run Logs" timeline)
     * ====================================================================== */
    experience: [
      {
        org: "Amazon", team: "Stores", title: "Software Development Engineer Intern",
        period: "Jan 2026 — Present", location: "Bengaluru, India", current: true,
        points: [
          "Shipped a production Java microservice on AWS Lambda + API Gateway over DynamoDB (GSIs tuned to access patterns, reusable DI'd DAO), with its own CDK infrastructure.",
          "Built an autonomous failure-remediation agent (Amazon Bedrock) that clusters recurring failures by root cause and proposes code-level fixes — gated by a crash-resilient state machine with output validation, retries, confidence scoring, and human approval.",
          "Shipped a 24/7 incident-investigation agent correlating telemetry with deployments to auto-generate root-cause analyses — cut investigation time from ~hours to ~minutes.",
        ],
      },
      {
        org: "ASPR Agrovalue (I) Ltd.", team: null, title: "Artificial Intelligence Intern",
        period: "Dec 2024 — Feb 2025", location: "India", current: false,
        points: [
          "Automated an invoice-processing pipeline using NER to extract structured fields from 10,000+ supplier invoices/month into a normalized schema.",
          "Built a Python web-scraping + ETL pipeline aggregating 1,000+ price records/day, feeding a Streamlit dashboard the procurement team adopted.",
        ],
      },
      {
        org: "Robita Club (Generative AI), IIIT Allahabad", team: null, title: "Overall Coordinator",
        period: "2023 — 2025", location: "Prayagraj, India", current: false,
        points: ["Led 10+ students and mentored 100+ juniors through campus AI hackathons and PyTorch workshops."],
      },
    ],

    /* ====================================================================== *
     *  8. SYSTEMS  (employer work as sanitized case studies)
     * ====================================================================== */
    systems: [
      {
        name: "Autonomous Failure-Remediation Agent", status: "production",
        summary: "A multi-call LLM agent (Amazon Bedrock) that investigates recurring operational failures, clusters them by root cause, and proposes code-level fixes — gated by human approval before any change.",
        architecture: ["Amazon Bedrock", "AWS Lambda", "API Gateway", "DynamoDB", "AWS CDK", "Java"],
        reliability: "Crash-resilient state machine · per-call output validation · automatic retries · 1–5 confidence scoring · human-in-the-loop approval gates.",
      },
      {
        name: "24/7 Incident-Investigation Agent", status: "production",
        summary: "An always-on agent that correlates multi-source telemetry with recent deployments to auto-generate structured, multi-level root-cause analyses.",
        architecture: ["Amazon Bedrock", "Tool use", "AWS Lambda", "CloudWatch", "Step Functions", "Java"],
        reliability: "Cuts investigation time from hours to minutes; runs on a fixed scan cadence.",
      },
    ],

    /* ====================================================================== *
     *  9. PROJECTS  (the "Builds" — these also become collectible data-shards)
     *     difficulty: "Legendary" | "Hard" | "Medium"  (just a visual badge)
     * ====================================================================== */
    projects: [
      { id: "deep-researcher", name: "Deep Researcher", tier: "flagship", stars: 10, difficulty: "Legendary",
        blurb: "Full-stack multi-agent research app: 7 specialized LLM agents (research → edit → write → review → revise → publish) orchestrated with LangGraph, FastAPI + WebSocket live log streaming, FAISS chat-over-report, and PDF/DOCX/Markdown export.",
        tech: ["Python", "LangGraph", "FastAPI", "WebSocket", "FAISS"], href: "https://github.com/Kaustubh-Rathi/Deep_Reseacher" }, // TODO: rename the GitHub repo to "Deep_Researcher" (GitHub auto-redirects), then update this URL — the repo name has a typo
      { id: "kg-rag", name: "Knowledge-Graph RAG", tier: "supporting", stars: 3, difficulty: "Hard",
        blurb: "Graph-grounded Q&A over real SEC 10-K filings using a Neo4j knowledge graph (Cypher) + embeddings; benchmarks relationship-aware retrieval against plain vector RAG.",
        tech: ["Neo4j", "Cypher", "LangChain", "Embeddings"], href: "https://github.com/Kaustubh-Rathi/Knowledge_Graphs_for_RAG" },
      { id: "medical-chatbot", name: "Medical RAG Chatbot", tier: "supporting", stars: 0, difficulty: "Hard",
        blurb: "Dockerized RAG clinical-interview chatbot (6 languages incl. Hindi) grounded in a FAISS store of ~5,000 doctor-patient dialogue chunks; conducts structured interviews and generates assessment reports.",
        tech: ["LangChain", "FAISS", "OpenAI", "Gradio", "Docker"], href: "https://github.com/Kaustubh-Rathi/Projects/tree/main/My_Medical_Chatbot" },
      { id: "transformer", name: "Transformer from Scratch", tier: "supporting", stars: 0, difficulty: "Medium",
        blurb: "Transformer implemented in PyTorch (512-dim, 8 heads, 3+3 layers) for DE→EN machine translation on Multi30k, with a full BLEU evaluation harness and TensorBoard tracking.",
        tech: ["PyTorch", "Transformers", "BLEU"], href: "https://github.com/Kaustubh-Rathi/SEQ_TO_SEQ_TRANSFORMER" },
      { id: "image-captioning", name: "Image Captioning (CNN→LSTM)", tier: "supporting", stars: 0, difficulty: "Medium",
        blurb: "Encoder–decoder image-captioning model in PyTorch: a pretrained InceptionV3 CNN encodes an image into a feature vector that seeds an LSTM decoder, which generates a caption word-by-word over a learned vocabulary.",
        tech: ["PyTorch", "InceptionV3", "LSTM", "CNN"], href: "https://github.com/Kaustubh-Rathi/IMAGE-CAPTIONING" },
      { id: "quant-research", name: "Quantitative Finance Research", tier: "quant", stars: 2, difficulty: "Medium",
        blurb: "Stochastic-process simulators (Brownian, GBM, Vasicek, CIR, CEV, Bessel) over 10k-path ensembles, and option pricing via Black-Scholes, Monte Carlo, and Longstaff-Schwartz.",
        tech: ["Python", "NumPy", "SciPy"], href: "https://github.com/Kaustubh-Rathi/Understanding_Quantitative_Finance" },
    ],

    /* ====================================================================== *
     *  10. SKILLS  (the "Loadout")
     * ====================================================================== */
    skills: [
      { group: "Languages",             items: ["Java", "Python", "C++", "SQL"] },
      { group: "Backend & Distributed", items: ["RPC services", "REST APIs", "Microservices", "Concurrency", "WebSocket", "Fault tolerance"] },
      { group: "Cloud & Infra",         items: ["AWS Lambda", "DynamoDB", "API Gateway", "CloudWatch", "Step Functions", "Bedrock", "AWS CDK", "Docker"] },
      { group: "GenAI & ML",            items: ["LLM agents", "Multi-agent orchestration", "Tool use", "RAG", "LangChain", "LangGraph", "PyTorch", "FAISS"] },
    ],

    meta: { builtWith: "Vanilla HTML/CSS/JS · static · zero backend · GitHub-Pages-ready", year: 2026 },
  };

  // Exposed as window.PORTFOLIO (back-compat) — the whole app reads from this.
  window.PORTFOLIO = CONFIG;
  window.CONFIG = CONFIG;
})();

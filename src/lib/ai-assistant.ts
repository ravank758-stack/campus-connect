export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  action?: {
    label: string;
    to: string;
  } | undefined;
  suggestions?: string[] | undefined;
}

export interface AISettings {
  apiKey?: string | undefined;
  apiProvider?: ("custom-openai" | "groq" | "openrouter") | undefined;
  soundEnabled: boolean;
  model?: string | undefined;
}

const STORAGE_KEY_SETTINGS = "skillswap_ai_settings";
const STORAGE_KEY_HISTORY = "skillswap_ai_history";

export function getStoredAISettings(): AISettings {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error(e);
  }
  return {
    soundEnabled: true,
  };
}

export function saveStoredAISettings(settings: AISettings) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getStoredChatHistory(): ChatMessage[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveStoredChatHistory(messages: ChatMessage[]) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(messages.slice(-30)));
    }
  } catch (e) {
    console.error(e);
  }
}

/** Web Audio API gentle sound effect */
export function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore audio context errors in restricted autoplay environments
  }
}

/**
 * Intelligent local response engine for SkillSwap Campus
 */
export async function generateAIResponse(
  userPrompt: string,
  history: ChatMessage[],
  context?: {
    userName?: string | undefined;
    skills?: { teach: string[]; learn: string[] } | undefined;
    college?: string | undefined;
  } | undefined
): Promise<{ reply: string; action?: { label: string; to: string } | undefined; suggestions?: string[] | undefined }> {
  const settings = getStoredAISettings();

  // If user provided a custom OpenAI-compatible API key, call the LLM API
  if (settings.apiKey?.trim()) {
    try {
      const endpoint =
        settings.apiProvider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : settings.apiProvider === "openrouter"
          ? "https://openrouter.ai/api/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

      const defaultModel =
        settings.apiProvider === "groq"
          ? "llama-3.3-70b-versatile"
          : settings.apiProvider === "openrouter"
          ? "meta-llama/llama-3.1-8b-instruct:free"
          : "gpt-4o-mini";

      const systemPrompt = `You are SwapBot, the intelligent AI Mentor for "SkillSwap Campus" (a peer-to-peer student skill exchange network).
Platform context:
- Students swap skills 1-on-1 without money (e.g. teach Python to learn Guitar, teach UI/UX to learn Calculus).
- Match scores are calculated as: 70% mutual skill overlap (what you teach matches what they want, and vice versa) + 15% same college + 15% shared availability.
- Platform sections: /dashboard (overview & match score), /discover (search students by skill, college, department), /requests (pending & accepted matches), /chat (direct messaging), /sessions (calendar scheduling & meeting links), /profile (skills to teach/learn).
- User profile: Name: ${context?.userName || "Student"}, College: ${context?.college || "Campus"}, Skills teaching: ${context?.skills?.teach.join(", ") || "None yet"}, Skills learning: ${context?.skills?.learn.join(", ") || "None yet"}.
Keep responses helpful, encouraging, formatted cleanly with markdown, bullet points, and actionable advice.`;

      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userPrompt },
      ];

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: settings.model || defaultModel,
          messages: apiMessages,
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          return {
            reply: text,
            suggestions: [
              "How to improve my match score?",
              "Draft a study session agenda",
              "Recommend top skills to learn",
            ],
          };
        }
      }
    } catch (err) {
      console.warn("External AI call failed, falling back to local expert engine:", err);
    }
  }

  // Built-in intelligent engine with rich campus knowledge
  const query = userPrompt.toLowerCase().trim();

  // 0. Registration & Account Creation
  if (
    query.includes("register") ||
    query.includes("sign up") ||
    query.includes("signup") ||
    query.includes("create account") ||
    query.includes("how to join") ||
    query.includes("enroll") ||
    query.includes("get started") ||
    query.includes("how to log in") ||
    query.includes("how to sign in")
  ) {
    return {
      reply: `### 🎓 How to Register on SkillSwap Campus

Joining SkillSwap Campus is 100% free and takes less than a minute! Here is the step-by-step process:

1. **Go to the Auth Page**:
   - Click the **[Go to Registration Page]** button below or the **"Sign in"** link in the top navigation.
   - Switch to the **"Create an account"** tab if you're new.

2. **Choose Your Sign Up Method**:
   - **1-Click with Google**: Tap "Continue with Google" for instant student login.
   - **Or with Email**: Enter your **Full Name**, **College/Personal Email**, and a secure **Password** (min. 6 characters).

3. **Complete Your Student Profile**:
   - Add your **College / University**, **Department**, and **Year of Study**.
   - Choose your preferred free time slots (*Weekday mornings/evenings* or *Weekends*).

4. **Add Skills to Teach & Learn**:
   - **Teach**: List subjects or hobbies you can share (e.g., *Python, Figma, Acoustic Guitar, Linear Algebra*).
   - **Learn**: List skills you want a partner to teach you.

Once complete, your match percentage with students across campus will immediately appear in your **Discover** and **Dashboard** tabs!`,
      action: { label: "Go to Registration Page", to: "/auth" },
      suggestions: [
        "How does the match score work?",
        "Recommend a skill partner",
        "Plan a 1-hour swap session",
      ],
    };
  }

  // 1. Match score calculation & optimization
  if (query.includes("match score") || query.includes("how does matching work") || query.includes("algorithm") || query.includes("percentage")) {
    return {
      reply: `### 🎯 How the Match Score Works on SkillSwap Campus

Your compatibility percentage with other peers is calculated using a **weighted 3-factor formula**:

1. **70% — Mutual Skill Overlap (The Core Swap)**
   - Did they want to learn what you can teach?
   - Do they teach what you are eager to learn?
   - Having balanced 2-way swaps maximizes this component!

2. **15% — Same Campus / College**
   - Matching with students from your college gives an automatic +15 point boost so you can easily meet up at campus libraries or study lounges.

3. **15% — Overlapping Availability**
   - Sharing time slots (e.g. *Weekday evenings* or *Weekends*) ensures you can actually find a time that works.

💡 **Pro-Tip**: Head to your **Profile** to list at least 3 skills you can teach and 2-3 skills you want to learn to double your high-probability matches!`,
      action: { label: "Go to Profile & Boost Score", to: "/profile" },
      suggestions: [
        "Recommend a skill partner",
        "How do I send a match request?",
        "Draft a study session plan",
      ],
    };
  }

  // 2. Skill partner recommendations & search
  if (query.includes("recommend") || query.includes("find partner") || query.includes("search") || query.includes("find someone") || query.includes("peer")) {
    return {
      reply: `### 🔍 Finding Your Ideal Skill Partner

To find great study partners right now:

1. **Explore the Discover Directory**: You can filter peers by department (e.g. Computer Science, Design, Electrical), college, and level (Beginner to Expert).
2. **High-Demand Swaps on Campus**:
   - 💻 **Tech**: React / Next.js ⇄ Python & Machine Learning
   - 🎨 **Creative**: UI/UX Figma ⇄ Video Editing / Blender
   - 🎸 **Hobbies**: Acoustic Guitar ⇄ Conversational Spanish / French
   - 📊 **Academics**: Data Structures & Algorithms ⇄ Linear Algebra / Calculus

Check out the live **Discover** catalog to see current students actively looking for swap partners!`,
      action: { label: "Open Discover Catalog", to: "/discover" },
      suggestions: [
        "Draft a match request message",
        "Plan a 1-hour swap session",
        "How to prepare for my first session?",
      ],
    };
  }

  // 3. Draft match request message / icebreaker
  if (query.includes("request message") || query.includes("icebreaker") || query.includes("what to say") || query.includes("draft") || query.includes("message starter")) {
    return {
      reply: `### 💬 Friendly Match Request Templates

Here are 3 tested templates to get high acceptance rates:

#### Option 1: Casual & Direct (Best for tech & design)
> *"Hey! I noticed you're looking to learn React, and I see you have solid experience with UI/UX in Figma. I'd love to do a weekly 1-hour skill trade where I help you build frontend projects and you give me feedback on design systems. Let me know if you'd be up for it!"*

#### Option 2: Casual Academic / Exam Prep
> *"Hi! I'm currently preparing for Data Structures and noticed you teach it, while I can help with Calculus and Discrete Math. Would you like to schedule an introductory 45-min swap session on campus or Google Meet?"*

#### Option 3: Hobby & Creative Exchange
> *"Hey there! I've been wanting to pick up Acoustic Guitar for months, and I can teach you digital illustration / Python from scratch. Let's swap knowledge!"*

👉 You can copy any of these directly into your request modal in the Discover tab.`,
      action: { label: "Explore Students to Message", to: "/discover" },
      suggestions: [
        "Plan a 1-hour swap session",
        "How to track sessions?",
        "Give me tips on teaching effectively",
      ],
    };
  }

  // 4. Study session agenda & planning
  if (query.includes("session") || query.includes("agenda") || query.includes("plan") || query.includes("schedule") || query.includes("hour")) {
    return {
      reply: `### ⏱️ The Ideal 60-Minute "Fair Swap" Agenda

To make sure both students get equal value without feeling rushed, follow this structure:

| Time | Activity | Focus |
| :--- | :--- | :--- |
| **00 – 05 min** | 👋 Welcome & Goal Check | Define what 1 concrete thing each person will learn today. |
| **05 – 30 min** | 🎓 **Round 1 (Person A Teaches)** | Person A walks Person B through concepts + hands-on exercise. |
| **30 – 35 min** | ☕ Micro-Break | Grab water, recap notes, switch screen-sharing roles. |
| **35 – 60 min** | 🚀 **Round 2 (Person B Teaches)** | Person B teaches Person A their skill + real-time practice. |
| **Wrap-up** | ⭐ Next steps & review | Schedule the next session and leave a verified review. |

📅 You can log and schedule upcoming meetings directly in the **Sessions** calendar tab!`,
      action: { label: "View Sessions Calendar", to: "/sessions" },
      suggestions: [
        "How do reviews work?",
        "Tips for teaching beginners",
        "What if my partner cancels?",
      ],
    };
  }

  // 5. Teaching tips
  if (query.includes("teaching") || query.includes("teach") || query.includes("pedagogy") || query.includes("explain")) {
    return {
      reply: `### 🌟 4 Golden Rules for Teaching Peers

1. **The "Show, Do, Review" Framework**:
   - Don't just lecture slides. Show an example (3 mins), let them type or try it out (5 mins), and review together.
2. **Avoid Jargon Clutter**:
   - Explain like you're talking to a friend over coffee. Use real-world analogies (e.g., comparing an API to a restaurant waiter).
3. **Encourage "Stupid" Questions**:
   - Remind your partner that every expert started as a confused beginner.
4. **End with a Micro-Project**:
   - Instead of theoretical trivia, end the session with something tangible: a small component, 3 guitar chords played in rhythm, or a solved problem set.`,
      suggestions: [
        "Plan a 1-hour swap session",
        "Draft a match request message",
        "How does the rating system work?",
      ],
    };
  }

  // 6. Ratings & Reviews
  if (query.includes("rating") || query.includes("review") || query.includes("reputation") || query.includes("stars")) {
    return {
      reply: `### ⭐ SkillSwap Rating & Review System

- After you finish a completed session, both partners can leave a **1 to 5 star rating** and constructive feedback.
- Your composite score appears on your **Public Student Card**, giving prospective swap partners confidence in your reliability, friendliness, and subject mastery.
- Highly rated students get featured higher in search algorithms across the campus directory!`,
      action: { label: "View My Profile", to: "/profile" },
      suggestions: [
        "How to improve my match score?",
        "Recommend a skill partner",
        "Plan a 1-hour swap session",
      ],
    };
  }

  // 7. Coding / Tech questions (e.g. Python, React, JS, Git)
  if (query.includes("python") || query.includes("react") || query.includes("javascript") || query.includes("code") || query.includes("git")) {
    return {
      reply: `### 💻 Tech & Programming Quick Guide

Whether you're teaching or learning coding on SkillSwap:

- **Pair Programming**: Use VS Code Live Share or screen sharing on Google Meet / Discord so both students can type together.
- **Top Beginner Roadmaps**:
  - **Python**: Variables & Loops ➔ Functions & Dictionaries ➔ File I/O ➔ Mini CLI tool or Pandas automation.
  - **React**: Components & Props ➔ useState & useEffect ➔ Event handlers ➔ Fetching API data ➔ Tailwind CSS styling.
  - **Git & GitHub**: \`git clone\` ➔ \`git checkout -b feature\` ➔ \`git add . && git commit\` ➔ Pull Requests.

Want to learn or teach a specific technology? Add it to your skills in your profile so compatible peers can find you!`,
      action: { label: "Update Tech Skills in Profile", to: "/profile" },
      suggestions: [
        "Plan a 1-hour swap session",
        "Draft a match request message",
        "How to boost match score?",
      ],
    };
  }

  // Default intelligent greeting & assistant overview
  return {
    reply: `👋 Hello! I am **SwapBot**, your AI Study & Skill Mentor on SkillSwap Campus.

I can help you with:
- 🎯 **Finding high-compatibility peer matches** based on your skills and campus.
- 📋 **Crafting tailored 60-minute study swap agendas** so both students learn effectively.
- ✍️ **Drafting high-response match request messages** & conversation starters.
- 💡 **Explaining technical or creative concepts** (coding, design, music, mathematics).
- ⚙️ **Optimizing your profile & match score** to get the best swap opportunities.

What would you like to explore today?`,
    suggestions: [
      "Recommend a skill partner",
      "How does the match score work?",
      "Draft a match request message",
      "Plan a 1-hour swap session",
    ],
  };
}

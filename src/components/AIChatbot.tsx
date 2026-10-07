import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Sparkles,
  X,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Settings,
  ArrowRight,
  Copy,
  Check,
  Compass,
  Calendar,
  Handshake,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
import {
  ChatMessage,
  AISettings,
  generateAIResponse,
  getStoredAISettings,
  saveStoredAISettings,
  getStoredChatHistory,
  saveStoredChatHistory,
  playNotificationChime,
} from "@/lib/ai-assistant";
import { useAuth } from "@/lib/auth";
import { useStudents } from "@/lib/data";

const QUICK_PROMPTS = [
  { label: "🎓 How to Register", prompt: "How do I register and create an account?" },
  { label: "🎯 Find Partner", prompt: "Recommend a skill swap partner for me" },
  { label: "⏱️ Session Agenda", prompt: "Plan a 1-hour swap session agenda" },
  { label: "✍️ Match Message", prompt: "Draft a friendly match request message" },
  { label: "📈 Boost Score", prompt: "How does the match score work and how can I boost it?" },
  { label: "💡 Teaching Tips", prompt: "Give me tips on how to teach beginners effectively" },
];

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [settings, setSettings] = useState<AISettings>(getStoredAISettings);
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || "");
  const [apiProviderInput, setApiProviderInput] = useState(settings.apiProvider || "custom-openai");
  const [customModelInput, setCustomModelInput] = useState(settings.model || "");

  const { userId } = useAuth();
  const { data: students = [] } = useStudents();
  const currentUser = students.find((s) => s.id === userId);
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = getStoredChatHistory();
    if (saved.length > 0) return saved;
    return [
      {
        id: "welcome-1",
        role: "assistant",
        content: `👋 Hey there! I'm **SwapBot**, your AI Campus Mentor.

I can help you find compatible skill partners, plan fair 1-on-1 study swap agendas, draft icebreaker messages, or answer academic & coding questions!

Choose a quick question below or ask me anything!`,
        timestamp: new Date().toISOString(),
        suggestions: [
          "Recommend a skill partner",
          "How does the match score work?",
          "Plan a 1-hour swap session",
        ],
      },
    ];
  });

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen to custom window event to open chat from anywhere
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-ai-chat", handleOpen);
    return () => window.removeEventListener("open-ai-chat", handleOpen);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Sync history to storage
  useEffect(() => {
    saveStoredChatHistory(messages);
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setIsTyping(true);

    try {
      // Build context
      const teachSkills = currentUser?.skills.filter((s) => s.kind === "teach").map((s) => s.name) || [];
      const learnSkills = currentUser?.skills.filter((s) => s.kind === "learn").map((s) => s.name) || [];
      const context = {
        userName: currentUser?.full_name,
        college: currentUser?.college,
        skills: { teach: teachSkills, learn: learnSkills },
      };

      const response = await generateAIResponse(text, newHistory, context);

      const botMsg: ChatMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: response.reply,
        timestamp: new Date().toISOString(),
        action: response.action,
        suggestions: response.suggestions,
      };

      setMessages((prev) => [...prev, botMsg]);

      if (settings.soundEnabled) {
        playNotificationChime();
      }

      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "Sorry, I ran into a hiccup generating that answer. Please try again!",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear conversation history?")) {
      const resetMsgs: ChatMessage[] = [
        {
          id: "welcome-" + Date.now(),
          role: "assistant",
          content: "Chat cleared! How can I help you today with your campus skill swaps?",
          timestamp: new Date().toISOString(),
          suggestions: [
            "Recommend a skill partner",
            "How does the match score work?",
            "Plan a 1-hour swap session",
          ],
        },
      ];
      setMessages(resetMsgs);
      saveStoredChatHistory(resetMsgs);
    }
  };

  const toggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(updated);
    saveStoredAISettings(updated);
  };

  const saveSettingsModal = () => {
    const updated: AISettings = {
      ...settings,
      apiKey: apiKeyInput.trim(),
      apiProvider: apiProviderInput as "custom-openai" | "groq" | "openrouter",
      model: customModelInput.trim() || undefined,
    };
    setSettings(updated);
    saveStoredAISettings(updated);
    setShowSettings(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          {/* Subtle initial greeting badge */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-card/95 px-3.5 py-1.5 shadow-lg backdrop-blur-md animate-rise">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground">Ask Campus AI</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-primary/30 active:scale-95"
            aria-label="Open AI Campus Mentor"
          >
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-accent opacity-30 blur group-hover:opacity-60 transition duration-300" />
            <div className="relative flex items-center justify-center">
              <Bot className="h-7 w-7 transition-transform group-hover:rotate-6" />
              <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-yellow-300 animate-spin" style={{ animationDuration: "6s" }} />
            </div>

            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-accent text-[9px] font-bold text-accent-foreground items-center justify-center">
                  1
                </span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-rise ${
            isExpanded
              ? "h-[90vh] w-[95vw] sm:w-[680px] sm:h-[800px]"
              : "h-[85vh] max-h-[640px] w-[92vw] sm:w-[420px]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 via-secondary/40 to-accent/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-md">
                <Bot className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-sm font-bold leading-tight">SwapBot</h3>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                    AI Mentor
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online • SkillSwap Campus
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                onClick={toggleSound}
                className="rounded-lg p-1.5 hover:bg-secondary hover:text-foreground transition-colors"
                title={settings.soundEnabled ? "Mute sounds" : "Enable sound chime"}
                aria-label="Toggle sound"
              >
                {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`rounded-lg p-1.5 hover:bg-secondary hover:text-foreground transition-colors ${
                  showSettings ? "bg-secondary text-primary" : ""
                }`}
                title="AI Settings (API Key / Model)"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:block rounded-lg p-1.5 hover:bg-secondary hover:text-foreground transition-colors"
                title={isExpanded ? "Collapse view" : "Expand view"}
                aria-label="Expand"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                onClick={handleClearHistory}
                className="rounded-lg p-1.5 hover:bg-secondary hover:text-foreground transition-colors"
                title="Clear chat history"
                aria-label="Clear chat"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Close chat"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Settings Overlay Drawer */}
          {showSettings && (
            <div className="border-b border-border bg-secondary/70 p-4 text-xs space-y-3 animate-rise">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-accent" /> Custom LLM Setup (Optional)
                </span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                By default, SwapBot uses its built-in expert campus engine with full platform awareness. You can optionally supply your own API key for live GPT-4 or Llama inference.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">Provider</label>
                <select
                  value={apiProviderInput}
                  onChange={(e) => setApiProviderInput(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="custom-openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="groq">Groq (Ultra-fast Llama 3.3)</option>
                  <option value="openrouter">OpenRouter (Multi-model)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">Model Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. gpt-4o-mini or llama-3.3-70b-versatile"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveSettingsModal}
                  className="flex-1 rounded-lg bg-primary py-1.5 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Save Settings
                </button>
                {settings.apiKey && (
                  <button
                    onClick={() => {
                      setApiKeyInput("");
                      setCustomModelInput("");
                      const cleared = { ...settings, apiKey: undefined, model: undefined };
                      setSettings(cleared);
                      saveStoredAISettings(cleared);
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Clear Key
                  </button>
                )}
              </div>
            </div>
          )}

          {/* User Status Bar if logged in */}
          {currentUser && (
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-3.5 py-1.5 text-[11px]">
              <span className="truncate text-muted-foreground">
                Logged in as <strong className="text-foreground">{currentUser.full_name}</strong> ({currentUser.college || "Campus"})
              </span>
              <span className="text-accent font-semibold flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Context Active
              </span>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-rise`}>
                  <div className="flex items-end gap-2 max-w-[88%]">
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-sm">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`relative group rounded-2xl px-4 py-2.5 text-sm ${
                        isUser
                          ? "rounded-br-sm bg-primary text-primary-foreground shadow-md"
                          : "rounded-bl-sm border border-border bg-secondary/80 text-foreground shadow-sm"
                      }`}
                    >
                      {/* Render markdown formatted text */}
                      <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                        {renderFormattedMessage(m.content)}
                      </div>

                      {/* Optional Action CTA */}
                      {m.action && (
                        <div className="mt-3 pt-2 border-t border-border/50">
                          <button
                            onClick={() => {
                              navigate({ to: m.action!.to as any });
                              if (window.innerWidth < 640) setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                          >
                            {m.action.label}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Copy Message button */}
                      <button
                        onClick={() => copyToClipboard(m.content, m.id)}
                        className={`absolute -top-2 right-2 hidden group-hover:flex items-center gap-1 rounded-md bg-card px-1.5 py-0.5 text-[10px] border border-border text-muted-foreground shadow-sm hover:text-foreground`}
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-2 ml-9 flex flex-wrap gap-1.5">
                      {m.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(sug)}
                          className="rounded-full border border-border bg-card/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary hover:text-primary active:scale-95"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 animate-rise">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-border bg-secondary/80 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="ml-1 text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="border-t border-border/60 bg-muted/30 px-3 py-2 overflow-x-auto no-scrollbar">
            <div className="flex gap-1.5 w-max">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isTyping}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-primary/40 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Footer */}
          <div className="border-t border-border bg-card p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask SwapBot anything about skills, matches, sessions..."
                disabled={isTyping}
                className="flex-1 rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span>Press Enter to send</span>
              <span className="flex items-center gap-1">
                Powered by <strong className="text-foreground">Campus AI</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Formatter helper for markdown styling */
function renderFormattedMessage(content: string) {
  const lines = content.split("\n");
  return lines.map((line, idx) => {
    // Header 3
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="font-display text-sm font-bold text-foreground mt-2 mb-1">
          {line.replace("### ", "")}
        </h4>
      );
    }
    // Header 4
    if (line.startsWith("#### ")) {
      return (
        <h5 key={idx} className="font-semibold text-xs text-foreground mt-1.5 mb-0.5">
          {line.replace("#### ", "")}
        </h5>
      );
    }
    // Blockquote
    if (line.startsWith("> ")) {
      return (
        <blockquote
          key={idx}
          className="border-l-2 border-accent pl-2.5 my-1 text-xs italic text-muted-foreground bg-accent/5 py-1 rounded-r-md"
        >
          {line.replace("> ", "")}
        </blockquote>
      );
    }
    // Bullet item
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <li key={idx} className="ml-4 list-disc text-xs leading-relaxed">
          {formatInline(line.slice(2))}
        </li>
      );
    }
    // Numbered item
    if (/^\d+\.\s/.test(line)) {
      return (
        <div key={idx} className="ml-1 text-xs leading-relaxed my-0.5">
          {formatInline(line)}
        </div>
      );
    }
    // Empty line
    if (!line.trim()) {
      return <div key={idx} className="h-1.5" />;
    }
    // Normal text
    return (
      <p key={idx} className="text-xs leading-relaxed">
        {formatInline(line)}
      </p>
    );
  });
}

function formatInline(str: string) {
  // Simple bold and code replacement
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

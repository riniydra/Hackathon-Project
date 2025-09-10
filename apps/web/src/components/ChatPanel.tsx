"use client";
import { useState, useEffect, useRef } from "react";
import { 
  ChatMessage, 
  ChatSession, 
  ChatStreamEvent,
  createChatSession, 
  listChatSessions, 
  getChatMessages, 
  deleteChatSession,
  streamChatMessage,
  me
} from "@/lib/api";
import { colors, radii } from "@/components/theme/tokens";

interface AnalysisData {
  intent: string;
  abuse_type: string;
  sentiment_score: number;
  risk_flags: Record<string, boolean>;
  risk_points: number;
  severity_score: number;
  escalation_index: number;
}

export default function ChatPanel() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [authed, setAuthed] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [warning, setWarning] = useState<string | undefined>();
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  // Lightweight metadata capture
  const [jurisdiction, setJurisdiction] = useState<string>("");
  const [childrenPresent, setChildrenPresent] = useState<""|"yes"|"no"|"prefer_not">("");
  const [confidentiality, setConfidentiality] = useState<"private"|"advocate_only"|"share_with_attorney"|"">("");
  const [shareWith, setShareWith] = useState<"nobody"|"advocate"|"attorney"|"">("");
  const [showContext, setShowContext] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamingBufferRef = useRef<string>("");
  const quickChips: {label:string; text:string}[] = [
    { label: "Safety plan", text: "Can you help me build a quick safety plan with steps to stay safe and items to prepare?" },
    { label: "Grounding", text: "Guide me through a brief grounding exercise to help with anxiety right now." },
    { label: "Breathing", text: "Walk me through a 4-7-8 breathing exercise for 1 minute." },
    { label: "Resources", text: "Share crisis and domestic violence hotline resources for my area and online." },
    { label: "Legal info", text: "What are general options for protective orders and how to prepare to speak with a lawyer?" },
  ];

  // Check auth status
  useEffect(() => {
    async function checkAuth() {
      try {
        const who = await me();
        const isAuthed = !!who?.user_id && who.user_id !== "demo";
        setAuthed(isAuthed);
        if (isAuthed) {
          await loadSessions();
        }
      } catch {
        setAuthed(false);
      }
    }
    checkAuth();
  }, []);

  // Load chat sessions
  async function loadSessions() {
    try {
      const data = await listChatSessions();
      setSessions(data || []);
    } catch (e: any) {
      setError("Failed to load chat sessions");
    }
  }

  // Load messages for a session
  async function loadMessages(sessionId: string) {
    try {
      const data = await getChatMessages(sessionId);
      setMessages(data || []);
    } catch (e: any) {
      setError("Failed to load messages");
    }
  }

  // Create new session
  async function createNewSession() {
    try {
      const session = await createChatSession();
      setCurrentSession(session);
      setMessages([]);
      setAnalysis(null);
      setWarning(undefined);
      await loadSessions();
      inputRef.current?.focus();
    } catch (e: any) {
      setError("Failed to create new session");
    }
  }

  // Send message
  async function sendMessage() {
    if (!inputMessage.trim() || isLoading || !authed) return;

    const messageText = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);
    setError(undefined);
    setAnalysis(null);
    setWarning(undefined);
    setStreamingContent("");
    streamingBufferRef.current = "";
    setIsStreaming(true);

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: Date.now(),
      session_id: currentSession?.session_id || "",
      role: "user",
      content: messageText,
      created_at: new Date().toISOString(),
      is_high_risk: false
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      await streamChatMessage(
        messageText,
        currentSession?.session_id,
        (event: ChatStreamEvent) => {
          switch (event.type) {
            case 'analysis':
              setAnalysis(event.data);
              break;
            case 'warning':
              setWarning(event.message);
              break;
            case 'content':
              setStreamingContent(prev => {
                const next = prev + (event.content || '');
                streamingBufferRef.current = next;
                return next;
              });
              break;
            case 'complete':
              // Add assistant message to messages
              const finalContent = streamingBufferRef.current;
              const resolvedSessionId = event.session_id || currentSession?.session_id || "";
              const assistantMessage: ChatMessage = {
                id: Date.now() + 1,
                session_id: resolvedSessionId,
                role: "assistant",
                content: finalContent,
                created_at: new Date().toISOString(),
                is_high_risk: false
              };
              setMessages(prev => [...prev, assistantMessage]);
              setStreamingContent("");
              setIsStreaming(false);
              setIsLoading(false);
              // Ensure current session is selected and refresh persisted messages
              if (!currentSession && resolvedSessionId) {
                setCurrentSession({ session_id: resolvedSessionId, created_at: new Date().toISOString(), message_count: 0 });
              }
              if (resolvedSessionId) {
                loadMessages(resolvedSessionId);
                loadSessions();
              }
              // Broadcast an event so InsightsPanel can refresh risk data
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("risk:refresh"));
              }
              break;
            case 'error':
              setError(event.message);
              setIsStreaming(false);
              setIsLoading(false);
              break;
          }
        },
        {
          jurisdiction: jurisdiction || undefined,
          children_present: childrenPresent === "" ? null : (childrenPresent === "yes" ? true : childrenPresent === "no" ? false : null),
          confidentiality: confidentiality || undefined,
          share_with: shareWith || undefined,
        }
      );
    } catch (e: any) {
      setError(e.message || "Failed to send message");
      setIsStreaming(false);
      setIsLoading(false);
    }
  }

  async function sendQuick(text: string) {
    if (isLoading || isStreaming || !authed) return;
    setInputMessage(text);
    // Defer to allow state update, then send
    setTimeout(() => {
      sendMessage();
    }, 0);
  }

  // Delete session
  async function handleDeleteSession(sessionId: string) {
    try {
      await deleteChatSession(sessionId);
      if (currentSession?.session_id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      await loadSessions();
    } catch (e: any) {
      setError("Failed to delete session");
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    // Keep the scroll pinned to the bottom while new content streams in
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!authed) {
    return (
      <div style={{ padding: 16, textAlign: "center", opacity: 0.7 }}>
        <p>Please log in to use the chat feature.</p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          The chat provides empathetic support with real-time risk assessment.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12, height: "100%" }}>
      {/* Session Management */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button 
          onClick={createNewSession}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          New Chat
        </button>
        {sessions.length > 0 && (
          <select
            value={currentSession?.session_id || ""}
            onChange={(e) => {
              const session = sessions.find(s => s.session_id === e.target.value);
              if (session) {
                setCurrentSession(session);
                loadMessages(session.session_id);
              }
            }}
            style={{ padding: "4px 8px", fontSize: 12 }}
          >
            <option value="">Select session...</option>
            {sessions.map(session => (
              <option key={session.session_id} value={session.session_id}>
                {new Date(session.created_at).toLocaleDateString()} ({session.message_count} msgs)
              </option>
            ))}
          </select>
        )}
        {currentSession && (
          <button
            onClick={() => handleDeleteSession(currentSession.session_id)}
            style={{ padding: "4px 8px", fontSize: 12, color: "crimson" }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Analysis Display */}
      {analysis && (
        <div style={{ 
          background: "#f0f9ff", 
          border: "1px solid #0ea5e9", 
          borderRadius: 8, 
          padding: 12,
          fontSize: 12
        }}>
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>Analysis:</div>
          <div>Intent: {analysis.intent}</div>
          <div>Abuse Type: {analysis.abuse_type}</div>
          <div>Sentiment: {analysis.sentiment_score.toFixed(2)}</div>
          <div>Risk Points: {analysis.risk_points}</div>
          {Object.entries(analysis.risk_flags).some(([_, flag]) => flag) && (
            <div style={{ marginTop: 4 }}>
              <strong>Risk Flags:</strong> {Object.entries(analysis.risk_flags)
                .filter(([_, flag]) => flag)
                .map(([key, _]) => key.replace(/_/g, ' '))
                .join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Warning Display */}
      {warning && (
        <div style={{ 
          background: "#fef2f2", 
          border: "1px solid #ef4444", 
          borderRadius: 8, 
          padding: 12,
          fontSize: 12,
          color: "#dc2626"
        }}>
          <strong>⚠️ Warning:</strong> {warning}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ color: "crimson", fontSize: 12 }}>{error}</div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: 12,
          display: "grid",
          gap: 12,
          minHeight: 200,
          maxHeight: "60vh", // ensure a scrollable area within the side panel
          background: "#fff"
        }}
      >
        {messages.length === 0 && !isStreaming && (
          <div style={{ textAlign: "center", opacity: 0.7, padding: 20 }}>
            <p>Start a conversation...</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              I'm here to provide empathetic support. Share what's on your mind.
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent: message.role === "user" ? "flex-end" : "flex-start"
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "8px 12px",
                borderRadius: radii.md,
                background: message.role === "user" ? colors.blue : colors.cardBg,
                color: message.role === "user" ? "white" : colors.slateText,
                fontSize: 14,
                lineHeight: 1.4
              }}
            >
              {message.content}
              {message.is_high_risk && (
                <div style={{ 
                  fontSize: 10, 
                  opacity: 0.8, 
                  marginTop: 4,
                  color: message.role === "user" ? "#fbbf24" : "#dc2626"
                }}>
                  ⚠️ High Risk
                </div>
              )}
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: message.role === "user" ? "right" : "left" }}>
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming content */}
        {isStreaming && streamingContent && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                maxWidth: "80%",
                padding: "8px 12px",
                borderRadius: radii.md,
                background: colors.cardBg,
                fontSize: 14,
                lineHeight: 1.4
              }}
            >
              {streamingContent}
              <span style={{ animation: "blink 1s infinite" }}>|</span>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>Assistant is typing…</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {quickChips.map((c) => (
          <button
            key={c.label}
            onClick={() => sendQuick(c.text)}
            disabled={!authed || isLoading || isStreaming}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: radii.pill,
              border: `1px solid ${colors.border}`,
              background: "var(--rs-teal-light)",
              opacity: (!authed || isLoading || isStreaming) ? 0.6 : 1,
              cursor: (!authed || isLoading || isStreaming) ? "not-allowed" : "pointer"
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Context capture (collapsible) */}
      <div style={{ marginTop: 4 }}>
        <button
          onClick={() => setShowContext(s => !s)}
          style={{ fontSize: 12, border: "1px solid #d1d5db", background: "#fff", borderRadius: 8, padding: "4px 8px" }}
        >
          {showContext ? "Hide Context" : "Show Context"}
        </button>
        {showContext && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <input
              placeholder="Jurisdiction (city/county)"
              value={jurisdiction}
              onChange={(e)=>setJurisdiction(e.target.value)}
              style={{ padding:"6px 8px", border:`1px solid ${colors.border}`, borderRadius:radii.md, fontSize:12, background:'#fff' }}
            />
            <select value={childrenPresent} onChange={(e)=>setChildrenPresent(e.target.value as any)}
              style={{ padding:"6px 8px", border:`1px solid ${colors.border}`, borderRadius:radii.md, fontSize:12, background:'#fff' }}>
              <option value="">Children Present</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>
            <select value={confidentiality} onChange={(e)=>setConfidentiality(e.target.value as any)}
              style={{ padding:"6px 8px", border:`1px solid ${colors.border}`, borderRadius:radii.md, fontSize:12, background:'#fff' }}>
              <option value="">Confidentiality</option>
              <option value="private">Private</option>
              <option value="advocate_only">Advocate only</option>
              <option value="share_with_attorney">Share with attorney</option>
            </select>
            <select value={shareWith} onChange={(e)=>setShareWith(e.target.value as any)}
              style={{ padding:"6px 8px", border:`1px solid ${colors.border}`, borderRadius:radii.md, fontSize:12, background:'#fff' }}>
              <option value="">Share With</option>
              <option value="nobody">Nobody</option>
              <option value="advocate">Advocate</option>
              <option value="attorney">Attorney</option>
            </select>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          ref={inputRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading || isStreaming}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            fontSize: 14
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!inputMessage.trim() || isLoading || isStreaming}
          style={{
            padding: "8px 16px",
            background: colors.skyDark,
            color: "white",
            border: "none",
            borderRadius: radii.md,
            fontSize: 14,
            opacity: (!inputMessage.trim() || isLoading || isStreaming) ? 0.5 : 1
          }}
        >
          {isLoading || isStreaming ? "..." : "Send"}
        </button>
      </div>

      <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center" }}>
        Press Enter to send • Esc to hide • ⌘+. for quick exit
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";
import { createChatEvent, listChatEvents } from "@/lib/api";
import GuidedChips from "./GuidedChips";

interface ChatEvent {
  id: number;
  user_id: string;
  created_at: string;
  role: 'user' | 'assistant';
  message: string;
  extra_json?: Record<string, any>;
}

interface GuidedChipData {
  substance_use?: string;
  frequency_of_abuse?: string;
  financial_control?: string;
  reporting_history?: string;
  recent_escalation?: string;
  safety_plan?: string;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatEvent[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGuidedChips, setShowGuidedChips] = useState(false);
  const [error, setError] = useState<string>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function loadChatHistory() {
    try {
      const events = await listChatEvents();
      setMessages(events.reverse()); // Show oldest first
    } catch (e: any) {
      setError("Failed to load chat history");
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setInput("");
    setLoading(true);
    setError(undefined);

    try {
      // Add user message
      const userEvent = await createChatEvent('user', userMessage);
      setMessages(prev => [...prev, userEvent]);

      // Simple auto-response for demo
      const responses = [
        "I understand. Can you tell me more about that?",
        "That sounds difficult. How are you feeling about this situation?",
        "Thank you for sharing. Would you like to explore some resources that might help?",
        "I'm here to listen. What would be most helpful for you right now?",
        "It takes courage to talk about these things. You're not alone in this."
      ];
      
      const assistantMessage = responses[Math.floor(Math.random() * responses.length)];
      
      setTimeout(async () => {
        try {
          const assistantEvent = await createChatEvent('assistant', assistantMessage);
          setMessages(prev => [...prev, assistantEvent]);
        } catch (e) {
          console.error("Failed to add assistant message:", e);
        }
        setLoading(false);
      }, 1000);

    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to send message");
      setLoading(false);
    }
  }

  function handleGuidedChipsComplete(data: GuidedChipData) {
    setShowGuidedChips(false);
    // Add a system message indicating chips were completed
    createChatEvent('assistant', 
      "Thank you for completing the guided assessment. This information helps me better understand your situation and provide more relevant support.",
      { guided_chips_completed: true, chip_data: data }
    ).then(event => {
      setMessages(prev => [...prev, event]);
    }).catch(e => {
      console.error("Failed to save guided chips completion:", e);
    });
  }

  function formatTimestamp(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString();
  }

  return (
    <div style={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      background: "#f9fafb"
    }}>
      {/* Header */}
      <div style={{ 
        padding: 16, 
        borderBottom: "1px solid #e5e7eb", 
        background: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h2 style={{ margin: 0, color: "#1f2937" }}>Support Chat</h2>
        <button
          onClick={() => setShowGuidedChips(!showGuidedChips)}
          style={{
            background: showGuidedChips ? "#ef4444" : "#3b82f6",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          {showGuidedChips ? "Hide Assessment" : "Quick Assessment"}
        </button>
      </div>

      {/* Guided Chips Panel */}
      {showGuidedChips && (
        <div style={{ 
          padding: 16, 
          borderBottom: "1px solid #e5e7eb",
          background: "#f3f4f6"
        }}>
          <GuidedChips onComplete={handleGuidedChipsComplete} />
        </div>
      )}

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}>
        {messages.length === 0 && !loading && (
          <div style={{ 
            textAlign: "center", 
            color: "#6b7280", 
            padding: 40 
          }}>
            <p>Welcome to the support chat. This is a safe space to talk.</p>
            <p>You can start by typing a message or using the Quick Assessment above.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ 
            display: "flex", 
            justifyContent: msg.role === 'user' ? "flex-end" : "flex-start"
          }}>
            <div style={{
              maxWidth: "70%",
              background: msg.role === 'user' ? "#3b82f6" : "white",
              color: msg.role === 'user' ? "white" : "#1f2937",
              padding: 12,
              borderRadius: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: msg.role === 'assistant' ? "1px solid #e5e7eb" : "none"
            }}>
              <div>{msg.message}</div>
              {msg.extra_json?.guided_chips_completed && (
                <div style={{ 
                  marginTop: 8, 
                  fontSize: 12, 
                  opacity: 0.8,
                  fontStyle: "italic"
                }}>
                  ✓ Assessment completed
                </div>
              )}
              <div style={{ 
                fontSize: 11, 
                opacity: 0.7, 
                marginTop: 4 
              }}>
                {formatTimestamp(msg.created_at)}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              background: "white",
              padding: 12,
              borderRadius: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb",
              color: "#6b7280"
            }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  background: "#9ca3af",
                  animation: "pulse 1.5s ease-in-out infinite"
                }} />
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  background: "#9ca3af",
                  animation: "pulse 1.5s ease-in-out infinite 0.5s"
                }} />
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  background: "#9ca3af",
                  animation: "pulse 1.5s ease-in-out infinite 1s"
                }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ 
        padding: 16, 
        borderTop: "1px solid #e5e7eb", 
        background: "white"
      }}>
        {error && (
          <div style={{ 
            color: "#ef4444", 
            fontSize: 14, 
            marginBottom: 8 
          }}>
            {error}
          </div>
        )}
        
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type your message here..."
            disabled={loading}
            style={{
              flex: 1,
              padding: 12,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              background: loading ? "#f9fafb" : "white"
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? "#9ca3af" : "#3b82f6",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: 8,
              fontSize: 14,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontWeight: 500
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 80%, 100% {
            opacity: 0.3;
          }
          40% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
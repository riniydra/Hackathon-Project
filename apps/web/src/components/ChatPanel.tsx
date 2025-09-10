"use client";
import { useState, useEffect, useRef } from "react";
import { getChatContext, ProfileData, ChatMessage, ChatContextOverrides } from "@/lib/api";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  contextOverrides?: ChatContextOverrides;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContextOverrides, setShowContextOverrides] = useState(false);
  
  // Context override states
  const [confidentiality, setConfidentiality] = useState<string>("");
  const [shareWith, setShareWith] = useState<string>("");
  const [includeProfile, setIncludeProfile] = useState<boolean>(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date(),
      contextOverrides: showContextOverrides ? {
        confidentiality: confidentiality || undefined,
        share_with: shareWith || undefined,
        include_profile: includeProfile
      } : undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    
    try {
      // Create chat message with context overrides
      const chatMessage: ChatMessage = {
        message: userMessage.content,
        context_overrides: userMessage.contextOverrides
      };
      
      // For now, simulate streaming response
      // In production, you'd handle the actual streaming response from the API
      const response = await mockStreamingResponse(chatMessage);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble responding right now. Please try again later.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const mockStreamingResponse = async (chatMessage: ChatMessage): Promise<string> => {
    // Mock implementation - in production, handle actual streaming
    return `I hear you, and I want you to know that your feelings are completely valid. It takes courage to reach out and share what you're experiencing. You deserve support and care.

If you're in immediate danger, please reach out to:
• National Domestic Violence Hotline: 1-800-799-7233
• Crisis Text Line: Text HOME to 741741
• Local emergency services: 911

Remember, this conversation is confidential and you're in control of what you share.`;
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const resetContextOverrides = () => {
    setConfidentiality("");
    setShareWith("");
    setIncludeProfile(true);
  };
  
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      maxHeight: "600px",
      background: "#fff",
      borderRadius: "8px",
      border: "1px solid #ddd"
    }}>
      {/* Header */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h3 style={{ margin: 0, fontSize: "1.1em" }}>Support Chat</h3>
        <button
          onClick={() => setShowContextOverrides(!showContextOverrides)}
          style={{
            background: showContextOverrides ? "#e3f2fd" : "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "0.8em",
            cursor: "pointer"
          }}
        >
          {showContextOverrides ? "Hide" : "Show"} Privacy Controls
        </button>
      </div>
      
      {/* Context Override Controls */}
      {showContextOverrides && (
        <div style={{
          padding: "12px 16px",
          background: "#f9f9f9",
          borderBottom: "1px solid #eee",
          fontSize: "0.85em"
        }}>
          <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={includeProfile}
                onChange={e => setIncludeProfile(e.target.checked)}
              />
              Include my profile context
            </label>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <select
                value={confidentiality}
                onChange={e => setConfidentiality(e.target.value)}
                style={{ padding: "4px", fontSize: "0.85em" }}
              >
                <option value="">Default confidentiality</option>
                <option value="private">Private</option>
                <option value="shared">Shared</option>
                <option value="anonymous">Anonymous</option>
              </select>
              
              <input
                type="text"
                placeholder="Override share with..."
                value={shareWith}
                onChange={e => setShareWith(e.target.value)}
                style={{ padding: "4px", fontSize: "0.85em" }}
              />
            </div>
            
            <button
              onClick={resetContextOverrides}
              style={{
                background: "none",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "0.75em",
                cursor: "pointer",
                width: "fit-content"
              }}
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: "center",
            color: "#666",
            fontSize: "0.9em",
            padding: "20px"
          }}>
            <p>This is a safe space to talk. Your conversation is private and confidential.</p>
            <p style={{ fontSize: "0.8em", marginTop: "8px" }}>
              💡 Use the privacy controls above to customize how your profile information is used in this conversation.
            </p>
          </div>
        )}
        
        {messages.map(message => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent: message.isUser ? "flex-end" : "flex-start"
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "12px",
                borderRadius: "12px",
                background: message.isUser ? "#007bff" : "#f1f1f1",
                color: message.isUser ? "white" : "black",
                fontSize: "0.9em",
                lineHeight: "1.4",
                whiteSpace: "pre-wrap"
              }}
            >
              {message.content}
              {message.contextOverrides && (
                <div style={{
                  marginTop: "8px",
                  fontSize: "0.75em",
                  opacity: 0.8,
                  borderTop: "1px solid rgba(255,255,255,0.3)",
                  paddingTop: "4px"
                }}>
                  Privacy: {message.contextOverrides.confidentiality || "default"} | 
                  Profile: {message.contextOverrides.include_profile ? "included" : "excluded"}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "12px",
              borderRadius: "12px",
              background: "#f1f1f1",
              fontSize: "0.9em"
            }}>
              Typing...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div style={{
        padding: "16px",
        borderTop: "1px solid #eee",
        display: "flex",
        gap: "8px"
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          style={{
            flex: 1,
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            resize: "none",
            minHeight: "44px",
            maxHeight: "120px",
            fontSize: "0.9em"
          }}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 16px",
            background: loading || !input.trim() ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontSize: "0.9em"
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
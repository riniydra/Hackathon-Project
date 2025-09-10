"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { me } from "@/lib/api";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysis?: {
    sentiment: string;
    riskLevel: 'low' | 'medium' | 'high';
    keywords: string[];
    suggestions: string[];
  };
}

interface ChatPanelProps {
  onClose?: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [showCopyButton, setShowCopyButton] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll functionality with edge case handling
  const scrollToBottom = useCallback((force = false) => {
    if (!chatContainerRef.current || !messagesEndRef.current) return;
    
    const container = chatContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // Auto-scroll if user is near bottom or force is true
    if (isNearBottom || force) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, []);
  
  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await me();
        setAuthed(!!user?.user_id && user.user_id !== "demo");
      } catch {
        setAuthed(false);
      }
    }
    checkAuth();
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // Handle scroll events to show/hide scroll button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;
      // Could add scroll-to-bottom button visibility logic here if needed
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !authed) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    // Force scroll after adding user message
    setTimeout(() => scrollToBottom(true), 100);
    
    try {
      // TODO: Replace with actual chat API call
      // Simulate API response for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I understand you're sharing something important with me. I'm here to listen and provide support. How are you feeling right now?",
        timestamp: new Date(),
        analysis: {
          sentiment: "neutral",
          riskLevel: "low",
          keywords: ["support", "listening", "feelings"],
          suggestions: ["Continue the conversation", "Ask about coping strategies", "Explore feelings further"]
        }
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Force scroll after assistant response
      setTimeout(() => scrollToBottom(true), 100);
      
    } catch (error) {
      console.error("Chat error:", error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyLastReply = () => {
    const lastAssistantMessage = messages
      .filter(m => m.type === 'assistant')
      .pop();
    
    if (lastAssistantMessage) {
      navigator.clipboard.writeText(lastAssistantMessage.content);
      // Could add toast notification here
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  if (!authed) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "var(--spacing-xl)",
        color: "var(--color-text-secondary)"
      }}>
        <p>Please log in to access the chat feature.</p>
      </div>
    );
  }
  
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      maxHeight: "100vh"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--spacing-md)",
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-background)"
      }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
          Support Chat
        </h2>
        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
          {showCopyButton && messages.some(m => m.type === 'assistant') && (
            <button
              onClick={copyLastReply}
              style={{
                padding: "var(--spacing-xs) var(--spacing-sm)",
                fontSize: "0.875rem",
                border: "1px solid var(--color-button-border)",
                borderRadius: "var(--border-radius-sm)",
                backgroundColor: "var(--color-button-background)",
                cursor: "pointer"
              }}
              title="Copy last reply"
            >
              📋 Copy
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "var(--spacing-xs) var(--spacing-sm)",
                fontSize: "0.875rem",
                border: "1px solid var(--color-button-border)",
                borderRadius: "var(--border-radius-sm)",
                backgroundColor: "var(--color-button-background)",
                cursor: "pointer"
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--spacing-md)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-md)"
        }}
      >
        {messages.length === 0 && (
          <div style={{
            textAlign: "center",
            color: "var(--color-text-secondary)",
            padding: "var(--spacing-xl)"
          }}>
            <p>Start a conversation. I'm here to listen and support you.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              flexDirection: message.type === 'user' ? "row-reverse" : "row",
              gap: "var(--spacing-sm)"
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "var(--spacing-md)",
                borderRadius: "var(--border-radius-md)",
                backgroundColor: message.type === 'user' 
                  ? "var(--color-tab-active)" 
                  : "var(--color-background-muted)",
                border: "1px solid var(--color-border)"
              }}
            >
              <p style={{ margin: 0, lineHeight: 1.5 }}>{message.content}</p>
              <div style={{
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                marginTop: "var(--spacing-xs)"
              }}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {/* Analysis Cards */}
        {messages
          .filter(m => m.type === 'assistant' && m.analysis)
          .slice(-1) // Show only the latest analysis
          .map((message) => (
            <div
              key={`analysis-${message.id}`}
              style={{
                marginTop: "var(--spacing-sm)",
                padding: "var(--spacing-md)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius-md)",
                backgroundColor: "var(--color-background-muted)"
              }}
            >
              {/* Styled Analysis Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--spacing-sm)",
                paddingBottom: "var(--spacing-sm)",
                borderBottom: "1px solid var(--color-border-light)"
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--color-text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-xs)"
                }}>
                  <span style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: message.analysis!.riskLevel === 'high' 
                      ? "var(--color-risk-high)"
                      : message.analysis!.riskLevel === 'medium'
                      ? "var(--color-risk-warn)"
                      : "var(--color-risk-low)"
                  }}></span>
                  Analysis
                </h4>
                <span style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                  textTransform: "capitalize"
                }}>
                  {message.analysis!.sentiment} • {message.analysis!.riskLevel} risk
                </span>
              </div>
              
              {message.analysis!.keywords.length > 0 && (
                <div style={{ marginBottom: "var(--spacing-sm)" }}>
                  <div style={{
                    fontSize: "0.75rem",
                    fontWeight: "500",
                    color: "var(--color-text-secondary)",
                    marginBottom: "var(--spacing-xs)"
                  }}>
                    Key themes:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)" }}>
                    {message.analysis!.keywords.map((keyword, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px var(--spacing-xs)",
                          backgroundColor: "var(--color-background)",
                          border: "1px solid var(--color-border-light)",
                          borderRadius: "var(--border-radius-sm)",
                          color: "var(--color-text-secondary)"
                        }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {message.analysis!.suggestions.length > 0 && (
                <div>
                  <div style={{
                    fontSize: "0.75rem",
                    fontWeight: "500",
                    color: "var(--color-text-secondary)",
                    marginBottom: "var(--spacing-xs)"
                  }}>
                    Suggestions:
                  </div>
                  <ul style={{
                    margin: 0,
                    paddingLeft: "var(--spacing-md)",
                    fontSize: "0.75rem",
                    color: "var(--color-text-secondary)"
                  }}>
                    {message.analysis!.suggestions.map((suggestion, i) => (
                      <li key={i} style={{ marginBottom: "2px" }}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        
        {isLoading && (
          <div style={{
            display: "flex",
            gap: "var(--spacing-sm)",
            alignItems: "center"
          }}>
            <div style={{
              padding: "var(--spacing-md)",
              borderRadius: "var(--border-radius-md)",
              backgroundColor: "var(--color-background-muted)",
              border: "1px solid var(--color-border)"
            }}>
              <div style={{ display: "flex", gap: "4px" }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-text-muted)",
                  animation: "pulse 1.5s ease-in-out infinite"
                }}></div>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-text-muted)",
                  animation: "pulse 1.5s ease-in-out infinite 0.5s"
                }}></div>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-text-muted)",
                  animation: "pulse 1.5s ease-in-out infinite 1s"
                }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "var(--spacing-sm)",
          padding: "var(--spacing-md)",
          borderTop: "1px solid var(--color-border)",
          backgroundColor: "var(--color-background)"
        }}
      >
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          disabled={isLoading}
          style={{
            flex: 1,
            minHeight: "44px",
            maxHeight: "120px",
            padding: "var(--spacing-sm)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--border-radius-sm)",
            fontSize: "1rem",
            lineHeight: 1.5,
            resize: "none",
            fontFamily: "inherit"
          }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          style={{
            padding: "var(--spacing-sm) var(--spacing-md)",
            border: "1px solid var(--color-button-border)",
            borderRadius: "var(--border-radius-sm)",
            backgroundColor: inputValue.trim() && !isLoading 
              ? "var(--color-tab-active)" 
              : "var(--color-button-background)",
            cursor: inputValue.trim() && !isLoading ? "pointer" : "not-allowed",
            opacity: inputValue.trim() && !isLoading ? 1 : 0.6,
            fontSize: "0.875rem",
            fontWeight: "500"
          }}
        >
          {isLoading ? "..." : "Send"}
        </button>
      </form>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
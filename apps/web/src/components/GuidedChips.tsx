"use client";
import { useState, useEffect } from "react";
import { saveGuidedChipResponses, getLatestGuidedChips } from "@/lib/api";

interface ChipOption {
  value: string;
  label: string;
  color?: string;
}

interface ChipQuestion {
  key: keyof GuidedChipData;
  question: string;
  options: ChipOption[];
  description?: string;
}

interface GuidedChipData {
  substance_use?: string;
  frequency_of_abuse?: string;
  financial_control?: string;
  reporting_history?: string;
  recent_escalation?: string;
  safety_plan?: string;
}

const CHIP_QUESTIONS: ChipQuestion[] = [
  {
    key: "substance_use",
    question: "Is substance use involved?",
    description: "Does your partner use drugs or alcohol in ways that affect your safety?",
    options: [
      { value: "none", label: "No substance use", color: "#10b981" },
      { value: "occasional", label: "Occasional use", color: "#f59e0b" },
      { value: "frequent", label: "Frequent use", color: "#ef4444" },
      { value: "unknown", label: "I'm not sure", color: "#6b7280" }
    ]
  },
  {
    key: "frequency_of_abuse",
    question: "How often do incidents occur?",
    description: "How frequently do you experience harmful behaviors?",
    options: [
      { value: "rare", label: "Very rarely", color: "#10b981" },
      { value: "monthly", label: "Monthly or less", color: "#f59e0b" },
      { value: "weekly", label: "Weekly", color: "#ef4444" },
      { value: "daily", label: "Daily or more", color: "#dc2626" }
    ]
  },
  {
    key: "financial_control",
    question: "Do you have access to money?",
    description: "Are you able to access and control your own finances?",
    options: [
      { value: "full_access", label: "Full access", color: "#10b981" },
      { value: "limited", label: "Limited access", color: "#f59e0b" },
      { value: "no_access", label: "No access", color: "#ef4444" },
      { value: "shared", label: "Shared control", color: "#6b7280" }
    ]
  },
  {
    key: "reporting_history",
    question: "Have you reported incidents before?",
    description: "Have you previously contacted police, counselors, or other authorities?",
    options: [
      { value: "never", label: "Never reported", color: "#6b7280" },
      { value: "informal", label: "Told friends/family", color: "#f59e0b" },
      { value: "formal", label: "Contacted authorities", color: "#10b981" },
      { value: "multiple", label: "Multiple reports", color: "#3b82f6" }
    ]
  },
  {
    key: "recent_escalation",
    question: "Has the situation gotten worse recently?",
    description: "Have incidents become more frequent or severe in recent weeks?",
    options: [
      { value: "no_change", label: "No change", color: "#6b7280" },
      { value: "slight", label: "Slightly worse", color: "#f59e0b" },
      { value: "significant", label: "Much worse", color: "#ef4444" },
      { value: "severe", label: "Dangerously worse", color: "#dc2626" }
    ]
  },
  {
    key: "safety_plan",
    question: "Do you have a safety plan?",
    description: "Do you have a plan for staying safe if you need to leave quickly?",
    options: [
      { value: "complete", label: "Yes, detailed plan", color: "#10b981" },
      { value: "basic", label: "Basic plan", color: "#f59e0b" },
      { value: "none", label: "No plan", color: "#ef4444" },
      { value: "need_help", label: "Need help creating one", color: "#3b82f6" }
    ]
  }
];

export default function GuidedChips({ onComplete }: { onComplete?: (data: GuidedChipData) => void }) {
  const [responses, setResponses] = useState<GuidedChipData>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Load any existing responses
    loadExistingResponses();
  }, []);

  async function loadExistingResponses() {
    try {
      const data = await getLatestGuidedChips();
      if (data.guided_chips) {
        setResponses(data.guided_chips);
        // Find the first unanswered question
        const unanswered = CHIP_QUESTIONS.findIndex(q => !data.guided_chips[q.key]);
        if (unanswered >= 0) {
          setCurrentQuestion(unanswered);
        } else {
          setCompleted(true);
        }
      }
    } catch (e) {
      // Ignore errors - user might not have any responses yet
    }
  }

  function handleChipSelect(questionKey: keyof GuidedChipData, value: string) {
    const newResponses = { ...responses, [questionKey]: value };
    setResponses(newResponses);

    // Move to next question automatically
    if (currentQuestion < CHIP_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      // All questions answered
      setTimeout(() => setCompleted(true), 300);
    }
  }

  async function saveResponses() {
    setLoading(true);
    setError(undefined);
    try {
      await saveGuidedChipResponses(responses);
      onComplete?.(responses);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to save responses");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResponses({});
    setCurrentQuestion(0);
    setCompleted(false);
    setError(undefined);
  }

  const progress = (Object.keys(responses).length / CHIP_QUESTIONS.length) * 100;

  if (completed) {
    return (
      <div style={{ 
        background: "white", 
        borderRadius: 12, 
        padding: 24, 
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        maxWidth: 500,
        margin: "0 auto"
      }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#1f2937" }}>Assessment Complete</h3>
        <p style={{ color: "#6b7280", marginBottom: 20 }}>
          Thank you for providing this information. Your responses help us better understand your situation.
        </p>
        
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {CHIP_QUESTIONS.map(q => {
            const response = responses[q.key];
            const option = q.options.find(opt => opt.value === response);
            return response ? (
              <div key={q.key} style={{
                background: option?.color || "#f3f4f6",
                color: "white",
                padding: "6px 12px",
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 500
              }}>
                {q.question.split("?")[0]}: {option?.label}
              </div>
            ) : null;
          })}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button 
            onClick={saveResponses}
            disabled={loading}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: 8,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Saving..." : "Save Responses"}
          </button>
          <button 
            onClick={reset}
            style={{
              background: "transparent",
              color: "#6b7280",
              border: "1px solid #d1d5db",
              padding: "12px 24px",
              borderRadius: 8,
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            Start Over
          </button>
        </div>

        {error && (
          <div style={{ color: "#ef4444", marginTop: 12, fontSize: 14 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  const question = CHIP_QUESTIONS[currentQuestion];

  return (
    <div style={{ 
      background: "white", 
      borderRadius: 12, 
      padding: 24, 
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      maxWidth: 500,
      margin: "0 auto"
    }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 8 
        }}>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            Question {currentQuestion + 1} of {CHIP_QUESTIONS.length}
          </span>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            {Math.round(progress)}% complete
          </span>
        </div>
        <div style={{ 
          background: "#f3f4f6", 
          borderRadius: 4, 
          height: 6, 
          overflow: "hidden" 
        }}>
          <div style={{ 
            background: "#3b82f6", 
            height: "100%", 
            width: `${progress}%`,
            transition: "width 0.3s ease"
          }} />
        </div>
      </div>

      <h3 style={{ margin: "0 0 8px 0", color: "#1f2937" }}>
        {question.question}
      </h3>
      
      {question.description && (
        <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 14 }}>
          {question.description}
        </p>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {question.options.map(option => (
          <button
            key={option.value}
            onClick={() => handleChipSelect(question.key, option.value)}
            style={{
              background: responses[question.key] === option.value ? option.color : "transparent",
              color: responses[question.key] === option.value ? "white" : "#374151",
              border: `2px solid ${responses[question.key] === option.value ? option.color : "#d1d5db"}`,
              padding: "12px 16px",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              fontWeight: responses[question.key] === option.value ? 600 : 400,
              transition: "all 0.2s ease"
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <button
          onClick={() => currentQuestion > 0 && setCurrentQuestion(currentQuestion - 1)}
          disabled={currentQuestion === 0}
          style={{
            background: "transparent",
            color: currentQuestion === 0 ? "#9ca3af" : "#6b7280",
            border: "1px solid #d1d5db",
            padding: "8px 16px",
            borderRadius: 6,
            cursor: currentQuestion === 0 ? "not-allowed" : "pointer"
          }}
        >
          Previous
        </button>
        
        <button
          onClick={() => setCurrentQuestion(Math.min(currentQuestion + 1, CHIP_QUESTIONS.length - 1))}
          disabled={currentQuestion === CHIP_QUESTIONS.length - 1}
          style={{
            background: currentQuestion === CHIP_QUESTIONS.length - 1 ? "#9ca3af" : "#3b82f6",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 6,
            cursor: currentQuestion === CHIP_QUESTIONS.length - 1 ? "not-allowed" : "pointer"
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
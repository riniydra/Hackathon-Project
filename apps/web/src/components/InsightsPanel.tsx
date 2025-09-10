"use client";
import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { getRiskScore, exportTableau, exportFullData, listExports } from "@/lib/api";

interface RiskData {
  score: number;
  level: string;
  reasons: string[];
  feature_scores: Record<string, number>;
  weights: Record<string, number>;
  thresholds: Record<string, number>;
}

interface ExportData {
  filename: string;
  path: string;
  type: string;
  size: number;
  created: string;
}

export interface InsightsPanelRef {
  refreshRiskData: () => Promise<void>;
}

const InsightsPanel = forwardRef<InsightsPanelRef>((props, ref) => {
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [exports, setExports] = useState<ExportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function loadRiskData() {
    setRiskLoading(true);
    try {
      const data = await getRiskScore();
      setRiskData(data);
    } catch (e: any) {
      setError("Failed to load risk data");
    } finally {
      setRiskLoading(false);
    }
  }

  async function loadExports() {
    try {
      const data = await listExports();
      setExports(data.exports || []);
    } catch (e: any) {
      setError("Failed to load exports");
    }
  }

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshRiskData: loadRiskData
  }));

  async function handleExportTableau() {
    setLoading(true);
    try {
      const result = await exportTableau();
      console.log("Tableau export created:", result);
      await loadExports(); // Refresh exports list
    } catch (e: any) {
      setError("Failed to create Tableau export");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportFull() {
    setLoading(true);
    try {
      const result = await exportFullData();
      console.log("Full export created:", result);
      await loadExports(); // Refresh exports list
    } catch (e: any) {
      setError("Failed to create full export");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRiskData();
    loadExports();
  }, []);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'var(--color-risk-high)';
      case 'warn': return 'var(--color-risk-warn)';
      case 'low': return 'var(--color-risk-low)';
      default: return 'var(--color-risk-default)';
    }
  };

  const getRiskLevelLabel = (level: string) => {
    switch (level) {
      case 'high': return 'High Risk';
      case 'warn': return 'Warning';
      case 'low': return 'Low Risk';
      case 'demo': return 'Demo Mode';
      default: return 'Unknown';
    }
  };

  return (
    <div className="insights-panel" style={{display:"grid", gap:"var(--spacing-lg)", maxWidth:600}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h3>Risk Insights</h3>
        <button 
          onClick={loadRiskData}
          disabled={riskLoading}
          style={{
            padding:"var(--spacing-xs) var(--spacing-sm)", 
            fontSize:12, 
            border:"1px solid var(--color-button-border)", 
            borderRadius:"var(--border-radius-sm)", 
            backgroundColor:"var(--color-button-background)",
            cursor: riskLoading ? "not-allowed" : "pointer",
            opacity: riskLoading ? 0.6 : 1
          }}
        >
          {riskLoading ? "🔄 Updating..." : "🔄 Refresh"}
        </button>
      </div>
      
      {riskData ? (
        <div className="risk-card mobile-compact" style={{display:"grid", gap:"var(--spacing-md)", padding:"var(--spacing-lg)", border:"1px solid var(--color-border)", borderRadius:"var(--border-radius-md)"}}>
          <div className="risk-summary mobile-stack" style={{display:"flex", alignItems:"center", gap:"var(--spacing-lg)"}}>
            <div style={{position:"relative", width:64, height:64}} aria-label="Risk score donut">
              <svg width="64" height="64" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="19" stroke="var(--color-border)" strokeWidth="4" fill="none"/>
                <circle 
                  cx="21" cy="21" r="19" 
                  stroke={getRiskLevelColor(riskData.level)} 
                  strokeWidth="4" 
                  fill="none"
                  className="donut-animated"
                  style={{
                    '--donut-progress': Math.round(riskData.score*100),
                    strokeDasharray: `${Math.round(riskData.score*100)} ${100-Math.round(riskData.score*100)}`,
                    strokeDashoffset: '25',
                    transformOrigin: 'center'
                  } as React.CSSProperties}
                />
                <text x="21" y="24" textAnchor="middle" fontSize="10" fill="var(--color-text-primary)" fontWeight="bold">{Math.round(riskData.score*100)}</text>
              </svg>
            </div>
            <div>
              <div style={{fontWeight:"bold"}}>{getRiskLevelLabel(riskData.level)}</div>
              <div style={{fontSize:14, color:"var(--color-text-secondary)"}}>Score: {riskData.score.toFixed(3)}</div>
              <details style={{marginTop:6}}>
                <summary style={{cursor:"pointer"}}>How it's calculated</summary>
                <div style={{fontSize:12, color:"var(--color-text-muted)", marginTop:"var(--spacing-xs)"}}>Weighted features per rules YAML. Levels at warn ≥ {riskData.thresholds?.warn}, high ≥ {riskData.thresholds?.high}.</div>
              </details>
            </div>
          </div>
          
          {riskData.reasons.length > 0 && (
            <div>
              <div style={{fontWeight:"bold", marginBottom:"var(--spacing-sm)"}}>Factors:</div>
              <ul style={{margin:0, paddingLeft:"var(--spacing-lg)"}}>
                {riskData.reasons.map((reason, i) => (
                  <li key={i} style={{marginBottom:"var(--spacing-xs)"}}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          
          {Object.keys(riskData.feature_scores).length > 0 && (
            <div>
              <div style={{fontWeight:"bold", marginBottom:"var(--spacing-sm)"}}>Feature Scores:</div>
              <div style={{display:"grid", gap:"var(--spacing-xs)"}}>
                {Object.entries(riskData.feature_scores).map(([feature, score]) => (
                  <div key={feature} style={{display:"flex", justifyContent:"space-between"}}>
                    <span style={{fontSize:14}}>{feature.replace(/_/g, ' ')}:</span>
                    <span style={{fontSize:14, fontWeight:"bold"}}>{score.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{padding:"var(--spacing-lg)", border:"1px solid var(--color-border)", borderRadius:"var(--border-radius-md)", textAlign:"center"}}>
          {riskLoading ? "Updating risk data..." : "Loading risk data..."}
        </div>
      )}

      <h3>Data Export</h3>
      
      <div style={{display:"grid", gap:"var(--spacing-sm)"}}>
        <button 
          onClick={handleExportTableau} 
          disabled={loading}
          style={{padding:"var(--spacing-sm) var(--spacing-lg)", border:"1px solid var(--color-button-border)", borderRadius:"var(--border-radius-sm)", backgroundColor:"var(--color-button-background)"}}
        >
          {loading ? "Creating..." : "Export for Tableau"}
        </button>
        
        <button 
          onClick={handleExportFull} 
          disabled={loading}
          style={{padding:"var(--spacing-sm) var(--spacing-lg)", border:"1px solid var(--color-button-border)", borderRadius:"var(--border-radius-sm)", backgroundColor:"var(--color-button-background)"}}
        >
          {loading ? "Creating..." : "Export Full Data"}
        </button>
      </div>

      {exports.length > 0 && (
        <div>
          <div style={{fontWeight:"bold", marginBottom:"var(--spacing-sm)"}}>Recent Exports:</div>
          <div style={{display:"grid", gap:"var(--spacing-xs)"}}>
            {exports.slice(0, 5).map((exp, i) => (
              <div key={i} style={{
                padding:"var(--spacing-sm)", 
                border:"1px solid var(--color-border)", 
                borderRadius:"var(--border-radius-sm)", 
                fontSize:14,
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center"
              }}>
                <div>
                  <div style={{fontWeight:"bold"}}>{exp.filename}</div>
                  <div style={{fontSize:12, color:"var(--color-text-secondary)"}}>
                    {exp.type} • {new Date(exp.created).toLocaleDateString()}
                  </div>
                </div>
                <div style={{fontSize:12, color:"var(--color-text-secondary)"}}>
                  {(exp.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{color:"var(--color-text-error)", padding:"var(--spacing-sm)", backgroundColor:"var(--color-background-error)", borderRadius:"var(--border-radius-sm)"}}>
          {error}
        </div>
      )}
    </div>
  );
});

InsightsPanel.displayName = 'InsightsPanel';

export default InsightsPanel;

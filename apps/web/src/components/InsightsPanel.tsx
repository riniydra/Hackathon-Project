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
      case 'high': return '#dc2626';
      case 'warn': return '#ea580c';
      case 'low': return '#16a34a';
      default: return '#6b7280';
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
    <div style={{display:"grid", gap:16, maxWidth:600}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h3>Risk Insights</h3>
        <button 
          onClick={loadRiskData}
          disabled={riskLoading}
          style={{
            padding:"4px 8px", 
            fontSize:12, 
            border:"1px solid #d1d5db", 
            borderRadius:4, 
            backgroundColor:"#f9fafb",
            cursor: riskLoading ? "not-allowed" : "pointer",
            opacity: riskLoading ? 0.6 : 1
          }}
        >
          {riskLoading ? "🔄 Updating..." : "🔄 Refresh"}
        </button>
      </div>
      
      {riskData ? (
        <div style={{display:"grid", gap:12, padding:16, border:"1px solid #e5e7eb", borderRadius:8}}>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: getRiskLevelColor(riskData.level),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold"
            }}>
              {Math.round(riskData.score * 100)}
            </div>
            <div>
              <div style={{fontWeight:"bold"}}>{getRiskLevelLabel(riskData.level)}</div>
              <div style={{fontSize:14, opacity:0.7}}>Score: {riskData.score.toFixed(3)}</div>
            </div>
          </div>
          
          {riskData.reasons.length > 0 && (
            <div>
              <div style={{fontWeight:"bold", marginBottom:8}}>Factors:</div>
              <ul style={{margin:0, paddingLeft:20}}>
                {riskData.reasons.map((reason, i) => (
                  <li key={i} style={{marginBottom:4}}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          
          {Object.keys(riskData.feature_scores).length > 0 && (
            <div>
              <div style={{fontWeight:"bold", marginBottom:8}}>Feature Scores:</div>
              <div style={{display:"grid", gap:4}}>
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
        <div style={{padding:16, border:"1px solid #e5e7eb", borderRadius:8, textAlign:"center"}}>
          {riskLoading ? "Updating risk data..." : "Loading risk data..."}
        </div>
      )}

      <h3>Data Export</h3>
      
      <div style={{display:"grid", gap:8}}>
        <button 
          onClick={handleExportTableau} 
          disabled={loading}
          style={{padding:"8px 16px", border:"1px solid #d1d5db", borderRadius:4, backgroundColor:"#f9fafb"}}
        >
          {loading ? "Creating..." : "Export for Tableau"}
        </button>
        
        <button 
          onClick={handleExportFull} 
          disabled={loading}
          style={{padding:"8px 16px", border:"1px solid #d1d5db", borderRadius:4, backgroundColor:"#f9fafb"}}
        >
          {loading ? "Creating..." : "Export Full Data"}
        </button>
      </div>

      {exports.length > 0 && (
        <div>
          <div style={{fontWeight:"bold", marginBottom:8}}>Recent Exports:</div>
          <div style={{display:"grid", gap:4}}>
            {exports.slice(0, 5).map((exp, i) => (
              <div key={i} style={{
                padding:8, 
                border:"1px solid #e5e7eb", 
                borderRadius:4, 
                fontSize:14,
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center"
              }}>
                <div>
                  <div style={{fontWeight:"bold"}}>{exp.filename}</div>
                  <div style={{fontSize:12, opacity:0.7}}>
                    {exp.type} • {new Date(exp.created).toLocaleDateString()}
                  </div>
                </div>
                <div style={{fontSize:12, opacity:0.7}}>
                  {(exp.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{color:"#dc2626", padding:8, backgroundColor:"#fef2f2", borderRadius:4}}>
          {error}
        </div>
      )}
    </div>
  );
});

InsightsPanel.displayName = 'InsightsPanel';

export default InsightsPanel;

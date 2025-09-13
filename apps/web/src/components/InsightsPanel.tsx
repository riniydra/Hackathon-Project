"use client";
import { useEffect, useState, useImperativeHandle, forwardRef, useRef } from "react";
import { getRiskScore, listExports } from "@/lib/api";
import { colors } from "@/components/theme/tokens";

interface RiskData {
  score: number;
  level: string;
  reasons: string[];
  feature_scores?: Record<string, number>;
  weights?: Record<string, number>;
  thresholds?: Record<string, number>;
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
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [history, setHistory] = useState<{ts:number; score:number}[]>([]);
  const mountedRef = useRef(false);

  async function loadRiskData() {
    setRiskLoading(true);
    try {
      const data = await getRiskScore();
      const normalized: RiskData = {
        score: typeof data?.score === "number" ? data.score : 0,
        level: data?.level || "demo",
        reasons: Array.isArray(data?.reasons) ? data.reasons : [],
        feature_scores: data?.feature_scores || {},
        weights: data?.weights || {},
        thresholds: data?.thresholds || {},
      };
      setRiskData(normalized);
      const now = Date.now();
      setLastUpdated(new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setHistory(h => ([...h, { ts: now, score: normalized.score }]).slice(-10));
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

  async function handleDownloadPDF() {
    try {
      setLoading(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf") as any,
      ]);
      const container = document.querySelector('#risk-panel-print') as HTMLElement | null;
      if (!container) return;
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 48; // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let y = 24;
      if (imgHeight <= pageHeight - 48) {
        pdf.addImage(imgData, 'PNG', 24, y, imgWidth, imgHeight);
      } else {
        // paginate
        let remaining = imgHeight;
        let imgY = 0;
        while (remaining > 0) {
          pdf.addImage(imgData, 'PNG', 24, y, imgWidth, Math.min(remaining, pageHeight - 48),  undefined, 'FAST');
          remaining -= (pageHeight - 48);
          imgY += (pageHeight - 48);
          if (remaining > 0) pdf.addPage();
        }
      }
      pdf.save('risk_report.pdf');
    } catch (e) {
      setError('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRiskData();
    loadExports();
    // Listen for risk refresh events dispatched from elsewhere in the app
    function onRiskRefresh() {
      loadRiskData();
    }
    if (typeof window !== "undefined") {
      window.addEventListener("risk:refresh", onRiskRefresh);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("risk:refresh", onRiskRefresh);
      }
    };
  }, []);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return '#dc2626';
      case 'warn': return '#ea580c';
      case 'low': return colors.skyDark;
      default: return colors.slateText;
    }
  };

  const barColorForFeature = (feature: string, level: string, weights?: Record<string, number>) => {
    const w = weights?.[feature] ?? 0;
    if (w < 0) return '#16a34a'; // green for protective
    // For non-protective features, use a fixed risk palette; not overall level
    return '#dc2626';
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
        <h3 style={{margin:0, color: 'var(--rs-text)'}}>Risk Score</h3>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <span style={{fontSize:12, opacity:.7}}>{lastUpdated ? `Updated ${lastUpdated}` : ""}</span>
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
      </div>
      
      {riskData ? (
        <div id="risk-panel-print" style={{display:"grid", gap:12, padding:16, border:`1px solid ${colors.border}`, borderRadius:24, background:"var(--rs-card-bg)", boxShadow:'var(--rs-shadow)'}}>
          <div style={{display:"flex", alignItems:"center", gap:16}}>
            <div style={{position:"relative", width:64, height:64}} aria-label="Risk score donut">
              <svg width="64" height="64" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="19" stroke="var(--rs-track)" strokeWidth="4" fill="none"/>
                <circle cx="21" cy="21" r="19" stroke={getRiskLevelColor(riskData.level)} strokeWidth="4" fill="none"
                        strokeDasharray={`${Math.round(riskData.score*100)} ${100-Math.round(riskData.score*100)}`}
                        strokeDashoffset="25"/>
                <text x="21" y="24" textAnchor="middle" fontSize="10" fill="#111" fontWeight="bold">{Math.round(riskData.score*100)}</text>
              </svg>
            </div>
            <div>
              <div style={{fontWeight:"bold"}}>{getRiskLevelLabel(riskData.level)}</div>
              <div style={{fontSize:14, opacity:0.7}}>Score: {riskData.score.toFixed(3)}</div>
              <details style={{marginTop:6}}>
                <summary style={{cursor:"pointer"}}>How it's calculated</summary>
                <div style={{fontSize:12, opacity:0.8, marginTop:6}}>Weighted features per rules YAML. Levels at warn ≥ {riskData.thresholds?.warn}, high ≥ {riskData.thresholds?.high}.</div>
              </details>
            </div>
            {/* Sparkline */}
            <div style={{marginLeft:"auto"}}>
              <svg width="160" height="40" viewBox="0 0 160 40">
                <polyline
                  fill="none"
                  stroke={colors.skyDark}
                  strokeWidth="2"
                  points={(() => {
                    if (!history.length) return "";
                    const max = 1, min = 0;
                    const step = 160 / Math.max(1, history.length-1);
                    return history.map((h, i) => {
                      const x = i * step;
                      const y = 40 - ((h.score - min)/(max-min)) * 36 - 2;
                      return `${x},${y}`;
                    }).join(" ");
                  })()}
                />
              </svg>
            </div>
          </div>
          
          {(riskData?.reasons?.length || 0) > 0 && (
            <div>
              <div style={{fontWeight:"bold", marginBottom:8}}>Factors:</div>
              <ul style={{margin:0, paddingLeft:20}}>
                {(riskData?.reasons || []).map((reason, i) => (
                  <li key={i} style={{marginBottom:4}}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          
          {Object.keys(riskData.feature_scores || {}).length > 0 && (
            <div>
              <div style={{fontWeight:"bold", marginBottom:8}}>Feature Scores:</div>
              <div style={{display:"grid", gap:6}}>
                {Object.entries(riskData.feature_scores || {}).map(([feature, score]) => {
                  const pct = Math.max(0, Math.min(100, Math.round((Number(score)||0)*100)));
                  return (
                    <div key={feature}>
                      <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4}}>
                        <span>{feature.replace(/_/g, ' ')}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{height:8, borderRadius:4, background: colors.skyLight, border:`1px solid ${colors.border}`}}>
                        <div style={{width:`${pct}%`, height:"100%", background:barColorForFeature(feature, riskData.level, riskData.weights), borderRadius:4}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{padding:16, border:`1px solid ${colors.border}`, borderRadius:8, textAlign:"center", background:"#fff"}}>
          {riskLoading ? "Updating risk data..." : "Loading risk data..."}
        </div>
      )}

      <div style={{display:"flex", justifyContent:"flex-start"}}>
        <button onClick={handleDownloadPDF} disabled={loading} style={{
          padding:"8px 16px", border:"1px solid #d1d5db", borderRadius:8,
          backgroundColor:"#eef2ff", color:"#111827", cursor: loading? 'not-allowed':'pointer'
        }}>
          {loading ? "Preparing PDF..." : "Download PDF"}
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

"use client";
import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { getRiskScore, getRiskHistory, getRiskChanges, exportTableau, exportFullData, listExports } from "@/lib/api";

interface RiskData {
  score: number;
  level: string;
  reasons: string[];
  feature_scores: Record<string, number>;
  weights: Record<string, number>;
  thresholds: Record<string, number>;
  timestamp?: string;
}

interface RiskHistoryPoint {
  timestamp: string;
  score: number;
  level: string;
}

interface RiskChanges {
  has_previous: boolean;
  score_change?: number;
  level_change?: string;
  new_reasons?: string[];
  resolved_reasons?: string[];
  feature_changes?: Record<string, {old: number, new: number, change: number}>;
  previous_timestamp?: string;
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
  const [riskHistory, setRiskHistory] = useState<RiskHistoryPoint[]>([]);
  const [riskChanges, setRiskChanges] = useState<RiskChanges | null>(null);
  const [exports, setExports] = useState<ExportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function loadRiskData() {
    setRiskLoading(true);
    try {
      const [riskData, historyData, changesData] = await Promise.all([
        getRiskScore(),
        getRiskHistory(7), // Last 7 days for sparkline
        getRiskChanges()
      ]);
      setRiskData(riskData);
      setRiskHistory(historyData.history || []);
      setRiskChanges(changesData);
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

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const SparklineChart = ({ data }: { data: RiskHistoryPoint[] }) => {
    if (data.length < 2) return <div style={{fontSize: 12, opacity: 0.7}}>Not enough data</div>;
    
    const maxScore = Math.max(...data.map(d => d.score));
    const minScore = Math.min(...data.map(d => d.score));
    const range = maxScore - minScore || 0.1;
    
    const points = data.map((point, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((point.score - minScore) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <svg width="80" height="24" viewBox="0 0 100 100" style={{border: '1px solid #e5e7eb', borderRadius: 4}}>
          <polyline
            points={points}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((point, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((point.score - minScore) / range) * 100;
            const color = getRiskLevelColor(point.level);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                fill={color}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <div style={{fontSize: 11, opacity: 0.7}}>
          {data.length} points, 7 days
        </div>
      </div>
    );
  };

  const FeatureBar = ({ name, score, weight, maxScore = 1 }: { name: string, score: number, weight: number, maxScore?: number }) => {
    const percentage = (score / maxScore) * 100;
    const weightedContribution = score * weight;
    
    return (
      <div style={{display: 'grid', gap: 4}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span style={{fontSize: 13}}>{name.replace(/_/g, ' ')}</span>
          <div style={{display: 'flex', gap: 8, fontSize: 12, opacity: 0.7}}>
            <span>Score: {score.toFixed(3)}</span>
            <span>Weight: {(weight * 100).toFixed(0)}%</span>
            <span>Impact: {weightedContribution.toFixed(3)}</span>
          </div>
        </div>
        <div style={{position: 'relative', height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden'}}>
          <div 
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: score > 0.6 ? '#dc2626' : score > 0.3 ? '#ea580c' : '#16a34a',
              borderRadius: 4,
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>
    );
  };

  const RiskChangesDisplay = ({ changes }: { changes: RiskChanges }) => {
    if (!changes.has_previous) {
      return <div style={{fontSize: 12, opacity: 0.7}}>No previous assessment for comparison</div>;
    }

    return (
      <div style={{display: 'grid', gap: 8}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span style={{fontSize: 13, fontWeight: 'bold'}}>Changes since last assessment:</span>
          {changes.previous_timestamp && (
            <span style={{fontSize: 11, opacity: 0.7}}>
              {formatTimestamp(changes.previous_timestamp)}
            </span>
          )}
        </div>
        
        {changes.score_change !== undefined && (
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{fontSize: 12}}>Score:</span>
            <span style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: changes.score_change > 0 ? '#dc2626' : changes.score_change < 0 ? '#16a34a' : '#6b7280'
            }}>
              {changes.score_change > 0 ? '+' : ''}{changes.score_change.toFixed(3)}
              {changes.score_change > 0 ? ' ↗️' : changes.score_change < 0 ? ' ↘️' : ' →'}
            </span>
          </div>
        )}
        
        {changes.level_change && (
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{fontSize: 12}}>Level changed to:</span>
            <span style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: getRiskLevelColor(changes.level_change)
            }}>
              {getRiskLevelLabel(changes.level_change)}
            </span>
          </div>
        )}
        
        {changes.new_reasons && changes.new_reasons.length > 0 && (
          <div>
            <div style={{fontSize: 12, fontWeight: 'bold', color: '#dc2626'}}>New concerns:</div>
            <ul style={{margin: '4px 0', paddingLeft: 16, fontSize: 11}}>
              {changes.new_reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        
        {changes.resolved_reasons && changes.resolved_reasons.length > 0 && (
          <div>
            <div style={{fontSize: 12, fontWeight: 'bold', color: '#16a34a'}}>Resolved:</div>
            <ul style={{margin: '4px 0', paddingLeft: 16, fontSize: 11}}>
              {changes.resolved_reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        
        {changes.feature_changes && Object.keys(changes.feature_changes).length > 0 && (
          <div>
            <div style={{fontSize: 12, fontWeight: 'bold'}}>Feature changes:</div>
            <div style={{display: 'grid', gap: 2, marginTop: 4}}>
              {Object.entries(changes.feature_changes).map(([feature, change]) => (
                <div key={feature} style={{display: 'flex', justifyContent: 'space-between', fontSize: 11}}>
                  <span>{feature.replace(/_/g, ' ')}:</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: change.change > 0 ? '#dc2626' : '#16a34a'
                  }}>
                    {change.old.toFixed(3)} → {change.new.toFixed(3)} 
                    ({change.change > 0 ? '+' : ''}{change.change.toFixed(3)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
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
          {/* Header with timestamp and sparkline */}
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div style={{fontSize:12, opacity:0.7}}>
              Last updated: {formatTimestamp(riskData.timestamp)}
            </div>
            <SparklineChart data={riskHistory} />
          </div>
          
          <div style={{display:"flex", alignItems:"center", gap:16}}>
            <div style={{position:"relative", width:64, height:64}} aria-label="Risk score donut">
              <svg width="64" height="64" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="19" stroke="#e5e7eb" strokeWidth="4" fill="none"/>
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
          </div>
          
          {/* Risk Changes Section */}
          {riskChanges && (
            <div>
              <div style={{fontWeight:"bold", marginBottom:8}}>Assessment Changes:</div>
              <div style={{padding:12, backgroundColor:"#f9fafb", borderRadius:6}}>
                <RiskChangesDisplay changes={riskChanges} />
              </div>
            </div>
          )}
          
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
              <div style={{fontWeight:"bold", marginBottom:8}}>Feature Analysis:</div>
              <div style={{display:"grid", gap:8}}>
                {Object.entries(riskData.feature_scores).map(([feature, score]) => (
                  <FeatureBar 
                    key={feature} 
                    name={feature} 
                    score={score} 
                    weight={riskData.weights[feature] || 0}
                  />
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

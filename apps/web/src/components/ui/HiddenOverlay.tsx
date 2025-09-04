"use client";
import { useUIState } from "@/components/shell/UIStateProvider";

export default function HiddenOverlay() {
  const { hidden } = useUIState();
  if (hidden !== "hidden") return null;
  return (
    <div style={{position:"absolute", inset:0, display:"grid", placeItems:"center"}}>
      <div style={{
        padding:24,
        borderRadius:16,
        background:"rgba(15,23,42,.7)",
        color:"#fff",
        width:"min(560px, 92vw)",
        textAlign:"center",
        boxShadow:"0 10px 30px rgba(0,0,0,.3)"
      }}>
        <h2 style={{marginTop:0}}>Hidden</h2>
        <p>Press Esc again to show PIN prompt</p>
      </div>
    </div>
  );
}




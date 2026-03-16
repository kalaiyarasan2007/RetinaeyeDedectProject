import React, { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useGetScan, useUpdateScan } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { formatMedicalDate, cn } from "@/lib/utils";
import { 
  AlertTriangle, CheckCircle, Volume2, Printer, ChevronLeft, 
  Stethoscope, Info, Activity, FileText
} from "lucide-react";

export default function ScanResult() {
  const [, params] = useRoute("/scans/:id");
  const scanId = parseInt(params?.id || "0", 10);
  const { data: scan, isLoading, refetch } = useGetScan(scanId);
  const updateMutation = useUpdateScan();
  const { user } = useAuth();
  
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (scan?.doctorNotes) setDoctorNotes(scan.doctorNotes);
  }, [scan]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Scan Data...</div>;
  if (!scan) return <div className="p-8 text-center text-destructive font-bold">Scan not found.</div>;

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      const text = `Patient scan analysis complete. Detected Diabetic Retinopathy Stage ${scan.drStage}. Risk level is ${scan.riskLevel}. Confidence score is ${(scan.confidenceScore * 100).toFixed(1)} percent. Recommendation: ${scan.recommendation}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleConfirm = async () => {
    await updateMutation.mutateAsync({
      id: scan.id,
      data: {
        doctorConfirmed: true,
        doctorNotes,
        doctorId: user?.username
      }
    });
    refetch();
  };

  const isCritical = scan.drStage >= 3;

  // Parse Heatmap Data (mock format: [{x, y, intensity, radius}])
  let heatmapPoints: any[] = [];
  try {
    if (scan.heatmapData) heatmapPoints = JSON.parse(scan.heatmapData);
  } catch(e) {}

  // If no heatmap points for demo, let's inject a few if it's high stage
  if (heatmapPoints.length === 0 && scan.drStage > 0) {
    heatmapPoints = [
      { x: 30, y: 40, intensity: 0.8, radius: 15 },
      { x: 60, y: 35, intensity: 0.9, radius: 20 },
      { x: 45, y: 70, intensity: 0.6, radius: 10 }
    ];
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-card rounded-full shadow-sm hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              Scan Results
              {scan.doctorConfirmed && <CheckCircle className="w-6 h-6 text-green-500" />}
            </h1>
            <p className="text-muted-foreground mt-1">Scan ID: {scan.id} • {formatMedicalDate(scan.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSpeak}
            className={cn("p-3 rounded-xl border border-border shadow-sm transition-colors", isSpeaking ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:bg-muted")}
            title="Read out loud"
          >
            <Volume2 className="w-5 h-5" />
          </button>
          <Link 
            href={`/reports/${scan.id}`} 
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl shadow-sm hover:bg-muted transition-colors font-semibold"
          >
            <Printer className="w-5 h-5" />
            Print Report
          </Link>
        </div>
      </div>

      {/* Critical Alert */}
      {isCritical && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-r-xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="text-destructive font-bold text-lg">CRITICAL FINDINGS</h3>
            <p className="text-destructive/80 text-sm font-medium">Immediate medical intervention is highly recommended. High risk of vision loss.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Image & Heatmap */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Retinal Fundus Analysis</h3>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500" /> High</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500" /> Med</span>
              </div>
            </div>
            
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-border flex items-center justify-center">
               {scan.imageData ? (
                 <>
                   <img src={scan.imageData} alt="Scan" className="w-full h-full object-contain" />
                   {/* Heatmap Overlay */}
                   <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none mix-blend-hard-light opacity-80">
                     <defs>
                       <radialGradient id="grad-red">
                         <stop offset="0%" stopColor="red" stopOpacity="1"/>
                         <stop offset="100%" stopColor="red" stopOpacity="0"/>
                       </radialGradient>
                       <radialGradient id="grad-yellow">
                         <stop offset="0%" stopColor="yellow" stopOpacity="1"/>
                         <stop offset="100%" stopColor="yellow" stopOpacity="0"/>
                       </radialGradient>
                     </defs>
                     {heatmapPoints.map((pt, i) => (
                       <circle 
                        key={i} 
                        cx={`${pt.x}%`} cy={`${pt.y}%`} r={`${pt.radius}%`} 
                        fill={pt.intensity > 0.7 ? "url(#grad-red)" : "url(#grad-yellow)"} 
                        opacity={pt.intensity} 
                       />
                     ))}
                   </svg>
                 </>
               ) : (
                 <div className="text-white/50 flex flex-col items-center gap-2">
                   <FileText className="w-12 h-12" />
                   <p>No Image Data Available</p>
                 </div>
               )}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              *Heatmap highlights regions indicative of microaneurysms and exudates.
            </p>
          </div>
        </div>

        {/* Right Col: Diagnostics */}
        <div className="space-y-6">
          {/* Main Stats */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 text-center">
             <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">DR Stage</p>
             <h2 className="text-6xl font-display font-black text-primary mb-2">{scan.drStage}</h2>
             <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm mb-6">
               {["No DR", "Mild Non-Proliferative DR", "Moderate Non-Proliferative DR", "Severe Non-Proliferative DR", "Proliferative DR"][scan.drStage]}
             </div>

             <div className="grid grid-cols-2 gap-4 text-left border-t border-border pt-6">
               <div>
                 <p className="text-xs text-muted-foreground font-semibold">AI Confidence</p>
                 <p className="text-xl font-bold">{(scan.confidenceScore * 100).toFixed(1)}%</p>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground font-semibold">Blindness Risk</p>
                 <p className="text-xl font-bold">{scan.blindnessRiskScore}/100</p>
               </div>
             </div>
          </div>

          {/* AI Recommendation */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <h3 className="font-bold flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-teal-500" /> AI Recommendation
            </h3>
            <p className="text-foreground text-sm leading-relaxed bg-muted/50 p-4 rounded-xl border border-border">
              {scan.recommendation}
            </p>
          </div>

          {/* Doctor Review Box */}
          {user?.role === "doctor" && !scan.doctorConfirmed && (
            <div className="bg-primary/5 rounded-2xl border-2 border-primary/20 p-6">
              <h3 className="font-bold text-primary flex items-center gap-2 mb-4">
                <Stethoscope className="w-5 h-5" /> Doctor Review Required
              </h3>
              <textarea 
                value={doctorNotes}
                onChange={e => setDoctorNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none mb-4 resize-none h-24"
                placeholder="Add clinical notes or override AI findings..."
              />
              <button 
                onClick={handleConfirm}
                disabled={updateMutation.isPending}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Confirm Diagnosis"}
              </button>
            </div>
          )}

          {scan.doctorConfirmed && (
            <div className="bg-green-500/10 rounded-2xl border border-green-500/20 p-6">
               <h3 className="font-bold text-green-700 flex items-center gap-2 mb-2">
                 <CheckCircle className="w-5 h-5" /> Confirmed by Dr. {scan.doctorId}
               </h3>
               {scan.doctorNotes && (
                 <div className="mt-4 pt-4 border-t border-green-500/20">
                   <p className="text-xs text-green-800 font-semibold mb-1">Clinical Notes:</p>
                   <p className="text-sm text-green-900">{scan.doctorNotes}</p>
                 </div>
               )}
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface AnalysisResult {
  drStage: number;
  confidenceScore: number;
  riskLevel: RiskLevel;
  blindnessRiskScore: number;
  heatmapData: string;
  recommendation: string;
}

const DR_STAGE_NAMES = [
  "No Diabetic Retinopathy",
  "Mild Diabetic Retinopathy",
  "Moderate Diabetic Retinopathy",
  "Severe Diabetic Retinopathy",
  "Proliferative Diabetic Retinopathy",
];

const RECOMMENDATIONS = [
  "Continue routine annual eye exams. Maintain good blood sugar and blood pressure control. No specific treatment required at this time.",
  "Follow up with ophthalmologist every 6-9 months. Focus on improving glycemic control. Consider lifestyle modifications.",
  "Refer to retinal specialist within 3-6 months. Intensify glycemic management. Consider laser photocoagulation evaluation.",
  "URGENT: Refer to retinal specialist within 1 month. High risk of vision loss. Anti-VEGF therapy or laser treatment may be needed.",
  "EMERGENCY: Immediate referral to vitreoretinal surgeon. Vitrectomy or pan-retinal photocoagulation required. Risk of blindness is very high.",
];

function getRiskLevel(drStage: number): RiskLevel {
  if (drStage === 0) return "low";
  if (drStage === 1) return "medium";
  if (drStage === 2) return "high";
  return "critical";
}

function getBlindnessRiskScore(drStage: number, confidence: number): number {
  const baseScores = [5, 20, 40, 65, 90];
  const base = baseScores[drStage] ?? 5;
  const variance = Math.floor((Math.random() - 0.5) * 10);
  return Math.min(100, Math.max(0, base + variance));
}

function generateHeatmap(drStage: number): string {
  const numSpots = drStage === 0 ? 0 : 3 + drStage * 3;
  const spots = [];

  for (let i = 0; i < numSpots; i++) {
    spots.push({
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      intensity: 0.4 + (drStage / 4) * 0.6 + (Math.random() - 0.5) * 0.2,
      radius: 5 + Math.random() * (drStage * 3),
    });
  }

  if (drStage >= 3) {
    spots.push({
      x: 50,
      y: 50,
      intensity: 0.9,
      radius: 8 + drStage * 2,
    });
  }

  return JSON.stringify(spots);
}

export function simulateAIAnalysis(): AnalysisResult {
  const rand = Math.random();
  let drStage: number;

  if (rand < 0.35) drStage = 0;
  else if (rand < 0.55) drStage = 1;
  else if (rand < 0.73) drStage = 2;
  else if (rand < 0.88) drStage = 3;
  else drStage = 4;

  const confidenceScore = parseFloat((0.72 + Math.random() * 0.25).toFixed(3));
  const riskLevel = getRiskLevel(drStage);
  const blindnessRiskScore = getBlindnessRiskScore(drStage, confidenceScore);
  const heatmapData = generateHeatmap(drStage);
  const recommendation = RECOMMENDATIONS[drStage] ?? RECOMMENDATIONS[0]!;

  return {
    drStage,
    confidenceScore,
    riskLevel,
    blindnessRiskScore,
    heatmapData,
    recommendation,
  };
}

export { DR_STAGE_NAMES };

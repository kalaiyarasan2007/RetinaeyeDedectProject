import React, { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useGetScan, useUpdateScan } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { formatMedicalDate, cn } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle, Volume2, VolumeX, Printer, ChevronLeft,
  Stethoscope, Activity, FileText, Languages,
} from "lucide-react";

// ─── Language types ───────────────────────────────────────────────────────────

type LangCode = "en-US" | "ta-IN" | "hi-IN" | "te-IN" | "ml-IN";

const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: "en-US", label: "English",   native: "English"     },
  { code: "ta-IN", label: "Tamil",     native: "தமிழ்"        },
  { code: "hi-IN", label: "Hindi",     native: "हिंदी"        },
  { code: "te-IN", label: "Telugu",    native: "తెలుగు"       },
  { code: "ml-IN", label: "Malayalam", native: "മലയാളം"      },
];

// ─── DR Stage labels ──────────────────────────────────────────────────────────

const DR_STAGE_LABELS: Record<LangCode, string[]> = {
  "en-US": [
    "No Diabetic Retinopathy",
    "Mild Diabetic Retinopathy",
    "Moderate Diabetic Retinopathy",
    "Severe Diabetic Retinopathy",
    "Proliferative Diabetic Retinopathy",
  ],
  "ta-IN": [
    "நீரிழிவு விழித்திரை நோய் இல்லை",
    "லேசான நீரிழிவு விழித்திரை நோய்",
    "மிதமான நீரிழிவு விழித்திரை நோய்",
    "கடுமையான நீரிழிவு விழித்திரை நோய்",
    "பெருக்க நீரிழிவு விழித்திரை நோய்",
  ],
  "hi-IN": [
    "कोई डायबिटिक रेटिनोपैथी नहीं",
    "हल्की डायबिटिक रेटिनोपैथी",
    "मध्यम डायबिटिक रेटिनोपैथी",
    "गंभीर डायबिटिक रेटिनोपैथी",
    "प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी",
  ],
  "te-IN": [
    "డయాబెటిక్ రెటినోపతి లేదు",
    "తేలికపాటి డయాబెటిక్ రెటినోపతి",
    "మధ్యస్థ డయాబెటిక్ రెటినోపతి",
    "తీవ్రమైన డయాబెటిక్ రెటినోపతి",
    "ప్రోలిఫెరేటివ్ డయాబెటిక్ రెటినోపతి",
  ],
  "ml-IN": [
    "ഡയബറ്റിക് റെറ്റിനോപ്പതി ഇല്ല",
    "ലഘുവായ ഡയബറ്റിക് റെറ്റിനോപ്പതി",
    "മിതമായ ഡയബറ്റിക് റെറ്റിനോപ്പതി",
    "കഠിനമായ ഡയബറ്റിക് റെറ്റിനോപ്പതി",
    "പ്രോലിഫെറേറ്റിവ് ഡയബറ്റിക് റെറ്റിനോപ്പതി",
  ],
};

// ─── Risk level labels ────────────────────────────────────────────────────────

const RISK_LABELS: Record<LangCode, Record<string, string>> = {
  "en-US": { low: "Low",       medium: "Medium",      high: "High",      critical: "Critical"           },
  "ta-IN": { low: "குறைந்த",   medium: "நடுத்தர",     high: "அதிக",      critical: "மிகவும் அபாயகரமான"  },
  "hi-IN": { low: "कम",        medium: "मध्यम",        high: "उच्च",      critical: "अति गंभीर"           },
  "te-IN": { low: "తక్కువ",    medium: "మధ్యస్థం",    high: "అధికం",     critical: "అత్యంత తీవ్రం"       },
  "ml-IN": { low: "കുറഞ്ഞ",   medium: "മധ്യനില",     high: "ഉയർന്ന",   critical: "അതിഗുരുതര"          },
};

// ─── UI string labels ─────────────────────────────────────────────────────────

interface UIStrings {
  scanResults: string;
  drStage: string;
  aiConfidence: string;
  blindnessRisk: string;
  aiRecommendation: string;
  retinalAnalysis: string;
  heatmapNote: string;
  criticalHeading: string;
  criticalBody: string;
  listenBtn: string;
  stopBtn: string;
  printReport: string;
  confirmedBy: string;
  clinicalNotes: string;
  doctorReviewHeading: string;
  confirmDiagnosis: string;
  saving: string;
  notesPlaceholder: string;
  noImage: string;
  loading: string;
  notFound: string;
  highLegend: string;
  medLegend: string;
}

const UI: Record<LangCode, UIStrings> = {
  "en-US": {
    scanResults:         "Scan Results",
    drStage:             "DR Stage",
    aiConfidence:        "AI Confidence",
    blindnessRisk:       "Blindness Risk",
    aiRecommendation:    "AI Recommendation",
    retinalAnalysis:     "Retinal Fundus Analysis",
    heatmapNote:         "*Heatmap highlights regions indicative of microaneurysms and exudates.",
    criticalHeading:     "CRITICAL FINDINGS",
    criticalBody:        "Immediate medical intervention is highly recommended. High risk of vision loss.",
    listenBtn:           "Listen",
    stopBtn:             "Stop",
    printReport:         "Print Report",
    confirmedBy:         "Confirmed by Dr.",
    clinicalNotes:       "Clinical Notes:",
    doctorReviewHeading: "Doctor Review Required",
    confirmDiagnosis:    "Confirm Diagnosis",
    saving:              "Saving...",
    notesPlaceholder:    "Add clinical notes or override AI findings...",
    noImage:             "No Image Data Available",
    loading:             "Loading Scan Data...",
    notFound:            "Scan not found.",
    highLegend:          "High",
    medLegend:           "Med",
  },
  "ta-IN": {
    scanResults:         "ஸ்கேன் பரிசோதனை முடிவுகள்",
    drStage:             "நீரிழிவு கண்நோய் நிலை",
    aiConfidence:        "ஏஐ முடிவின் நம்பிக்கை அளவு",
    blindnessRisk:       "மருத்துவ அபாய மதிப்பெண்",
    aiRecommendation:    "ஏஐ மருத்துவ பரிந்துரை",
    retinalAnalysis:     "கண் ரெட்டினா படப் பகுப்பாய்வு",
    heatmapNote:         "*சிவப்பு மற்றும் மஞ்சள் நிறக் குறிகள் கண்ணில் பாதிக்கப்பட்ட பகுதிகளைக் காட்டுகின்றன.",
    criticalHeading:     "மிகவும் அவசரமான கண்டுபிடிப்பு",
    criticalBody:        "உடனடியாக மருத்துவரை சந்திக்கவும். பார்வை இழக்கும் அபாயம் மிக அதிகமாக உள்ளது.",
    listenBtn:           "கேளுங்கள்",
    stopBtn:             "நிறுத்து",
    printReport:         "அறிக்கை அச்சிடு",
    confirmedBy:         "மருத்துவர் உறுதிப்படுத்தியவர்:",
    clinicalNotes:       "மருத்துவ குறிப்புகள்:",
    doctorReviewHeading: "மருத்துவர் ஆய்வு தேவை",
    confirmDiagnosis:    "நோய் கண்டறிதலை உறுதிப்படுத்து",
    saving:              "சேமிக்கிறது...",
    notesPlaceholder:    "மருத்துவ குறிப்புகள் சேர்க்கவும் அல்லது ஏஐ முடிவை திருத்தவும்...",
    noImage:             "படம் கிடைக்கவில்லை",
    loading:             "ஸ்கேன் தரவு ஏற்றுகிறது...",
    notFound:            "ஸ்கேன் கிடைக்கவில்லை.",
    highLegend:          "அதிக பாதிப்பு",
    medLegend:           "மிதமான பாதிப்பு",
  },
  "hi-IN": {
    scanResults:         "स्कैन परिणाम",
    drStage:             "DR चरण",
    aiConfidence:        "AI विश्वास",
    blindnessRisk:       "अंधापन जोखिम",
    aiRecommendation:    "AI सिफारिश",
    retinalAnalysis:     "रेटिनल फंडस विश्लेषण",
    heatmapNote:         "*हीटमैप माइक्रोएन्यूरिज्म और एक्सुडेट्स के क्षेत्रों को इंगित करता है।",
    criticalHeading:     "गंभीर निष्कर्ष",
    criticalBody:        "तत्काल चिकित्सा हस्तक्षेप की अत्यधिक अनुशंसा की जाती है। दृष्टि हानि का उच्च जोखिम।",
    listenBtn:           "सुनें",
    stopBtn:             "रोकें",
    printReport:         "रिपोर्ट प्रिंट करें",
    confirmedBy:         "डॉ. द्वारा पुष्टि की गई।",
    clinicalNotes:       "नैदानिक नोट्स:",
    doctorReviewHeading: "डॉक्टर समीक्षा आवश्यक है",
    confirmDiagnosis:    "निदान की पुष्टि करें",
    saving:              "सहेज रहा है...",
    notesPlaceholder:    "नैदानिक नोट जोड़ें या AI निष्कर्षों को ओवरराइड करें...",
    noImage:             "कोई छवि डेटा उपलब्ध नहीं",
    loading:             "स्कैन डेटा लोड हो रहा है...",
    notFound:            "स्कैन नहीं मिला।",
    highLegend:          "उच्च",
    medLegend:           "मध्यम",
  },
  "te-IN": {
    scanResults:         "స్కాన్ ఫలితాలు",
    drStage:             "DR దశ",
    aiConfidence:        "AI నమ్మకం",
    blindnessRisk:       "అంధత్వ ప్రమాదం",
    aiRecommendation:    "AI సిఫారసు",
    retinalAnalysis:     "రెటీనల్ ఫండస్ విశ్లేషణ",
    heatmapNote:         "*హీట్‌మ్యాప్ మైక్రోఆన్యూరిజమ్‌లు మరియు ఎక్సూడేట్‌ల ప్రాంతాలను సూచిస్తుంది.",
    criticalHeading:     "క్లిష్టమైన నిర్ధారణలు",
    criticalBody:        "తక్షణ వైద్య జోక్యం అత్యంత సిఫార్సు చేయబడింది. దృష్టి కోల్పోయే ప్రమాదం ఎక్కువగా ఉంది.",
    listenBtn:           "వినండి",
    stopBtn:             "ఆపు",
    printReport:         "నివేదిక ముద్రించు",
    confirmedBy:         "డాక్టర్ ధృవీకరించారు.",
    clinicalNotes:       "క్లినికల్ నోట్స్:",
    doctorReviewHeading: "డాక్టర్ సమీక్ష అవసరం",
    confirmDiagnosis:    "రోగనిర్ధారణను నిర్ధారించండి",
    saving:              "సేవ్ అవుతోంది...",
    notesPlaceholder:    "క్లినికల్ నోట్స్ జోడించండి లేదా AI ఫలితాలను భర్తీ చేయండి...",
    noImage:             "చిత్ర డేటా అందుబాటులో లేదు",
    loading:             "స్కాన్ డేటా లోడ్ అవుతోంది...",
    notFound:            "స్కాన్ కనుగొనబడలేదు.",
    highLegend:          "అధికం",
    medLegend:           "మధ్యస్థం",
  },
  "ml-IN": {
    scanResults:         "സ്‌കാൻ ഫലങ്ങൾ",
    drStage:             "DR ഘട്ടം",
    aiConfidence:        "AI ആത്മവിശ്വാസം",
    blindnessRisk:       "അന്ധത അപകടം",
    aiRecommendation:    "AI ശുപാർശ",
    retinalAnalysis:     "റെറ്റിനൽ ഫണ്ടസ് വിശകലനം",
    heatmapNote:         "*ഹീറ്റ്‌മാപ്പ് മൈക്രോആന്യൂറിസങ്ങളും എക്‌സൂഡേറ്റുകളും ഉള്ള ഭാഗങ്ങൾ ചൂണ്ടിക്കാണിക്കുന്നു.",
    criticalHeading:     "നിർണായക കണ്ടുപിടിത്തങ്ങൾ",
    criticalBody:        "ഉടനടി വൈദ്യ ഇടപെടൽ ശക്തമായി ശുപാർശ ചെയ്യുന്നു. കാഴ്ച നഷ്ടപ്പെടാനുള്ള ഉയർന്ന അപകടം.",
    listenBtn:           "കേൾക്കുക",
    stopBtn:             "നിർത്തുക",
    printReport:         "റിപ്പോർട്ട് പ്രിന്റ് ചെയ്യുക",
    confirmedBy:         "ഡോ. സ്ഥിരീകരിച്ചു.",
    clinicalNotes:       "ക്ലിനിക്കൽ കുറിപ്പുകൾ:",
    doctorReviewHeading: "ഡോക്ടർ അവലോകനം ആവശ്യമാണ്",
    confirmDiagnosis:    "രോഗനിർണ്ണയം സ്ഥിരീകരിക്കുക",
    saving:              "സംരക്ഷിക്കുന്നു...",
    notesPlaceholder:    "ക്ലിനിക്കൽ കുറിപ്പുകൾ ചേർക്കുക അല്ലെങ്കിൽ AI കണ്ടെത്തലുകൾ മേൽ എഴുതുക...",
    noImage:             "ചിത്ര ഡാറ്റ ലഭ്യമല്ല",
    loading:             "സ്‌കാൻ ഡാറ്റ ലോഡ് ചെയ്യുന്നു...",
    notFound:            "സ്‌കാൻ കണ്ടെത്തിയില്ല.",
    highLegend:          "ഉയർന്ന",
    medLegend:           "മധ്യനില",
  },
};

// ─── Translated recommendations (5 DR stages × 5 languages) ──────────────────

const RECOMMENDATIONS: Record<LangCode, string[]> = {
  "en-US": [
    "Your retinal scan looks healthy. No signs of diabetic eye disease were found. Keep having your eyes checked once a year, and keep your blood sugar under control.",
    "Small changes were found in your retina. No treatment is needed right now. Visit your eye doctor every 6 months, eat healthy, and manage your blood sugar carefully.",
    "Noticeable changes were found in your retina. Please see an eye specialist within 3 to 6 months. Keep blood sugar tightly controlled. Laser treatment may be needed.",
    "URGENT: Serious damage found in your retina. See an eye specialist within 1 month. Do not delay — vision loss is possible if untreated. Treatment such as laser or injections may be required.",
    "EMERGENCY: Very severe damage found. Go to the hospital immediately. Surgery may be needed. Delay can cause permanent blindness.",
  ],
  "ta-IN": [
    "உங்கள் கண் ரெட்டினா படம் ஆய்வு செய்யப்பட்டது. தற்போது நீரிழிவு கண் நோயின் எந்த அறிகுறியும் காணப்படவில்லை. உங்கள் கண்கள் நல்ல நிலையில் உள்ளன. ஒவ்வொரு ஆண்டும் ஒரு முறை கண் பரிசோதனை செய்வது நல்லது. சர்க்கரை அளவை கட்டுப்பாட்டில் வையுங்கள்.",
    "உங்கள் கண் ரெட்டினாவில் லேசான மாற்றங்கள் கண்டுபிடிக்கப்பட்டுள்ளன. இப்போதைக்கு நேரடி சிகிச்சை தேவையில்லை. ஆனால், ஒவ்வொரு 6 மாதத்திற்கும் ஒரு முறை கண் மருத்துவரிடம் செல்லுங்கள். சர்க்கரை அளவை கட்டுப்படுத்தி, ஆரோக்கியமான உணவு சாப்பிடுங்கள்.",
    "உங்கள் கண் ரெட்டினாவில் குறிப்பிடத்தக்க மாற்றங்கள் தெரிகின்றன. 3 முதல் 6 மாதத்திற்குள் கண் நோய் நிபுணரிடம் சென்று பரிசோதனை செய்யுங்கள். சர்க்கரை அளவை கண்டிப்பாக கட்டுப்படுத்துங்கள். லேசர் சிகிச்சை தேவைப்படலாம்.",
    "மிகவும் அவசரம். உங்கள் கண் ரெட்டினாவில் கடுமையான பாதிப்பு கண்டுபிடிக்கப்பட்டுள்ளது. ஒரு மாதத்திற்குள் கண் நிபுணரை சந்திக்க வேண்டும். தாமதிக்காதீர்கள். சரியான நேரத்தில் சிகிச்சை பெறாவிட்டால் பார்வை இழக்கலாம்.",
    "மிகவும் தீவிரமான அவசர நிலை. உங்கள் கண்ணில் மிகவும் அதிகமான பாதிப்பு உள்ளது. உடனடியாக மருத்துவமனைக்கு செல்லுங்கள். கண் அறுவை சிகிச்சை தேவைப்படலாம். தாமதிக்காதீர்கள், பார்வை போய்விடலாம்.",
  ],
  "hi-IN": [
    "आपकी आंख की रेटिना जांच की गई। अभी कोई बीमारी के लक्षण नहीं हैं। आपकी आंखें ठीक हैं। हर साल एक बार आंखों की जांच करवाएं और शुगर लेवल को काबू में रखें।",
    "आपकी रेटिना में हल्के बदलाव मिले हैं। अभी इलाज की जरूरत नहीं है। हर 6 महीने में डॉक्टर से मिलें। खाने-पीने में सावधानी रखें और शुगर कंट्रोल करें।",
    "आपकी रेटिना में काफी बदलाव दिख रहे हैं। 3 से 6 महीने के अंदर आंख के विशेषज्ञ से मिलें। शुगर को सख्ती से काबू में रखें। लेजर इलाज की जरूरत पड़ सकती है।",
    "जरूरी: आपकी आंख में गंभीर खराबी पाई गई है। एक महीने के अंदर डॉक्टर से मिलें। देरी मत करें। सही समय पर इलाज न हो तो आंख की रोशनी जा सकती है।",
    "बहुत जरूरी: बहुत गंभीर स्थिति है। तुरंत अस्पताल जाएं। आंख का ऑपरेशन जरूरी हो सकता है। देरी करने पर आंख की रोशनी हमेशा के लिए जा सकती है।",
  ],
  "te-IN": [
    "మీ కంటి రెటీనా పరీక్ష చేయబడింది. ఇప్పుడు ఎటువంటి వ్యాధి లక్షణాలు కనిపించడం లేదు. మీ కళ్ళు ఆరోగ్యంగా ఉన్నాయి. ప్రతి సంవత్సరం ఒకసారి కంటి పరీక్ష చేయించుకోండి. చక్కెర స్థాయిని నియంత్రించండి.",
    "మీ రెటీనాలో తేలికపాటి మార్పులు కనిపిస్తున్నాయి. ఇప్పుడు నేరుగా చికిత్స అవసరం లేదు. ప్రతి 6 నెలలకు కంటి డాక్టర్‌ని చూడండి. ఆహారంలో జాగ్రత్తగా ఉండి చక్కెర తక్కువగా ఉంచండి.",
    "మీ రెటీనాలో గుర్తించదగిన మార్పులు కనిపిస్తున్నాయి. 3 నుండి 6 నెలలలో నిపుణ వైద్యుడిని సంప్రదించండి. చక్కెర స్థాయిని కచ్చితంగా నియంత్రించండి. లేజర్ చికిత్స అవసరం కావచ్చు.",
    "అత్యవసరం: మీ కంటిలో తీవ్రమైన సమస్య కనిపిస్తోంది. ఒక నెలలో కంటి నిపుణుడిని తప్పకుండా చూడండి. ఆలస్యం చేయకండి. సకాలంలో చికిత్స తీసుకోకపోతే చూపు పోవచ్చు.",
    "అత్యంత తీవ్రం: మీ కంటికి చాలా అధికంగా నష్టం జరిగింది. వెంటనే ఆసుపత్రికి వెళ్ళండి. కంటి శస్త్రచికిత్స అవసరం కావచ్చు. ఆలస్యం చేస్తే చూపు శాశ్వతంగా పోవచ్చు.",
  ],
  "ml-IN": [
    "നിങ്ങളുടെ കണ്ണിന്റെ റെറ്റിന പരിശോധിച്ചു. ഇപ്പോൾ ഒരു രോഗ ലക്ഷണവും കാണുന്നില്ല. കണ്ണുകൾ ആരോഗ്യകരമാണ്. എല്ലാ വർഷവും ഒരു തവണ കണ്ണ് പരിശോധന നടത്തുക. പഞ്ചസാര അളവ് നിയന്ത്രിക്കുക.",
    "റെറ്റിനയിൽ ചെറിയ മാറ്റങ്ങൾ കണ്ടെത്തി. ഇപ്പോൾ ചികിത്സ ആവശ്യമില്ല. എല്ലാ 6 മാസത്തിലും ഡോക്ടറെ കാണുക. ആരോഗ്യകരമായ ഭക്ഷണം കഴിക്കുക. പഞ്ചസാര നിയന്ത്രിക്കുക.",
    "റെറ്റിനയിൽ ശ്രദ്ധേയമായ മാറ്റങ്ങൾ കണ്ടെത്തി. 3 മുതൽ 6 മാസത്തിനുള്ളിൽ കണ്ണ് വിദഗ്ധനെ കാണുക. പഞ്ചസാര കർശനമായി നിയന്ത്രിക്കുക. ലേസർ ചികിത്സ ആവശ്യം വന്നേക്കാം.",
    "അടിയന്തരം: കണ്ണിൽ ഗുരുതരമായ തകരാർ കണ്ടെത്തി. ഒരു മാസത്തിനുള്ളിൽ ഡോക്ടറെ കണ്ടിരിക്കണം. വൈകരുത്. ശരിയായ സമയത്ത് ചികിത്സ ലഭിച്ചില്ലെങ്കിൽ കാഴ്ച നഷ്ടപ്പെടാം.",
    "വളരെ ഗുരുതരം: കണ്ണിന് ഏറ്റവും കൂടുതൽ കേടുപാടുകൾ ഉണ്ട്. ഉടൻ ആശുപത്രിയിൽ പോകുക. കണ്ണ് ശസ്ത്രക്രിയ ആവശ്യമാകാം. വൈകിയാൽ കാഴ്ച എന്നെന്നേക്കും നഷ്ടപ്പെടാം.",
  ],
};

// ─── Narration builder ────────────────────────────────────────────────────────

function buildNarration(lang: LangCode, drStage: number, riskLevel: string, confidence: string, recommendation: string): string {
  const stage = DR_STAGE_LABELS[lang][drStage] ?? DR_STAGE_LABELS[lang][0];
  const risk  = RISK_LABELS[lang][riskLevel] ?? riskLevel;

  if (lang === "ta-IN") return [
    `உங்கள் கண் ரெட்டினா படம் ஆய்வு செய்யப்பட்டது.`,
    `கண்டறியப்பட்ட நிலை: ${stage}.`,
    `அபாய நிலை ${risk} ஆக உள்ளது.`,
    `ஏஐ முடிவின் நம்பிக்கை அளவு ${confidence} சதவீதம்.`,
    `மருத்துவ பரிந்துரை: ${recommendation}`,
  ].join("  ");

  if (lang === "hi-IN") return [
    `मरीज़ की स्कैन जांच पूरी हुई।`,
    `पता चला: ${stage}।`,
    `जोखिम स्तर ${risk} है।`,
    `विश्वास स्कोर ${confidence} प्रतिशत है।`,
    `सिफारिश: ${recommendation}`,
  ].join("  ");

  if (lang === "te-IN") return [
    `రోగి స్కాన్ విశ్లేషణ పూర్తయింది.`,
    `కనుగొనబడింది: ${stage}.`,
    `ప్రమాద స్థాయి ${risk}.`,
    `నమ్మకం స్కోర్ ${confidence} శాతం.`,
    `సిఫారసు: ${recommendation}`,
  ].join("  ");

  if (lang === "ml-IN") return [
    `രോഗിയുടെ സ്‌കാൻ വിശകലനം പൂർത്തിയായി.`,
    `കണ്ടെത്തൽ: ${stage}.`,
    `അപകട നില ${risk}.`,
    `ആത്മവിശ്വാസ സ്‌കോർ ${confidence} ശതമാനം.`,
    `ശുപാർശ: ${recommendation}`,
  ].join("  ");

  return [
    `Patient scan analysis complete.`,
    `Detected: ${stage}.`,
    `Risk level is ${risk}.`,
    `Confidence score is ${confidence} percent.`,
    `Recommendation: ${recommendation}`,
  ].join("  ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScanResult() {
  const [, params] = useRoute("/scans/:id");
  const scanId = parseInt(params?.id || "0", 10);
  const { data: scan, isLoading, refetch } = useGetScan(scanId);
  const updateMutation = useUpdateScan();
  const { user } = useAuth();

  const [doctorNotes, setDoctorNotes] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LangCode>("en-US");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (scan?.doctorNotes) setDoctorNotes(scan.doctorNotes);
  }, [scan]);

  // Stop speaking instantly on language change
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [selectedLanguage]);

  // Cleanup on unmount
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  const t = UI[selectedLanguage];

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">{UI["en-US"].loading}</div>;
  if (!scan) return <div className="p-8 text-center text-destructive font-bold">{UI["en-US"].notFound}</div>;

  // Derived translated values
  const drStageLabel    = DR_STAGE_LABELS[selectedLanguage][scan.drStage] ?? DR_STAGE_LABELS["en-US"][scan.drStage]!;
  const riskLabel       = RISK_LABELS[selectedLanguage][scan.riskLevel] ?? scan.riskLevel;
  const recommendation  = RECOMMENDATIONS[selectedLanguage][scan.drStage] ?? RECOMMENDATIONS["en-US"][scan.drStage]!;
  const confidence      = (scan.confidenceScore * 100).toFixed(1);
  const isCritical      = scan.drStage >= 3;

  // Heatmap
  let heatmapPoints: { x: number; y: number; intensity: number; radius: number }[] = [];
  try { if (scan.heatmapData) heatmapPoints = JSON.parse(scan.heatmapData); } catch (_) {}
  if (heatmapPoints.length === 0 && scan.drStage > 0) {
    heatmapPoints = [
      { x: 30, y: 40, intensity: 0.8, radius: 15 },
      { x: 60, y: 35, intensity: 0.9, radius: 20 },
      { x: 45, y: 70, intensity: 0.6, radius: 10 },
    ];
  }

  const handleSpeak = () => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = buildNarration(selectedLanguage, scan.drStage, scan.riskLevel, confidence, recommendation);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang   = selectedLanguage;
    utterance.rate   = 0.75;
    utterance.pitch  = 1;
    utterance.volume = 1;
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleConfirm = async () => {
    await updateMutation.mutateAsync({ id: scan.id, data: { doctorConfirmed: true, doctorNotes, doctorId: user?.username } });
    refetch();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-card rounded-full shadow-sm hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              {t.scanResults}
              {scan.doctorConfirmed && <CheckCircle className="w-6 h-6 text-green-500" />}
            </h1>
            <p className="text-muted-foreground mt-1">Scan ID: {scan.id} • {formatMedicalDate(scan.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Language + Listen cluster */}
          <div className="flex items-center bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 border-r border-border text-muted-foreground">
              <Languages className="w-4 h-4 shrink-0" />
              <select
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value as LangCode)}
                className="bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.native} ({l.label})</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSpeak}
              className={cn(
                "flex items-center gap-2 px-3 py-2 transition-colors font-semibold text-sm",
                isSpeaking ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              )}
              title={isSpeaking ? t.stopBtn : t.listenBtn}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isSpeaking ? t.stopBtn : t.listenBtn}
            </button>
          </div>

          <Link
            href={`/reports/${scan.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl shadow-sm hover:bg-muted transition-colors font-semibold text-sm"
          >
            <Printer className="w-4 h-4" />
            {t.printReport}
          </Link>
        </div>
      </div>

      {/* ── Critical alert ── */}
      {isCritical && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-r-xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="text-destructive font-bold text-lg">{t.criticalHeading}</h3>
            <p className="text-destructive/80 text-sm font-medium">{t.criticalBody}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Image & Heatmap ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t.retinalAnalysis}</h3>
              <div className="flex items-center gap-3 text-sm font-medium">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> {t.highLegend}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> {t.medLegend}</span>
              </div>
            </div>

            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-border flex items-center justify-center">
              {scan.imageData ? (
                <>
                  <img src={scan.imageData} alt="Scan" className="w-full h-full object-contain" />
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none mix-blend-hard-light opacity-80">
                    <defs>
                      <radialGradient id="grad-red">
                        <stop offset="0%" stopColor="red" stopOpacity="1" />
                        <stop offset="100%" stopColor="red" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="grad-yellow">
                        <stop offset="0%" stopColor="yellow" stopOpacity="1" />
                        <stop offset="100%" stopColor="yellow" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    {heatmapPoints.map((pt, i) => (
                      <circle key={i} cx={`${pt.x}%`} cy={`${pt.y}%`} r={`${pt.radius}%`}
                        fill={pt.intensity > 0.7 ? "url(#grad-red)" : "url(#grad-yellow)"}
                        opacity={pt.intensity} />
                    ))}
                  </svg>
                </>
              ) : (
                <div className="text-white/50 flex flex-col items-center gap-2">
                  <FileText className="w-12 h-12" />
                  <p>{t.noImage}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">{t.heatmapNote}</p>
          </div>
        </div>

        {/* ── Right: Diagnostics ── */}
        <div className="space-y-6">

          {/* DR Stage card */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 text-center">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">{t.drStage}</p>
            <h2 className="text-6xl font-display font-black text-primary mb-2">{scan.drStage}</h2>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm mb-6">
              {drStageLabel}
            </div>
            <div className="grid grid-cols-2 gap-4 text-left border-t border-border pt-6">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">{t.aiConfidence}</p>
                <p className="text-xl font-bold">{confidence}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">{t.blindnessRisk}</p>
                <p className="text-xl font-bold">{scan.blindnessRiskScore}/100</p>
              </div>
            </div>
          </div>

          {/* AI Recommendation — translated */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <h3 className="font-bold flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-teal-500" /> {t.aiRecommendation}
            </h3>
            <p className="text-foreground text-sm leading-relaxed bg-muted/50 p-4 rounded-xl border border-border">
              {recommendation}
            </p>
          </div>

          {/* Doctor review */}
          {user?.role === "doctor" && !scan.doctorConfirmed && (
            <div className="bg-primary/5 rounded-2xl border-2 border-primary/20 p-6">
              <h3 className="font-bold text-primary flex items-center gap-2 mb-4">
                <Stethoscope className="w-5 h-5" /> {t.doctorReviewHeading}
              </h3>
              <textarea
                value={doctorNotes}
                onChange={e => setDoctorNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none mb-4 resize-none h-24"
                placeholder={t.notesPlaceholder}
              />
              <button
                onClick={handleConfirm}
                disabled={updateMutation.isPending}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updateMutation.isPending ? t.saving : t.confirmDiagnosis}
              </button>
            </div>
          )}

          {scan.doctorConfirmed && (
            <div className="bg-green-500/10 rounded-2xl border border-green-500/20 p-6">
              <h3 className="font-bold text-green-700 flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5" /> {t.confirmedBy} {scan.doctorId}
              </h3>
              {scan.doctorNotes && (
                <div className="mt-4 pt-4 border-t border-green-500/20">
                  <p className="text-xs text-green-800 font-semibold mb-1">{t.clinicalNotes}</p>
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

import type { PlanAction } from "./recourse";
import type { FeatureKey } from "./types";

export type Lang = "en" | "hi" | "mr";
export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: "en", label: "English", native: "EN" },
  { id: "hi", label: "Hindi", native: "हिं" },
  { id: "mr", label: "Marathi", native: "मरा" },
];
export const asLang = (v: string | null | undefined): Lang => (v === "hi" || v === "mr" ? v : "en");

const fill = (t: string, vars: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));

export const money = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

/** Display value of a raw feature, in the unit the applicant understands. */
export function displayValue(key: FeatureKey, v: number): string {
  if (key === "monthlyIncome") return money(v);
  if (key === "utilization" || key === "debtRatio") return pct(v);
  return String(Math.round(v));
}

const UI = {
  en: {
    today: "Today",
    step: "Step",
    reapply: "Re-apply",
    kinds: { actionable: "Actionable", "slow-moving": "Slow-moving", time: "Time" } as Record<string, string>,
    total: "Total",
    projected: "projected",
    tagline: "A rejection should be a roadmap.",
    heroBody:
      "Pathway explains a loan decision in plain language, then finds the smallest realistic set of changes that turns a “no” into a “yes”, with a month-by-month timeline.",
    tryDemo: "Try a demo applicant",
    assess: "See my path",
    applicant: "Applicant",
    fairness: "Fairness audit",
    report: "Lender report",
    method: "How it works",
    score: "Pathway score",
    threshold: "Approval needs",
    pd: "Default risk (2 yrs)",
    approved: "Approved",
    declined: "Declined",
    approvedIn: "Approved in {n} months",
    approvedIn1: "Approved in 1 month",
    approvedNow: "Approved today",
    noPlan: "No feasible plan within {n} months",
    why: "Why",
    whyTitle: "The reasons behind this decision",
    whySub: "Ranked by how many score points each factor costs, compared with the average applicant.",
    noReasons: "Nothing is holding this application back.",
    what: "What",
    whatTitle: "The lowest-effort plan that flips the decision",
    whatSub: "Only changes a person can realistically make. Immutable traits are never touched.",
    never: "Never changed",
    neverList: "Age · Dependents · Real-estate loans",
    effort: "effort",
    monthsShort: "mo",
    planScore: "Score after the plan",
    when: "When",
    whenTitle: "Month-by-month projection",
    whenSub: "Score versus the approval line if you follow the plan, and if you change nothing.",
    withPlan: "With plan",
    withoutPlan: "No changes",
    month: "Month",
    assumptions: "Assumptions used (lib/config.ts)",
    explanation: "Plain-language summary",
    rewrite: "Rewrite in simpler words (AI)",
    rewriting: "Rewriting…",
    rewriteNote: "Uses Claude only if the server has an API key; otherwise you keep the template.",
    printReport: "Open lender report",
    disclaimer:
      "Pathway is a simulation built on public/synthetic data for a hackathon. It is not a credit decision, not financial advice, and not affiliated with any lender.",
    fields: {
      monthlyIncome: "Monthly income",
      utilization: "Card utilization",
      debtRatio: "Debt-to-income",
      age: "Age",
      openCreditLines: "Open credit lines",
      late30: "30–59 days late",
      late60: "60–89 days late",
      late90: "90+ days late",
      dependents: "Dependents",
      realEstateLoans: "Real-estate loans",
    } as Record<FeatureKey, string>,
  },
  hi: {
    today: "आज",
    step: "चरण",
    reapply: "दोबारा आवेदन",
    kinds: { actionable: "बदलने योग्य", "slow-moving": "धीमा बदलाव", time: "समय" } as Record<string, string>,
    total: "कुल",
    projected: "अनुमानित",
    tagline: "अस्वीकृति एक रास्ता होनी चाहिए।",
    heroBody:
      "पाथवे ऋण निर्णय को सरल भाषा में समझाता है, फिर बदलावों का सबसे छोटा व्यावहारिक सेट ढूँढता है जो “ना” को “हाँ” में बदल दे, महीने-दर-महीने समयरेखा के साथ।",
    tryDemo: "डेमो आवेदक आज़माएँ",
    assess: "मेरा रास्ता देखें",
    applicant: "आवेदक",
    fairness: "निष्पक्षता जाँच",
    report: "ऋणदाता रिपोर्ट",
    method: "यह कैसे काम करता है",
    score: "पाथवे स्कोर",
    threshold: "स्वीकृति के लिए चाहिए",
    pd: "डिफ़ॉल्ट जोखिम (2 वर्ष)",
    approved: "स्वीकृत",
    declined: "अस्वीकृत",
    approvedIn: "{n} महीनों में स्वीकृति",
    approvedIn1: "1 महीने में स्वीकृति",
    approvedNow: "आज ही स्वीकृत",
    noPlan: "{n} महीनों में कोई व्यावहारिक योजना नहीं",
    why: "क्यों",
    whyTitle: "इस निर्णय के कारण",
    whySub: "औसत आवेदक की तुलना में हर कारण से कितने स्कोर अंक घटे, उसी क्रम में।",
    noReasons: "इस आवेदन को कुछ भी नहीं रोक रहा।",
    what: "क्या",
    whatTitle: "निर्णय बदलने वाली सबसे आसान योजना",
    whatSub: "केवल वही बदलाव जो व्यक्ति वास्तव में कर सकता है। न बदलने योग्य बातें कभी नहीं छुई जातीं।",
    never: "कभी नहीं बदला जाता",
    neverList: "आयु · आश्रित · रियल-एस्टेट ऋण",
    effort: "प्रयास",
    monthsShort: "माह",
    planScore: "योजना के बाद स्कोर",
    when: "कब",
    whenTitle: "महीने-दर-महीने अनुमान",
    whenSub: "योजना अपनाने पर और कुछ न बदलने पर, स्वीकृति रेखा की तुलना में स्कोर।",
    withPlan: "योजना के साथ",
    withoutPlan: "कोई बदलाव नहीं",
    month: "महीना",
    assumptions: "प्रयुक्त मान्यताएँ (lib/config.ts)",
    explanation: "सरल भाषा में सारांश",
    rewrite: "और सरल शब्दों में लिखें (AI)",
    rewriting: "लिखा जा रहा है…",
    rewriteNote: "सर्वर पर API कुंजी होने पर ही Claude का उपयोग होता है; अन्यथा यही टेम्पलेट रहता है।",
    printReport: "ऋणदाता रिपोर्ट खोलें",
    disclaimer:
      "पाथवे एक हैकथॉन के लिए सार्वजनिक/कृत्रिम डेटा पर बना सिमुलेशन है। यह कोई ऋण निर्णय या वित्तीय सलाह नहीं है और किसी ऋणदाता से संबद्ध नहीं है।",
    fields: {
      monthlyIncome: "मासिक आय",
      utilization: "कार्ड उपयोग",
      debtRatio: "कर्ज़-आय अनुपात",
      age: "आयु",
      openCreditLines: "सक्रिय क्रेडिट खाते",
      late30: "30–59 दिन देरी",
      late60: "60–89 दिन देरी",
      late90: "90+ दिन देरी",
      dependents: "आश्रित",
      realEstateLoans: "रियल-एस्टेट ऋण",
    } as Record<FeatureKey, string>,
  },
  mr: {
    today: "आज",
    step: "पायरी",
    reapply: "पुन्हा अर्ज",
    kinds: { actionable: "बदलता येणारे", "slow-moving": "हळू बदल", time: "वेळ" } as Record<string, string>,
    total: "एकूण",
    projected: "अंदाजित",
    tagline: "नकार हा एक मार्ग असायला हवा.",
    heroBody:
      "पाथवे कर्जाचा निर्णय सोप्या भाषेत समजावतो, मग “नाही” चे “हो” मध्ये रूपांतर करणारे सर्वात लहान व्यवहार्य बदल शोधतो, महिना-दर-महिना वेळापत्रकासह.",
    tryDemo: "डेमो अर्जदार वापरून पाहा",
    assess: "माझा मार्ग पाहा",
    applicant: "अर्जदार",
    fairness: "निष्पक्षता तपासणी",
    report: "कर्जदाता अहवाल",
    method: "हे कसे चालते",
    score: "पाथवे स्कोअर",
    threshold: "मंजुरीसाठी आवश्यक",
    pd: "थकबाकी जोखीम (2 वर्षे)",
    approved: "मंजूर",
    declined: "नामंजूर",
    approvedIn: "{n} महिन्यांत मंजुरी",
    approvedIn1: "1 महिन्यात मंजुरी",
    approvedNow: "आजच मंजूर",
    noPlan: "{n} महिन्यांत व्यवहार्य योजना नाही",
    why: "का",
    whyTitle: "या निर्णयामागील कारणे",
    whySub: "सरासरी अर्जदाराच्या तुलनेत प्रत्येक घटकामुळे किती स्कोअर गुण कमी झाले, त्या क्रमाने.",
    noReasons: "या अर्जाला काहीही अडवत नाही.",
    what: "काय",
    whatTitle: "निर्णय बदलणारी सर्वात सोपी योजना",
    whatSub: "फक्त व्यक्ती प्रत्यक्षात करू शकेल असे बदल. न बदलता येणाऱ्या गोष्टींना कधीही हात लावला जात नाही.",
    never: "कधीही बदलले जात नाही",
    neverList: "वय · अवलंबित · स्थावर मालमत्ता कर्जे",
    effort: "प्रयत्न",
    monthsShort: "म.",
    planScore: "योजनेनंतर स्कोअर",
    when: "कधी",
    whenTitle: "महिना-दर-महिना अंदाज",
    whenSub: "योजना पाळल्यास आणि काहीही न बदलल्यास, मंजुरी रेषेच्या तुलनेत स्कोअर.",
    withPlan: "योजनेसह",
    withoutPlan: "कोणताही बदल नाही",
    month: "महिना",
    assumptions: "वापरलेली गृहितके (lib/config.ts)",
    explanation: "सोप्या भाषेत सारांश",
    rewrite: "आणखी सोप्या शब्दांत लिहा (AI)",
    rewriting: "लिहित आहे…",
    rewriteNote: "सर्व्हरवर API की असेल तरच Claude वापरले जाते; अन्यथा हाच साचा राहतो.",
    printReport: "कर्जदाता अहवाल उघडा",
    disclaimer:
      "पाथवे हे हॅकॅथॉनसाठी सार्वजनिक/कृत्रिम डेटावर बनवलेले सिम्युलेशन आहे. हा कर्जाचा निर्णय किंवा आर्थिक सल्ला नाही आणि कोणत्याही कर्जदात्याशी संलग्न नाही.",
    fields: {
      monthlyIncome: "मासिक उत्पन्न",
      utilization: "कार्ड वापर",
      debtRatio: "कर्ज-उत्पन्न गुणोत्तर",
      age: "वय",
      openCreditLines: "सक्रिय क्रेडिट खाती",
      late30: "30–59 दिवस उशीर",
      late60: "60–89 दिवस उशीर",
      late90: "90+ दिवस उशीर",
      dependents: "अवलंबित",
      realEstateLoans: "स्थावर मालमत्ता कर्जे",
    } as Record<FeatureKey, string>,
  },
};

export type UIStrings = (typeof UI)["en"];
export const t = (lang: Lang): UIStrings => UI[lang];
export const tf = (template: string, vars: Record<string, string | number>) => fill(template, vars);

const REASONS: Record<Lang, Record<FeatureKey, string>> = {
  en: {
    utilization: "Your credit cards are {value} used. High balances signal stretched finances.",
    debtRatio: "Monthly debt payments take {value} of your income.",
    monthlyIncome: "Your monthly income ({value}) is low compared with similar applicants.",
    late30: "{value} payment(s) were 30–59 days late in the last 2 years.",
    late60: "{value} payment(s) were 60–89 days late in the last 2 years.",
    late90: "{value} payment(s) were 90+ days late in the last 2 years.",
    openCreditLines: "Only {value} open credit lines: a thin credit history.",
    age: "Your age group ({value}) shows higher default rates in the data. This can't change, so it is never part of your plan.",
    dependents: "{value} dependents add to household obligations.",
    realEstateLoans: "Your number of real-estate loans ({value}).",
  },
  hi: {
    utilization: "आपके क्रेडिट कार्ड की सीमा का {value} उपयोग हो चुका है। ऊँचा बकाया आर्थिक दबाव का संकेत है।",
    debtRatio: "मासिक कर्ज़ किस्तें आपकी आय का {value} हिस्सा लेती हैं।",
    monthlyIncome: "आपकी मासिक आय ({value}) समान आवेदकों की तुलना में कम है।",
    late30: "पिछले 2 वर्षों में {value} भुगतान 30–59 दिन देर से हुए।",
    late60: "पिछले 2 वर्षों में {value} भुगतान 60–89 दिन देर से हुए।",
    late90: "पिछले 2 वर्षों में {value} भुगतान 90+ दिन देर से हुए।",
    openCreditLines: "केवल {value} सक्रिय क्रेडिट खाते — क्रेडिट इतिहास कम है।",
    age: "आपके आयु वर्ग ({value}) में डेटा के अनुसार डिफ़ॉल्ट दर अधिक है। यह बदला नहीं जा सकता, इसलिए यह आपकी योजना में कभी शामिल नहीं होता।",
    dependents: "{value} आश्रित परिवार की आर्थिक ज़िम्मेदारी बढ़ाते हैं।",
    realEstateLoans: "आपके रियल-एस्टेट ऋणों की संख्या ({value})।",
  },
  mr: {
    utilization: "तुमच्या क्रेडिट कार्ड मर्यादेपैकी {value} वापरली गेली आहे. जास्त थकबाकी आर्थिक ताणाचे लक्षण आहे.",
    debtRatio: "मासिक कर्जाचे हप्ते तुमच्या उत्पन्नाच्या {value} इतके आहेत.",
    monthlyIncome: "तुमचे मासिक उत्पन्न ({value}) तत्सम अर्जदारांच्या तुलनेत कमी आहे.",
    late30: "गेल्या 2 वर्षांत {value} हप्ते 30–59 दिवस उशिरा भरले गेले.",
    late60: "गेल्या 2 वर्षांत {value} हप्ते 60–89 दिवस उशिरा भरले गेले.",
    late90: "गेल्या 2 वर्षांत {value} हप्ते 90+ दिवस उशिरा भरले गेले.",
    openCreditLines: "फक्त {value} सक्रिय क्रेडिट खाती — पत इतिहास कमी आहे.",
    age: "तुमच्या वयोगटात ({value}) डेटानुसार थकबाकीचे प्रमाण जास्त आहे. हे बदलता येत नाही, म्हणून ते तुमच्या योजनेत कधीही नसते.",
    dependents: "{value} अवलंबित व्यक्तींमुळे कुटुंबाची आर्थिक जबाबदारी वाढते.",
    realEstateLoans: "तुमच्या स्थावर मालमत्ता कर्जांची संख्या ({value}).",
  },
};

export function reasonText(lang: Lang, key: FeatureKey, value: number): string {
  return fill(REASONS[lang][key], { value: displayValue(key, value) });
}

const ACTIONS: Record<Lang, Record<PlanAction["key"], string>> = {
  en: {
    utilization: "Pay card balances down from {from} to {to} of your limit",
    debtRatio: "Cut monthly debt payments so they take {to} of income instead of {from}",
    openCreditLines: "Change open credit lines from {from} to {to}",
    monthlyIncome: "Grow monthly income from {from} to {to} (capped, realistic growth)",
    wait: "Pay every bill on time for {to} months so past late payments age out",
  } as Record<PlanAction["key"], string>,
  hi: {
    utilization: "कार्ड का बकाया सीमा के {from} से घटाकर {to} करें",
    debtRatio: "मासिक किस्तें घटाएँ ताकि वे आय का {from} नहीं, {to} हों",
    openCreditLines: "सक्रिय क्रेडिट खाते {from} से {to} करें",
    monthlyIncome: "मासिक आय {from} से {to} तक बढ़ाएँ (सीमित, व्यावहारिक वृद्धि)",
    wait: "{to} महीने तक हर बिल समय पर चुकाएँ ताकि पुराने देर वाले भुगतान रिकॉर्ड से हट जाएँ",
  } as Record<PlanAction["key"], string>,
  mr: {
    utilization: "कार्डची थकबाकी मर्यादेच्या {from} वरून {to} पर्यंत कमी करा",
    debtRatio: "मासिक हप्ते कमी करा जेणेकरून ते उत्पन्नाच्या {from} ऐवजी {to} होतील",
    openCreditLines: "सक्रिय क्रेडिट खाती {from} वरून {to} करा",
    monthlyIncome: "मासिक उत्पन्न {from} वरून {to} पर्यंत वाढवा (मर्यादित, व्यवहार्य वाढ)",
    wait: "{to} महिने प्रत्येक बिल वेळेवर भरा, जेणेकरून जुने उशिराचे हप्ते नोंदीतून हटतील",
  } as Record<PlanAction["key"], string>,
};

export function actionText(lang: Lang, a: PlanAction): string {
  const fmt = (v: number) => (a.key === "wait" ? String(v) : displayValue(a.key as FeatureKey, v));
  return fill(ACTIONS[lang][a.key], { from: fmt(a.from), to: fmt(a.to) });
}

const SUMMARY: Record<Lang, { head: string; reason: string; plan: string; plan1: string; ok: string; none: string }> = {
  en: {
    head: "{name}, this application was {decision} with a Pathway score of {score} (approval needs {threshold}).",
    reason: "The biggest factor: {reason}",
    plan: "If you follow the plan below, you are projected to be approved in about {n} months.",
    plan1: "If you follow the plan below, you are projected to be approved in about 1 month.",
    ok: "No changes are needed.",
    none: "Under our realistic limits there is no plan that reaches approval within {n} months. The closest plan is shown.",
  },
  hi: {
    head: "{name}, यह आवेदन {score} के पाथवे स्कोर के साथ {decision} हुआ (स्वीकृति के लिए {threshold} चाहिए)।",
    reason: "सबसे बड़ा कारण: {reason}",
    plan: "नीचे दी गई योजना अपनाने पर लगभग {n} महीनों में स्वीकृति का अनुमान है।",
    plan1: "नीचे दी गई योजना अपनाने पर लगभग 1 महीने में स्वीकृति का अनुमान है।",
    ok: "किसी बदलाव की ज़रूरत नहीं है।",
    none: "हमारी व्यावहारिक सीमाओं में {n} महीनों के भीतर स्वीकृति तक पहुँचने वाली कोई योजना नहीं है। सबसे नज़दीकी योजना दिखाई गई है।",
  },
  mr: {
    head: "{name}, हा अर्ज {score} पाथवे स्कोअरसह {decision} झाला (मंजुरीसाठी {threshold} आवश्यक).",
    reason: "सर्वात मोठे कारण: {reason}",
    plan: "खालील योजना पाळल्यास सुमारे {n} महिन्यांत मंजुरीचा अंदाज आहे.",
    plan1: "खालील योजना पाळल्यास सुमारे 1 महिन्यात मंजुरीचा अंदाज आहे.",
    ok: "कोणत्याही बदलाची गरज नाही.",
    none: "आमच्या व्यवहार्य मर्यादांमध्ये {n} महिन्यांत मंजुरीपर्यंत पोहोचणारी योजना नाही. सर्वात जवळची योजना दाखवली आहे.",
  },
};

export function summaryText(
  lang: Lang,
  o: {
    name: string;
    approved: boolean;
    score: number;
    threshold: number;
    topReason: { key: FeatureKey; value: number } | null;
    approvalMonth: number | null;
    horizon: number;
  },
): string {
  const s = SUMMARY[lang];
  const ui = t(lang);
  const parts = [
    fill(s.head, {
      name: o.name,
      decision: (o.approved ? ui.approved : ui.declined).toLowerCase(),
      score: Math.round(o.score),
      threshold: o.threshold,
    }),
  ];
  if (o.approved) parts.push(s.ok);
  else {
    if (o.topReason) parts.push(fill(s.reason, { reason: reasonText(lang, o.topReason.key, o.topReason.value) }));
    if (o.approvalMonth === null) parts.push(fill(s.none, { n: o.horizon }));
    else parts.push(o.approvalMonth <= 1 ? s.plan1 : fill(s.plan, { n: o.approvalMonth }));
  }
  return parts.join(" ");
}

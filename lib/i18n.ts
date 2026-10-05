import { UNCERTAINTY, describeUncertainty } from "./config";
import { MODEL } from "./model";
import { inr } from "./money";
import { PRICING, describePricing, type RateTier } from "./pricing";
import type { PlanAction } from "./recourse";
import type { Sample } from "./samples";
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

/** Rupees with Indian digit grouping: 250000 → "₹2,50,000". */
export const money = (v: number) => inr(v);
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
/** A rate such as an APR: one decimal, trailing ".0" dropped (0.105 → "10.5%", 0.18 → "18%"). */
export const rate = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, "")}%`;

/** Display value of a raw feature, in the unit the applicant understands. */
export function displayValue(key: FeatureKey, v: number): string {
  if (key === "monthlyIncome") return money(v);
  if (key === "utilization" || key === "debtRatio") return pct(v);
  return String(Math.round(v));
}

const EN = {
  today: "Today",
  step: "Step",
  reapply: "Re-apply",
  kinds: { actionable: "Actionable", "slow-moving": "Slow-moving", time: "Time" } as Record<string, string>,
  total: "Total",
  projected: "projected",
  tagline: "Why was this loan declined, and what fixes it?",
  heroBody:
    "Enter the numbers from your credit report. Pathway names the reasons, finds the smallest realistic set of changes that turns a decline into an approval, and shows the month you could apply again.",
  tryDemo: "Try a demo applicant",
  assess: "See my path",
  applicant: "Applicant",
  fairness: "Fairness audit",
  report: "Lender report",
  method: "How it works",
  score: "Pathway score",
  threshold: "Approval needs",
  pd: "Chance of default in 2 years",
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
  neverList: "Age · Dependants · Home loans",
  effort: "effort",
  monthsShort: "mo",
  planScore: "Score after the plan",
  when: "When",
  whenTitle: "Month-by-month projection",
  whenSub: "Score versus the approval line if you follow the plan, and if you change nothing.",
  withPlan: "With plan",
  withoutPlan: "No changes",
  month: "Month",
  assumptions: "Assumptions used",
  explanation: "Plain-language summary",
  rewrite: "Rewrite in simpler words (AI)",
  rewriting: "Rewriting…",
  rewriteNote: "Uses Claude only if the server has an API key; otherwise you keep the template.",
  printReport: "Open lender report",
  disclaimer:
    "Pathway is an educational simulation built on synthetic data. It is not a credit decision, not financial advice, and not linked to any lender, bank or credit bureau.",
  fields: {
    monthlyIncome: "Monthly income",
    utilization: "Credit card utilisation",
    debtRatio: "FOIR (EMIs as % of income)",
    age: "Age",
    openCreditLines: "Active loans and cards",
    late30: "Late 30–59 days (DPD)",
    late60: "Late 60–89 days (DPD)",
    late90: "Late 90+ days (DPD)",
    dependents: "Dependants",
    realEstateLoans: "Home loans",
  } as Record<FeatureKey, string>,

  // Workbench
  kicker: "Explainable credit, in plain words",
  profileTitle: "Applicant profile",
  profileSub: "Use the figures on your credit report. Everything below updates as you type.",
  historyTitle: "Credit history and household",
  pts: "pts",
  aiBadge: "AI rewrite",
  templateBadge: "Template",
  closestPlan: "Closest plan",
  samples: {
    "clear-rejection": "Maxed-out cards and recent late payments",
    borderline: "Just under the line: high card balance",
    approved: "Low card use, clean repayment history",
  } as Record<Sample["id"], string>,
  incomeUnits: "Amounts are in rupees. Income is your monthly income; FOIR counts all EMIs and other fixed monthly payments.",

  savings: {
    kicker: "Worth",
    title: "What the plan is worth in money",
    sub: "The same personal loan, taken today versus after the plan. Interest rates are illustrative, not offers.",
    amount: "Loan amount",
    term: "Term",
    termOption: "{n} months",
    headlineSave: "Follow the plan and save {amount} in interest",
    emiDrop: "Your monthly payment (EMI) drops by {amount} a month.",
    headlineClosest:
      "The closest plan still ends below the approval line, so the rate stays at the high-cost lender's {apr} a year.",
    closestGap: "{n} more points would reach the {tier} ({apr} a year) and save {amount} on this loan.",
    headlineApproved: "At today's score, this loan costs {amount} in interest",
    approvedTier: "You already qualify for the {tier} at {apr} a year.",
    today: "Borrow today",
    afterPlan: "Borrow after the plan",
    afterClosest: "After the closest plan",
    atNextTier: "At the next tier",
    apr: "Interest rate (p.a.)",
    tierLabel: "Rate tier",
    emi: "Monthly payment (EMI)",
    interest: "Total interest",
    declinedTier: "Declined: high-cost lender at {apr} a year",
    tierName: "{tier} tier",
    tierNames: { excellent: "Excellent", "very-good": "Very good", good: "Good", fair: "Fair" } as Record<RateTier["id"], string>,
    ladderTitle: "Illustrative rate ladder",
    ladderSub: "A higher Pathway score unlocks a lower rate.",
    declinedZone: "Declined",
    scoreFrom: "Score {n}+",
    scoreBelow: "Below {n}",
    youToday: "You today",
    youAfter: "After the plan",
    nextHint: "{n} more points reaches the {tier} ({apr} a year) and saves another {amount}.",
    bestTier: "That is already the best illustrative tier.",
    assumptions: "Pricing assumptions (illustrative)",
    assumptionsNote:
      "Every rate here is illustrative, for a simulation. It is not calibrated to any lender and is not an offer or financial advice.",
    rows: {
      tierValue: "{apr} a year",
      declinedLabel: "Below {n} (declined)",
      declinedValue: "{apr} a year from a high-cost lender",
      loanLabel: "Default loan",
      loanValue: "{amount} over {n} months",
      affordLabel: "Affordability",
      affordValue: "FOIR: all EMIs at most {pct} of monthly income",
    },
  },

  mc: {
    likely: "Likely approved in {n} months",
    likely1: "Likely approved in 1 month",
    likelyNow: "Approved today",
    likelyBeyond: "Likely beyond {n} months",
    range: "Best case {low}, worst case {high}",
    rangeSame: "Best and worst case alike: {m}",
    months: "{n} months",
    month1: "1 month",
    month0: "today",
    beyond: "beyond {n} months",
    share: "{pct} of {runs} simulated futures reach approval within {n} months",
    exact: "Exactly on plan: {label}",
    band: "Likely range ({low}th–{high}th percentile)",
    approvalDot: "Projected approval",
    tooltipRange: "Likely range",
    howSure: "How sure is this?",
    howSureBody:
      "We replay the plan {runs} times with real-life wobble: slower or faster paydown, uneven income growth, the odd income shock that pauses progress, and the occasional new late payment. The shaded band shows where the middle {width}% of those simulated futures land. It is a simulation, not a promise.",
    chartLabel:
      "Projected Pathway score over the next {h} months. With the plan it moves from {from} to {to}; with no changes it ends at {base}. Approval needs {threshold}. {likely}. {share}.",
    rows: {
      runs: "Simulated futures",
      runsValue: "{runs} per applicant (seeded, repeatable)",
      pace: "Pace of paydown",
      paceValue: "{min}–{max} of the plan's pace, centred on {mean}",
      income: "Income growth",
      incomeValue: "{min}–{max} per month, centred on {mean}",
      shocks: "Income shocks",
      shocksValue: "{chance} chance a month, pausing progress {lo}–{hi} months",
      late: "New late payment",
      lateValue: "{chance} chance a month",
      band: "Band shown",
      bandValue: "{low}th to {high}th percentile; “likely” is the median",
    },
  },

  tools: {
    kicker: "Explore",
    title: "More tools",
    sub: "Other ways to plan ahead, check an offer and audit the model.",
    goalTitle: "Goal planner",
    goalBody: "Tell us the loan you want; we work backwards.",
    offerTitle: "Offer check",
    offerBody: "Find the real yearly cost (APR) of an instant loan app offer.",
    fairnessBody: "See how the model's decisions and plans compare across groups.",
    open: "Open",
  },

  save: {
    title: "Keep this plan",
    signedOut: "Sign in with Google to save this plan and log your numbers each month to see your progress.",
    signIn: "Sign in to save",
    newPlan: "Save it to My plans. Come back each month, update the numbers, and see how far you have come.",
    save: "Save this plan",
    checkin: "You are updating a saved plan. Save today's numbers to record your progress.",
    saveCheckin: "Save today's numbers",
    saving: "Saving…",
    saved: "Saved.",
    savedCheckin: "Saved. Score today: {score}.",
    open: "Open My plans",
    errors: {
      limit: "You have reached the limit (50 plans, 120 updates per plan). Delete one in My plans first.",
      signedOut: "Your sign-in has expired. Sign in again to save.",
      generic: "This could not be saved just now. Please try again.",
    },
  },
};

export type UIStrings = typeof EN;

/** Typed so Hindi and Marathi must carry exactly the English keys. */
const UI: Record<Lang, UIStrings> = {
  en: EN,
  hi: {
    today: "आज",
    step: "चरण",
    reapply: "दोबारा आवेदन",
    kinds: { actionable: "बदलने योग्य", "slow-moving": "धीमा बदलाव", time: "समय" } as Record<string, string>,
    total: "कुल",
    projected: "अनुमानित",
    tagline: "यह ऋण क्यों अस्वीकार हुआ, और क्या बदलने से मंज़ूर होगा?",
    heroBody:
      "अपनी क्रेडिट रिपोर्ट के आँकड़े डालें। पाथवे कारण बताता है, अस्वीकृति को स्वीकृति में बदलने वाले सबसे छोटे व्यावहारिक बदलाव ढूँढता है, और बताता है कि आप किस महीने दोबारा आवेदन कर सकते हैं।",
    tryDemo: "डेमो आवेदक आज़माएँ",
    assess: "मेरा रास्ता देखें",
    applicant: "आवेदक",
    fairness: "निष्पक्षता जाँच",
    report: "ऋणदाता रिपोर्ट",
    method: "यह कैसे काम करता है",
    score: "पाथवे स्कोर",
    threshold: "स्वीकृति के लिए चाहिए",
    pd: "2 वर्षों में डिफ़ॉल्ट की संभावना",
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
    neverList: "आयु · आश्रित · होम लोन",
    effort: "प्रयास",
    monthsShort: "माह",
    planScore: "योजना के बाद स्कोर",
    when: "कब",
    whenTitle: "महीने-दर-महीने अनुमान",
    whenSub: "योजना अपनाने पर और कुछ न बदलने पर, स्वीकृति रेखा की तुलना में स्कोर।",
    withPlan: "योजना के साथ",
    withoutPlan: "कोई बदलाव नहीं",
    month: "महीना",
    assumptions: "प्रयुक्त मान्यताएँ",
    explanation: "सरल भाषा में सारांश",
    rewrite: "और सरल शब्दों में लिखें (AI)",
    rewriting: "लिखा जा रहा है…",
    rewriteNote: "सर्वर पर API कुंजी होने पर ही Claude का उपयोग होता है; अन्यथा यही टेम्पलेट रहता है।",
    printReport: "ऋणदाता रिपोर्ट खोलें",
    disclaimer:
      "पाथवे कृत्रिम डेटा पर बना एक शैक्षिक सिमुलेशन है। यह कोई ऋण निर्णय या वित्तीय सलाह नहीं है, और किसी ऋणदाता, बैंक या क्रेडिट ब्यूरो से जुड़ा नहीं है।",
    fields: {
      monthlyIncome: "मासिक आय",
      utilization: "क्रेडिट कार्ड उपयोग",
      debtRatio: "FOIR (आय में EMI का हिस्सा)",
      age: "आयु",
      openCreditLines: "सक्रिय ऋण और कार्ड",
      late30: "30–59 दिन देरी (DPD)",
      late60: "60–89 दिन देरी (DPD)",
      late90: "90+ दिन देरी (DPD)",
      dependents: "आश्रित",
      realEstateLoans: "होम लोन",
    } as Record<FeatureKey, string>,

    kicker: "समझ में आने वाले ऋण निर्णय, सरल शब्दों में",
    profileTitle: "आवेदक प्रोफ़ाइल",
    profileSub: "अपनी क्रेडिट रिपोर्ट के आँकड़े डालें। टाइप करते ही नीचे सब कुछ अपडेट हो जाता है।",
    historyTitle: "क्रेडिट इतिहास और परिवार",
    pts: "अंक",
    aiBadge: "AI द्वारा दोबारा लिखा गया",
    templateBadge: "टेम्पलेट",
    closestPlan: "सबसे नज़दीकी योजना",
    samples: {
      "clear-rejection": "कार्ड पूरी सीमा तक इस्तेमाल और हाल में देर से भुगतान",
      borderline: "रेखा से ज़रा नीचे: कार्ड पर ऊँचा बकाया",
      approved: "कम कार्ड उपयोग, साफ़ रिकॉर्ड",
    } as Record<Sample["id"], string>,
    incomeUnits:
      "राशियाँ रुपये में हैं। आय यानी आपकी मासिक आय; FOIR में सभी EMI और अन्य तय मासिक भुगतान गिने जाते हैं।",

    savings: {
      kicker: "फ़ायदा",
      title: "योजना से पैसों में कितना फ़ायदा",
      sub: "वही पर्सनल लोन, आज लेने पर बनाम योजना पूरी करने के बाद लेने पर। ब्याज दरें केवल उदाहरण हैं, कोई ऑफ़र नहीं।",
      amount: "ऋण राशि",
      term: "अवधि",
      termOption: "{n} महीने",
      headlineSave: "योजना अपनाएँ और ब्याज में {amount} बचाएँ",
      emiDrop: "आपकी मासिक किस्त (EMI) हर महीने {amount} कम हो जाती है।",
      headlineClosest:
        "सबसे नज़दीकी योजना भी स्वीकृति रेखा से नीचे रहती है, इसलिए दर महँगे ऋणदाता की {apr} सालाना ही रहती है।",
      closestGap: "{n} और अंक आपको {tier} ({apr} सालाना) तक ले जाते और इस ऋण पर {amount} बचाते।",
      headlineApproved: "आज के स्कोर पर इस ऋण पर {amount} ब्याज लगेगा",
      approvedTier: "आप पहले से ही {tier} में {apr} सालाना ब्याज के योग्य हैं।",
      today: "आज ऋण लें",
      afterPlan: "योजना के बाद ऋण लें",
      afterClosest: "सबसे नज़दीकी योजना के बाद",
      atNextTier: "अगली श्रेणी पर",
      apr: "ब्याज दर (सालाना)",
      tierLabel: "दर श्रेणी",
      emi: "मासिक किस्त (EMI)",
      interest: "कुल ब्याज",
      declinedTier: "अस्वीकृत: {apr} सालाना वाला महँगा ऋणदाता",
      tierName: "{tier} श्रेणी",
      tierNames: { excellent: "उत्कृष्ट", "very-good": "बहुत अच्छी", good: "अच्छी", fair: "ठीक-ठाक" } as Record<RateTier["id"], string>,
      ladderTitle: "उदाहरण दर-सीढ़ी",
      ladderSub: "पाथवे स्कोर जितना ऊँचा, दर उतनी कम।",
      declinedZone: "अस्वीकृत",
      scoreFrom: "स्कोर {n}+",
      scoreBelow: "{n} से कम",
      youToday: "आज आप",
      youAfter: "योजना के बाद",
      nextHint: "{n} और अंक आपको {tier} ({apr} सालाना) तक ले जाएँगे और {amount} और बचाएँगे।",
      bestTier: "यह पहले से ही सबसे अच्छी उदाहरण श्रेणी है।",
      assumptions: "मूल्य-निर्धारण की मान्यताएँ (उदाहरण)",
      assumptionsNote:
        "यहाँ की हर दर एक सिमुलेशन के लिए केवल उदाहरण है। यह किसी ऋणदाता के अनुसार तय नहीं है और न ही कोई ऑफ़र या वित्तीय सलाह है।",
      rows: {
        tierValue: "{apr} सालाना",
        declinedLabel: "{n} से कम (अस्वीकृत)",
        declinedValue: "किसी महँगे ऋणदाता से {apr} सालाना",
        loanLabel: "मानक ऋण",
        loanValue: "{n} महीनों के लिए {amount}",
        affordLabel: "भुगतान क्षमता",
        affordValue: "FOIR: सभी EMI मिलाकर मासिक आय के {pct} से अधिक नहीं",
      },
    },

    mc: {
      likely: "लगभग {n} महीनों में स्वीकृति की संभावना",
      likely1: "लगभग 1 महीने में स्वीकृति की संभावना",
      likelyNow: "आज ही स्वीकृत",
      likelyBeyond: "संभवतः {n} महीनों से अधिक",
      range: "सबसे अच्छी स्थिति में {low}, सबसे खराब स्थिति में {high}",
      rangeSame: "सबसे अच्छी और सबसे खराब, दोनों स्थितियों में: {m}",
      months: "{n} महीने",
      month1: "1 महीना",
      month0: "आज",
      beyond: "{n} महीनों से अधिक",
      share: "{runs} सिम्युलेटेड भविष्यों में से {pct} में {n} महीनों के भीतर स्वीकृति मिलती है",
      exact: "योजना ठीक-ठीक चले तो: {label}",
      band: "संभावित दायरा ({low}वें–{high}वें प्रतिशतक)",
      approvalDot: "अनुमानित स्वीकृति",
      tooltipRange: "संभावित दायरा",
      howSure: "यह अनुमान कितना पक्का है?",
      howSureBody:
        "हम आपकी योजना को {runs} बार असल ज़िंदगी के उतार-चढ़ाव के साथ दोहराते हैं: कभी धीमा या तेज़ भुगतान, असमान आय वृद्धि, कभी-कभार आय का झटका जो प्रगति रोक देता है, और कभी कोई नया देर वाला भुगतान। छायांकित पट्टी दिखाती है कि बीच के {width}% सिम्युलेटेड भविष्य कहाँ पहुँचते हैं। यह एक सिमुलेशन है, कोई वादा नहीं।",
      chartLabel:
        "अगले {h} महीनों का अनुमानित पाथवे स्कोर। योजना के साथ यह {from} से {to} तक जाता है; कोई बदलाव न करने पर यह {base} पर रहता है। स्वीकृति के लिए {threshold} चाहिए। {likely}। {share}।",
      rows: {
        runs: "सिम्युलेटेड भविष्य",
        runsValue: "हर आवेदक के लिए {runs} (तय बीज से, हर बार वही नतीजा)",
        pace: "भुगतान की रफ़्तार",
        paceValue: "योजना की रफ़्तार का {min}–{max}, औसत {mean}",
        income: "आय वृद्धि",
        incomeValue: "हर महीने {min}–{max}, औसत {mean}",
        shocks: "आय के झटके",
        shocksValue: "हर महीने {chance} संभावना, प्रगति {lo}–{hi} महीने रुकती है",
        late: "नया देर वाला भुगतान",
        lateValue: "हर महीने {chance} संभावना",
        band: "दिखाई गई पट्टी",
        bandValue: "{low}वें से {high}वें प्रतिशतक तक; “संभावित” यानी माध्यिका",
      },
    },

    tools: {
      kicker: "और देखें",
      title: "और टूल",
      sub: "आगे की योजना बनाने, किसी ऑफ़र को परखने और मॉडल की जाँच करने के और तरीके।",
      goalTitle: "लक्ष्य योजनाकार",
      goalBody: "बताइए आपको कौन-सा ऋण चाहिए; हम वहाँ से पीछे की ओर हिसाब लगाते हैं।",
      offerTitle: "ऑफ़र जाँच",
      offerBody: "किसी इंस्टेंट लोन ऐप ऑफ़र की असली सालाना लागत (APR) जानें।",
      fairnessBody: "देखें कि मॉडल के निर्णय और योजनाएँ अलग-अलग समूहों में कैसी रहती हैं।",
      open: "खोलें",
    },

    save: {
      title: "यह योजना रखें",
      signedOut: "इस योजना को सहेजने और हर महीने अपने आँकड़े दर्ज करके प्रगति देखने के लिए Google से साइन इन करें।",
      signIn: "सहेजने के लिए साइन इन करें",
      newPlan: "इसे मेरी योजनाएँ में सहेजें। हर महीने लौटकर आँकड़े अपडेट करें और देखें कि आप कितना आगे बढ़े।",
      save: "यह योजना सहेजें",
      checkin: "आप एक सहेजी गई योजना अपडेट कर रहे हैं। अपनी प्रगति दर्ज करने के लिए आज के आँकड़े सहेजें।",
      saveCheckin: "आज के आँकड़े सहेजें",
      saving: "सहेजा जा रहा है…",
      saved: "सहेज लिया गया।",
      savedCheckin: "सहेज लिया गया। आज का स्कोर: {score}।",
      open: "मेरी योजनाएँ खोलें",
      errors: {
        limit: "आप सीमा तक पहुँच गए हैं (50 योजनाएँ, हर योजना में 120 अपडेट)। पहले मेरी योजनाएँ में से कोई एक हटाएँ।",
        signedOut: "आपका साइन इन समाप्त हो गया है। सहेजने के लिए फिर से साइन इन करें।",
        generic: "अभी यह सहेजा नहीं जा सका। कृपया फिर से कोशिश करें।",
      },
    },
  },
  mr: {
    today: "आज",
    step: "पायरी",
    reapply: "पुन्हा अर्ज",
    kinds: { actionable: "बदलता येणारे", "slow-moving": "हळू बदल", time: "वेळ" } as Record<string, string>,
    total: "एकूण",
    projected: "अंदाजित",
    tagline: "हे कर्ज का नाकारले गेले, आणि काय बदलल्यास मंजूर होईल?",
    heroBody:
      "तुमच्या क्रेडिट रिपोर्टमधील आकडे भरा. पाथवे कारणे सांगतो, नकाराचे मंजुरीत रूपांतर करणारे सर्वात लहान व्यवहार्य बदल शोधतो, आणि तुम्ही कोणत्या महिन्यात पुन्हा अर्ज करू शकता ते दाखवतो.",
    tryDemo: "डेमो अर्जदार वापरून पाहा",
    assess: "माझा मार्ग पाहा",
    applicant: "अर्जदार",
    fairness: "निष्पक्षता तपासणी",
    report: "कर्जदाता अहवाल",
    method: "हे कसे चालते",
    score: "पाथवे स्कोअर",
    threshold: "मंजुरीसाठी आवश्यक",
    pd: "2 वर्षांत थकबाकीची शक्यता",
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
    neverList: "वय · अवलंबित · गृहकर्जे",
    effort: "प्रयत्न",
    monthsShort: "म.",
    planScore: "योजनेनंतर स्कोअर",
    when: "कधी",
    whenTitle: "महिना-दर-महिना अंदाज",
    whenSub: "योजना पाळल्यास आणि काहीही न बदलल्यास, मंजुरी रेषेच्या तुलनेत स्कोअर.",
    withPlan: "योजनेसह",
    withoutPlan: "कोणताही बदल नाही",
    month: "महिना",
    assumptions: "वापरलेली गृहितके",
    explanation: "सोप्या भाषेत सारांश",
    rewrite: "आणखी सोप्या शब्दांत लिहा (AI)",
    rewriting: "लिहित आहे…",
    rewriteNote: "सर्व्हरवर API की असेल तरच Claude वापरले जाते; अन्यथा हाच साचा राहतो.",
    printReport: "कर्जदाता अहवाल उघडा",
    disclaimer:
      "पाथवे हे कृत्रिम डेटावर बनवलेले शैक्षणिक सिम्युलेशन आहे. हा कर्जाचा निर्णय किंवा आर्थिक सल्ला नाही, आणि कोणत्याही कर्जदाता, बँक किंवा क्रेडिट ब्युरोशी जोडलेले नाही.",
    fields: {
      monthlyIncome: "मासिक उत्पन्न",
      utilization: "क्रेडिट कार्ड वापर",
      debtRatio: "FOIR (उत्पन्नातील EMI चा हिस्सा)",
      age: "वय",
      openCreditLines: "सक्रिय कर्जे आणि कार्ड",
      late30: "30–59 दिवस उशीर (DPD)",
      late60: "60–89 दिवस उशीर (DPD)",
      late90: "90+ दिवस उशीर (DPD)",
      dependents: "अवलंबित",
      realEstateLoans: "गृहकर्जे",
    } as Record<FeatureKey, string>,

    kicker: "समजण्याजोगे कर्ज निर्णय, सोप्या शब्दांत",
    profileTitle: "अर्जदार प्रोफाइल",
    profileSub: "तुमच्या क्रेडिट रिपोर्टमधील आकडे भरा. टाइप करताच खालील सर्व काही अद्ययावत होते.",
    historyTitle: "पत इतिहास आणि कुटुंब",
    pts: "गुण",
    aiBadge: "AI ने पुन्हा लिहिलेले",
    templateBadge: "साचा",
    closestPlan: "सर्वात जवळची योजना",
    samples: {
      "clear-rejection": "कार्ड मर्यादेपर्यंत वापरलेली आणि अलीकडे उशिरा हप्ते",
      borderline: "रेषेच्या थोडे खाली: कार्डवर जास्त थकबाकी",
      approved: "कमी कार्ड वापर, स्वच्छ पत इतिहास",
    } as Record<Sample["id"], string>,
    incomeUnits:
      "रकमा रुपयांमध्ये आहेत. उत्पन्न म्हणजे तुमचे मासिक उत्पन्न; FOIR मध्ये सर्व EMI आणि इतर ठरलेले मासिक हप्ते मोजले जातात.",

    savings: {
      kicker: "फायदा",
      title: "योजनेचा पैशांत किती फायदा",
      sub: "तेच पर्सनल लोन, आज घेतल्यास विरुद्ध योजना पूर्ण केल्यानंतर घेतल्यास. व्याजदर फक्त उदाहरणादाखल आहेत, ऑफर नाहीत.",
      amount: "कर्जाची रक्कम",
      term: "मुदत",
      termOption: "{n} महिने",
      headlineSave: "योजना पाळा आणि व्याजात {amount} वाचवा",
      emiDrop: "तुमचा मासिक हप्ता (EMI) दरमहा {amount} ने कमी होतो.",
      headlineClosest:
        "सर्वात जवळची योजनाही मंजुरी रेषेखालीच राहते, त्यामुळे दर महागड्या कर्जदात्याचा {apr} वार्षिकच राहतो.",
      closestGap: "आणखी {n} गुण तुम्हाला {tier} ({apr} वार्षिक) मध्ये नेतील आणि या कर्जावर {amount} वाचवतील.",
      headlineApproved: "आजच्या स्कोअरवर या कर्जावर {amount} व्याज लागेल",
      approvedTier: "तुम्ही आधीच {tier} मध्ये {apr} वार्षिक व्याजासाठी पात्र आहात.",
      today: "आज कर्ज घ्या",
      afterPlan: "योजनेनंतर कर्ज घ्या",
      afterClosest: "सर्वात जवळच्या योजनेनंतर",
      atNextTier: "पुढील श्रेणीत",
      apr: "व्याजदर (वार्षिक)",
      tierLabel: "दर श्रेणी",
      emi: "मासिक हप्ता (EMI)",
      interest: "एकूण व्याज",
      declinedTier: "नामंजूर: {apr} वार्षिक दराचा महागडा कर्जदाता",
      tierName: "{tier} श्रेणी",
      tierNames: { excellent: "उत्कृष्ट", "very-good": "खूप चांगली", good: "चांगली", fair: "साधारण" } as Record<RateTier["id"], string>,
      ladderTitle: "उदाहरणादाखल दर-शिडी",
      ladderSub: "पाथवे स्कोअर जितका जास्त, दर तितका कमी.",
      declinedZone: "नामंजूर",
      scoreFrom: "स्कोअर {n}+",
      scoreBelow: "{n} पेक्षा कमी",
      youToday: "आज तुम्ही",
      youAfter: "योजनेनंतर",
      nextHint: "आणखी {n} गुण तुम्हाला {tier} ({apr} वार्षिक) मध्ये नेतील आणि आणखी {amount} वाचवतील.",
      bestTier: "ही आधीच सर्वोत्तम उदाहरणादाखल श्रेणी आहे.",
      assumptions: "किंमत-निर्धारणाची गृहितके (उदाहरणादाखल)",
      assumptionsNote:
        "येथील प्रत्येक दर सिम्युलेशनसाठी फक्त उदाहरणादाखल आहे. तो कोणत्याही कर्जदात्यानुसार ठरवलेला नाही आणि ऑफर किंवा आर्थिक सल्ला नाही.",
      rows: {
        tierValue: "{apr} वार्षिक",
        declinedLabel: "{n} पेक्षा कमी (नामंजूर)",
        declinedValue: "महागड्या कर्जदात्याकडून {apr} वार्षिक",
        loanLabel: "मानक कर्ज",
        loanValue: "{n} महिन्यांसाठी {amount}",
        affordLabel: "परवडण्याची मर्यादा",
        affordValue: "FOIR: सर्व EMI मिळून मासिक उत्पन्नाच्या {pct} पेक्षा जास्त नाहीत",
      },
    },

    mc: {
      likely: "सुमारे {n} महिन्यांत मंजुरीची शक्यता",
      likely1: "सुमारे 1 महिन्यात मंजुरीची शक्यता",
      likelyNow: "आजच मंजूर",
      likelyBeyond: "बहुधा {n} महिन्यांपेक्षा जास्त",
      range: "सर्वोत्तम स्थितीत {low}, सर्वात वाईट स्थितीत {high}",
      rangeSame: "सर्वोत्तम आणि सर्वात वाईट, दोन्ही स्थितींत: {m}",
      months: "{n} महिने",
      month1: "1 महिना",
      month0: "आज",
      beyond: "{n} महिन्यांपेक्षा जास्त",
      share: "{runs} सिम्युलेटेड भविष्यांपैकी {pct} मध्ये {n} महिन्यांत मंजुरी मिळते",
      exact: "योजना तंतोतंत पाळल्यास: {label}",
      band: "संभाव्य पट्टा ({low}व्या–{high}व्या पर्सेंटाइल)",
      approvalDot: "अंदाजित मंजुरी",
      tooltipRange: "संभाव्य पट्टा",
      howSure: "हा अंदाज किती खात्रीचा आहे?",
      howSureBody:
        "आम्ही तुमची योजना {runs} वेळा प्रत्यक्ष आयुष्यातील चढ-उतारांसह पुन्हा चालवतो: कधी हळू तर कधी जलद परतफेड, असमान उत्पन्नवाढ, कधीतरी प्रगती थांबवणारा उत्पन्नाचा धक्का, आणि क्वचित एखादा नवा उशिराचा हप्ता. छायांकित पट्टा दाखवतो की मधली {width}% सिम्युलेटेड भविष्ये कुठे पोहोचतात. हे सिम्युलेशन आहे, वचन नाही.",
      chartLabel:
        "पुढील {h} महिन्यांचा अंदाजित पाथवे स्कोअर. योजनेसह तो {from} वरून {to} पर्यंत जातो; काहीही न बदलल्यास तो {base} वर राहतो. मंजुरीसाठी {threshold} आवश्यक. {likely}. {share}.",
      rows: {
        runs: "सिम्युलेटेड भविष्ये",
        runsValue: "प्रत्येक अर्जदारासाठी {runs} (निश्चित बीज, दरवेळी तोच निकाल)",
        pace: "परतफेडीचा वेग",
        paceValue: "योजनेच्या वेगाच्या {min}–{max}, सरासरी {mean}",
        income: "उत्पन्नवाढ",
        incomeValue: "दरमहा {min}–{max}, सरासरी {mean}",
        shocks: "उत्पन्नाचे धक्के",
        shocksValue: "दरमहा {chance} शक्यता, प्रगती {lo}–{hi} महिने थांबते",
        late: "नवा उशिराचा हप्ता",
        lateValue: "दरमहा {chance} शक्यता",
        band: "दाखवलेला पट्टा",
        bandValue: "{low}व्या ते {high}व्या पर्सेंटाइलपर्यंत; “संभाव्य” म्हणजे मध्यक",
      },
    },

    tools: {
      kicker: "आणखी पाहा",
      title: "आणखी साधने",
      sub: "पुढचे नियोजन, एखादी ऑफर तपासणे आणि मॉडेलची तपासणी करण्याचे आणखी मार्ग.",
      goalTitle: "ध्येय नियोजक",
      goalBody: "तुम्हाला हवे ते कर्ज सांगा; आम्ही तिथून उलट हिशेब करतो.",
      offerTitle: "ऑफर तपासणी",
      offerBody: "इन्स्टंट लोन ॲपच्या ऑफरचा खरा वार्षिक खर्च (APR) शोधा.",
      fairnessBody: "मॉडेलचे निर्णय आणि योजना वेगवेगळ्या गटांमध्ये कशा ठरतात ते पाहा.",
      open: "उघडा",
    },

    save: {
      title: "ही योजना ठेवा",
      signedOut: "ही योजना जतन करण्यासाठी आणि दरमहा तुमचे आकडे नोंदवून प्रगती पाहण्यासाठी Google ने साइन इन करा.",
      signIn: "जतन करण्यासाठी साइन इन करा",
      newPlan: "ही माझ्या योजना मध्ये जतन करा. दरमहा परत या, आकडे अद्ययावत करा आणि तुम्ही किती पुढे गेलात ते पाहा.",
      save: "ही योजना जतन करा",
      checkin: "तुम्ही जतन केलेली योजना अद्ययावत करत आहात. प्रगती नोंदवण्यासाठी आजचे आकडे जतन करा.",
      saveCheckin: "आजचे आकडे जतन करा",
      saving: "जतन करत आहे…",
      saved: "जतन झाले.",
      savedCheckin: "जतन झाले. आजचा स्कोअर: {score}.",
      open: "माझ्या योजना उघडा",
      errors: {
        limit: "तुम्ही मर्यादा गाठली आहे (50 योजना, प्रत्येक योजनेत 120 नोंदी). आधी माझ्या योजना मधून एखादी काढा.",
        signedOut: "तुमचे साइन इन संपले आहे. जतन करण्यासाठी पुन्हा साइन इन करा.",
        generic: "आत्ता हे जतन करता आले नाही. कृपया पुन्हा प्रयत्न करा.",
      },
    },
  },
};

export const t = (lang: Lang): UIStrings => UI[lang];
export const tf = (template: string, vars: Record<string, string | number>) => fill(template, vars);

/**
 * Splits a template around one placeholder so a live element (an animated number) can sit inside a
 * translated sentence whatever the word order: `splitAt("save {amount} now", "amount")` → ["save ", " now"].
 */
export function splitAt(template: string, key: string): [string, string] {
  const token = `{${key}}`;
  const i = template.indexOf(token);
  return i < 0 ? [template, ""] : [template.slice(0, i), template.slice(i + token.length)];
}

/** A month count from the Monte Carlo band in words: "today", "1 month", "7 months", "beyond 36 months". */
export function monthsText(lang: Lang, m: number | null, horizon: number): string {
  const s = UI[lang].mc;
  if (m === null) return fill(s.beyond, { n: horizon });
  if (m <= 0) return s.month0;
  if (m === 1) return s.month1;
  return fill(s.months, { n: m });
}

/** Headline for the median simulated approval month. */
export function likelyText(lang: Lang, m: number | null, horizon: number): string {
  const s = UI[lang].mc;
  if (m === null) return fill(s.likelyBeyond, { n: horizon });
  if (m <= 0) return s.likelyNow;
  if (m === 1) return s.likely1;
  return fill(s.likely, { n: m });
}

/** Localized name of a pricing tier, e.g. "Good tier". */
export function tierText(lang: Lang, id: RateTier["id"]): string {
  const s = UI[lang].savings;
  return fill(s.tierName, { tier: s.tierNames[id] });
}

/** The pricing assumptions, localized. English is `describePricing()` verbatim. */
export function pricingRows(lang: Lang): { label: string; value: string }[] {
  if (lang === "en") return describePricing();
  const s = UI[lang].savings;
  return [
    ...PRICING.tiers.map((tier) => ({ label: fill(s.scoreFrom, { n: tier.minScore }), value: fill(s.rows.tierValue, { apr: rate(tier.apr) }) })),
    {
      label: fill(s.rows.declinedLabel, { n: MODEL.thresholdScore }),
      value: fill(s.rows.declinedValue, { apr: rate(PRICING.declinedAlternativeApr) }),
    },
    {
      label: s.rows.loanLabel,
      value: fill(s.rows.loanValue, { amount: inr(PRICING.defaultLoan.amount), n: PRICING.defaultLoan.termMonths }),
    },
    { label: s.rows.affordLabel, value: fill(s.rows.affordValue, { pct: rate(PRICING.maxEmiToIncome) }) },
  ];
}

/** The Monte Carlo assumptions, localized. English is `describeUncertainty()` verbatim. */
export function uncertaintyRows(lang: Lang): { label: string; value: string }[] {
  if (lang === "en") return describeUncertainty();
  const r = UI[lang].mc.rows;
  const u = UNCERTAINTY;
  const p = (v: number, d = 0) => pct(v, d);
  return [
    { label: r.runs, value: fill(r.runsValue, { runs: u.runs }) },
    { label: r.pace, value: fill(r.paceValue, { min: p(u.paceMultiplier.min), max: p(u.paceMultiplier.max), mean: p(u.paceMultiplier.mean) }) },
    {
      label: r.income,
      value: fill(r.incomeValue, {
        min: p(u.incomeGrowthPerMonth.min, 1),
        max: p(u.incomeGrowthPerMonth.max, 1),
        mean: p(u.incomeGrowthPerMonth.mean, 1),
      }),
    },
    {
      label: r.shocks,
      value: fill(r.shocksValue, { chance: p(u.shockChancePerMonth, 1), lo: u.shockMonths[0], hi: u.shockMonths[1] }),
    },
    { label: r.late, value: fill(r.lateValue, { chance: p(u.newLateChancePerMonth, 1) }) },
    {
      label: r.band,
      value: fill(r.bandValue, { low: Math.round(u.percentiles.low * 100), high: Math.round(u.percentiles.high * 100) }),
    },
  ];
}

const REASONS: Record<Lang, Record<FeatureKey, string>> = {
  en: {
    utilization: "You are using {value} of your credit card limits. High balances signal stretched finances.",
    debtRatio: "EMIs and other fixed payments take {value} of your income (FOIR).",
    monthlyIncome: "Your monthly income ({value}) is low compared with similar applicants.",
    late30: "{value} payment(s) were 30–59 days past due (DPD) in the last 2 years.",
    late60: "{value} payment(s) were 60–89 days past due (DPD) in the last 2 years.",
    late90: "{value} payment(s) were 90+ days past due (DPD) in the last 2 years.",
    openCreditLines: "Only {value} active loans and cards: a thin credit history.",
    age: "Your age group ({value}) shows higher default rates in the data. This can't change, so it is never part of your plan.",
    dependents: "{value} dependants add to household obligations.",
    realEstateLoans: "Your number of home loans ({value}).",
  },
  hi: {
    utilization: "आपके क्रेडिट कार्ड की सीमा का {value} उपयोग हो चुका है। ऊँचा बकाया आर्थिक दबाव का संकेत है।",
    debtRatio: "EMI और अन्य तय भुगतान आपकी आय का {value} हिस्सा लेते हैं (FOIR)।",
    monthlyIncome: "आपकी मासिक आय ({value}) समान आवेदकों की तुलना में कम है।",
    late30: "पिछले 2 वर्षों में {value} भुगतान 30–59 दिन देर से हुए।",
    late60: "पिछले 2 वर्षों में {value} भुगतान 60–89 दिन देर से हुए।",
    late90: "पिछले 2 वर्षों में {value} भुगतान 90+ दिन देर से हुए।",
    openCreditLines: "केवल {value} सक्रिय ऋण और कार्ड: क्रेडिट इतिहास कम है।",
    age: "आपके आयु वर्ग ({value}) में डेटा के अनुसार डिफ़ॉल्ट दर अधिक है। यह बदला नहीं जा सकता, इसलिए यह आपकी योजना में कभी शामिल नहीं होता।",
    dependents: "{value} आश्रित परिवार की आर्थिक ज़िम्मेदारी बढ़ाते हैं।",
    realEstateLoans: "आपके होम लोन की संख्या ({value})।",
  },
  mr: {
    utilization: "तुमच्या क्रेडिट कार्ड मर्यादेपैकी {value} वापरली गेली आहे. जास्त थकबाकी आर्थिक ताणाचे लक्षण आहे.",
    debtRatio: "EMI आणि इतर ठरलेले हप्ते तुमच्या उत्पन्नाच्या {value} इतके आहेत (FOIR).",
    monthlyIncome: "तुमचे मासिक उत्पन्न ({value}) तत्सम अर्जदारांच्या तुलनेत कमी आहे.",
    late30: "गेल्या 2 वर्षांत {value} हप्ते 30–59 दिवस उशिरा भरले गेले.",
    late60: "गेल्या 2 वर्षांत {value} हप्ते 60–89 दिवस उशिरा भरले गेले.",
    late90: "गेल्या 2 वर्षांत {value} हप्ते 90+ दिवस उशिरा भरले गेले.",
    openCreditLines: "फक्त {value} सक्रिय कर्जे आणि कार्ड: पत इतिहास कमी आहे.",
    age: "तुमच्या वयोगटात ({value}) डेटानुसार थकबाकीचे प्रमाण जास्त आहे. हे बदलता येत नाही, म्हणून ते तुमच्या योजनेत कधीही नसते.",
    dependents: "{value} अवलंबित व्यक्तींमुळे कुटुंबाची आर्थिक जबाबदारी वाढते.",
    realEstateLoans: "तुमच्या गृहकर्जांची संख्या ({value}).",
  },
};

export function reasonText(lang: Lang, key: FeatureKey, value: number): string {
  return fill(REASONS[lang][key], { value: displayValue(key, value) });
}

const ACTIONS: Record<Lang, Record<PlanAction["key"], string>> = {
  en: {
    utilization: "Bring credit card balances down from {from} to {to} of your limits",
    debtRatio: "Cut EMIs so they take {to} of income instead of {from} (FOIR)",
    openCreditLines: "Change active loans and cards from {from} to {to}",
    monthlyIncome: "Grow monthly income from {from} to {to} (capped, realistic growth)",
    wait: "Pay every bill on time for {to} months so past late payments age out",
  } as Record<PlanAction["key"], string>,
  hi: {
    utilization: "कार्ड का बकाया सीमा के {from} से घटाकर {to} करें",
    debtRatio: "EMI घटाएँ ताकि वे आय का {from} नहीं, {to} हों (FOIR)",
    openCreditLines: "सक्रिय ऋण और कार्ड {from} से {to} करें",
    monthlyIncome: "मासिक आय {from} से {to} तक बढ़ाएँ (सीमित, व्यावहारिक वृद्धि)",
    wait: "{to} महीने तक हर बिल समय पर चुकाएँ ताकि पुराने देर वाले भुगतान रिकॉर्ड से हट जाएँ",
  } as Record<PlanAction["key"], string>,
  mr: {
    utilization: "कार्डची थकबाकी मर्यादेच्या {from} वरून {to} पर्यंत कमी करा",
    debtRatio: "EMI कमी करा जेणेकरून ते उत्पन्नाच्या {from} ऐवजी {to} होतील (FOIR)",
    openCreditLines: "सक्रिय कर्जे आणि कार्ड {from} वरून {to} करा",
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

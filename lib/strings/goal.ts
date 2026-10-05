import type { Milestone } from "@/lib/goal";
import { money, pct, tf, type Lang } from "@/lib/i18n";
import type { RateTier } from "@/lib/pricing";
import type { Sample } from "@/lib/samples";

/**
 * Strings for the goal planner (/goal). Every language defines every key (enforced by `GoalStrings`).
 * Templates use {name} placeholders filled with `tf` from lib/i18n. Money is in rupees (see lib/money.ts).
 */
export interface GoalStrings {
  crumb: string;
  home: string;
  hero: { eyebrow: string; title: string; body: string; stepsLabel: string; step1: string; step2: string; step3: string };
  inputs: {
    heading: string;
    goalLegend: string;
    amount: string;
    amountHint: string;
    term: string;
    termValue: string;
    maxApr: string;
    aprValue: string;
    impliesTier: string;
    impliesNone: string;
    profileLegend: string;
    profileSub: string;
    demo: string;
    demoTaglines: Record<Sample["id"], string>;
    shareNote: string;
  };
  status: {
    met: string;
    metSub: string;
    plan: string;
    plan1: string;
    planSub: string;
    infeasible: string;
    infeasibleSub: string;
    tooCheap: string;
    tooCheapSub: string;
  };
  card: {
    heading: string;
    sub: string;
    goalScore: string;
    todayScore: string;
    pointsToGo: string;
    goalMet: string;
    gaugeAria: string;
    approvalLine: string;
    ladder: string;
    tierRange: string;
    belowRange: string;
    declinedApr: string;
    youToday: string;
    yourGoal: string;
    aprShort: string;
  };
  /** Names of the illustrative pricing tiers in lib/pricing.ts, plus the declined zone. */
  tiers: Record<RateTier["id"] | "declined", string>;
  plan: {
    heading: string;
    sub: string;
    closest: string;
    none: string;
    step: string;
    doneBy: string;
    effort: string;
    scoreAfter: string;
  };
  chart: {
    heading: string;
    sub: string;
    score: string;
    approval: string;
    goal: string;
    month: string;
    aria: string;
    outcomeGoal: string;
    outcomeMet: string;
    outcomeNone: string;
  };
  milestones: {
    heading: string;
    sub: string;
    none: string;
    progress: string;
    monthN: string;
    utilization: string;
    debt: string;
    income: string;
    lines: string;
    lateLast: string;
    lateLeft: string;
    approval: string;
    tier: string;
    goal: string;
    goalApproval: string;
    late: Record<"late30" | "late60" | "late90", string>;
  };
  afford: {
    heading: string;
    sub: string;
    today: string;
    afterPlan: string;
    /** Single column title when the plan does not change income or debt payments. */
    both: string;
    emi: string;
    existing: string;
    room: string;
    fits: string;
    over: string;
    perMonth: string;
    barAria: string;
    borrow: string;
    term: string;
    termNot: string;
    noRoom: string;
    spare: string;
  };
  today: {
    heading: string;
    sub: string;
    tier: string;
    declined: string;
    maxLoan: string;
    maxLoanAt: string;
    none: string;
    interest: string;
    interestToday: string;
    interestGoal: string;
    saved: string;
    same: string;
  };
  footnote: { text: string; link: string };
}

const en: GoalStrings = {
  crumb: "Goal planner",
  home: "Home",
  hero: {
    eyebrow: "Goal planner",
    title: "Start from the loan you want.",
    body: "Tell Pathway the loan you're aiming for. It works backwards: the score that rate needs, where you stand today, the lowest-effort plan to close the gap, and whether the monthly payment fits your budget.",
    stepsLabel: "How the planner works",
    step1: "Choose the amount, the term and the highest interest rate you'd accept.",
    step2: "See the score that rate needs and a projected plan to reach it.",
    step3: "Check the monthly payment against your budget before you apply.",
  },
  inputs: {
    heading: "Your goal and profile",
    goalLegend: "The loan you want",
    amount: "Loan amount",
    amountHint: "In rupees.",
    term: "Term",
    termValue: "{n} months",
    maxApr: "Highest interest rate you'd accept (per year)",
    aprValue: "{apr} a year",
    impliesTier: "That needs the {tier} tier: a score of {score} or more gets {apr} a year.",
    impliesNone: "No tier we model is that cheap. The best is {apr} a year, at a score of {score} or more.",
    profileLegend: "Your profile",
    profileSub: "Carried over from the home page. Change anything and the plan updates.",
    demo: "Or start from a demo applicant",
    demoTaglines: {
      "clear-rejection": "Maxed-out cards and recent late payments",
      borderline: "Just under the line: high card balance",
      approved: "Low card use, clean repayment history",
    },
    shareNote: "The link to this page keeps your goal and profile, so you can bookmark or share it.",
  },
  status: {
    met: "You already meet this goal",
    metSub: "Your score today qualifies for {apr} a year, within your limit. No plan needed.",
    plan: "Reach your goal in {n} months",
    plan1: "Reach your goal in 1 month",
    planSub: "Projected, if you follow the plan below at a realistic pace.",
    infeasible: "Not reachable within {n} months",
    infeasibleSub: "Under realistic limits, no plan gets to {score}. The closest plan below reaches about {best}.",
    tooCheap: "No tier is as cheap as {apr} a year",
    tooCheapSub: "The best rate we model is {best} a year, at a score of {score} or more. The plan below aims for that.",
  },
  card: {
    heading: "The score your goal needs",
    sub: "Higher scores unlock cheaper rate tiers.",
    goalScore: "Goal score",
    todayScore: "Your score today",
    pointsToGo: "{n} points to go",
    goalMet: "Goal met",
    gaugeAria: "Pathway score scale from 300 to 900. Your score today is {current}, your goal is {goal}, and the approval line is {threshold}.",
    approvalLine: "Approval line",
    ladder: "Rate tiers (illustrative)",
    tierRange: "{score}+",
    belowRange: "Below {score}",
    declinedApr: "about {apr} elsewhere",
    youToday: "You today",
    yourGoal: "Your goal",
    aprShort: "{apr} a year",
  },
  tiers: { excellent: "Excellent", "very-good": "Very good", good: "Good", fair: "Fair", declined: "Declined" },
  plan: {
    heading: "Your plan",
    sub: "The lowest-effort changes that reach a score of {score}. Age, dependants and home loans are never changed.",
    closest: "Closest plan within realistic limits",
    none: "Nothing to change: your profile already meets this goal.",
    step: "Step {n}",
    doneBy: "Done by month {n}",
    effort: "Effort {n}",
    scoreAfter: "Projected score after the plan: {n}",
  },
  chart: {
    heading: "Score, month by month",
    sub: "Projected Pathway score if you follow the plan, against the approval line and your goal.",
    score: "Projected score",
    approval: "Approval line ({n})",
    goal: "Goal ({n})",
    month: "Month",
    aria: "Line chart of the projected Pathway score over {months} months, starting at {start} and ending at {end}. The approval line is at {threshold} and the goal at {goal}. {outcome}",
    outcomeGoal: "The goal is reached in month {n}.",
    outcomeMet: "The goal is already met today.",
    outcomeNone: "The goal is not reached in this period.",
  },
  milestones: {
    heading: "Milestones",
    sub: "Tick them off as you go. Nothing is saved or sent anywhere.",
    none: "No milestones needed: you're already there.",
    progress: "{done} of {total} done",
    monthN: "Month {n}",
    utilization: "Card utilisation reaches {to}",
    debt: "Monthly debt payments are {cut} lower, about {payments} a month",
    income: "Monthly income reaches {to}",
    lines: "Active loans and cards change to {to}",
    lateLast: "Your last {late} late payment ages out",
    lateLeft: "{late} late payments on record drop to {n}",
    approval: "Crosses the approval line ({score}) and qualifies for {apr} a year",
    tier: "Reaches {score}: qualifies for {apr} a year ({tier})",
    goal: "Reaches {score}: qualifies for {apr} a year. Goal reached",
    goalApproval: "Crosses the approval line ({score}) and qualifies for {apr} a year. Goal reached",
    late: { late30: "30–59-day", late60: "60–89-day", late90: "90+-day" },
  },
  afford: {
    heading: "Can you afford the payment?",
    sub: "Lenders commonly cap all loan payments together at {cap} of monthly income.",
    today: "Today",
    afterPlan: "After the plan",
    both: "Today and after the plan",
    emi: "Monthly payment (EMI) at {apr} over {n} months",
    existing: "Debt payments you already make",
    room: "Room left in your budget",
    fits: "Fits your budget",
    over: "Over your budget",
    perMonth: "{amount}/month",
    barAria: "Budget of {budget} a month: {existing} already goes to debt payments and the new payment would be {emi}.",
    borrow: "Borrow up to {amount} instead to stay within budget.",
    term: "Or a {n}-month term lowers the payment to {emi}, which fits.",
    termNot: "Even over {n} months the payment would be {emi}, still above your room.",
    noRoom: "Your current debt payments already fill the budget, so cutting them comes first.",
    spare: "That leaves about {amount} a month of room.",
  },
  today: {
    heading: "What you can get today",
    sub: "Where you stand if you applied now, for the same loan.",
    tier: "A prime lender would offer about {apr} a year ({tier} tier).",
    declined: "A prime lender would likely decline today. High-cost lenders often charge around {apr} a year.",
    maxLoan: "Largest loan that fits your budget today",
    maxLoanAt: "over {n} months at {apr} a year",
    none: "No new loan fits your budget today: your debt payments already use it.",
    interest: "Interest on {amount} over {n} months",
    interestToday: "Today, at {apr}",
    interestGoal: "At your goal rate, {apr}",
    saved: "Reaching your goal first is projected to save about {amount} in interest.",
    same: "Your rate today is already as good as your goal rate.",
  },
  footnote: {
    text: "Illustrative pricing: the interest-rate tiers, the {alt} high-cost lender and the {cap} FOIR cap are assumptions, not offers from any lender. Every figure is a projection from a simulation, not financial advice.",
    link: "How it works",
  },
};

const hi: GoalStrings = {
  crumb: "लक्ष्य योजनाकार",
  home: "होम",
  hero: {
    eyebrow: "लक्ष्य योजनाकार",
    title: "जो ऋण आप चाहते हैं, वहीं से शुरू करें।",
    body: "पाथवे को बताएँ कि आप कौन-सा ऋण चाहते हैं। यह उल्टी दिशा में काम करता है: उस दर के लिए कितना स्कोर चाहिए, आज आप कहाँ हैं, अंतर पाटने की सबसे आसान योजना, और क्या मासिक किस्त आपके बजट में आती है।",
    stepsLabel: "योजनाकार कैसे काम करता है",
    step1: "राशि, अवधि और अधिकतम स्वीकार्य ब्याज दर चुनें।",
    step2: "देखें कि उस दर के लिए कितना स्कोर चाहिए, और वहाँ तक पहुँचने की अनुमानित योजना।",
    step3: "आवेदन से पहले मासिक किस्त को अपने बजट से मिलाकर देखें।",
  },
  inputs: {
    heading: "आपका लक्ष्य और प्रोफ़ाइल",
    goalLegend: "आप कौन-सा ऋण चाहते हैं",
    amount: "ऋण राशि",
    amountHint: "रुपये में।",
    term: "अवधि",
    termValue: "{n} महीने",
    maxApr: "आप अधिकतम कितनी सालाना ब्याज दर स्वीकार करेंगे",
    aprValue: "{apr} सालाना ब्याज",
    impliesTier: "इसके लिए {tier} श्रेणी चाहिए: {score} या अधिक स्कोर पर {apr} सालाना ब्याज मिलता है।",
    impliesNone: "हमारी कोई भी श्रेणी इतनी सस्ती नहीं है। सबसे अच्छी दर {apr} सालाना ब्याज है, {score} या अधिक स्कोर पर।",
    profileLegend: "आपकी प्रोफ़ाइल",
    profileSub: "होम पेज से ली गई। कुछ भी बदलें, योजना तुरंत अपडेट हो जाएगी।",
    demo: "या किसी डेमो आवेदक से शुरू करें",
    demoTaglines: {
      "clear-rejection": "कार्ड पूरी तरह भरे और हाल में देर से भुगतान",
      borderline: "रेखा से ठीक नीचे: कार्ड पर ऊँचा बकाया",
      approved: "कम कार्ड उपयोग, साफ़ इतिहास",
    },
    shareNote: "इस पेज के लिंक में आपका लक्ष्य और प्रोफ़ाइल शामिल रहते हैं, ताकि आप इसे सहेज या साझा कर सकें।",
  },
  status: {
    met: "आप यह लक्ष्य पहले से पूरा करते हैं",
    metSub: "आज का आपका स्कोर आपकी सीमा के भीतर {apr} सालाना ब्याज के योग्य है। किसी योजना की ज़रूरत नहीं।",
    plan: "{n} महीनों में अपने लक्ष्य तक पहुँचें",
    plan1: "1 महीने में अपने लक्ष्य तक पहुँचें",
    planSub: "अनुमान, यदि आप नीचे दी गई योजना व्यावहारिक गति से अपनाते हैं।",
    infeasible: "{n} महीनों में संभव नहीं",
    infeasibleSub: "व्यावहारिक सीमाओं में कोई भी योजना {score} तक नहीं पहुँचती। नीचे सबसे नज़दीकी योजना है, जो लगभग {best} तक पहुँचती है।",
    tooCheap: "कोई भी श्रेणी {apr} सालाना ब्याज जितनी सस्ती नहीं",
    tooCheapSub: "हमारे मॉडल की सबसे अच्छी दर {best} सालाना ब्याज है, {score} या अधिक स्कोर पर। नीचे की योजना उसी को लक्ष्य बनाती है।",
  },
  card: {
    heading: "आपके लक्ष्य के लिए ज़रूरी स्कोर",
    sub: "ऊँचा स्कोर सस्ती दर वाली श्रेणियाँ खोलता है।",
    goalScore: "लक्ष्य स्कोर",
    todayScore: "आज आपका स्कोर",
    pointsToGo: "{n} अंक बाकी",
    goalMet: "लक्ष्य पूरा",
    gaugeAria: "300 से 900 तक का पाथवे स्कोर पैमाना। आज आपका स्कोर {current} है, आपका लक्ष्य {goal} है, और स्वीकृति रेखा {threshold} है।",
    approvalLine: "स्वीकृति रेखा",
    ladder: "दर श्रेणियाँ (उदाहरण के लिए)",
    tierRange: "{score}+",
    belowRange: "{score} से कम",
    declinedApr: "अन्यत्र लगभग {apr}",
    youToday: "आज आप",
    yourGoal: "आपका लक्ष्य",
    aprShort: "{apr} सालाना ब्याज",
  },
  tiers: { excellent: "उत्कृष्ट", "very-good": "बहुत अच्छी", good: "अच्छी", fair: "सामान्य", declined: "अस्वीकृत" },
  plan: {
    heading: "आपकी योजना",
    sub: "{score} स्कोर तक पहुँचने के लिए सबसे कम प्रयास वाले बदलाव। आयु, आश्रित और होम लोन कभी नहीं बदले जाते।",
    closest: "व्यावहारिक सीमाओं में सबसे नज़दीकी योजना",
    none: "कुछ बदलने की ज़रूरत नहीं: आपकी प्रोफ़ाइल पहले से इस लक्ष्य को पूरा करती है।",
    step: "चरण {n}",
    doneBy: "महीना {n} तक पूरा",
    effort: "प्रयास {n}",
    scoreAfter: "योजना के बाद अनुमानित स्कोर: {n}",
  },
  chart: {
    heading: "महीने-दर-महीने स्कोर",
    sub: "योजना अपनाने पर अनुमानित पाथवे स्कोर, स्वीकृति रेखा और आपके लक्ष्य की तुलना में।",
    score: "अनुमानित स्कोर",
    approval: "स्वीकृति रेखा ({n})",
    goal: "लक्ष्य ({n})",
    month: "महीना",
    aria: "{months} महीनों में अनुमानित पाथवे स्कोर का रेखा चार्ट, जो {start} से शुरू होकर {end} पर समाप्त होता है। स्वीकृति रेखा {threshold} पर और लक्ष्य {goal} पर है। {outcome}",
    outcomeGoal: "लक्ष्य महीना {n} में पूरा होता है।",
    outcomeMet: "लक्ष्य आज ही पूरा है।",
    outcomeNone: "इस अवधि में लक्ष्य पूरा नहीं होता।",
  },
  milestones: {
    heading: "पड़ाव",
    sub: "आगे बढ़ते हुए इन पर निशान लगाएँ। कुछ भी सहेजा या कहीं भेजा नहीं जाता।",
    none: "किसी पड़ाव की ज़रूरत नहीं: आप पहले से वहाँ हैं।",
    progress: "{total} में से {done} पूरे",
    monthN: "महीना {n}",
    utilization: "कार्ड उपयोग {to} तक पहुँचता है",
    debt: "मासिक कर्ज़ किस्तें {cut} कम, लगभग {payments} प्रति माह",
    income: "मासिक आय {to} तक पहुँचती है",
    lines: "सक्रिय ऋण और कार्ड {to} हो जाते हैं",
    lateLast: "{late} की देरी वाला आख़िरी भुगतान रिकॉर्ड से हट जाता है",
    lateLeft: "रिकॉर्ड पर {late} की देरी वाले भुगतान घटकर {n} रह जाते हैं",
    approval: "स्वीकृति रेखा ({score}) पार, {apr} सालाना ब्याज के योग्य",
    tier: "{score} तक पहुँचे: {apr} सालाना ब्याज के योग्य ({tier})",
    goal: "{score} तक पहुँचे: {apr} सालाना ब्याज के योग्य। लक्ष्य पूरा",
    goalApproval: "स्वीकृति रेखा ({score}) पार, {apr} सालाना ब्याज के योग्य। लक्ष्य पूरा",
    late: { late30: "30–59 दिन", late60: "60–89 दिन", late90: "90+ दिन" },
  },
  afford: {
    heading: "क्या आप किस्त चुका पाएँगे?",
    sub: "ऋणदाता आम तौर पर सभी ऋण किस्तों को मिलाकर मासिक आय के {cap} तक सीमित रखते हैं।",
    today: "आज",
    afterPlan: "योजना के बाद",
    both: "आज और योजना के बाद",
    emi: "{n} महीनों के लिए {apr} पर मासिक किस्त (EMI)",
    existing: "जो कर्ज़ किस्तें आप पहले से चुका रहे हैं",
    room: "बजट में बची जगह",
    fits: "बजट में आती है",
    over: "बजट से ज़्यादा",
    perMonth: "{amount}/माह",
    barAria: "{budget} प्रति माह का बजट: {existing} पहले से कर्ज़ किस्तों में जाता है और नई किस्त {emi} होगी।",
    borrow: "बजट में रहने के लिए इसके बजाय {amount} तक उधार लें।",
    term: "या {n} महीने की अवधि से किस्त घटकर {emi} हो जाती है, जो बजट में आती है।",
    termNot: "{n} महीनों में भी किस्त {emi} होगी, जो बची जगह से ज़्यादा है।",
    noRoom: "आपकी मौजूदा कर्ज़ किस्तें पहले ही पूरा बजट ले लेती हैं, इसलिए पहले उन्हें घटाना ज़रूरी है।",
    spare: "इसके बाद हर महीने लगभग {amount} की गुंजाइश बचती है।",
  },
  today: {
    heading: "आज आपको क्या मिल सकता है",
    sub: "अगर आप अभी इसी ऋण के लिए आवेदन करें, तो आप कहाँ खड़े हैं।",
    tier: "एक प्रमुख ऋणदाता लगभग {apr} सालाना ब्याज दे सकता है ({tier} श्रेणी)।",
    declined: "आज एक प्रमुख ऋणदाता संभवतः आवेदन अस्वीकार करेगा। ऊँची लागत वाले ऋणदाता अक्सर लगभग {apr} सालाना ब्याज लेते हैं।",
    maxLoan: "आज आपके बजट में आने वाला सबसे बड़ा ऋण",
    maxLoanAt: "{n} महीनों के लिए {apr} सालाना ब्याज पर",
    none: "आज कोई नया ऋण आपके बजट में नहीं आता: मौजूदा कर्ज़ किस्तें पूरा बजट ले लेती हैं।",
    interest: "{n} महीनों में {amount} पर ब्याज",
    interestToday: "आज, {apr} पर",
    interestGoal: "आपकी लक्ष्य दर {apr} पर",
    saved: "पहले लक्ष्य तक पहुँचने से ब्याज में लगभग {amount} की अनुमानित बचत होती है।",
    same: "आज की आपकी दर पहले से ही आपकी लक्ष्य दर जितनी अच्छी है।",
  },
  footnote: {
    text: "उदाहरण के लिए मूल्य: ब्याज दर श्रेणियाँ, {alt} वाला ऊँची लागत का विकल्प और {cap} की बजट सीमा केवल मान्यताएँ हैं, किसी ऋणदाता का प्रस्ताव नहीं। हर आँकड़ा एक सिमुलेशन का अनुमान है, वित्तीय सलाह नहीं।",
    link: "यह कैसे काम करता है",
  },
};

const mr: GoalStrings = {
  crumb: "ध्येय नियोजक",
  home: "मुख्यपृष्ठ",
  hero: {
    eyebrow: "ध्येय नियोजक",
    title: "तुम्हाला हवे असलेल्या कर्जापासून सुरुवात करा.",
    body: "तुम्हाला कोणते कर्ज हवे आहे ते पाथवेला सांगा. ते उलट दिशेने काम करते: त्या दरासाठी किती स्कोअर लागतो, आज तुम्ही कुठे आहात, अंतर भरून काढणारी सर्वात सोपी योजना, आणि मासिक हप्ता तुमच्या बजेटमध्ये बसतो का.",
    stepsLabel: "नियोजक कसे काम करतो",
    step1: "रक्कम, मुदत आणि तुम्ही स्वीकाराल असा सर्वाधिक व्याजदर निवडा.",
    step2: "त्या दरासाठी लागणारा स्कोअर आणि तिथे पोहोचण्याची अंदाजित योजना पाहा.",
    step3: "अर्ज करण्यापूर्वी मासिक हप्ता तुमच्या बजेटशी जुळवून पाहा.",
  },
  inputs: {
    heading: "तुमचे ध्येय आणि प्रोफाइल",
    goalLegend: "तुम्हाला हवे असलेले कर्ज",
    amount: "कर्जाची रक्कम",
    amountHint: "रुपयांमध्ये.",
    term: "मुदत",
    termValue: "{n} महिने",
    maxApr: "तुम्ही स्वीकाराल असा सर्वाधिक वार्षिक व्याजदर",
    aprValue: "{apr} वार्षिक व्याज",
    impliesTier: "यासाठी {tier} श्रेणी लागते: {score} किंवा अधिक स्कोअरवर {apr} वार्षिक व्याज मिळतो.",
    impliesNone: "आमची कोणतीही श्रेणी इतकी स्वस्त नाही. सर्वोत्तम दर {apr} वार्षिक व्याज आहे, {score} किंवा अधिक स्कोअरवर.",
    profileLegend: "तुमचे प्रोफाइल",
    profileSub: "मुख्यपृष्ठावरून आणलेले. काहीही बदला, योजना लगेच अद्ययावत होईल.",
    demo: "किंवा डेमो अर्जदारापासून सुरुवात करा",
    demoTaglines: {
      "clear-rejection": "पूर्ण वापरलेली कार्डे आणि अलीकडचे उशिराचे हप्ते",
      borderline: "रेषेच्या अगदी खाली: कार्डवर जास्त थकबाकी",
      approved: "कमी कार्ड वापर, स्वच्छ इतिहास",
    },
    shareNote: "या पानाच्या लिंकमध्ये तुमचे ध्येय आणि प्रोफाइल जपले जाते, त्यामुळे तुम्ही ती जतन किंवा शेअर करू शकता.",
  },
  status: {
    met: "तुम्ही हे ध्येय आधीच गाठले आहे",
    metSub: "आजचा तुमचा स्कोअर तुमच्या मर्यादेत, {apr} वार्षिक व्याज साठी पात्र आहे. कोणत्याही योजनेची गरज नाही.",
    plan: "{n} महिन्यांत तुमचे ध्येय गाठा",
    plan1: "1 महिन्यात तुमचे ध्येय गाठा",
    planSub: "अंदाज, जर तुम्ही खालील योजना व्यवहार्य वेगाने पाळली तर.",
    infeasible: "{n} महिन्यांत शक्य नाही",
    infeasibleSub: "व्यवहार्य मर्यादांमध्ये कोणतीही योजना {score} पर्यंत पोहोचत नाही. खाली सर्वात जवळची योजना आहे, जी सुमारे {best} पर्यंत पोहोचते.",
    tooCheap: "कोणतीही श्रेणी {apr} वार्षिक व्याज इतकी स्वस्त नाही",
    tooCheapSub: "आमच्या मॉडेलमधील सर्वोत्तम दर {best} वार्षिक व्याज आहे, {score} किंवा अधिक स्कोअरवर. खालील योजना तेच ध्येय ठेवते.",
  },
  card: {
    heading: "तुमच्या ध्येयासाठी लागणारा स्कोअर",
    sub: "जास्त स्कोअरमुळे स्वस्त दराच्या श्रेणी खुल्या होतात.",
    goalScore: "ध्येय स्कोअर",
    todayScore: "आजचा तुमचा स्कोअर",
    pointsToGo: "अजून {n} गुण",
    goalMet: "ध्येय गाठले",
    gaugeAria: "300 ते 900 पाथवे स्कोअर मोजपट्टी. आजचा तुमचा स्कोअर {current} आहे, तुमचे ध्येय {goal} आहे, आणि मंजुरी रेषा {threshold} आहे.",
    approvalLine: "मंजुरी रेषा",
    ladder: "दर श्रेणी (उदाहरणादाखल)",
    tierRange: "{score}+",
    belowRange: "{score} पेक्षा कमी",
    declinedApr: "इतरत्र सुमारे {apr}",
    youToday: "आज तुम्ही",
    yourGoal: "तुमचे ध्येय",
    aprShort: "{apr} वार्षिक व्याज",
  },
  tiers: { excellent: "उत्कृष्ट", "very-good": "खूप चांगली", good: "चांगली", fair: "साधारण", declined: "नामंजूर" },
  plan: {
    heading: "तुमची योजना",
    sub: "{score} स्कोअरपर्यंत पोहोचण्यासाठी सर्वात कमी प्रयत्नांचे बदल. वय, अवलंबित आणि गृहकर्जे कधीही बदलली जात नाहीत.",
    closest: "व्यवहार्य मर्यादांमधील सर्वात जवळची योजना",
    none: "काहीही बदलण्याची गरज नाही: तुमचे प्रोफाइल आधीच हे ध्येय पूर्ण करते.",
    step: "पायरी {n}",
    doneBy: "महिना {n} पर्यंत पूर्ण",
    effort: "प्रयत्न {n}",
    scoreAfter: "योजनेनंतर अंदाजित स्कोअर: {n}",
  },
  chart: {
    heading: "महिना-दर-महिना स्कोअर",
    sub: "योजना पाळल्यास अंदाजित पाथवे स्कोअर, मंजुरी रेषा आणि तुमच्या ध्येयाच्या तुलनेत.",
    score: "अंदाजित स्कोअर",
    approval: "मंजुरी रेषा ({n})",
    goal: "ध्येय ({n})",
    month: "महिना",
    aria: "{months} महिन्यांतील अंदाजित पाथवे स्कोअरचा रेषा आलेख, जो {start} पासून सुरू होऊन {end} वर संपतो. मंजुरी रेषा {threshold} वर आणि ध्येय {goal} वर आहे. {outcome}",
    outcomeGoal: "ध्येय महिना {n} मध्ये गाठले जाते.",
    outcomeMet: "ध्येय आजच गाठलेले आहे.",
    outcomeNone: "या कालावधीत ध्येय गाठले जात नाही.",
  },
  milestones: {
    heading: "टप्पे",
    sub: "पुढे जाताना यांवर खूण करा. काहीही जतन केले जात नाही किंवा कुठेही पाठवले जात नाही.",
    none: "कोणत्याही टप्प्याची गरज नाही: तुम्ही आधीच तिथे आहात.",
    progress: "{total} पैकी {done} पूर्ण",
    monthN: "महिना {n}",
    utilization: "कार्ड वापर {to} पर्यंत पोहोचतो",
    debt: "मासिक कर्ज हप्ते {cut} कमी, सुमारे {payments} दरमहा",
    income: "मासिक उत्पन्न {to} पर्यंत पोहोचते",
    lines: "सक्रिय कर्जे आणि कार्ड {to} होतात",
    lateLast: "{late} उशिराचा शेवटचा हप्ता नोंदीतून हटतो",
    lateLeft: "नोंदीवरील {late} उशिराचे हप्ते कमी होऊन {n} राहतात",
    approval: "मंजुरी रेषा ({score}) ओलांडली, {apr} वार्षिक व्याज साठी पात्र",
    tier: "{score} गाठले: {apr} वार्षिक व्याज साठी पात्र ({tier})",
    goal: "{score} गाठले: {apr} वार्षिक व्याज साठी पात्र. ध्येय पूर्ण",
    goalApproval: "मंजुरी रेषा ({score}) ओलांडली, {apr} वार्षिक व्याज साठी पात्र. ध्येय पूर्ण",
    late: { late30: "30–59 दिवस", late60: "60–89 दिवस", late90: "90+ दिवस" },
  },
  afford: {
    heading: "तुम्हाला हप्ता परवडेल का?",
    sub: "कर्जदाते सहसा सर्व कर्ज हप्ते मिळून मासिक उत्पन्नाच्या {cap} पर्यंत मर्यादित ठेवतात.",
    today: "आज",
    afterPlan: "योजनेनंतर",
    both: "आज आणि योजनेनंतर",
    emi: "{n} महिन्यांसाठी {apr} दराने मासिक हप्ता (EMI)",
    existing: "तुम्ही आधीच भरत असलेले कर्ज हप्ते",
    room: "बजेटमध्ये उरलेली जागा",
    fits: "बजेटमध्ये बसतो",
    over: "बजेटपेक्षा जास्त",
    perMonth: "{amount}/महिना",
    barAria: "दरमहा {budget} चे बजेट: त्यापैकी {existing} आधीच कर्ज हप्त्यांमध्ये जातात आणि नवीन हप्ता {emi} असेल.",
    borrow: "बजेटमध्ये राहण्यासाठी त्याऐवजी {amount} पर्यंत कर्ज घ्या.",
    term: "किंवा {n} महिन्यांच्या मुदतीने हप्ता {emi} पर्यंत कमी होतो, जो बजेटमध्ये बसतो.",
    termNot: "{n} महिन्यांतही हप्ता {emi} असेल, जो उरलेल्या जागेपेक्षा जास्त आहे.",
    noRoom: "तुमचे सध्याचे कर्ज हप्ते आधीच संपूर्ण बजेट व्यापतात, त्यामुळे आधी ते कमी करणे गरजेचे आहे.",
    spare: "त्यानंतर दरमहा सुमारे {amount} इतकी जागा उरते.",
  },
  today: {
    heading: "आज तुम्हाला काय मिळू शकते",
    sub: "आत्ता याच कर्जासाठी अर्ज केल्यास तुम्ही कुठे आहात.",
    tier: "एखादा प्रमुख कर्जदाता सुमारे {apr} वार्षिक व्याज देऊ शकतो ({tier} श्रेणी).",
    declined: "आज एखादा प्रमुख कर्जदाता बहुधा नकार देईल. जास्त खर्चाचे कर्जदाते अनेकदा सुमारे {apr} वार्षिक व्याज आकारतात.",
    maxLoan: "आज तुमच्या बजेटमध्ये बसणारे सर्वात मोठे कर्ज",
    maxLoanAt: "{n} महिन्यांसाठी {apr} वार्षिक व्याज दराने",
    none: "आज कोणतेही नवीन कर्ज तुमच्या बजेटमध्ये बसत नाही: सध्याचे कर्ज हप्ते संपूर्ण बजेट व्यापतात.",
    interest: "{n} महिन्यांत {amount} वरील व्याज",
    interestToday: "आज, {apr} दराने",
    interestGoal: "तुमच्या ध्येय दराने, {apr}",
    saved: "आधी ध्येय गाठल्यास व्याजात सुमारे {amount} ची अंदाजित बचत होते.",
    same: "तुमचा आजचा दर आधीच तुमच्या ध्येय दराइतका चांगला आहे.",
  },
  footnote: {
    text: "उदाहरणादाखल दर: व्याजदर श्रेणी, {alt} चा जास्त खर्चाचा पर्याय आणि {cap} ची बजेट मर्यादा ही केवळ गृहितके आहेत, कोणत्याही कर्जदात्याचे प्रस्ताव नाहीत. प्रत्येक आकडा सिम्युलेशनमधील अंदाज आहे, आर्थिक सल्ला नाही.",
    link: "हे कसे चालते",
  },
};

export const GOAL_STRINGS: Record<Lang, GoalStrings> = { en, hi, mr };
export const goalStrings = (lang: Lang): GoalStrings => GOAL_STRINGS[lang];

/** APR as a short percentage: 0.105 → "10.5%", 0.15 → "15%". */
export const aprText = (apr: number) => `${(apr * 100).toFixed(1).replace(/\.0$/, "")}%`;

/** One milestone as a localized sentence. */
export function milestoneText(lang: Lang, m: Milestone): string {
  const s = GOAL_STRINGS[lang];
  const ms = s.milestones;
  switch (m.kind) {
    case "utilization":
      return tf(ms.utilization, { to: pct(m.to) });
    case "debt":
      return tf(ms.debt, { cut: pct(m.cut), payments: money(m.payments) });
    case "income":
      return tf(ms.income, { to: money(m.to) });
    case "lines":
      return tf(ms.lines, { to: Math.round(m.to) });
    case "late":
      return m.remaining === 0
        ? tf(ms.lateLast, { late: ms.late[m.feature] })
        : tf(ms.lateLeft, { late: ms.late[m.feature], n: m.remaining });
    case "approval":
      return tf(ms.approval, { score: m.score, apr: aprText(m.apr) });
    case "tier":
      return tf(ms.tier, { score: m.score, apr: aprText(m.apr), tier: s.tiers[m.tier] });
    case "goal":
      return tf(m.approval ? ms.goalApproval : ms.goal, { score: m.score, apr: aprText(m.apr) });
  }
}

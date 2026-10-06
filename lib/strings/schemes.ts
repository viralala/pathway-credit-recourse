import type { Lang } from "@/lib/i18n";
import type {
  AreaType,
  BusinessStage,
  EnterpriseForm,
  Gender,
  MatchStatus,
  Outcome,
  ProfileFieldKey,
  SchemeType,
  Sector,
  SocialCategory,
} from "@/lib/schemes/types";

/**
 * Strings for the government scheme section of the workbench ("Alternative Government-Supported
 * Pathways"). Every language defines every key (enforced by `SchemeStrings`), including a label for
 * every profile field and every option of every choice field.
 *
 * Only the interface text lives here. Scheme names, summaries, benefits and criterion labels come from
 * the scheme directory (in English) and are shown as published; no scheme is named in this file.
 * Templates use {name} placeholders filled with `tf` from lib/i18n.
 *
 * Wording rule: these strings say criteria "appear to match" or "appear relevant". They never state a
 * result as an approval, a promise or a probability.
 */

/** A form question: the label shown to the person and a short hint under it. */
export interface FieldStrings {
  label: string;
  hint: string;
}

export interface SchemeStrings {
  kicker: string;
  title: string;
  sub: string;
  /** One line saying this check does not use the credit assessment. */
  independent: string;
  form: {
    heading: string;
    intro: string;
    optional: string;
    /** First option of every choice question: the person has not answered. */
    notAnswered: string;
    yes: string;
    no: string;
    notSure: string;
    moreDetails: string;
    moreDetailsHint: string;
    /** Why gender and social category are asked. */
    sensitive: string;
    check: string;
    checking: string;
    rangeError: string;
    changed: string;
    save: string;
    saveHint: string;
  };
  /** Label and hint for every field a rule may refer to (including those with no form question). */
  fields: Record<ProfileFieldKey, FieldStrings>;
  /** One label per allowed value of every choice field. */
  options: {
    gender: Record<Gender, string>;
    socialCategory: Record<SocialCategory, string>;
    areaType: Record<AreaType, string>;
    businessStage: Record<BusinessStage, string>;
    sector: Record<Sector, string>;
    enterpriseForm: Record<EnterpriseForm, string>;
  };
  /** Highest class passed: 0 and 15 have their own wording, 1 to 12 use `classN`. */
  education: { none: string; classN: string; graduate: string };
  status: Record<MatchStatus, string>;
  results: {
    heading: string;
    loading: string;
    countOne: string;
    countMany: string;
    /** Spoken once a check finishes. */
    found: string;
    openGroup: string;
    openGroupSub: string;
    notMatchedGroup: string;
    notMatchedHint: string;
    noneOpen: string;
    missingTop: string;
    saved: string;
    notSaved: string;
    retry: string;
    empty: { title: string; body: string };
    unavailable: { title: string; body: string };
    rateLimited: string;
    error: string;
    network: string;
  };
  card: {
    agency: string;
    type: string;
    types: Record<SchemeType, string>;
    benefits: string;
    loanRange: string;
    loanFrom: string;
    loanUpTo: string;
    loanBetween: string;
    confirmed: string;
    confirmedNone: string;
    matchScore: string;
    matchCaption: string;
    englishNote: string;
    criteriaHeading: string;
    requiredHeading: string;
    preferredHeading: string;
    preferredNote: string;
    outcome: Record<Outcome, string>;
    yourAnswer: string;
    noAnswer: string;
    source: string;
    missingHeading: string;
    missingIntro: string;
    goTo: string;
    noQuestion: string;
    officialSource: string;
    otherSources: string;
    apply: string;
    howToApply: string;
    lastChecked: string;
    unverified: string;
    newTab: string;
  };
  disclaimer: {
    title: string;
    information: string;
    match: string;
    decides: string;
    changes: string;
    affiliation: string;
  };
}

const en: SchemeStrings = {
  kicker: "Other routes",
  title: "Alternative Government-Supported Pathways",
  sub: "Some government-backed schemes publish who they are meant for. Tell us a few things and we show which published criteria appear to match, and which we still need to know.",
  independent:
    "This check is separate from your Pathway score. It uses only the answers below and your monthly income, never your Pathway score or any other credit result.",
  form: {
    heading: "A few questions",
    intro:
      "Every question is optional. Skip anything you are not sure about: an unanswered question is treated as “not known”, never as “no”.",
    optional: "Optional",
    notAnswered: "Not answered",
    yes: "Yes",
    no: "No",
    notSure: "Not sure",
    moreDetails: "More details (optional)",
    moreDetailsHint: "The more you answer, the more of each scheme's published criteria we can check.",
    sensitive:
      "Why we ask about gender and social category: some schemes are reserved for particular groups. Both are optional, used only for this check, and you can leave them blank.",
    check: "Check schemes",
    checking: "Checking schemes…",
    rangeError: "Enter a number from {min} to {max}.",
    changed: "You changed your answers after the last check. Check again to update the results.",
    save: "Save this result to my account",
    saveHint: "Optional. Keeps this result in your account history. Nothing is saved unless you tick this.",
  },
  fields: {
    businessStage: { label: "What is the money for?", hint: "A new business, or one that is already running." },
    sector: { label: "Kind of work", hint: "The main activity of the business." },
    loanAmount: { label: "Loan amount you are looking for (₹)", hint: "A rough figure is fine." },
    projectCost: { label: "Total cost of the project or unit (₹)", hint: "Everything the business needs, including your own money." },
    annualIncome: { label: "Yearly income (₹)", hint: "Worked out from the monthly income you entered above." },
    age: { label: "Your age (years)", hint: "Completed years." },
    gender: { label: "Gender", hint: "Some schemes are reserved for particular groups." },
    socialCategory: { label: "Social category", hint: "Some schemes are reserved for particular groups." },
    areaType: { label: "Where will the business be?", hint: "The place where the unit will work." },
    enterpriseForm: { label: "How is the business set up?", hint: "The legal form of the business or group." },
    educationClass: { label: "Highest class passed", hint: "Choose “Graduate or above” for a college degree." },
    isTraditionalArtisan: {
      label: "Do you work with your hands and tools in a traditional family trade?",
      hint: "For example carpentry, pottery, weaving or blacksmithing.",
    },
    hasAvailedGovtSubsidy: {
      label: "Have you already received a government subsidy for a unit under another scheme?",
      hint: "Some schemes support a person only once.",
    },
    hasSimilarSchemeLoan: {
      label: "In the last five years, did you take a loan under a similar government credit scheme?",
      hint: "Some schemes ask for a gap between such loans.",
    },
    isGovernmentEmployee: {
      label: "Are you, or is anyone in your family, in government service?",
      hint: "Some schemes leave out government employees and their families.",
    },
    hasLoanDefault: {
      label: "Is a loan of yours in default with any bank or financial institution?",
      hint: "That means a loan that has stayed overdue and unpaid for a long time.",
    },
  },
  options: {
    gender: { female: "Woman", male: "Man", other: "Other" },
    socialCategory: {
      general: "General",
      obc: "Other Backward Classes (OBC)",
      sc: "Scheduled Caste (SC)",
      st: "Scheduled Tribe (ST)",
      minority: "Minority community",
    },
    areaType: { rural: "Rural area (village)", urban: "Urban area (town or city)" },
    businessStage: { new: "A new business or unit", existing: "A business already running" },
    sector: {
      manufacturing: "Making or processing goods",
      services: "Services",
      trading: "Trading or retail",
      agri_allied: "Farming-related work (dairy, fishery, poultry and similar)",
    },
    enterpriseForm: {
      individual: "Individual",
      proprietorship: "Sole proprietorship",
      partnership: "Partnership firm",
      company: "Company",
      shg: "Self-help group (SHG)",
      cooperative: "Cooperative society",
      trust: "Trust",
    },
  },
  education: { none: "No formal schooling", classN: "Class {n}", graduate: "Graduate or above" },
  status: {
    appears_relevant: "Criteria appear to match",
    needs_more_information: "Need more information",
    not_matched: "Criteria do not appear to match",
  },
  results: {
    heading: "What we found",
    loading: "Checking schemes",
    countOne: "1 scheme checked against your answers.",
    countMany: "{n} schemes checked against your answers.",
    found:
      "Check finished. For {relevant}, the published criteria appear to match. {more} need more information. For {not}, the criteria do not appear to match.",
    openGroup: "Schemes worth a closer look",
    openGroupSub: "Where the published criteria appear to match, or where we need a little more information.",
    notMatchedGroup: "Schemes whose published criteria do not appear to match",
    notMatchedHint:
      "Open a scheme to see which criterion was not met. If one of your answers was wrong, correct it above and check again.",
    noneOpen:
      "With your answers so far, no scheme's published criteria appear to match. See the list below to understand why, or change an answer and check again.",
    missingTop: "Answering these would let us check more schemes",
    saved: "Saved to your account",
    notSaved: "This result could not be saved to your account.",
    retry: "Try again",
    empty: {
      title: "No schemes to show",
      body: "The scheme directory returned no schemes for these answers. Try changing or adding an answer, or look at the official government portals directly.",
    },
    unavailable: {
      title: "The scheme directory is not available right now",
      body: "The rest of Pathway works as usual. Please try again a little later.",
    },
    rateLimited: "There were a lot of checks in a short time. Please try again in a minute.",
    error: "We could not complete the check. Please try again.",
    network: "We could not reach the service. Check your connection and try again.",
  },
  card: {
    agency: "Implementing agency",
    type: "Scheme type",
    types: {
      loan: "Loan scheme",
      credit_guarantee: "Credit risk cover",
      credit_linked_subsidy: "Subsidy linked to a loan",
      composite: "Combined scheme",
    },
    benefits: "Benefits as published",
    loanRange: "Loan range",
    loanFrom: "From {min}",
    loanUpTo: "Up to {max}",
    loanBetween: "{min} to {max}",
    confirmed: "Published criteria confirmed: {n} of {m}",
    confirmedNone: "No required criteria are listed",
    matchScore: "Criteria match: {n} out of 100",
    matchCaption: "This shows how much of the published criteria your answers confirm. It does not predict whether an application will succeed.",
    englishNote: "Scheme details are shown in English, as published.",
    criteriaHeading: "How each published criterion was checked",
    requiredHeading: "Required by the scheme",
    preferredHeading: "Priority (not a condition)",
    preferredNote: "The scheme may give priority to these, but they are not conditions and do not rule anyone out.",
    outcome: { pass: "Met", fail: "Not met", unknown: "Not known" },
    yourAnswer: "Your answer: {value}",
    noAnswer: "No answer given",
    source: "Source: {ref}",
    missingHeading: "Tell us this to check further",
    missingIntro: "These answers could change the result for this scheme.",
    goTo: "Go to the question: {field}",
    noQuestion: "Not asked here",
    officialSource: "Official source",
    otherSources: "Other sources",
    apply: "Apply or learn more on the official portal",
    howToApply: "How to apply",
    lastChecked: "Last checked against the official source on {date}",
    unverified: "Not yet verified against the official source. Confirm the details on the official site.",
    newTab: "opens in a new tab",
  },
  disclaimer: {
    title: "Please read this",
    information: "This is general information, not advice and not a decision.",
    match:
      "A match only means a scheme's published criteria appear relevant to the answers you gave. It is not an approval, an offer or a promise of one.",
    decides: "The bank or implementing agency makes the decision, using its own checks.",
    changes: "Scheme details change. Always confirm the current rules on the official source before you apply.",
    affiliation: "Pathway is not affiliated with these schemes or with the government.",
  },
};

const hi: SchemeStrings = {
  kicker: "अन्य रास्ते",
  title: "सरकार-समर्थित वैकल्पिक रास्ते",
  sub: "कुछ सरकार-समर्थित योजनाएँ प्रकाशित करती हैं कि वे किनके लिए हैं। कुछ बातें बताइए, हम दिखाएँगे कि प्रकाशित मानदंडों में से कौन-से मेल खाते दिखते हैं और किनके बारे में हमें अभी जानना बाकी है।",
  independent:
    "यह जाँच आपके पाथवे स्कोर से अलग है। इसमें केवल नीचे के आपके उत्तर और आपकी मासिक आय का उपयोग होता है, पाथवे स्कोर या किसी अन्य क्रेडिट नतीजे का नहीं।",
  form: {
    heading: "कुछ सवाल",
    intro:
      "हर सवाल वैकल्पिक है। जिसके बारे में पक्का न हो उसे छोड़ दें: बिना जवाब वाला सवाल “पता नहीं” माना जाता है, कभी “नहीं” नहीं।",
    optional: "वैकल्पिक",
    notAnswered: "उत्तर नहीं दिया",
    yes: "हाँ",
    no: "नहीं",
    notSure: "पक्का नहीं",
    moreDetails: "और विवरण (वैकल्पिक)",
    moreDetailsHint: "जितने ज़्यादा उत्तर, उतने ज़्यादा प्रकाशित मानदंड हम हर योजना में जाँच पाते हैं।",
    sensitive:
      "लिंग और सामाजिक श्रेणी क्यों पूछी जाती है: कुछ योजनाएँ खास समूहों के लिए आरक्षित होती हैं। दोनों वैकल्पिक हैं, केवल इसी जाँच में उपयोग होते हैं, और आप इन्हें खाली छोड़ सकते हैं।",
    check: "योजनाएँ जाँचें",
    checking: "योजनाएँ जाँची जा रही हैं…",
    rangeError: "{min} से {max} के बीच की संख्या लिखें।",
    changed: "पिछली जाँच के बाद आपने उत्तर बदले हैं। नतीजे अपडेट करने के लिए फिर से जाँचें।",
    save: "इस नतीजे को मेरे खाते में सहेजें",
    saveHint: "वैकल्पिक। यह नतीजा आपके खाते के इतिहास में रखा जाएगा। टिक किए बिना कुछ भी सहेजा नहीं जाता।",
  },
  fields: {
    businessStage: { label: "पैसा किस काम के लिए है?", hint: "नया कारोबार, या पहले से चल रहा कारोबार।" },
    sector: { label: "काम का प्रकार", hint: "कारोबार की मुख्य गतिविधि।" },
    loanAmount: { label: "आप कितना ऋण चाहते हैं (₹)", hint: "मोटा अंदाज़ा भी चलेगा।" },
    projectCost: { label: "परियोजना या इकाई की कुल लागत (₹)", hint: "कारोबार के लिए ज़रूरी सब कुछ, आपके अपने पैसे सहित।" },
    annualIncome: { label: "सालाना आय (₹)", hint: "ऊपर दी गई मासिक आय से निकाली जाती है।" },
    age: { label: "आपकी आयु (वर्ष)", hint: "पूरे किए हुए वर्ष।" },
    gender: { label: "लिंग", hint: "कुछ योजनाएँ खास समूहों के लिए आरक्षित होती हैं।" },
    socialCategory: { label: "सामाजिक श्रेणी", hint: "कुछ योजनाएँ खास समूहों के लिए आरक्षित होती हैं।" },
    areaType: { label: "कारोबार कहाँ होगा?", hint: "वह जगह जहाँ इकाई चलेगी।" },
    enterpriseForm: { label: "कारोबार किस रूप में है?", hint: "कारोबार या समूह का कानूनी स्वरूप।" },
    educationClass: { label: "उत्तीर्ण की गई सबसे ऊँची कक्षा", hint: "कॉलेज की डिग्री हो तो “स्नातक या उससे ऊपर” चुनें।" },
    isTraditionalArtisan: {
      label: "क्या आप पारंपरिक पारिवारिक पेशे में हाथ और औज़ारों से काम करते हैं?",
      hint: "जैसे बढ़ईगिरी, कुम्हारी, बुनाई या लोहारी।",
    },
    hasAvailedGovtSubsidy: {
      label: "क्या आपने किसी दूसरी योजना के तहत किसी इकाई के लिए सरकारी सब्सिडी पहले ही ली है?",
      hint: "कुछ योजनाएँ किसी व्यक्ति की मदद केवल एक बार करती हैं।",
    },
    hasSimilarSchemeLoan: {
      label: "क्या पिछले पाँच वर्षों में आपने ऐसी ही किसी सरकारी ऋण योजना के तहत ऋण लिया है?",
      hint: "कुछ योजनाएँ ऐसे ऋणों के बीच अंतर माँगती हैं।",
    },
    isGovernmentEmployee: {
      label: "क्या आप या आपके परिवार का कोई सदस्य सरकारी सेवा में है?",
      hint: "कुछ योजनाएँ सरकारी कर्मचारियों और उनके परिवारों को शामिल नहीं करतीं।",
    },
    hasLoanDefault: {
      label: "क्या किसी बैंक या वित्तीय संस्था का आपका कोई ऋण चूक (डिफ़ॉल्ट) में है?",
      hint: "यानी ऐसा ऋण जो लंबे समय से बकाया है और चुकाया नहीं गया।",
    },
  },
  options: {
    gender: { female: "महिला", male: "पुरुष", other: "अन्य" },
    socialCategory: {
      general: "सामान्य",
      obc: "अन्य पिछड़ा वर्ग (OBC)",
      sc: "अनुसूचित जाति (SC)",
      st: "अनुसूचित जनजाति (ST)",
      minority: "अल्पसंख्यक समुदाय",
    },
    areaType: { rural: "ग्रामीण क्षेत्र (गाँव)", urban: "शहरी क्षेत्र (कस्बा या शहर)" },
    businessStage: { new: "नया कारोबार या इकाई", existing: "पहले से चल रहा कारोबार" },
    sector: {
      manufacturing: "सामान बनाना या प्रसंस्करण",
      services: "सेवाएँ",
      trading: "व्यापार या खुदरा बिक्री",
      agri_allied: "खेती से जुड़े काम (डेयरी, मत्स्य, मुर्गीपालन आदि)",
    },
    enterpriseForm: {
      individual: "व्यक्तिगत",
      proprietorship: "एकल स्वामित्व",
      partnership: "साझेदारी फ़र्म",
      company: "कंपनी",
      shg: "स्वयं सहायता समूह (SHG)",
      cooperative: "सहकारी समिति",
      trust: "ट्रस्ट",
    },
  },
  education: { none: "कोई औपचारिक स्कूली शिक्षा नहीं", classN: "कक्षा {n}", graduate: "स्नातक या उससे ऊपर" },
  status: {
    appears_relevant: "मानदंड मेल खाते दिखते हैं",
    needs_more_information: "और जानकारी चाहिए",
    not_matched: "मानदंड मेल खाते नहीं दिखते",
  },
  results: {
    heading: "हमें क्या मिला",
    loading: "योजनाएँ जाँची जा रही हैं",
    countOne: "आपके उत्तरों के आधार पर 1 योजना जाँची गई।",
    countMany: "आपके उत्तरों के आधार पर {n} योजनाएँ जाँची गईं।",
    found:
      "जाँच पूरी हुई। {relevant} योजनाओं के प्रकाशित मानदंड मेल खाते दिखते हैं। {more} के लिए और जानकारी चाहिए। {not} के मानदंड मेल खाते नहीं दिखते।",
    openGroup: "ध्यान से देखने लायक योजनाएँ",
    openGroupSub: "जहाँ प्रकाशित मानदंड मेल खाते दिखते हैं, या जहाँ हमें थोड़ी और जानकारी चाहिए।",
    notMatchedGroup: "वे योजनाएँ जिनके प्रकाशित मानदंड मेल खाते नहीं दिखते",
    notMatchedHint:
      "किसी योजना को खोलकर देखें कि कौन-सा मानदंड पूरा नहीं हुआ। कोई उत्तर गलत था तो ऊपर सुधारकर फिर जाँचें।",
    noneOpen:
      "अब तक के आपके उत्तरों से किसी योजना के प्रकाशित मानदंड मेल खाते नहीं दिखते। कारण समझने के लिए नीचे की सूची देखें, या कोई उत्तर बदलकर फिर जाँचें।",
    missingTop: "इनके उत्तर देने से हम और योजनाएँ जाँच पाएँगे",
    saved: "आपके खाते में सहेजा गया",
    notSaved: "यह नतीजा आपके खाते में सहेजा नहीं जा सका।",
    retry: "फिर कोशिश करें",
    empty: {
      title: "दिखाने के लिए कोई योजना नहीं",
      body: "इन उत्तरों के लिए योजना निर्देशिका से कोई योजना नहीं मिली। कोई उत्तर बदलकर या जोड़कर देखें, या सरकारी पोर्टल सीधे देखें।",
    },
    unavailable: {
      title: "योजना निर्देशिका अभी उपलब्ध नहीं है",
      body: "पाथवे का बाकी हिस्सा सामान्य रूप से चलता रहेगा। कृपया थोड़ी देर बाद फिर कोशिश करें।",
    },
    rateLimited: "थोड़े समय में बहुत ज़्यादा जाँचें हो गईं। कृपया एक मिनट बाद फिर कोशिश करें।",
    error: "हम जाँच पूरी नहीं कर पाए। कृपया फिर कोशिश करें।",
    network: "सेवा तक पहुँच नहीं हो पाई। अपना कनेक्शन देखें और फिर कोशिश करें।",
  },
  card: {
    agency: "कार्यान्वयन एजेंसी",
    type: "योजना का प्रकार",
    types: {
      loan: "ऋण योजना",
      credit_guarantee: "ऋण जोखिम कवर",
      credit_linked_subsidy: "ऋण से जुड़ी सब्सिडी",
      composite: "मिली-जुली योजना",
    },
    benefits: "प्रकाशित लाभ",
    loanRange: "ऋण सीमा",
    loanFrom: "{min} से",
    loanUpTo: "{max} तक",
    loanBetween: "{min} से {max}",
    confirmed: "पुष्ट प्रकाशित मानदंड: {m} में से {n}",
    confirmedNone: "कोई अनिवार्य मानदंड सूचीबद्ध नहीं है",
    matchScore: "मानदंड मिलान: 100 में से {n}",
    matchCaption: "यह दिखाता है कि आपके उत्तर प्रकाशित मानदंडों के कितने हिस्से की पुष्टि करते हैं। यह नहीं बताता कि आवेदन सफल होगा या नहीं।",
    englishNote: "योजना का विवरण अंग्रेज़ी में, जैसा प्रकाशित है वैसा दिखाया गया है।",
    criteriaHeading: "हर प्रकाशित मानदंड की जाँच कैसे हुई",
    requiredHeading: "योजना की अनिवार्य शर्तें",
    preferredHeading: "प्राथमिकता (शर्त नहीं)",
    preferredNote: "योजना इन्हें प्राथमिकता दे सकती है, पर ये शर्तें नहीं हैं और इनके न होने पर कोई बाहर नहीं होता।",
    outcome: { pass: "पूरा", fail: "पूरा नहीं", unknown: "जानकारी नहीं" },
    yourAnswer: "आपका उत्तर: {value}",
    noAnswer: "उत्तर नहीं दिया",
    source: "स्रोत: {ref}",
    missingHeading: "आगे जाँचने के लिए यह बताइए",
    missingIntro: "इन उत्तरों से इस योजना का नतीजा बदल सकता है।",
    goTo: "प्रश्न पर जाएँ: {field}",
    noQuestion: "यहाँ नहीं पूछा गया",
    officialSource: "आधिकारिक स्रोत",
    otherSources: "अन्य स्रोत",
    apply: "आधिकारिक पोर्टल पर आवेदन करें या और जानें",
    howToApply: "आवेदन कैसे करें",
    lastChecked: "आधिकारिक स्रोत से अंतिम बार {date} को मिलान किया गया",
    unverified: "आधिकारिक स्रोत से अभी तक सत्यापित नहीं। विवरण की पुष्टि आधिकारिक साइट पर करें।",
    newTab: "नए टैब में खुलता है",
  },
  disclaimer: {
    title: "कृपया यह पढ़ें",
    information: "यह सामान्य जानकारी है, सलाह या निर्णय नहीं।",
    match:
      "मेल का मतलब केवल यह है कि किसी योजना के प्रकाशित मानदंड आपके दिए उत्तरों के हिसाब से प्रासंगिक दिखते हैं। यह मंज़ूरी, ऑफ़र या उसका वादा नहीं है।",
    decides: "निर्णय बैंक या कार्यान्वयन एजेंसी अपनी जाँच के आधार पर लेती है।",
    changes: "योजनाओं का विवरण बदलता रहता है। आवेदन से पहले हमेशा आधिकारिक स्रोत पर मौजूदा नियम जाँच लें।",
    affiliation: "पाथवे का इन योजनाओं या सरकार से कोई संबंध नहीं है।",
  },
};

const mr: SchemeStrings = {
  kicker: "इतर मार्ग",
  title: "सरकार-समर्थित पर्यायी मार्ग",
  sub: "काही सरकार-समर्थित योजना कोणासाठी आहेत हे प्रसिद्ध करतात. काही गोष्टी सांगा; प्रसिद्ध निकषांपैकी कोणते जुळताना दिसतात आणि कोणत्याबद्दल आम्हाला अजून माहिती हवी आहे ते आम्ही दाखवू.",
  independent:
    "ही तपासणी तुमच्या पाथवे स्कोअरपासून वेगळी आहे. यात फक्त खालील तुमची उत्तरे आणि तुमचे मासिक उत्पन्न वापरले जाते; पाथवे स्कोअर किंवा इतर कोणताही क्रेडिट निकाल वापरला जात नाही.",
  form: {
    heading: "काही प्रश्न",
    intro:
      "प्रत्येक प्रश्न ऐच्छिक आहे. खात्री नसल्यास सोडून द्या: उत्तर न दिलेला प्रश्न “माहीत नाही” असा धरला जातो, कधीही “नाही” असा नाही.",
    optional: "ऐच्छिक",
    notAnswered: "उत्तर दिलेले नाही",
    yes: "होय",
    no: "नाही",
    notSure: "खात्री नाही",
    moreDetails: "अधिक तपशील (ऐच्छिक)",
    moreDetailsHint: "जेवढी जास्त उत्तरे, तेवढे जास्त प्रसिद्ध निकष आम्ही प्रत्येक योजनेत तपासू शकतो.",
    sensitive:
      "लिंग आणि सामाजिक प्रवर्ग का विचारतो: काही योजना विशिष्ट गटांसाठी राखीव असतात. दोन्ही ऐच्छिक आहेत, फक्त याच तपासणीसाठी वापरले जातात आणि तुम्ही ते रिकामे सोडू शकता.",
    check: "योजना तपासा",
    checking: "योजना तपासत आहोत…",
    rangeError: "{min} ते {max} यादरम्यानची संख्या लिहा.",
    changed: "मागील तपासणीनंतर तुम्ही उत्तरे बदलली आहेत. निकाल अद्ययावत करण्यासाठी पुन्हा तपासा.",
    save: "हा निकाल माझ्या खात्यात जतन करा",
    saveHint: "ऐच्छिक. हा निकाल तुमच्या खात्याच्या इतिहासात ठेवला जाईल. टिक केल्याशिवाय काहीही जतन होत नाही.",
  },
  fields: {
    businessStage: { label: "पैसे कशासाठी हवेत?", hint: "नवीन व्यवसाय, किंवा आधीच सुरू असलेला व्यवसाय." },
    sector: { label: "कामाचा प्रकार", hint: "व्यवसायाची मुख्य क्रिया." },
    loanAmount: { label: "तुम्हाला किती कर्ज हवे आहे (₹)", hint: "अंदाजे रक्कम चालेल." },
    projectCost: { label: "प्रकल्पाचा किंवा युनिटचा एकूण खर्च (₹)", hint: "व्यवसायाला लागणारे सर्व काही, तुमच्या स्वतःच्या पैशांसह." },
    annualIncome: { label: "वार्षिक उत्पन्न (₹)", hint: "वर दिलेल्या मासिक उत्पन्नावरून काढले जाते." },
    age: { label: "तुमचे वय (वर्षे)", hint: "पूर्ण झालेली वर्षे." },
    gender: { label: "लिंग", hint: "काही योजना विशिष्ट गटांसाठी राखीव असतात." },
    socialCategory: { label: "सामाजिक प्रवर्ग", hint: "काही योजना विशिष्ट गटांसाठी राखीव असतात." },
    areaType: { label: "व्यवसाय कुठे असेल?", hint: "युनिट जिथे चालेल ती जागा." },
    enterpriseForm: { label: "व्यवसाय कोणत्या स्वरूपात आहे?", hint: "व्यवसायाचे किंवा गटाचे कायदेशीर स्वरूप." },
    educationClass: { label: "उत्तीर्ण केलेली सर्वोच्च इयत्ता", hint: "महाविद्यालयीन पदवी असल्यास “पदवीधर किंवा त्याहून अधिक” निवडा." },
    isTraditionalArtisan: {
      label: "तुम्ही पारंपरिक कौटुंबिक व्यवसायात हाताने आणि अवजारांनी काम करता का?",
      hint: "उदा. सुतारकाम, कुंभारकाम, विणकाम किंवा लोहारकाम.",
    },
    hasAvailedGovtSubsidy: {
      label: "तुम्ही दुसऱ्या एखाद्या योजनेअंतर्गत एखाद्या युनिटसाठी सरकारी अनुदान आधीच घेतले आहे का?",
      hint: "काही योजना एखाद्या व्यक्तीला एकदाच मदत करतात.",
    },
    hasSimilarSchemeLoan: {
      label: "गेल्या पाच वर्षांत तुम्ही अशाच एखाद्या सरकारी कर्ज योजनेअंतर्गत कर्ज घेतले आहे का?",
      hint: "काही योजना अशा कर्जांमध्ये ठरावीक अंतर मागतात.",
    },
    isGovernmentEmployee: {
      label: "तुम्ही किंवा तुमच्या कुटुंबातील कोणी सरकारी सेवेत आहे का?",
      hint: "काही योजनांमध्ये सरकारी कर्मचारी आणि त्यांची कुटुंबे धरली जात नाहीत.",
    },
    hasLoanDefault: {
      label: "कोणत्याही बँकेचे किंवा वित्तीय संस्थेचे तुमचे कर्ज थकबाकीत (डिफॉल्टमध्ये) आहे का?",
      hint: "म्हणजे बऱ्याच काळापासून थकलेले आणि न फेडलेले कर्ज.",
    },
  },
  options: {
    gender: { female: "महिला", male: "पुरुष", other: "इतर" },
    socialCategory: {
      general: "सर्वसाधारण",
      obc: "इतर मागास वर्ग (OBC)",
      sc: "अनुसूचित जाती (SC)",
      st: "अनुसूचित जमाती (ST)",
      minority: "अल्पसंख्याक समुदाय",
    },
    areaType: { rural: "ग्रामीण भाग (गाव)", urban: "शहरी भाग (शहर किंवा नगर)" },
    businessStage: { new: "नवीन व्यवसाय किंवा युनिट", existing: "आधीच सुरू असलेला व्यवसाय" },
    sector: {
      manufacturing: "वस्तू बनवणे किंवा त्यांच्यावर प्रक्रिया करणे",
      services: "सेवा",
      trading: "व्यापार किंवा किरकोळ विक्री",
      agri_allied: "शेतीशी संबंधित कामे (दुग्धव्यवसाय, मत्स्यव्यवसाय, कुक्कुटपालन इ.)",
    },
    enterpriseForm: {
      individual: "वैयक्तिक",
      proprietorship: "एकल मालकी",
      partnership: "भागीदारी संस्था",
      company: "कंपनी",
      shg: "स्वयं-सहायता गट (SHG)",
      cooperative: "सहकारी संस्था",
      trust: "ट्रस्ट",
    },
  },
  education: { none: "औपचारिक शालेय शिक्षण नाही", classN: "इयत्ता {n}", graduate: "पदवीधर किंवा त्याहून अधिक" },
  status: {
    appears_relevant: "निकष जुळताना दिसतात",
    needs_more_information: "अधिक माहिती हवी",
    not_matched: "निकष जुळताना दिसत नाहीत",
  },
  results: {
    heading: "आम्हाला काय आढळले",
    loading: "योजना तपासत आहोत",
    countOne: "तुमच्या उत्तरांनुसार 1 योजना तपासली.",
    countMany: "तुमच्या उत्तरांनुसार {n} योजना तपासल्या.",
    found:
      "तपासणी पूर्ण झाली. {relevant} योजनांचे प्रसिद्ध निकष जुळताना दिसतात. {more} साठी अधिक माहिती हवी. {not} चे निकष जुळताना दिसत नाहीत.",
    openGroup: "जवळून पाहण्यासारख्या योजना",
    openGroupSub: "जिथे प्रसिद्ध निकष जुळताना दिसतात, किंवा जिथे आम्हाला थोडी अधिक माहिती हवी आहे.",
    notMatchedGroup: "ज्या योजनांचे प्रसिद्ध निकष जुळताना दिसत नाहीत",
    notMatchedHint:
      "एखादी योजना उघडून कोणता निकष पूर्ण झाला नाही ते पाहा. एखादे उत्तर चुकले असल्यास वर दुरुस्त करून पुन्हा तपासा.",
    noneOpen:
      "आतापर्यंतच्या तुमच्या उत्तरांनुसार कोणत्याही योजनेचे प्रसिद्ध निकष जुळताना दिसत नाहीत. कारण समजण्यासाठी खालील यादी पाहा, किंवा एखादे उत्तर बदलून पुन्हा तपासा.",
    missingTop: "यांची उत्तरे दिल्यास आम्ही आणखी योजना तपासू शकू",
    saved: "तुमच्या खात्यात जतन केले",
    notSaved: "हा निकाल तुमच्या खात्यात जतन करता आला नाही.",
    retry: "पुन्हा प्रयत्न करा",
    empty: {
      title: "दाखवण्यासाठी कोणतीही योजना नाही",
      body: "या उत्तरांसाठी योजना निर्देशिकेतून कोणतीही योजना मिळाली नाही. एखादे उत्तर बदलून किंवा जोडून पाहा, किंवा सरकारी पोर्टल थेट पाहा.",
    },
    unavailable: {
      title: "योजना निर्देशिका सध्या उपलब्ध नाही",
      body: "पाथवेचा उर्वरित भाग नेहमीप्रमाणे चालेल. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.",
    },
    rateLimited: "थोड्या वेळात खूप तपासण्या झाल्या. कृपया एका मिनिटाने पुन्हा प्रयत्न करा.",
    error: "आम्ही तपासणी पूर्ण करू शकलो नाही. कृपया पुन्हा प्रयत्न करा.",
    network: "सेवेपर्यंत पोहोचता आले नाही. तुमचे कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.",
  },
  card: {
    agency: "अंमलबजावणी संस्था",
    type: "योजनेचा प्रकार",
    types: {
      loan: "कर्ज योजना",
      credit_guarantee: "कर्ज जोखीम संरक्षण",
      credit_linked_subsidy: "कर्जाशी जोडलेले अनुदान",
      composite: "संमिश्र योजना",
    },
    benefits: "प्रसिद्ध केलेले लाभ",
    loanRange: "कर्जाची मर्यादा",
    loanFrom: "{min} पासून",
    loanUpTo: "{max} पर्यंत",
    loanBetween: "{min} ते {max}",
    confirmed: "पुष्ट झालेले प्रसिद्ध निकष: {m} पैकी {n}",
    confirmedNone: "कोणताही आवश्यक निकष नमूद केलेला नाही",
    matchScore: "निकष जुळणी: 100 पैकी {n}",
    matchCaption: "तुमची उत्तरे प्रसिद्ध निकषांपैकी किती भागाची पुष्टी करतात ते हे दर्शवते. अर्ज यशस्वी होईल की नाही याचा हा अंदाज नाही.",
    englishNote: "योजनेचा तपशील प्रसिद्ध केल्याप्रमाणे इंग्रजीत दाखवला आहे.",
    criteriaHeading: "प्रत्येक प्रसिद्ध निकष कसा तपासला",
    requiredHeading: "योजनेच्या आवश्यक अटी",
    preferredHeading: "प्राधान्य (अट नाही)",
    preferredNote: "योजना यांना प्राधान्य देऊ शकते, पण त्या अटी नाहीत आणि त्या नसल्यास कोणीही बाद होत नाही.",
    outcome: { pass: "पूर्ण", fail: "पूर्ण नाही", unknown: "माहीत नाही" },
    yourAnswer: "तुमचे उत्तर: {value}",
    noAnswer: "उत्तर दिलेले नाही",
    source: "स्रोत: {ref}",
    missingHeading: "पुढे तपासण्यासाठी हे सांगा",
    missingIntro: "या उत्तरांमुळे या योजनेचा निकाल बदलू शकतो.",
    goTo: "प्रश्नाकडे जा: {field}",
    noQuestion: "येथे विचारलेले नाही",
    officialSource: "अधिकृत स्रोत",
    otherSources: "इतर स्रोत",
    apply: "अधिकृत पोर्टलवर अर्ज करा किंवा अधिक जाणून घ्या",
    howToApply: "अर्ज कसा करावा",
    lastChecked: "अधिकृत स्रोताशी शेवटची पडताळणी {date} रोजी केली",
    unverified: "अधिकृत स्रोताशी अद्याप पडताळणी झालेली नाही. तपशिलांची खात्री अधिकृत संकेतस्थळावर करा.",
    newTab: "नवीन टॅबमध्ये उघडते",
  },
  disclaimer: {
    title: "कृपया हे वाचा",
    information: "ही सर्वसाधारण माहिती आहे, सल्ला किंवा निर्णय नाही.",
    match:
      "जुळणी म्हणजे फक्त एवढेच की योजनेचे प्रसिद्ध निकष तुम्ही दिलेल्या उत्तरांनुसार संबंधित दिसतात. ही मंजुरी, ऑफर किंवा त्याचे आश्वासन नाही.",
    decides: "निर्णय बँक किंवा अंमलबजावणी संस्था स्वतःच्या तपासणीनुसार घेते.",
    changes: "योजनांचे तपशील बदलत राहतात. अर्ज करण्यापूर्वी नेहमी अधिकृत स्रोतावर सध्याचे नियम तपासा.",
    affiliation: "पाथवेचा या योजनांशी किंवा सरकारशी कोणताही संबंध नाही.",
  },
};

export const SCHEME_STRINGS: Record<Lang, SchemeStrings> = { en, hi, mr };

export const schemeStrings = (lang: Lang): SchemeStrings => SCHEME_STRINGS[lang];

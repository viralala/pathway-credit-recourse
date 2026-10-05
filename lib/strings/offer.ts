import { tf, type Lang } from "../i18n";
import { formatMoney, formatRate, type Currency, type RedFlag } from "../offer";

/**
 * Every user-facing string of the Offer check, in English, Hindi and Marathi.
 * The English object defines the shape; the other languages must match it key for key.
 * URLs, "1930" and domain names stay untranslated.
 */
const en = {
  crumb: "Offer check",
  home: "Home",
  eyebrow: "Offer check",
  title: "Is that instant loan a trap?",
  intro:
    "Many instant-loan apps hide the real cost behind fees taken upfront and very short repayment times. Enter an offer to see what it truly costs per year, the red flags, and how it compares with a fair rate.",
  privacy: "Runs in your browser. Nothing you type is stored or sent.",

  examplesTitle: "Try an example",
  examplesNote: "Fictional offers, not real lenders.",
  examples: {
    app7: "Example: 7-day app loan",
    weekly: "Example: weekly instalments",
    bank: "Example: fair bank-style loan",
  },
  showingExample: "Showing “{name}”. Change any number to check your own offer.",
  reset: "Clear the form",

  formTitle: "The offer",
  formSub: "Copy the numbers from the loan screen or agreement.",
  currency: "Currency",
  currencies: { INR: "Indian rupee (₹)" },
  sanctioned: "Amount sanctioned",
  sanctionedHint: "The loan amount written on the offer.",
  processingFee: "Processing fee",
  processingFeeHint: "Taken out before the money reaches you.",
  otherCharges: "Other upfront charges",
  otherChargesHint: "Platform, verification or insurance fees taken upfront.",
  gstPct: "Tax on fees (%)",
  gstHint: "In India, GST (usually 18%) is charged on processing fees.",
  optional: "optional",
  repayment: "How do you repay?",
  bullet: "One payment at the end",
  bulletDesc: "Repay everything on one date.",
  instalments: "Equal instalments",
  instalmentsDesc: "Weekly, fortnightly or monthly payments.",
  bulletAmount: "Amount to repay",
  bulletDays: "Due after (days)",
  count: "Number of instalments",
  instalment: "Each instalment",
  everyDays: "How often",
  frequencies: { 7: "Every week (7 days)", 14: "Every 2 weeks (14 days)", 30: "Every month (30 days)" },
  errors: {
    required: "Enter a number.",
    positive: "Must be more than 0.",
    nonNegative: "Can't be negative.",
    integer: "Use a whole number.",
    tooLarge: "That is too large to check.",
    percent: "Enter a percentage from 0 to 100.",
    feesTooHigh: "The deductions are as large as the loan itself: nothing would reach you.",
  },
  incomplete: "Fill in the offer to see its true cost.",
  incompleteList: "Still needed:",

  resultsTitle: "The true cost",
  trueApr: "True APR",
  trueAprHint: "Yearly rate including every fee, worked out on the money you actually receive.",
  verdictLabel: "Cost verdict",
  verdicts: { fair: "Looks fair", expensive: "Expensive", predatory: "Predatory-level cost" },
  verdictBody: {
    fair: "Within the 36% a year line we use as a rough guide. Still compare offers and read the Key Fact Statement.",
    expensive: "Above 36% a year: this is costly credit. Compare it with other options before you accept.",
    predatory: "Above 100% a year: at this rate, a year of borrowing would cost more than the money you received. Look at other options first.",
  },
  story: "You get {received} and pay back {repaid} over {period}. That is {cost} for the use of the money: a true APR of {apr}.",
  storyFree: "You get {received} and pay back {repaid} over {period}. That is no more than you receive, so this offer has no cost.",
  periodN: "{n} days",
  period1: "1 day",
  daysN: "{n} days",
  day1: "1 day",
  stats: {
    received: "You receive",
    repaid: "You repay in total",
    cost: "Total cost of credit",
    costShare: "Cost as % of what you receive",
    feeShare: "Upfront deductions",
    tenure: "Time to repay",
    ear: "Effective annual rate (compounded)",
  },
  feeShareValue: "{amount} ({share} of sanction)",

  barTitle: "What you get vs what you pay",
  barGet: "You get",
  barPay: "You pay",
  barReceived: "Money you received",
  barFees: "Fees you never received",
  barInterest: "Interest and charges",
  barAria:
    "You get {received}. You pay {repaid}: {principal} gives back the money you received, {fees} covers fees you never received and {interest} is interest and charges.",

  flagsTitle: "Red flags",
  flagsNone: "No red flags in the numbers you entered. Still go through the app checks too.",
  flagsPending: "Flags from the numbers appear once the offer is filled in.",
  flagCount: "{label}: {n}",
  severity: { danger: "Serious", warning: "Warning", info: "Note" },
  flags: {
    apr: { title: "True APR above {threshold}", body: "Counting the fees and the repayment time, this costs {value} a year." },
    deductions: {
      title: "Large upfront deductions",
      body: "{value} of the sanctioned amount is taken before you get the money (guide line: {threshold}).",
    },
    "short-tenure": {
      title: "Very little time to repay",
      body: "Repayment is due within {value} days. Short terms often push people to borrow again just to repay.",
    },
    "received-differs": {
      title: "You receive less than the sanctioned amount",
      body: "{value} is taken out upfront, but you repay as if you had received the full amount.",
    },
    "frequent-instalments": {
      title: "Instalments more often than monthly",
      body: "Paying every {value} days makes the loan cost more than the per-instalment figure suggests, with less time between payments.",
    },
    permissions: {
      title: "Asked for contacts, photos or call logs",
      body: "Lending apps should not access these. Such access is often misused to harass borrowers and their contacts.",
    },
    noKfs: {
      title: "No Key Fact Statement before signing",
      body: "Regulated lenders must show you a Key Fact Statement, with the all-in APR, before you sign.",
    },
    thirdParty: {
      title: "Money goes through someone else's account",
      body: "Loan money should move only between your bank account and the lender's account.",
    },
    pressure: {
      title: "Pressure, threats or harassment",
      body: "A genuine lender does not rush or threaten you. You can report this (see “What you can do”).",
    },
    unverified: {
      title: "Lender not verified",
      body: "Check that the lender is a bank or an RBI-registered NBFC before you borrow.",
    },
  },

  checklistTitle: "Check the app too",
  checklistSub: "Turn on anything that happened. Each one adds a red flag.",
  checklist: {
    permissions: "The app asked for access to my contacts, photos or call logs",
    noKfs: "I was not shown a Key Fact Statement (KFS) before signing",
    thirdParty: "The money would be paid to, or collected through, an account that is not mine or the lender's",
    pressure: "I was pressured to accept immediately, or threatened or harassed",
    unverified: "I could not verify that the lender is regulated (a bank or an RBI-registered NBFC)",
  },

  compareTitle: "Compared with a fair rate",
  compareLess: "At a Pathway “fair” tier rate this would cost {amount} less.",
  compareNotLess: "This offer already costs no more than a Pathway “fair” tier rate.",
  compareBody: "Same {received} received, same payment dates, priced at Pathway's illustrative rates.",
  thisOffer: "This offer",
  tierRow: "“{tier}” tier · {apr} APR",
  tierNames: { fair: "Fair", excellent: "Excellent" },
  costLabel: "Cost {cost}",
  less: "{amount} less",
  more: "{amount} more",
  same: "about the same",
  compareNote:
    "Pathway's tiers are illustrative rates for applicants who clear the approval line. They are not an offer of credit.",
  compareCta: "See your path to a fair-rate loan",

  doTitle: "What you can do",
  doSub: "General information for borrowers in India.",
  do: {
    kfs: {
      title: "Ask for the Key Fact Statement",
      body: "RBI's rules require regulated lenders to give you a Key Fact Statement (KFS) before you sign, showing the all-inclusive APR, every fee and the repayment schedule. Charges not in the KFS cannot be added later without your explicit consent.",
    },
    regulated: {
      title: "Check the lender is regulated",
      body: "The lender should be a bank or an RBI-registered NBFC. RBI publishes lists of regulated entities on its website, and a lending app should clearly name the regulated lender behind the loan.",
    },
    permissions: {
      title: "Never share contacts or photos",
      body: "Under RBI's digital lending rules, lending apps should not access your contacts, files, photos or call logs. One-time access to the camera, microphone or location is allowed only for KYC, with your consent.",
    },
    account: {
      title: "Money only to and from your account",
      body: "Loan money and repayments should move only between your bank account and the lender's account, not through an agent's or another person's account.",
    },
    coolingOff: {
      title: "Use the cooling-off period",
      body: "Digital loans come with a cooling-off (look-up) period in which you can exit by repaying the principal and the proportionate APR, without a penalty.",
    },
    sachet: {
      title: "Report unauthorised lending apps",
      body: "Report unauthorised lending apps or entities on RBI's Sachet portal.",
    },
    cyber: {
      title: "Threats, harassment or fraud",
      body: "Call the national cyber crime helpline 1930 or report at cybercrime.gov.in. You can also go to your nearest police station.",
    },
    ombudsman: {
      title: "Complaint about a regulated lender",
      body: "Complain to the lender first. If it is not resolved within 30 days, or you are unhappy with the reply, you can complain to the RBI Ombudsman at cms.rbi.org.in.",
    },
  },
  notLegal: "This is general information, not legal or financial advice. Rules change: check the latest on rbi.org.in.",
  newTab: "(opens in a new tab)",

  howTitle: "How we calculate",
  how: {
    flows:
      "Cash flows. On day 0 you receive R = amount sanctioned − fees − tax on fees. On day tᵢ you pay Pᵢ: one payment, or equal instalments every 7, 14 or 30 days.",
    rate: "Daily rate. We find the daily rate r at which your payments, discounted back to day 0, equal what you received. We solve it by bisection, which always converges for a loan like this.",
    apr: "True APR = r × 365. This nominal annual rate is the simple annualisation used for APR figures in Key Fact Statements.",
    ear: "Effective annual rate = (1 + r)^365 − 1: what the cost compounds to if you kept borrowing at this rate for a whole year.",
    dayCount:
      "Day count. A monthly instalment is counted as 30 days, so a loan priced at exactly 1% a month shows as about 12.1% APR.",
    cost: "Total cost of credit = everything you repay − what you received. Upfront deductions count as cost, because you repay money you never received.",
    compare:
      "Comparison. The same amount received, repaid on the same dates in the same proportions, priced at Pathway's illustrative tier rates ({fair} “fair”, {excellent} “excellent”).",
    thresholdsTitle: "Red-flag lines (illustrative rules of thumb, not legal limits)",
    thresholds: {
      apr: "True APR: warning above {w}, serious above {d}.",
      deductions: "Upfront deductions: warning above {w} of the sanctioned amount, serious above {d}.",
      tenure: "Repayment due in under {n} days: warning.",
      frequency: "Instalments more often than every {n} days: note.",
      received: "Any gap between the amount sanctioned and the amount received: note.",
    },
    privacy: "Everything is calculated in your browser. Nothing you enter is stored or sent anywhere.",
  },

  disclaimer:
    "An illustrative simulation for education. Not financial or legal advice, not a credit decision, and not affiliated with any lender.",
  liveSummary: "True APR {apr}. {verdict}. Red flags: {n}.",
};

export type OfferStrings = typeof en;

const hi: OfferStrings = {
  crumb: "ऑफ़र जाँच",
  home: "होम",
  eyebrow: "ऑफ़र जाँच",
  title: "क्या वह इंस्टेंट लोन एक जाल है?",
  intro:
    "कई इंस्टेंट-लोन ऐप असली लागत को पहले से काटी गई फ़ीस और चुकाने के बहुत कम समय के पीछे छिपा देते हैं। कोई ऑफ़र दर्ज करें और देखें कि सालाना उसकी असली लागत कितनी है, ख़तरे के कौन-से संकेत हैं, और उचित दर की तुलना में वह कैसा है।",
  privacy: "यह आपके ब्राउज़र में ही चलता है। आप जो भी लिखते हैं, वह न सहेजा जाता है, न कहीं भेजा जाता है।",

  examplesTitle: "कोई उदाहरण आज़माएँ",
  examplesNote: "काल्पनिक ऑफ़र, असली ऋणदाता नहीं।",
  examples: {
    app7: "उदाहरण: 7 दिन का ऐप लोन",
    weekly: "उदाहरण: साप्ताहिक किस्तें",
    bank: "उदाहरण: बैंक जैसा उचित लोन",
  },
  showingExample: "“{name}” दिखाया जा रहा है। अपना ऑफ़र जाँचने के लिए कोई भी संख्या बदलें।",
  reset: "फ़ॉर्म खाली करें",

  formTitle: "ऑफ़र",
  formSub: "लोन स्क्रीन या अनुबंध से संख्याएँ यहाँ लिखें।",
  currency: "मुद्रा",
  currencies: { INR: "भारतीय रुपया (₹)" },
  sanctioned: "स्वीकृत राशि",
  sanctionedHint: "ऑफ़र पर लिखी लोन राशि।",
  processingFee: "प्रोसेसिंग फ़ीस",
  processingFeeHint: "पैसा आप तक पहुँचने से पहले ही काट ली जाती है।",
  otherCharges: "अन्य अग्रिम शुल्क",
  otherChargesHint: "प्लेटफ़ॉर्म, सत्यापन या बीमा के नाम पर पहले ही काटे गए शुल्क।",
  gstPct: "फ़ीस पर कर (%)",
  gstHint: "भारत में प्रोसेसिंग फ़ीस पर GST (आमतौर पर 18%) लगता है।",
  optional: "वैकल्पिक",
  repayment: "आप कैसे चुकाएँगे?",
  bullet: "अंत में एक ही भुगतान",
  bulletDesc: "पूरी राशि एक ही तारीख़ को चुकाएँ।",
  instalments: "बराबर किस्तें",
  instalmentsDesc: "साप्ताहिक, पाक्षिक या मासिक भुगतान।",
  bulletAmount: "चुकाने की राशि",
  bulletDays: "कितने दिन बाद देय",
  count: "किस्तों की संख्या",
  instalment: "हर किस्त",
  everyDays: "कितनी बार",
  frequencies: { 7: "हर हफ़्ते (7 दिन)", 14: "हर 2 हफ़्ते (14 दिन)", 30: "हर महीने (30 दिन)" },
  errors: {
    required: "कोई संख्या लिखें।",
    positive: "0 से अधिक होनी चाहिए।",
    nonNegative: "ऋणात्मक नहीं हो सकती।",
    integer: "पूर्ण संख्या लिखें।",
    tooLarge: "यह जाँचने के लिए बहुत बड़ी है।",
    percent: "0 से 100 के बीच प्रतिशत लिखें।",
    feesTooHigh: "कटौतियाँ लोन जितनी ही बड़ी हैं: आप तक कुछ भी नहीं पहुँचेगा।",
  },
  incomplete: "असली लागत देखने के लिए ऑफ़र का विवरण भरें।",
  incompleteList: "अभी ये भरना बाक़ी है:",

  resultsTitle: "असली लागत",
  trueApr: "असली APR",
  trueAprHint: "हर फ़ीस सहित सालाना दर, उस पैसे पर जो वास्तव में आपको मिलता है।",
  verdictLabel: "लागत का आकलन",
  verdicts: { fair: "उचित लगता है", expensive: "महँगा", predatory: "शोषणकारी स्तर की लागत" },
  verdictBody: {
    fair: "यह 36% सालाना की उस रेखा के भीतर है जिसे हम मोटे मार्गदर्शन के रूप में लेते हैं। फिर भी ऑफ़रों की तुलना करें और मुख्य तथ्य विवरण (KFS) पढ़ें।",
    expensive: "यह 36% सालाना से ऊपर है: यह महँगा कर्ज़ है। स्वीकार करने से पहले दूसरे विकल्पों से तुलना करें।",
    predatory: "यह 100% सालाना से ऊपर है: इस दर पर एक साल का उधार मिले हुए पैसे से भी ज़्यादा महँगा पड़ेगा। पहले दूसरे विकल्प देखें।",
  },
  story: "आपको {received} मिलते हैं और आप {period} में {repaid} चुकाते हैं। यानी पैसे के उपयोग के लिए {cost}: {apr} की असली APR।",
  storyFree: "आपको {received} मिलते हैं और आप {period} में {repaid} चुकाते हैं। यह मिली राशि से ज़्यादा नहीं है, इसलिए इस ऑफ़र की कोई लागत नहीं है।",
  periodN: "{n} दिनों",
  period1: "1 दिन",
  daysN: "{n} दिन",
  day1: "1 दिन",
  stats: {
    received: "आपको मिलते हैं",
    repaid: "कुल चुकाना",
    cost: "कर्ज़ की कुल लागत",
    costShare: "मिली राशि पर लागत (%)",
    feeShare: "अग्रिम कटौतियाँ",
    tenure: "चुकाने का समय",
    ear: "प्रभावी सालाना दर (चक्रवृद्धि)",
  },
  feeShareValue: "{amount} (स्वीकृत राशि का {share})",

  barTitle: "आपको क्या मिलता है, आप क्या चुकाते हैं",
  barGet: "आपको मिलता है",
  barPay: "आप चुकाते हैं",
  barReceived: "आपको मिला पैसा",
  barFees: "वह फ़ीस जो आपको कभी मिली ही नहीं",
  barInterest: "ब्याज और शुल्क",
  barAria:
    "आपको {received} मिलते हैं। आप {repaid} चुकाते हैं: {principal} मिली राशि लौटाता है, {fees} उस फ़ीस का है जो आपको कभी नहीं मिली, और {interest} ब्याज और शुल्क है।",

  flagsTitle: "ख़तरे के संकेत",
  flagsNone: "आपकी दर्ज की गई संख्याओं में ख़तरे का कोई संकेत नहीं है। फिर भी ऐप की जाँचें ज़रूर करें।",
  flagsPending: "ऑफ़र पूरा भरने पर संख्याओं से जुड़े संकेत यहाँ दिखेंगे।",
  flagCount: "{label}: {n}",
  severity: { danger: "गंभीर", warning: "चेतावनी", info: "ध्यान दें" },
  flags: {
    apr: { title: "असली APR {threshold} से ऊपर", body: "फ़ीस और चुकाने के समय को जोड़ने पर इसकी लागत सालाना {value} है।" },
    deductions: {
      title: "बड़ी अग्रिम कटौतियाँ",
      body: "पैसा मिलने से पहले ही स्वीकृत राशि का {value} काट लिया जाता है (मार्गदर्शक रेखा: {threshold})।",
    },
    "short-tenure": {
      title: "चुकाने के लिए बहुत कम समय",
      body: "भुगतान {value} दिनों के भीतर देय है। कम अवधि अक्सर लोगों को चुकाने के लिए फिर से उधार लेने पर मजबूर करती है।",
    },
    "received-differs": {
      title: "स्वीकृत राशि से कम पैसा मिलता है",
      body: "{value} पहले ही काट लिया जाता है, लेकिन आप ऐसे चुकाते हैं मानो पूरी राशि मिली हो।",
    },
    "frequent-instalments": {
      title: "महीने से ज़्यादा बार किस्तें",
      body: "हर {value} दिन में भुगतान से लोन की लागत प्रति-किस्त आँकड़े से ज़्यादा होती है, और भुगतानों के बीच कम समय मिलता है।",
    },
    permissions: {
      title: "संपर्क, फ़ोटो या कॉल लॉग की अनुमति माँगी",
      body: "लोन ऐप को इन तक पहुँच नहीं लेनी चाहिए। ऐसी पहुँच का दुरुपयोग अक्सर उधार लेने वालों और उनके संपर्कों को परेशान करने के लिए होता है।",
    },
    noKfs: {
      title: "हस्ताक्षर से पहले मुख्य तथ्य विवरण नहीं",
      body: "विनियमित ऋणदाताओं को हस्ताक्षर से पहले कुल APR के साथ मुख्य तथ्य विवरण (KFS) दिखाना ज़रूरी है।",
    },
    thirdParty: {
      title: "पैसा किसी और के खाते से होकर जाता है",
      body: "लोन का पैसा केवल आपके बैंक खाते और ऋणदाता के खाते के बीच ही आना-जाना चाहिए।",
    },
    pressure: {
      title: "दबाव, धमकी या उत्पीड़न",
      body: "असली ऋणदाता आपको जल्दबाज़ी में नहीं डालता और न ही धमकाता है। आप इसकी शिकायत कर सकते हैं (“आप क्या कर सकते हैं” देखें)।",
    },
    unverified: {
      title: "ऋणदाता सत्यापित नहीं",
      body: "उधार लेने से पहले जाँचें कि ऋणदाता कोई बैंक या RBI में पंजीकृत NBFC है।",
    },
  },

  checklistTitle: "ऐप की भी जाँच करें",
  checklistSub: "जो भी हुआ हो, उसे चालू करें। हर एक से एक ख़तरे का संकेत जुड़ता है।",
  checklist: {
    permissions: "ऐप ने मेरे संपर्क, फ़ोटो या कॉल लॉग तक पहुँच माँगी",
    noKfs: "हस्ताक्षर से पहले मुझे मुख्य तथ्य विवरण (KFS) नहीं दिखाया गया",
    thirdParty: "पैसा ऐसे खाते में आएगा या ऐसे खाते से वसूला जाएगा जो न मेरा है, न ऋणदाता का",
    pressure: "मुझ पर तुरंत स्वीकार करने का दबाव डाला गया, या मुझे धमकाया या परेशान किया गया",
    unverified: "ऋणदाता विनियमित है या नहीं (बैंक या RBI में पंजीकृत NBFC), इसकी पुष्टि नहीं हो सकी",
  },

  compareTitle: "उचित दर से तुलना",
  compareLess: "पाथवे की “उचित” श्रेणी की दर पर इसकी लागत {amount} कम होती।",
  compareNotLess: "यह ऑफ़र पहले से ही पाथवे की “उचित” श्रेणी की दर से महँगा नहीं है।",
  compareBody: "उतने ही {received} मिलें, भुगतान की वही तारीख़ें हों, और दाम पाथवे की उदाहरणात्मक दरों पर हों।",
  thisOffer: "यह ऑफ़र",
  tierRow: "“{tier}” श्रेणी · {apr} APR",
  tierNames: { fair: "उचित", excellent: "उत्कृष्ट" },
  costLabel: "लागत {cost}",
  less: "{amount} कम",
  more: "{amount} ज़्यादा",
  same: "लगभग बराबर",
  compareNote: "पाथवे की श्रेणियाँ स्वीकृति रेखा पार करने वाले आवेदकों के लिए उदाहरणात्मक दरें हैं। ये ऋण का प्रस्ताव नहीं हैं।",
  compareCta: "उचित दर वाले लोन तक अपना रास्ता देखें",

  doTitle: "आप क्या कर सकते हैं",
  doSub: "भारत में उधार लेने वालों के लिए सामान्य जानकारी।",
  do: {
    kfs: {
      title: "मुख्य तथ्य विवरण (KFS) माँगें",
      body: "RBI के नियमों के अनुसार विनियमित ऋणदाताओं को हस्ताक्षर से पहले आपको मुख्य तथ्य विवरण (KFS) देना होता है, जिसमें सभी शुल्कों सहित APR, हर फ़ीस और भुगतान की समय-सारणी होती है। जो शुल्क KFS में नहीं है, वह बाद में आपकी स्पष्ट सहमति के बिना नहीं जोड़ा जा सकता।",
    },
    regulated: {
      title: "जाँचें कि ऋणदाता विनियमित है",
      body: "ऋणदाता कोई बैंक या RBI में पंजीकृत NBFC होना चाहिए। RBI अपनी वेबसाइट पर विनियमित संस्थाओं की सूचियाँ प्रकाशित करता है, और लोन ऐप को लोन देने वाले विनियमित ऋणदाता का नाम साफ़-साफ़ बताना चाहिए।",
    },
    permissions: {
      title: "संपर्क या फ़ोटो की अनुमति कभी न दें",
      body: "RBI के डिजिटल लेंडिंग नियमों के अनुसार लोन ऐप को आपके संपर्क, फ़ाइलें, फ़ोटो या कॉल लॉग नहीं देखने चाहिए। कैमरा, माइक्रोफ़ोन या लोकेशन की एक बार की अनुमति केवल KYC के लिए, आपकी सहमति से ली जा सकती है।",
    },
    account: {
      title: "पैसा केवल आपके खाते में और आपके खाते से",
      body: "लोन का पैसा और उसकी वापसी केवल आपके बैंक खाते और ऋणदाता के खाते के बीच होनी चाहिए, किसी एजेंट या दूसरे व्यक्ति के खाते से होकर नहीं।",
    },
    coolingOff: {
      title: "कूलिंग-ऑफ़ अवधि का उपयोग करें",
      body: "डिजिटल लोन में एक कूलिंग-ऑफ़ (लुक-अप) अवधि होती है, जिसमें आप मूलधन और आनुपातिक APR चुकाकर बिना किसी जुर्माने के लोन से बाहर निकल सकते हैं।",
    },
    sachet: {
      title: "अनधिकृत लोन ऐप की शिकायत करें",
      body: "अनधिकृत लोन ऐप या संस्थाओं की शिकायत RBI के सचेत (Sachet) पोर्टल पर करें।",
    },
    cyber: {
      title: "धमकी, उत्पीड़न या धोखाधड़ी",
      body: "राष्ट्रीय साइबर अपराध हेल्पलाइन 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत दर्ज करें। आप अपने नज़दीकी पुलिस स्टेशन भी जा सकते हैं।",
    },
    ombudsman: {
      title: "विनियमित ऋणदाता के बारे में शिकायत",
      body: "पहले ऋणदाता से शिकायत करें। अगर 30 दिनों में समाधान न हो, या आप जवाब से संतुष्ट न हों, तो cms.rbi.org.in पर RBI लोकपाल से शिकायत कर सकते हैं।",
    },
  },
  notLegal: "यह सामान्य जानकारी है, क़ानूनी या वित्तीय सलाह नहीं। नियम बदलते रहते हैं: नवीनतम जानकारी rbi.org.in पर देखें।",
  newTab: "(नए टैब में खुलता है)",

  howTitle: "हम कैसे गणना करते हैं",
  how: {
    flows:
      "नकद प्रवाह। दिन 0 पर आपको R = स्वीकृत राशि − फ़ीस − फ़ीस पर कर मिलता है। दिन tᵢ पर आप Pᵢ चुकाते हैं: एक ही भुगतान, या हर 7, 14 या 30 दिन पर बराबर किस्तें।",
    rate: "दैनिक दर। हम वह दैनिक दर r ढूँढते हैं जिस पर आपके भुगतानों का दिन 0 का मूल्य, आपको मिली राशि के बराबर हो। इसे हम द्विभाजन (bisection) विधि से हल करते हैं, जो ऐसे लोन के लिए हमेशा उत्तर तक पहुँचती है।",
    apr: "असली APR = r × 365। यह नाममात्र सालाना दर है, वही सरल वार्षिकीकरण जो मुख्य तथ्य विवरण (KFS) में APR के लिए इस्तेमाल होता है।",
    ear: "प्रभावी सालाना दर = (1 + r)^365 − 1: अगर आप पूरे साल इसी दर पर उधार लेते रहें, तो चक्रवृद्धि से लागत इतनी हो जाएगी।",
    dayCount: "दिनों की गिनती। मासिक किस्त को 30 दिन माना जाता है, इसलिए ठीक 1% प्रति माह वाला लोन लगभग 12.1% APR दिखाता है।",
    cost: "कर्ज़ की कुल लागत = आपके सभी भुगतान − आपको मिली राशि। अग्रिम कटौतियाँ लागत में गिनी जाती हैं, क्योंकि आप वह पैसा चुकाते हैं जो आपको कभी मिला ही नहीं।",
    compare:
      "तुलना। उतनी ही मिली राशि, उन्हीं तारीख़ों पर उसी अनुपात में चुकाई गई, पाथवे की उदाहरणात्मक श्रेणी दरों पर ({fair} “उचित”, {excellent} “उत्कृष्ट”)।",
    thresholdsTitle: "ख़तरे की रेखाएँ (उदाहरणात्मक अनुमान, क़ानूनी सीमाएँ नहीं)",
    thresholds: {
      apr: "असली APR: {w} से ऊपर चेतावनी, {d} से ऊपर गंभीर।",
      deductions: "अग्रिम कटौतियाँ: स्वीकृत राशि के {w} से ऊपर चेतावनी, {d} से ऊपर गंभीर।",
      tenure: "{n} दिनों से कम में भुगतान देय: चेतावनी।",
      frequency: "हर {n} दिनों से ज़्यादा बार किस्तें: ध्यान दें।",
      received: "स्वीकृत राशि और मिली राशि में कोई भी अंतर: ध्यान दें।",
    },
    privacy: "सारी गणना आपके ब्राउज़र में होती है। आप जो भी दर्ज करते हैं, वह न सहेजा जाता है, न कहीं भेजा जाता है।",
  },

  disclaimer:
    "शिक्षा के लिए एक उदाहरणात्मक सिमुलेशन। यह वित्तीय या क़ानूनी सलाह नहीं, कोई ऋण निर्णय नहीं, और किसी ऋणदाता से संबद्ध नहीं है।",
  liveSummary: "असली APR {apr}। {verdict}। ख़तरे के संकेत: {n}।",
};

const mr: OfferStrings = {
  crumb: "ऑफर तपासणी",
  home: "मुख्यपृष्ठ",
  eyebrow: "ऑफर तपासणी",
  title: "ते इन्स्टंट कर्ज म्हणजे सापळा तर नाही ना?",
  intro:
    "अनेक इन्स्टंट-कर्ज अ‍ॅप्स खरी किंमत आधीच कापलेल्या शुल्कांमागे आणि परतफेडीच्या अगदी कमी वेळेमागे लपवतात. ऑफर भरा आणि पाहा की वर्षाला त्याची खरी किंमत किती आहे, कोणते धोक्याचे संकेत आहेत आणि वाजवी दराच्या तुलनेत ते कसे आहे.",
  privacy: "हे तुमच्या ब्राउझरमध्येच चालते. तुम्ही जे लिहिता ते साठवले जात नाही किंवा कुठेही पाठवले जात नाही.",

  examplesTitle: "एखादे उदाहरण वापरून पाहा",
  examplesNote: "काल्पनिक ऑफर, खरे कर्जदाते नाहीत.",
  examples: {
    app7: "उदाहरण: 7 दिवसांचे अ‍ॅप कर्ज",
    weekly: "उदाहरण: साप्ताहिक हप्ते",
    bank: "उदाहरण: बँकेसारखे वाजवी कर्ज",
  },
  showingExample: "“{name}” दाखवले आहे. तुमची स्वतःची ऑफर तपासण्यासाठी कोणताही आकडा बदला.",
  reset: "फॉर्म रिकामा करा",

  formTitle: "ऑफर",
  formSub: "कर्जाच्या स्क्रीनवरून किंवा करारातून आकडे येथे लिहा.",
  currency: "चलन",
  currencies: { INR: "भारतीय रुपया (₹)" },
  sanctioned: "मंजूर रक्कम",
  sanctionedHint: "ऑफरवर लिहिलेली कर्जाची रक्कम.",
  processingFee: "प्रोसेसिंग शुल्क",
  processingFeeHint: "पैसे तुमच्यापर्यंत पोहोचण्यापूर्वीच कापले जाते.",
  otherCharges: "इतर आगाऊ शुल्क",
  otherChargesHint: "प्लॅटफॉर्म, पडताळणी किंवा विम्याच्या नावाने आधीच कापलेले शुल्क.",
  gstPct: "शुल्कावरील कर (%)",
  gstHint: "भारतात प्रोसेसिंग शुल्कावर GST (साधारणपणे 18%) लागतो.",
  optional: "ऐच्छिक",
  repayment: "तुम्ही परतफेड कशी कराल?",
  bullet: "शेवटी एकच भरणा",
  bulletDesc: "संपूर्ण रक्कम एकाच तारखेला परत करा.",
  instalments: "समान हप्ते",
  instalmentsDesc: "साप्ताहिक, पाक्षिक किंवा मासिक भरणा.",
  bulletAmount: "परत करायची रक्कम",
  bulletDays: "किती दिवसांनी देय",
  count: "हप्त्यांची संख्या",
  instalment: "प्रत्येक हप्ता",
  everyDays: "किती वेळा",
  frequencies: { 7: "दर आठवड्याला (7 दिवस)", 14: "दर 2 आठवड्यांनी (14 दिवस)", 30: "दर महिन्याला (30 दिवस)" },
  errors: {
    required: "एखादी संख्या लिहा.",
    positive: "0 पेक्षा जास्त असायला हवी.",
    nonNegative: "ऋण असू शकत नाही.",
    integer: "पूर्ण संख्या लिहा.",
    tooLarge: "तपासण्यासाठी हे खूप मोठे आहे.",
    percent: "0 ते 100 मधील टक्केवारी लिहा.",
    feesTooHigh: "कपात कर्जाइतकीच मोठी आहे: तुमच्यापर्यंत काहीच पोहोचणार नाही.",
  },
  incomplete: "खरी किंमत पाहण्यासाठी ऑफरचा तपशील भरा.",
  incompleteList: "अजून भरायचे बाकी:",

  resultsTitle: "खरी किंमत",
  trueApr: "खरा APR",
  trueAprHint: "प्रत्येक शुल्कासह वार्षिक दर, तुम्हाला प्रत्यक्ष मिळणाऱ्या पैशांवर मोजलेला.",
  verdictLabel: "किमतीचा निष्कर्ष",
  verdicts: { fair: "वाजवी वाटते", expensive: "महाग", predatory: "शोषण करणाऱ्या पातळीची किंमत" },
  verdictBody: {
    fair: "हे वर्षाला 36% च्या त्या रेषेच्या आत आहे जी आम्ही ढोबळ मार्गदर्शक म्हणून वापरतो. तरीही ऑफरची तुलना करा आणि मुख्य तथ्य विवरण (KFS) वाचा.",
    expensive: "हे वर्षाला 36% पेक्षा जास्त आहे: हे महाग कर्ज आहे. स्वीकारण्यापूर्वी इतर पर्यायांशी तुलना करा.",
    predatory: "हे वर्षाला 100% पेक्षा जास्त आहे: या दराने वर्षभराचे कर्ज मिळालेल्या पैशांपेक्षाही जास्त महाग पडेल. आधी इतर पर्याय पाहा.",
  },
  story: "तुम्हाला {received} मिळतात आणि तुम्ही {period} {repaid} परत करता. म्हणजे पैसे वापरण्यासाठी {cost}: {apr} इतका खरा APR.",
  storyFree: "तुम्हाला {received} मिळतात आणि तुम्ही {period} {repaid} परत करता. हे मिळालेल्या रकमेपेक्षा जास्त नाही, त्यामुळे या ऑफरची काहीच किंमत नाही.",
  periodN: "{n} दिवसांत",
  period1: "1 दिवसात",
  daysN: "{n} दिवस",
  day1: "1 दिवस",
  stats: {
    received: "तुम्हाला मिळतात",
    repaid: "एकूण परतफेड",
    cost: "कर्जाची एकूण किंमत",
    costShare: "मिळालेल्या रकमेवर किंमत (%)",
    feeShare: "आगाऊ कपात",
    tenure: "परतफेडीचा वेळ",
    ear: "प्रभावी वार्षिक दर (चक्रवाढ)",
  },
  feeShareValue: "{amount} (मंजूर रकमेच्या {share})",

  barTitle: "तुम्हाला काय मिळते, तुम्ही काय भरता",
  barGet: "तुम्हाला मिळते",
  barPay: "तुम्ही भरता",
  barReceived: "तुम्हाला मिळालेले पैसे",
  barFees: "कधीच न मिळालेले शुल्क",
  barInterest: "व्याज आणि शुल्क",
  barAria:
    "तुम्हाला {received} मिळतात. तुम्ही {repaid} भरता: {principal} मिळालेली रक्कम परत करते, {fees} कधीच न मिळालेल्या शुल्काचे आहेत आणि {interest} व्याज व शुल्क आहे.",

  flagsTitle: "धोक्याचे संकेत",
  flagsNone: "तुम्ही भरलेल्या आकड्यांमध्ये कोणताही धोक्याचा संकेत नाही. तरीही अ‍ॅपच्या तपासण्या नक्की करा.",
  flagsPending: "ऑफर पूर्ण भरल्यावर आकड्यांशी संबंधित संकेत येथे दिसतील.",
  flagCount: "{label}: {n}",
  severity: { danger: "गंभीर", warning: "इशारा", info: "लक्षात घ्या" },
  flags: {
    apr: { title: "खरा APR {threshold} पेक्षा जास्त", body: "शुल्क आणि परतफेडीचा वेळ धरल्यास याची किंमत वर्षाला {value} आहे." },
    deductions: {
      title: "मोठी आगाऊ कपात",
      body: "पैसे मिळण्यापूर्वीच मंजूर रकमेच्या {value} कापले जातात (मार्गदर्शक रेषा: {threshold}).",
    },
    "short-tenure": {
      title: "परतफेडीसाठी खूप कमी वेळ",
      body: "परतफेड {value} दिवसांच्या आत देय आहे. कमी कालावधीमुळे अनेकदा परतफेडीसाठी पुन्हा कर्ज घ्यावे लागते.",
    },
    "received-differs": {
      title: "मंजूर रकमेपेक्षा कमी पैसे मिळतात",
      body: "{value} आधीच कापले जातात, पण तुम्ही पूर्ण रक्कम मिळाल्यासारखी परतफेड करता.",
    },
    "frequent-instalments": {
      title: "महिन्यापेक्षा जास्त वेळा हप्ते",
      body: "दर {value} दिवसांनी भरणा केल्याने कर्जाची किंमत प्रति-हप्ता आकड्यापेक्षा जास्त होते, आणि दोन भरण्यांमध्ये कमी वेळ मिळतो.",
    },
    permissions: {
      title: "संपर्क, फोटो किंवा कॉल लॉगची परवानगी मागितली",
      body: "कर्ज अ‍ॅप्सनी यांचा वापर करू नये. अशा परवानगीचा गैरवापर अनेकदा कर्जदार आणि त्यांच्या संपर्कांना त्रास देण्यासाठी होतो.",
    },
    noKfs: {
      title: "सही करण्यापूर्वी मुख्य तथ्य विवरण नाही",
      body: "नियमन असलेल्या कर्जदात्यांनी सही करण्यापूर्वी एकूण APR सह मुख्य तथ्य विवरण (KFS) दाखवणे आवश्यक आहे.",
    },
    thirdParty: {
      title: "पैसे दुसऱ्याच्या खात्यातून जातात",
      body: "कर्जाचे पैसे फक्त तुमच्या बँक खात्यात आणि कर्जदात्याच्या खात्यातच ये-जा करायला हवेत.",
    },
    pressure: {
      title: "दबाव, धमकी किंवा छळ",
      body: "खरा कर्जदाता तुम्हाला घाई करायला लावत नाही किंवा धमकावत नाही. तुम्ही याची तक्रार करू शकता (“तुम्ही काय करू शकता” पाहा).",
    },
    unverified: {
      title: "कर्जदाता सत्यापित नाही",
      body: "कर्ज घेण्यापूर्वी कर्जदाता बँक किंवा RBI-नोंदणीकृत NBFC आहे का ते तपासा.",
    },
  },

  checklistTitle: "अ‍ॅपचीही तपासणी करा",
  checklistSub: "जे घडले असेल ते चालू करा. प्रत्येक निवडीने एक धोक्याचा संकेत जोडला जातो.",
  checklist: {
    permissions: "अ‍ॅपने माझ्या संपर्क, फोटो किंवा कॉल लॉगची परवानगी मागितली",
    noKfs: "सही करण्यापूर्वी मला मुख्य तथ्य विवरण (KFS) दाखवले गेले नाही",
    thirdParty: "पैसे अशा खात्यात येतील किंवा अशा खात्यातून वसूल होतील जे माझे किंवा कर्जदात्याचे नाही",
    pressure: "मला लगेच स्वीकारण्यासाठी दबाव टाकला गेला, किंवा धमकावले किंवा त्रास दिला गेला",
    unverified: "कर्जदाता नियमन असलेला आहे (बँक किंवा RBI-नोंदणीकृत NBFC) याची खात्री मला करता आली नाही",
  },

  compareTitle: "वाजवी दराशी तुलना",
  compareLess: "पाथवेच्या “वाजवी” श्रेणीच्या दराने याची किंमत {amount} कमी असती.",
  compareNotLess: "ही ऑफर आधीच पाथवेच्या “वाजवी” श्रेणीच्या दरापेक्षा महाग नाही.",
  compareBody: "तितकेच {received} मिळाले, भरण्याच्या त्याच तारखा, आणि किंमत पाथवेच्या उदाहरणादाखल दरांवर.",
  thisOffer: "ही ऑफर",
  tierRow: "“{tier}” श्रेणी · {apr} APR",
  tierNames: { fair: "वाजवी", excellent: "उत्कृष्ट" },
  costLabel: "किंमत {cost}",
  less: "{amount} कमी",
  more: "{amount} जास्त",
  same: "जवळपास सारखेच",
  compareNote: "पाथवेच्या श्रेणी मंजुरी रेषा ओलांडणाऱ्या अर्जदारांसाठीचे उदाहरणादाखल दर आहेत. हा कर्जाचा प्रस्ताव नाही.",
  compareCta: "वाजवी दराच्या कर्जापर्यंतचा तुमचा मार्ग पाहा",

  doTitle: "तुम्ही काय करू शकता",
  doSub: "भारतातील कर्ज घेणाऱ्यांसाठी सर्वसाधारण माहिती.",
  do: {
    kfs: {
      title: "मुख्य तथ्य विवरण (KFS) मागा",
      body: "RBI च्या नियमांनुसार नियमन असलेल्या कर्जदात्यांनी सही करण्यापूर्वी तुम्हाला मुख्य तथ्य विवरण (KFS) द्यायला हवे, ज्यात सर्व शुल्कांसह APR, प्रत्येक शुल्क आणि परतफेडीचे वेळापत्रक असते. KFS मध्ये नसलेले शुल्क नंतर तुमच्या स्पष्ट संमतीशिवाय जोडता येत नाही.",
    },
    regulated: {
      title: "कर्जदाता नियमन असलेला आहे का ते तपासा",
      body: "कर्जदाता बँक किंवा RBI-नोंदणीकृत NBFC असायला हवा. RBI आपल्या वेबसाइटवर नियमन असलेल्या संस्थांच्या याद्या प्रसिद्ध करते, आणि कर्ज अ‍ॅपने कर्ज देणाऱ्या नियमन असलेल्या कर्जदात्याचे नाव स्पष्टपणे सांगायला हवे.",
    },
    permissions: {
      title: "संपर्क किंवा फोटोंची परवानगी कधीही देऊ नका",
      body: "RBI च्या डिजिटल कर्ज नियमांनुसार कर्ज अ‍ॅप्सनी तुमचे संपर्क, फाइल्स, फोटो किंवा कॉल लॉग पाहू नयेत. कॅमेरा, मायक्रोफोन किंवा लोकेशनची एकदाच परवानगी फक्त KYC साठी, तुमच्या संमतीने घेता येते.",
    },
    account: {
      title: "पैसे फक्त तुमच्या खात्यात आणि खात्यातून",
      body: "कर्जाचे पैसे आणि परतफेड फक्त तुमच्या बँक खात्यात आणि कर्जदात्याच्या खात्यातच व्हायला हवी, एखाद्या एजंटच्या किंवा दुसऱ्या व्यक्तीच्या खात्यातून नाही.",
    },
    coolingOff: {
      title: "कूलिंग-ऑफ कालावधी वापरा",
      body: "डिजिटल कर्जांना कूलिंग-ऑफ (लुक-अप) कालावधी असतो, ज्यात तुम्ही मुद्दल आणि प्रमाणशीर APR भरून कोणत्याही दंडाशिवाय कर्जातून बाहेर पडू शकता.",
    },
    sachet: {
      title: "अनधिकृत कर्ज अ‍ॅप्सची तक्रार करा",
      body: "अनधिकृत कर्ज अ‍ॅप्स किंवा संस्थांची तक्रार RBI च्या सचेत (Sachet) पोर्टलवर करा.",
    },
    cyber: {
      title: "धमकी, छळ किंवा फसवणूक",
      body: "राष्ट्रीय सायबर गुन्हे हेल्पलाइन 1930 वर कॉल करा किंवा cybercrime.gov.in वर तक्रार नोंदवा. तुम्ही जवळच्या पोलीस ठाण्यातही जाऊ शकता.",
    },
    ombudsman: {
      title: "नियमन असलेल्या कर्जदात्याबद्दल तक्रार",
      body: "आधी कर्जदात्याकडे तक्रार करा. 30 दिवसांत निवारण न झाल्यास, किंवा उत्तराने तुमचे समाधान न झाल्यास, cms.rbi.org.in वर RBI लोकपालाकडे तक्रार करू शकता.",
    },
  },
  notLegal: "ही सर्वसाधारण माहिती आहे, कायदेशीर किंवा आर्थिक सल्ला नाही. नियम बदलत असतात: ताजी माहिती rbi.org.in वर पाहा.",
  newTab: "(नवीन टॅबमध्ये उघडते)",

  howTitle: "आम्ही गणना कशी करतो",
  how: {
    flows:
      "रोख प्रवाह. दिवस 0 ला तुम्हाला R = मंजूर रक्कम − शुल्क − शुल्कावरील कर मिळतो. दिवस tᵢ ला तुम्ही Pᵢ भरता: एकच भरणा, किंवा दर 7, 14 किंवा 30 दिवसांनी समान हप्ते.",
    rate: "दैनिक दर. आम्ही असा दैनिक दर r शोधतो ज्यावर तुमच्या भरण्यांचे दिवस 0 चे मूल्य तुम्हाला मिळालेल्या रकमेइतके होते. हे आम्ही द्विभाजन (bisection) पद्धतीने सोडवतो, जी अशा कर्जासाठी नेहमी उत्तरापर्यंत पोहोचते.",
    apr: "खरा APR = r × 365. हा नाममात्र वार्षिक दर आहे, मुख्य तथ्य विवरणातील (KFS) APR साठी वापरले जाणारे तेच साधे वार्षिकीकरण.",
    ear: "प्रभावी वार्षिक दर = (1 + r)^365 − 1: तुम्ही वर्षभर याच दराने कर्ज घेत राहिलात तर चक्रवाढीने किंमत इतकी होईल.",
    dayCount: "दिवसांची मोजणी. मासिक हप्ता 30 दिवसांचा धरला जातो, त्यामुळे नेमके दरमहा 1% असलेले कर्ज सुमारे 12.1% APR दाखवते.",
    cost: "कर्जाची एकूण किंमत = तुम्ही परत करता ते सर्व − तुम्हाला मिळालेली रक्कम. आगाऊ कपात किमतीत धरली जाते, कारण कधीच न मिळालेले पैसे तुम्ही परत करता.",
    compare:
      "तुलना. तितकीच मिळालेली रक्कम, त्याच तारखांना त्याच प्रमाणात परत केलेली, पाथवेच्या उदाहरणादाखल श्रेणी दरांवर ({fair} “वाजवी”, {excellent} “उत्कृष्ट”).",
    thresholdsTitle: "धोक्याच्या रेषा (उदाहरणादाखल अंदाज, कायदेशीर मर्यादा नाहीत)",
    thresholds: {
      apr: "खरा APR: {w} पेक्षा जास्त असल्यास इशारा, {d} पेक्षा जास्त असल्यास गंभीर.",
      deductions: "आगाऊ कपात: मंजूर रकमेच्या {w} पेक्षा जास्त असल्यास इशारा, {d} पेक्षा जास्त असल्यास गंभीर.",
      tenure: "{n} दिवसांपेक्षा कमी वेळात परतफेड देय: इशारा.",
      frequency: "दर {n} दिवसांपेक्षा जास्त वेळा हप्ते: नोंद.",
      received: "मंजूर रक्कम आणि मिळालेली रक्कम यांत कोणताही फरक: नोंद.",
    },
    privacy: "सर्व गणना तुमच्या ब्राउझरमध्ये होते. तुम्ही भरलेले काहीही साठवले जात नाही किंवा कुठेही पाठवले जात नाही.",
  },

  disclaimer:
    "शिक्षणासाठी एक उदाहरणादाखल सिम्युलेशन. हा आर्थिक किंवा कायदेशीर सल्ला नाही, कर्जाचा निर्णय नाही, आणि कोणत्याही कर्जदात्याशी संलग्न नाही.",
  liveSummary: "खरा APR {apr}. {verdict}. धोक्याचे संकेत: {n}.",
};

export const OFFER_STRINGS: Record<Lang, OfferStrings> = { en, hi, mr };

export const offerStrings = (lang: Lang): OfferStrings => OFFER_STRINGS[lang];

export type GuidanceId = keyof OfferStrings["do"];
/** Display order of the "What you can do" items. */
export const GUIDANCE_ORDER: GuidanceId[] = ["kfs", "regulated", "permissions", "account", "coolingOff", "sachet", "cyber", "ombudsman"];

export interface GuidanceLink {
  href: string;
  label: string;
  /** Opens in a new tab with rel="noopener noreferrer". */
  external: boolean;
}

/** Official sources linked from "What you can do". Never translated. */
export const GUIDANCE_LINKS: Partial<Record<GuidanceId, GuidanceLink[]>> = {
  regulated: [{ href: "https://www.rbi.org.in", label: "rbi.org.in", external: true }],
  sachet: [{ href: "https://sachet.rbi.org.in", label: "sachet.rbi.org.in", external: true }],
  cyber: [
    { href: "tel:1930", label: "1930", external: false },
    { href: "https://cybercrime.gov.in", label: "cybercrime.gov.in", external: true },
  ],
  ombudsman: [{ href: "https://cms.rbi.org.in", label: "cms.rbi.org.in", external: true }],
};

/** "7 days" / "1 day" in the page language. */
export function daysText(s: OfferStrings, n: number): string {
  return n === 1 ? s.day1 : tf(s.daysN, { n });
}

/** "over 7 days" style phrase used inside the plain-language story. */
export function periodText(s: OfferStrings, n: number): string {
  return n === 1 ? s.period1 : tf(s.periodN, { n });
}

/** Localized title and body of a red flag, with its numbers formatted for the currency. */
export function flagCopy(s: OfferStrings, flag: RedFlag, currency: Currency): { title: string; body: string } {
  const copy = s.flags[flag.id];
  let value = "";
  let threshold = "";
  switch (flag.id) {
    case "apr":
    case "deductions":
      value = formatRate(flag.value ?? 0, currency);
      threshold = formatRate(flag.threshold ?? 0, currency);
      break;
    case "short-tenure":
    case "frequent-instalments":
      value = String(flag.value ?? "");
      threshold = String(flag.threshold ?? "");
      break;
    case "received-differs":
      value = formatMoney(flag.value ?? 0, currency);
      break;
    default:
      break;
  }
  const vars = { value, threshold };
  return { title: tf(copy.title, vars), body: tf(copy.body, vars) };
}

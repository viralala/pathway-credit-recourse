import type { Lang } from "../i18n";

/**
 * Every user-facing string of the "fill from your bank" flow, in English, Hindi and Marathi.
 * The English object defines the shape; the other languages must match it key for key.
 */
const en = {
  cardTitle: "Skip the typing: fill from your bank",
  cardBody:
    "Account Aggregator is the RBI-regulated way to share bank data. You approve in your bank's own flow, and Pathway reads your data once.",
  open: "Fill from your bank",

  dialogTitle: "Fill from your bank",
  dialogDesc: "Share your statements once to fill in the form.",
  close: "Close",
  back: "Back",
  continue: "Continue",
  working: "Working…",

  loadingConfig: "Checking how bank connection is set up…",

  sandboxNote: "Sandbox: fictional data, no real bank is contacted.",
  profilesLabel: "Pick a demo person",
  profiles: {
    salaried: { title: "Salaried, steady", desc: "Regular salary, one card, low balances owed." },
    stretched: { title: "Stretched, card-heavy", desc: "High card use, a few late payments, several loans." },
    "thin-file": { title: "Thin file", desc: "New to credit, little history, no declared income." },
  },

  mobileLabel: "Mobile number linked to your bank",
  mobileHint: "10 digits. Your bank sends the approval request to this number.",
  mobileInvalid: "Enter a 10 digit mobile number.",

  consentTitle: "Review this request",
  consentIntro: "This is what the approval screen shows. Nothing is shared until you approve.",
  consentRows: {
    who: { label: "Who is asking", value: "Pathway" },
    purpose: { label: "Why", value: "One-time credit check to explain your loan decision" },
    data: { label: "What is read", value: "12 months of bank statements, plus card and loan summaries" },
    duration: { label: "For how long", value: "One-time fetch. The access ends right after." },
    storage: { label: "Stored?", value: "No. Your data stays in this browser tab and is not saved." },
  },
  approve: "Approve",
  decline: "Decline",

  waitingTitle: "Waiting for your approval",
  waitingBody: "Approve the request in the bank window we opened. This page continues by itself.",
  waitingOpen: "Open the approval page",
  waitingReopen: "Window closed? Open it again",
  waitingTimer: "Checking every 3 seconds, for up to 3 minutes.",

  fetchingTitle: "Fetching your data",
  fetchingSteps: [
    "Consent confirmed",
    "Linked accounts found",
    "Reading 12 months of statements",
    "Working out your seven inputs",
  ],

  doneTitle: "Your data is ready",
  doneBody: "Review what was found, then use it to fill the form. You can still change any number.",
  periodLabel: "Period covered",
  period: "{from} to {to}",
  accountsLabel: "Linked accounts",
  kinds: { deposit: "Bank account", "credit-card": "Credit card", loan: "Loan" },
  use: "Use this data",

  declinedTitle: "You declined the request",
  declinedBody: "Nothing was read or shared. You can type the numbers yourself, or start again.",
  startAgain: "Start again",

  retry: "Try again",
  errors: {
    config: "We could not check how bank connection is set up. Check your internet and try again.",
    consent: "We could not create the consent request. Please try again in a moment.",
    mobile: "That mobile number was not accepted. Check the 10 digits and try again.",
    rejected: "The request was rejected in the bank flow, so no data was shared. You can try again.",
    expired: "The request expired before it was approved. Start a new one.",
    timeout: "We waited 3 minutes and did not get your approval. Start again when you are ready.",
    fetch: "We could not fetch your data. Nothing was saved. Please try again.",
    network: "We could not reach the server. Check your internet and try again.",
    rateLimit: "Too many attempts in a short time. Wait a minute and try again.",
    popup: "Your browser blocked the approval window. Use the button to open it.",
  },
  badge: {
    bank: "From bank",
    card: "From card",
    loan: "From loan",
    none: "Not found",
  },
};

export type ConnectStrings = typeof en;

const hi: ConnectStrings = {
  cardTitle: "टाइप करने से बचें: अपने बैंक से भरें",
  cardBody:
    "अकाउंट एग्रीगेटर बैंक डेटा साझा करने का RBI-नियंत्रित तरीका है। आप अपने बैंक के ही फ़्लो में मंज़ूरी देते हैं और Pathway आपका डेटा सिर्फ़ एक बार पढ़ता है।",
  open: "अपने बैंक से भरें",

  dialogTitle: "अपने बैंक से भरें",
  dialogDesc: "फ़ॉर्म भरने के लिए अपने स्टेटमेंट एक बार साझा करें।",
  close: "बंद करें",
  back: "वापस",
  continue: "आगे बढ़ें",
  working: "काम चल रहा है…",

  loadingConfig: "जाँच रहे हैं कि बैंक कनेक्शन कैसे सेट है…",

  sandboxNote: "सैंडबॉक्स: काल्पनिक डेटा, किसी असली बैंक से संपर्क नहीं किया जाता।",
  profilesLabel: "एक डेमो व्यक्ति चुनें",
  profiles: {
    salaried: { title: "वेतनभोगी, स्थिर", desc: "नियमित वेतन, एक कार्ड, बकाया कम।" },
    stretched: { title: "तंगी में, कार्ड पर निर्भर", desc: "कार्ड का भारी उपयोग, कुछ देरी से भुगतान, कई लोन।" },
    "thin-file": { title: "कम इतिहास", desc: "क्रेडिट में नए, इतिहास कम, आय घोषित नहीं।" },
  },

  mobileLabel: "आपके बैंक से जुड़ा मोबाइल नंबर",
  mobileHint: "10 अंक। आपका बैंक मंज़ूरी का अनुरोध इसी नंबर पर भेजता है।",
  mobileInvalid: "10 अंकों का मोबाइल नंबर दर्ज करें।",

  consentTitle: "इस अनुरोध को देखें",
  consentIntro: "मंज़ूरी स्क्रीन पर यही दिखता है। आपके मंज़ूर करने तक कुछ साझा नहीं होता।",
  consentRows: {
    who: { label: "कौन माँग रहा है", value: "Pathway" },
    purpose: { label: "क्यों", value: "आपके लोन निर्णय को समझाने के लिए एक बार की क्रेडिट जाँच" },
    data: { label: "क्या पढ़ा जाएगा", value: "12 महीने के बैंक स्टेटमेंट, साथ में कार्ड और लोन का सार" },
    duration: { label: "कितने समय के लिए", value: "एक बार की जानकारी। उसके तुरंत बाद एक्सेस खत्म।" },
    storage: { label: "क्या सहेजा जाएगा?", value: "नहीं। आपका डेटा इसी ब्राउज़र टैब में रहता है और सहेजा नहीं जाता।" },
  },
  approve: "मंज़ूर करें",
  decline: "मना करें",

  waitingTitle: "आपकी मंज़ूरी का इंतज़ार है",
  waitingBody: "हमारी खोली हुई बैंक विंडो में अनुरोध मंज़ूर करें। यह पेज अपने आप आगे बढ़ेगा।",
  waitingOpen: "मंज़ूरी पेज खोलें",
  waitingReopen: "विंडो बंद हो गई? फिर से खोलें",
  waitingTimer: "हर 3 सेकंड में जाँच, अधिकतम 3 मिनट तक।",

  fetchingTitle: "आपका डेटा लाया जा रहा है",
  fetchingSteps: [
    "सहमति पक्की हुई",
    "जुड़े खाते मिल गए",
    "12 महीने के स्टेटमेंट पढ़ रहे हैं",
    "आपके सात इनपुट निकाल रहे हैं",
  ],

  doneTitle: "आपका डेटा तैयार है",
  doneBody: "जो मिला उसे देखें, फिर फ़ॉर्म भरने के लिए इस्तेमाल करें। आप कोई भी संख्या बदल सकते हैं।",
  periodLabel: "अवधि",
  period: "{from} से {to}",
  accountsLabel: "जुड़े खाते",
  kinds: { deposit: "बैंक खाता", "credit-card": "क्रेडिट कार्ड", loan: "लोन" },
  use: "यह डेटा इस्तेमाल करें",

  declinedTitle: "आपने अनुरोध मना कर दिया",
  declinedBody: "कुछ भी पढ़ा या साझा नहीं किया गया। आप खुद संख्याएँ भर सकते हैं, या दोबारा शुरू करें।",
  startAgain: "दोबारा शुरू करें",

  retry: "फिर कोशिश करें",
  errors: {
    config: "हम जाँच नहीं पाए कि बैंक कनेक्शन कैसे सेट है। इंटरनेट देखें और फिर कोशिश करें।",
    consent: "हम सहमति का अनुरोध नहीं बना पाए। कृपया थोड़ी देर में फिर कोशिश करें।",
    mobile: "यह मोबाइल नंबर स्वीकार नहीं हुआ। 10 अंक जाँचें और फिर कोशिश करें।",
    rejected: "बैंक फ़्लो में अनुरोध अस्वीकार हुआ, इसलिए कोई डेटा साझा नहीं हुआ। आप फिर कोशिश कर सकते हैं।",
    expired: "मंज़ूरी से पहले अनुरोध की समय-सीमा खत्म हो गई। नया अनुरोध शुरू करें।",
    timeout: "हमने 3 मिनट इंतज़ार किया पर मंज़ूरी नहीं मिली। तैयार हों तब दोबारा शुरू करें।",
    fetch: "हम आपका डेटा नहीं ला पाए। कुछ भी सहेजा नहीं गया। कृपया फिर कोशिश करें।",
    network: "हम सर्वर तक नहीं पहुँच पाए। इंटरनेट देखें और फिर कोशिश करें।",
    rateLimit: "थोड़े समय में बहुत ज़्यादा कोशिशें हुईं। एक मिनट रुककर फिर कोशिश करें।",
    popup: "आपके ब्राउज़र ने मंज़ूरी विंडो रोक दी। बटन से उसे खोलें।",
  },
  badge: {
    bank: "बैंक से",
    card: "कार्ड से",
    loan: "लोन से",
    none: "नहीं मिला",
  },
};

const mr: ConnectStrings = {
  cardTitle: "टाइप करणे टाळा: तुमच्या बँकेतून भरा",
  cardBody:
    "अकाउंट अ‍ॅग्रीगेटर हा बँक डेटा शेअर करण्याचा RBI-नियंत्रित मार्ग आहे. तुम्ही तुमच्या बँकेच्याच प्रक्रियेत मंजुरी देता आणि Pathway तुमचा डेटा फक्त एकदा वाचतो.",
  open: "तुमच्या बँकेतून भरा",

  dialogTitle: "तुमच्या बँकेतून भरा",
  dialogDesc: "फॉर्म भरण्यासाठी तुमचे स्टेटमेंट एकदा शेअर करा.",
  close: "बंद करा",
  back: "मागे",
  continue: "पुढे जा",
  working: "काम सुरू आहे…",

  loadingConfig: "बँक कनेक्शन कसे सेट आहे ते तपासत आहोत…",

  sandboxNote: "सँडबॉक्स: काल्पनिक डेटा, कोणत्याही खऱ्या बँकेशी संपर्क होत नाही.",
  profilesLabel: "एक डेमो व्यक्ती निवडा",
  profiles: {
    salaried: { title: "पगारदार, स्थिर", desc: "नियमित पगार, एक कार्ड, थकबाकी कमी." },
    stretched: { title: "ओढाताण, कार्डवर अवलंबून", desc: "कार्डचा जास्त वापर, काही उशिरा भरणा, अनेक कर्जे." },
    "thin-file": { title: "कमी इतिहास", desc: "क्रेडिटमध्ये नवीन, इतिहास कमी, उत्पन्न जाहीर नाही." },
  },

  mobileLabel: "तुमच्या बँकेशी जोडलेला मोबाइल नंबर",
  mobileHint: "10 अंक. तुमची बँक मंजुरीची विनंती याच नंबरवर पाठवते.",
  mobileInvalid: "10 अंकी मोबाइल नंबर टाका.",

  consentTitle: "ही विनंती तपासा",
  consentIntro: "मंजुरी स्क्रीनवर हेच दिसते. तुम्ही मंजूर करेपर्यंत काहीही शेअर होत नाही.",
  consentRows: {
    who: { label: "कोण मागत आहे", value: "Pathway" },
    purpose: { label: "का", value: "तुमचा कर्ज निर्णय समजावण्यासाठी एकदाची क्रेडिट तपासणी" },
    data: { label: "काय वाचले जाईल", value: "12 महिन्यांचे बँक स्टेटमेंट, तसेच कार्ड आणि कर्जाचा सारांश" },
    duration: { label: "किती काळासाठी", value: "एकदाच माहिती घेतली जाते. त्यानंतर लगेच प्रवेश संपतो." },
    storage: { label: "साठवले जाते का?", value: "नाही. तुमचा डेटा याच ब्राउझर टॅबमध्ये राहतो आणि साठवला जात नाही." },
  },
  approve: "मंजूर करा",
  decline: "नकार द्या",

  waitingTitle: "तुमच्या मंजुरीची वाट पाहत आहोत",
  waitingBody: "आम्ही उघडलेल्या बँक विंडोमध्ये विनंती मंजूर करा. हे पान आपोआप पुढे जाईल.",
  waitingOpen: "मंजुरीचे पान उघडा",
  waitingReopen: "विंडो बंद झाली? पुन्हा उघडा",
  waitingTimer: "दर 3 सेकंदांनी तपासणी, जास्तीत जास्त 3 मिनिटे.",

  fetchingTitle: "तुमचा डेटा आणत आहोत",
  fetchingSteps: [
    "संमती निश्चित झाली",
    "जोडलेली खाती सापडली",
    "12 महिन्यांचे स्टेटमेंट वाचत आहोत",
    "तुमचे सात इनपुट काढत आहोत",
  ],

  doneTitle: "तुमचा डेटा तयार आहे",
  doneBody: "काय सापडले ते पाहा, मग फॉर्म भरण्यासाठी वापरा. तुम्ही कोणताही आकडा बदलू शकता.",
  periodLabel: "कालावधी",
  period: "{from} ते {to}",
  accountsLabel: "जोडलेली खाती",
  kinds: { deposit: "बँक खाते", "credit-card": "क्रेडिट कार्ड", loan: "कर्ज" },
  use: "हा डेटा वापरा",

  declinedTitle: "तुम्ही विनंती नाकारली",
  declinedBody: "काहीही वाचले किंवा शेअर केले गेले नाही. तुम्ही स्वतः आकडे भरू शकता, किंवा पुन्हा सुरू करा.",
  startAgain: "पुन्हा सुरू करा",

  retry: "पुन्हा प्रयत्न करा",
  errors: {
    config: "बँक कनेक्शन कसे सेट आहे ते आम्ही तपासू शकलो नाही. इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.",
    consent: "आम्ही संमतीची विनंती तयार करू शकलो नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.",
    mobile: "हा मोबाइल नंबर स्वीकारला गेला नाही. 10 अंक तपासा आणि पुन्हा प्रयत्न करा.",
    rejected: "बँकेच्या प्रक्रियेत विनंती नाकारली गेली, त्यामुळे कोणताही डेटा शेअर झाला नाही. तुम्ही पुन्हा प्रयत्न करू शकता.",
    expired: "मंजुरीआधीच विनंतीची मुदत संपली. नवीन विनंती सुरू करा.",
    timeout: "आम्ही 3 मिनिटे वाट पाहिली पण मंजुरी मिळाली नाही. तयार असाल तेव्हा पुन्हा सुरू करा.",
    fetch: "आम्ही तुमचा डेटा आणू शकलो नाही. काहीही साठवले गेले नाही. कृपया पुन्हा प्रयत्न करा.",
    network: "आम्ही सर्व्हरपर्यंत पोहोचू शकलो नाही. इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.",
    rateLimit: "थोड्या वेळात खूप प्रयत्न झाले. एक मिनिट थांबून पुन्हा प्रयत्न करा.",
    popup: "तुमच्या ब्राउझरने मंजुरी विंडो रोखली. बटणाने ती उघडा.",
  },
  badge: {
    bank: "बँकेतून",
    card: "कार्डवरून",
    loan: "कर्जातून",
    none: "सापडले नाही",
  },
};

const STRINGS: Record<Lang, ConnectStrings> = { en, hi, mr };

export const connectStrings = (lang: Lang): ConnectStrings => STRINGS[lang];

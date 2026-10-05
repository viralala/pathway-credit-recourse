import type { Lang } from "@/lib/i18n";

/** Sign-in, "My plans" and partner enquiry strings. Every language must define every key. */
export interface AccountStrings {
  signin: {
    eyebrow: string;
    title: string;
    body: string;
    google: string;
    off: string;
    offCta: string;
    legal: string;
    errors: Record<"cancelled" | "provider-disabled" | "provider-failed" | "session-failed" | "unavailable", string>;
  };
  account: {
    eyebrow: string;
    title: string;
    signedInAs: string;
    empty: string;
    emptyCta: string;
    started: string;
    latest: string;
    updates: string;
    approved: string;
    projected: string;
    noPlan: string;
    history: string;
    update: string;
    remove: string;
    removeConfirm: string;
    cancel: string;
    lastUpdated: string;
    data: string;
    download: string;
    signOut: string;
    deleteTitle: string;
    deleteBody: string;
    deleteConfirm: string;
    deleteButton: string;
    loadError: string;
    deleteError: string;
  };
  partners: {
    eyebrow: string;
    title: string;
    body: string;
    pilotTitle: string;
    pilot: { text: string; link: string; href: string }[];
    formTitle: string;
    name: string;
    organisation: string;
    email: string;
    kind: string;
    kinds: Record<"lender" | "fintech" | "regulator" | "other", string>;
    message: string;
    optional: string;
    send: string;
    sending: string;
    privacy: string;
    sent: string;
    errors: Record<"name" | "organisation" | "email" | "kind" | "message" | "throttled" | "generic", string>;
    off: string;
    offLink: string;
  };
}

export const ACCOUNT: Record<Lang, AccountStrings> = {
  en: {
    signin: {
      eyebrow: "Account",
      title: "Sign in to save your plans",
      body: "With an account you can save a plan, come back each month, update your numbers and see your score move. Google shares only your name and email address with us.",
      google: "Continue with Google",
      off: "Accounts are not switched on for this site yet. Every tool works without one.",
      offCta: "Check my loan",
      legal: "By signing in you agree to the terms and conditions and the privacy policy.",
      errors: {
        cancelled: "Sign-in was cancelled. You can try again whenever you like.",
        "provider-disabled": "Google sign-in is not switched on for this site yet.",
        "provider-failed": "Google sign-in could not start. Please try again in a moment.",
        "session-failed": "That sign-in link has expired or was already used. Please sign in again.",
        unavailable: "Accounts are not available right now.",
      },
    },
    account: {
      eyebrow: "My plans",
      title: "Your saved plans",
      signedInAs: "Signed in as {email}",
      empty: "No saved plans yet. Check a loan and press “Save this plan” to start tracking it.",
      emptyCta: "Check my loan",
      started: "Started at",
      latest: "Latest",
      updates: "{n} updates",
      approved: "At or above the approval line",
      projected: "Projected approval in {n} months",
      noPlan: "No plan reaches approval within {n} months",
      history: "History",
      update: "Update my numbers",
      remove: "Delete",
      removeConfirm: "Delete this plan and its history",
      cancel: "Cancel",
      lastUpdated: "Last updated {date}",
      data: "Your data",
      download: "Download my data (JSON)",
      signOut: "Sign out",
      deleteTitle: "Delete my account",
      deleteBody: "This permanently deletes your account, every saved plan and every update. It cannot be undone.",
      deleteConfirm: "I understand that this cannot be undone",
      deleteButton: "Delete my account",
      loadError: "Your plans could not be loaded just now. Please refresh the page.",
      deleteError: "Your account could not be deleted just now. Nothing was removed. Please try again.",
    },
    partners: {
      eyebrow: "For lenders",
      title: "Reasons, rejection letters and fairness checks for every declined application",
      body: "Pathway turns a scoring model's output into plain-language reasons, a plan the applicant can follow and a printable letter, in English, Hindi and Marathi. Today it runs on a model trained on synthetic data; a pilot would calibrate it on your own decisions.",
      pilotTitle: "What a pilot covers",
      pilot: [
        { text: "Reasons and a plan to approval for each declined application.", link: "Try it", href: "/check?sample=clear-rejection" },
        { text: "A rejection letter in English, Hindi and Marathi.", link: "See a sample letter", href: "/report?sample=clear-rejection" },
        { text: "A fairness audit of how much effort approval takes across age and income groups.", link: "See the audit", href: "/fairness" },
      ],
      formTitle: "Talk to us",
      name: "Your name",
      organisation: "Organisation",
      email: "Work email",
      kind: "You are a",
      kinds: { lender: "Bank or NBFC", fintech: "Fintech or lending app", regulator: "Regulator or auditor", other: "Something else" },
      message: "What would you like to explore?",
      optional: "optional",
      send: "Send enquiry",
      sending: "Sending…",
      privacy: "We use these details only to reply to you. See the privacy policy.",
      sent: "Thank you. Your enquiry has been received and we will reply by email.",
      errors: {
        name: "Enter your name (up to 80 characters).",
        organisation: "Enter your organisation (up to 120 characters).",
        email: "Enter a valid email address.",
        kind: "Choose one option.",
        message: "Keep the message under 2,000 characters.",
        throttled: "We have already received several enquiries from this address today. We will be in touch.",
        generic: "Your enquiry could not be sent just now. Please try again.",
      },
      off: "The enquiry form opens once our database is connected. Until then, reach us here:",
      offLink: "Open an issue on GitHub",
    },
  },
  hi: {
    signin: {
      eyebrow: "खाता",
      title: "अपनी योजनाएँ सहेजने के लिए साइन इन करें",
      body: "खाते से आप योजना सहेज सकते हैं, हर महीने लौटकर अपने आँकड़े अपडेट कर सकते हैं और अपना स्कोर बढ़ता देख सकते हैं। Google हमें केवल आपका नाम और ईमेल पता देता है।",
      google: "Google से जारी रखें",
      off: "इस साइट पर अभी खाते चालू नहीं हैं। हर टूल बिना खाते के काम करता है।",
      offCta: "मेरा ऋण जाँचें",
      legal: "साइन इन करके आप नियम और शर्तों तथा गोपनीयता नीति से सहमत होते हैं।",
      errors: {
        cancelled: "साइन इन रद्द हो गया। आप जब चाहें फिर से कोशिश कर सकते हैं।",
        "provider-disabled": "इस साइट पर अभी Google साइन इन चालू नहीं है।",
        "provider-failed": "Google साइन इन शुरू नहीं हो सका। कृपया थोड़ी देर में फिर कोशिश करें।",
        "session-failed": "यह साइन इन लिंक समाप्त हो गया है या पहले ही इस्तेमाल हो चुका है। कृपया फिर से साइन इन करें।",
        unavailable: "अभी खाते उपलब्ध नहीं हैं।",
      },
    },
    account: {
      eyebrow: "मेरी योजनाएँ",
      title: "आपकी सहेजी गई योजनाएँ",
      signedInAs: "{email} के रूप में साइन इन",
      empty: "अभी कोई सहेजी गई योजना नहीं है। किसी ऋण की जाँच करें और उसे ट्रैक करने के लिए “यह योजना सहेजें” दबाएँ।",
      emptyCta: "मेरा ऋण जाँचें",
      started: "शुरुआत",
      latest: "नवीनतम",
      updates: "{n} अपडेट",
      approved: "स्वीकृति रेखा पर या उससे ऊपर",
      projected: "{n} महीनों में स्वीकृति का अनुमान",
      noPlan: "{n} महीनों में स्वीकृति तक पहुँचने वाली कोई योजना नहीं",
      history: "इतिहास",
      update: "मेरे आँकड़े अपडेट करें",
      remove: "हटाएँ",
      removeConfirm: "यह योजना और इसका इतिहास हटाएँ",
      cancel: "रद्द करें",
      lastUpdated: "अंतिम अपडेट {date}",
      data: "आपका डेटा",
      download: "मेरा डेटा डाउनलोड करें (JSON)",
      signOut: "साइन आउट",
      deleteTitle: "मेरा खाता हटाएँ",
      deleteBody: "इससे आपका खाता, हर सहेजी गई योजना और हर अपडेट हमेशा के लिए हट जाएगा। इसे वापस नहीं लाया जा सकता।",
      deleteConfirm: "मैं समझता/समझती हूँ कि इसे वापस नहीं लाया जा सकता",
      deleteButton: "मेरा खाता हटाएँ",
      loadError: "अभी आपकी योजनाएँ लोड नहीं हो सकीं। कृपया पृष्ठ रीफ़्रेश करें।",
      deleteError: "अभी आपका खाता हटाया नहीं जा सका। कुछ भी नहीं हटा। कृपया फिर से कोशिश करें।",
    },
    partners: {
      eyebrow: "ऋणदाताओं के लिए",
      title: "हर अस्वीकृत आवेदन के लिए कारण, अस्वीकृति पत्र और निष्पक्षता जाँच",
      body: "पाथवे स्कोरिंग मॉडल के नतीजे को सरल भाषा के कारणों, आवेदक के लिए एक योजना और प्रिंट करने योग्य पत्र में बदलता है, अंग्रेज़ी, हिंदी और मराठी में। आज यह कृत्रिम डेटा पर प्रशिक्षित मॉडल पर चलता है; पायलट में इसे आपके अपने निर्णयों पर कैलिब्रेट किया जाएगा।",
      pilotTitle: "पायलट में क्या शामिल है",
      pilot: [
        { text: "हर अस्वीकृत आवेदन के लिए कारण और स्वीकृति तक की योजना।", link: "आज़माएँ", href: "/check?sample=clear-rejection" },
        { text: "अंग्रेज़ी, हिंदी और मराठी में अस्वीकृति पत्र।", link: "नमूना पत्र देखें", href: "/report?sample=clear-rejection" },
        { text: "आयु और आय समूहों में स्वीकृति के लिए लगने वाले प्रयास की निष्पक्षता जाँच।", link: "जाँच देखें", href: "/fairness" },
      ],
      formTitle: "हमसे बात करें",
      name: "आपका नाम",
      organisation: "संस्था",
      email: "कार्यालय ईमेल",
      kind: "आप हैं",
      kinds: { lender: "बैंक या NBFC", fintech: "फ़िनटेक या लेंडिंग ऐप", regulator: "नियामक या ऑडिटर", other: "कुछ और" },
      message: "आप क्या जानना चाहेंगे?",
      optional: "वैकल्पिक",
      send: "पूछताछ भेजें",
      sending: "भेजा जा रहा है…",
      privacy: "हम इन जानकारियों का उपयोग केवल आपको जवाब देने के लिए करते हैं। गोपनीयता नीति देखें।",
      sent: "धन्यवाद। आपकी पूछताछ मिल गई है और हम ईमेल से जवाब देंगे।",
      errors: {
        name: "अपना नाम लिखें (80 अक्षरों तक)।",
        organisation: "अपनी संस्था का नाम लिखें (120 अक्षरों तक)।",
        email: "एक मान्य ईमेल पता लिखें।",
        kind: "एक विकल्प चुनें।",
        message: "संदेश 2,000 अक्षरों से कम रखें।",
        throttled: "आज इस पते से हमें पहले ही कई पूछताछ मिल चुकी हैं। हम संपर्क करेंगे।",
        generic: "अभी आपकी पूछताछ भेजी नहीं जा सकी। कृपया फिर से कोशिश करें।",
      },
      off: "हमारा डेटाबेस जुड़ने के बाद पूछताछ फ़ॉर्म खुलेगा। तब तक यहाँ संपर्क करें:",
      offLink: "GitHub पर इश्यू खोलें",
    },
  },
  mr: {
    signin: {
      eyebrow: "खाते",
      title: "तुमच्या योजना जतन करण्यासाठी साइन इन करा",
      body: "खात्यामुळे तुम्ही योजना जतन करू शकता, दरमहा परत येऊन आकडे अद्ययावत करू शकता आणि तुमचा स्कोअर वाढताना पाहू शकता. Google आम्हाला फक्त तुमचे नाव आणि ईमेल पत्ता देते.",
      google: "Google ने पुढे जा",
      off: "या साइटवर अजून खाती सुरू केलेली नाहीत. प्रत्येक साधन खात्याशिवाय चालते.",
      offCta: "माझे कर्ज तपासा",
      legal: "साइन इन करून तुम्ही नियम आणि अटी व गोपनीयता धोरणाला संमती देता.",
      errors: {
        cancelled: "साइन इन रद्द झाले. तुम्हाला हवे तेव्हा पुन्हा प्रयत्न करू शकता.",
        "provider-disabled": "या साइटवर अजून Google साइन इन सुरू नाही.",
        "provider-failed": "Google साइन इन सुरू होऊ शकले नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.",
        "session-failed": "ही साइन इन लिंक कालबाह्य झाली आहे किंवा आधीच वापरली गेली आहे. कृपया पुन्हा साइन इन करा.",
        unavailable: "आत्ता खाती उपलब्ध नाहीत.",
      },
    },
    account: {
      eyebrow: "माझ्या योजना",
      title: "तुमच्या जतन केलेल्या योजना",
      signedInAs: "{email} म्हणून साइन इन",
      empty: "अजून कोणतीही योजना जतन केलेली नाही. एखादे कर्ज तपासा आणि ते ट्रॅक करण्यासाठी “ही योजना जतन करा” दाबा.",
      emptyCta: "माझे कर्ज तपासा",
      started: "सुरुवात",
      latest: "नवीनतम",
      updates: "{n} नोंदी",
      approved: "मंजुरी रेषेवर किंवा त्यावर",
      projected: "{n} महिन्यांत मंजुरीचा अंदाज",
      noPlan: "{n} महिन्यांत मंजुरीपर्यंत पोहोचणारी योजना नाही",
      history: "इतिहास",
      update: "माझे आकडे अद्ययावत करा",
      remove: "काढा",
      removeConfirm: "ही योजना आणि तिचा इतिहास काढा",
      cancel: "रद्द करा",
      lastUpdated: "शेवटचे अद्ययावत {date}",
      data: "तुमचा डेटा",
      download: "माझा डेटा डाउनलोड करा (JSON)",
      signOut: "साइन आउट",
      deleteTitle: "माझे खाते काढा",
      deleteBody: "यामुळे तुमचे खाते, प्रत्येक जतन केलेली योजना आणि प्रत्येक नोंद कायमची काढली जाईल. हे परत आणता येणार नाही.",
      deleteConfirm: "हे परत आणता येणार नाही हे मला समजले आहे",
      deleteButton: "माझे खाते काढा",
      loadError: "आत्ता तुमच्या योजना लोड होऊ शकल्या नाहीत. कृपया पान रिफ्रेश करा.",
      deleteError: "आत्ता तुमचे खाते काढता आले नाही. काहीही काढले गेले नाही. कृपया पुन्हा प्रयत्न करा.",
    },
    partners: {
      eyebrow: "कर्जदात्यांसाठी",
      title: "प्रत्येक नाकारलेल्या अर्जासाठी कारणे, नकार पत्र आणि निष्पक्षता तपासणी",
      body: "पाथवे स्कोअरिंग मॉडेलच्या निकालाचे सोप्या भाषेतील कारणे, अर्जदाराला पाळता येईल अशी योजना आणि छापता येणारे पत्र यांत रूपांतर करतो, इंग्रजी, हिंदी आणि मराठीत. आज तो कृत्रिम डेटावर प्रशिक्षित मॉडेलवर चालतो; पायलटमध्ये तो तुमच्या स्वतःच्या निर्णयांवर कॅलिब्रेट केला जाईल.",
      pilotTitle: "पायलटमध्ये काय असते",
      pilot: [
        { text: "प्रत्येक नाकारलेल्या अर्जासाठी कारणे आणि मंजुरीपर्यंतची योजना.", link: "वापरून पाहा", href: "/check?sample=clear-rejection" },
        { text: "इंग्रजी, हिंदी आणि मराठीत नकार पत्र.", link: "नमुना पत्र पाहा", href: "/report?sample=clear-rejection" },
        { text: "वय आणि उत्पन्न गटांमध्ये मंजुरीसाठी लागणाऱ्या प्रयत्नांची निष्पक्षता तपासणी.", link: "तपासणी पाहा", href: "/fairness" },
      ],
      formTitle: "आमच्याशी बोला",
      name: "तुमचे नाव",
      organisation: "संस्था",
      email: "कार्यालयीन ईमेल",
      kind: "तुम्ही आहात",
      kinds: { lender: "बँक किंवा NBFC", fintech: "फिनटेक किंवा लेंडिंग ॲप", regulator: "नियामक किंवा लेखापरीक्षक", other: "इतर" },
      message: "तुम्हाला काय जाणून घ्यायचे आहे?",
      optional: "ऐच्छिक",
      send: "चौकशी पाठवा",
      sending: "पाठवत आहे…",
      privacy: "आम्ही ही माहिती फक्त तुम्हाला उत्तर देण्यासाठी वापरतो. गोपनीयता धोरण पाहा.",
      sent: "धन्यवाद. तुमची चौकशी मिळाली आहे आणि आम्ही ईमेलने उत्तर देऊ.",
      errors: {
        name: "तुमचे नाव लिहा (80 अक्षरांपर्यंत).",
        organisation: "तुमच्या संस्थेचे नाव लिहा (120 अक्षरांपर्यंत).",
        email: "वैध ईमेल पत्ता लिहा.",
        kind: "एक पर्याय निवडा.",
        message: "संदेश 2,000 अक्षरांपेक्षा कमी ठेवा.",
        throttled: "आज या पत्त्यावरून आम्हाला आधीच अनेक चौकशा मिळाल्या आहेत. आम्ही संपर्क करू.",
        generic: "आत्ता तुमची चौकशी पाठवता आली नाही. कृपया पुन्हा प्रयत्न करा.",
      },
      off: "आमचा डेटाबेस जोडल्यानंतर चौकशी फॉर्म सुरू होईल. तोपर्यंत येथे संपर्क करा:",
      offLink: "GitHub वर इश्यू उघडा",
    },
  },
};

export const accountStrings = (lang: Lang): AccountStrings => ACCOUNT[lang];

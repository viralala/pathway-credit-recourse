import type { Lang } from "@/lib/i18n";

/**
 * Strings for the site shell: header, footer, cookie consent, money cursor, 404 and error pages.
 * Every language must define every key (the interface enforces it). Legal page names are
 * translated, but the legal pages themselves are English-only, so `legalNote` says so.
 */
export interface ShellStrings {
  skipToContent: string;
  homeAria: string;
  mainNav: string;
  nav: { home: string; goal: string; offerCheck: string };
  menu: { open: string; close: string; title: string; description: string };
  language: string;
  footer: {
    tagline: string;
    disclaimerTitle: string;
    disclaimer: string;
    product: string;
    legal: string;
    openSource: string;
    terms: string;
    privacy: string;
    licenses: string;
    cookieSettings: string;
    /** Empty in English; elsewhere it says the legal pages are in English. */
    legalNote: string;
    source: string;
    sourceBody: string;
    newTab: string;
    copyright: string;
    footerNav: string;
  };
  consent: {
    regionLabel: string;
    title: string;
    body: string;
    learnMore: string;
    acceptAll: string;
    necessaryOnly: string;
    customize: string;
    dialogTitle: string;
    dialogBody: string;
    necessaryTitle: string;
    necessaryBody: string;
    alwaysOn: string;
    functionalTitle: string;
    functionalBody: string;
    noTracking: string;
    save: string;
    saved: string;
    close: string;
  };
  cursor: {
    on: string;
    off: string;
    turnOn: string;
    turnOff: string;
    remembered: string;
    session: string;
  };
  notFound: {
    code: string;
    title: string;
    body: string;
    suggestions: string;
    homeHint: string;
    goalHint: string;
    offerHint: string;
  };
  error: {
    title: string;
    body: string;
    retry: string;
    home: string;
    reference: string;
  };
}

export const SHELL: Record<Lang, ShellStrings> = {
  en: {
    skipToContent: "Skip to content",
    homeAria: "Pathway home",
    mainNav: "Main",
    nav: { home: "Home", goal: "Goal planner", offerCheck: "Offer check" },
    menu: {
      open: "Open menu",
      close: "Close menu",
      title: "Menu",
      description: "Explore Pathway’s tools and choose your language.",
    },
    language: "Language",
    footer: {
      tagline:
        "A loan rejection should come with a roadmap. Pathway explains the decision and projects a realistic path to approval.",
      disclaimerTitle: "Please note",
      disclaimer:
        "Pathway is a simulation built on public and synthetic data. It is not a credit decision, not financial advice, and not affiliated with any lender.",
      product: "Product",
      legal: "Legal",
      openSource: "Open source",
      terms: "Terms of use",
      privacy: "Privacy policy",
      licenses: "Licenses & credits",
      cookieSettings: "Cookie settings",
      legalNote: "",
      source: "Source on GitHub",
      sourceBody: "The model, the data pipeline and this site are open for anyone to review.",
      newTab: "(opens in a new tab)",
      copyright: "© 2026 Pathway contributors. Code released under the MIT License.",
      footerNav: "Footer",
    },
    consent: {
      regionLabel: "Cookie consent",
      title: "Cookies, kept to a minimum",
      body:
        "Pathway sets no analytics, advertising or tracking cookies. One strictly necessary cookie remembers this choice. If you allow functional storage, we also remember whether the money cursor is on or off, on this device only.",
      learnMore: "Read the cookie details",
      acceptAll: "Accept all",
      necessaryOnly: "Necessary only",
      customize: "Customize",
      dialogTitle: "Cookie settings",
      dialogBody:
        "Choose what Pathway may remember on this device. You can change this at any time from “Cookie settings” in the footer.",
      necessaryTitle: "Strictly necessary",
      necessaryBody:
        "A first-party cookie named pathway_consent keeps this choice for 180 days, so we do not ask on every page. It is always on.",
      alwaysOn: "Always on",
      functionalTitle: "Functional",
      functionalBody:
        "Remembers your money-cursor on/off choice in this browser’s local storage (pathway_cursor). Turning this off deletes it.",
      noTracking: "Pathway sets no analytics, advertising or tracking cookies.",
      save: "Save choices",
      saved: "Your cookie choices are saved.",
      close: "Close",
    },
    cursor: {
      on: "Money cursor: on",
      off: "Money cursor: off",
      turnOn: "Turn the money cursor on",
      turnOff: "Turn the money cursor off",
      remembered: "Remembered on this device.",
      session: "Remembered for this visit only. Allow functional storage in Cookie settings to keep it.",
    },
    notFound: {
      code: "Error 404",
      title: "This path doesn’t lead anywhere yet",
      body: "We couldn’t find the page you asked for. The link may be mistyped, or the page may have moved.",
      suggestions: "Try one of these instead",
      homeHint: "Start again from the home page.",
      goalHint: "Set a goal and see a projected timeline.",
      offerHint: "Look at a loan offer in plain numbers.",
    },
    error: {
      title: "Something went wrong",
      body: "This part of Pathway ran into an unexpected problem. Trying again usually helps.",
      retry: "Try again",
      home: "Go to home",
      reference: "Error reference",
    },
  },
  hi: {
    skipToContent: "मुख्य सामग्री पर जाएँ",
    homeAria: "पाथवे होम",
    mainNav: "मुख्य",
    nav: { home: "होम", goal: "लक्ष्य योजनाकार", offerCheck: "ऑफ़र जाँच" },
    menu: {
      open: "मेनू खोलें",
      close: "मेनू बंद करें",
      title: "मेनू",
      description: "पाथवे के टूल देखें और अपनी भाषा चुनें।",
    },
    language: "भाषा",
    footer: {
      tagline:
        "ऋण अस्वीकृति के साथ आगे का रास्ता भी मिलना चाहिए। पाथवे निर्णय समझाता है और स्वीकृति तक का एक व्यावहारिक, अनुमानित रास्ता दिखाता है।",
      disclaimerTitle: "कृपया ध्यान दें",
      disclaimer:
        "पाथवे सार्वजनिक और कृत्रिम डेटा पर बना एक सिमुलेशन है। यह कोई ऋण निर्णय या वित्तीय सलाह नहीं है, और किसी भी ऋणदाता से संबद्ध नहीं है।",
      product: "उत्पाद",
      legal: "कानूनी",
      openSource: "ओपन सोर्स",
      terms: "उपयोग की शर्तें",
      privacy: "गोपनीयता नीति",
      licenses: "लाइसेंस और श्रेय",
      cookieSettings: "कुकी सेटिंग्स",
      legalNote: "कानूनी पृष्ठ अंग्रेज़ी में हैं।",
      source: "GitHub पर सोर्स कोड",
      sourceBody: "मॉडल, डेटा पाइपलाइन और यह वेबसाइट, सब कोई भी जाँच सकता है।",
      newTab: "(नए टैब में खुलता है)",
      copyright: "© 2026 पाथवे योगदानकर्ता। कोड MIT लाइसेंस के तहत जारी किया गया है।",
      footerNav: "फ़ुटर",
    },
    consent: {
      regionLabel: "कुकी सहमति",
      title: "कुकी, कम से कम",
      body:
        "पाथवे कोई एनालिटिक्स, विज्ञापन या ट्रैकिंग कुकी नहीं लगाता। एक ज़रूरी कुकी केवल आपकी यह पसंद याद रखती है। आप अनुमति दें, तो हम इसी डिवाइस पर यह भी याद रखेंगे कि मनी कर्सर चालू है या बंद।",
      learnMore: "कुकी का पूरा विवरण पढ़ें",
      acceptAll: "सभी स्वीकार करें",
      necessaryOnly: "केवल ज़रूरी",
      customize: "खुद चुनें",
      dialogTitle: "कुकी सेटिंग्स",
      dialogBody:
        "चुनें कि पाथवे इस डिवाइस पर क्या याद रख सकता है। आप फ़ुटर में “कुकी सेटिंग्स” से इसे कभी भी बदल सकते हैं।",
      necessaryTitle: "पूरी तरह ज़रूरी",
      necessaryBody:
        "pathway_consent नाम की हमारी अपनी कुकी आपकी यह पसंद 180 दिनों तक याद रखती है, ताकि हमें हर पृष्ठ पर न पूछना पड़े। यह हमेशा चालू रहती है।",
      alwaysOn: "हमेशा चालू",
      functionalTitle: "कार्यात्मक",
      functionalBody:
        "मनी कर्सर चालू या बंद रखने की आपकी पसंद इस ब्राउज़र की लोकल स्टोरेज (pathway_cursor) में याद रखता है। इसे बंद करने पर वह जानकारी मिटा दी जाती है।",
      noTracking: "पाथवे कोई एनालिटिक्स, विज्ञापन या ट्रैकिंग कुकी नहीं लगाता।",
      save: "पसंद सहेजें",
      saved: "आपकी कुकी पसंद सहेज ली गई है।",
      close: "बंद करें",
    },
    cursor: {
      on: "मनी कर्सर: चालू",
      off: "मनी कर्सर: बंद",
      turnOn: "मनी कर्सर चालू करें",
      turnOff: "मनी कर्सर बंद करें",
      remembered: "यह पसंद इस डिवाइस पर याद रखी जाएगी।",
      session: "यह पसंद केवल इस विज़िट तक याद रहेगी। इसे बनाए रखने के लिए कुकी सेटिंग्स में कार्यात्मक स्टोरेज की अनुमति दें।",
    },
    notFound: {
      code: "त्रुटि 404",
      title: "यह रास्ता अभी कहीं नहीं जाता",
      body: "आप जो पृष्ठ ढूँढ रहे थे, वह हमें नहीं मिला। हो सकता है लिंक में कोई गलती हो, या पृष्ठ कहीं और चला गया हो।",
      suggestions: "इनमें से कोई आज़माएँ",
      homeHint: "होम पेज से फिर से शुरू करें।",
      goalHint: "एक लक्ष्य तय करें और अनुमानित समयरेखा देखें।",
      offerHint: "किसी ऋण ऑफ़र को सरल आँकड़ों में देखें।",
    },
    error: {
      title: "कुछ गड़बड़ हो गई",
      body: "पाथवे के इस हिस्से में एक अनपेक्षित समस्या आई। दोबारा कोशिश करने से अक्सर बात बन जाती है।",
      retry: "फिर से कोशिश करें",
      home: "होम पर जाएँ",
      reference: "त्रुटि संदर्भ",
    },
  },
  mr: {
    skipToContent: "मुख्य मजकुराकडे जा",
    homeAria: "पाथवे मुख्यपृष्ठ",
    mainNav: "मुख्य",
    nav: { home: "मुख्यपृष्ठ", goal: "ध्येय नियोजक", offerCheck: "ऑफर तपासणी" },
    menu: {
      open: "मेनू उघडा",
      close: "मेनू बंद करा",
      title: "मेनू",
      description: "पाथवेची साधने पाहा आणि तुमची भाषा निवडा.",
    },
    language: "भाषा",
    footer: {
      tagline:
        "कर्ज नाकारले गेले तरी पुढचा मार्ग दिसायला हवा. पाथवे निर्णय समजावतो आणि मंजुरीपर्यंतचा व्यवहार्य, अंदाजित मार्ग दाखवतो.",
      disclaimerTitle: "कृपया लक्षात घ्या",
      disclaimer:
        "पाथवे हे सार्वजनिक आणि कृत्रिम डेटावर बनवलेले सिम्युलेशन आहे. हा कर्जाचा निर्णय किंवा आर्थिक सल्ला नाही, आणि कोणत्याही कर्जदात्याशी संलग्न नाही.",
      product: "उत्पादन",
      legal: "कायदेशीर",
      openSource: "ओपन सोर्स",
      terms: "वापराच्या अटी",
      privacy: "गोपनीयता धोरण",
      licenses: "परवाने आणि श्रेय",
      cookieSettings: "कुकी सेटिंग्ज",
      legalNote: "कायदेशीर पाने इंग्रजीत आहेत.",
      source: "GitHub वर सोर्स कोड",
      sourceBody: "मॉडेल, डेटा पाइपलाइन आणि ही वेबसाइट, सर्व काही कोणालाही तपासता येते.",
      newTab: "(नवीन टॅबमध्ये उघडते)",
      copyright: "© 2026 पाथवे योगदानकर्ते. कोड MIT परवान्याअंतर्गत प्रसिद्ध केला आहे.",
      footerNav: "फूटर",
    },
    consent: {
      regionLabel: "कुकी संमती",
      title: "कुकी, अगदी कमीत कमी",
      body:
        "पाथवे कोणत्याही ॲनालिटिक्स, जाहिरात किंवा ट्रॅकिंग कुकी वापरत नाही. एक आवश्यक कुकी फक्त तुमची ही निवड लक्षात ठेवते. तुम्ही परवानगी दिल्यास, मनी कर्सर चालू आहे की बंद हेही आम्ही याच डिव्हाइसवर लक्षात ठेवू.",
      learnMore: "कुकीची संपूर्ण माहिती वाचा",
      acceptAll: "सर्व स्वीकारा",
      necessaryOnly: "फक्त आवश्यक",
      customize: "स्वतः निवडा",
      dialogTitle: "कुकी सेटिंग्ज",
      dialogBody:
        "पाथवे या डिव्हाइसवर काय लक्षात ठेवू शकतो ते निवडा. फूटरमधील “कुकी सेटिंग्ज” मधून तुम्ही हे कधीही बदलू शकता.",
      necessaryTitle: "अत्यंत आवश्यक",
      necessaryBody:
        "pathway_consent नावाची आमची स्वतःची कुकी तुमची ही निवड 180 दिवस लक्षात ठेवते, म्हणजे प्रत्येक पानावर विचारावे लागत नाही. ती नेहमी चालू असते.",
      alwaysOn: "नेहमी चालू",
      functionalTitle: "कार्यात्मक",
      functionalBody:
        "मनी कर्सर चालू की बंद ही तुमची निवड या ब्राउझरच्या लोकल स्टोरेजमध्ये (pathway_cursor) लक्षात ठेवते. हे बंद केल्यास ती माहिती पुसली जाते.",
      noTracking: "पाथवे कोणत्याही ॲनालिटिक्स, जाहिरात किंवा ट्रॅकिंग कुकी वापरत नाही.",
      save: "निवड जतन करा",
      saved: "तुमची कुकी निवड जतन झाली आहे.",
      close: "बंद करा",
    },
    cursor: {
      on: "मनी कर्सर: चालू",
      off: "मनी कर्सर: बंद",
      turnOn: "मनी कर्सर चालू करा",
      turnOff: "मनी कर्सर बंद करा",
      remembered: "ही निवड या डिव्हाइसवर लक्षात ठेवली जाईल.",
      session: "ही निवड फक्त या भेटीपुरती लक्षात राहील. ती कायम ठेवण्यासाठी कुकी सेटिंग्जमध्ये कार्यात्मक स्टोरेजला परवानगी द्या.",
    },
    notFound: {
      code: "त्रुटी 404",
      title: "हा मार्ग अजून कुठेच जात नाही",
      body: "तुम्ही शोधत असलेले पान आम्हाला सापडले नाही. कदाचित लिंकमध्ये चूक असेल, किंवा पान दुसरीकडे हलवले गेले असेल.",
      suggestions: "यापैकी एखादे वापरून पाहा",
      homeHint: "मुख्यपृष्ठावरून पुन्हा सुरुवात करा.",
      goalHint: "एखादे ध्येय ठरवा आणि अंदाजित वेळापत्रक पाहा.",
      offerHint: "कर्जाची ऑफर सोप्या आकड्यांत पाहा.",
    },
    error: {
      title: "काहीतरी चुकले",
      body: "पाथवेच्या या भागात अनपेक्षित अडचण आली. पुन्हा प्रयत्न केल्यास बहुतेक वेळा काम होते.",
      retry: "पुन्हा प्रयत्न करा",
      home: "मुख्यपृष्ठावर जा",
      reference: "त्रुटी संदर्भ",
    },
  },
};

export const shell = (lang: Lang): ShellStrings => SHELL[lang];

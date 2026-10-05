import type { Lang } from "@/lib/i18n";

/**
 * Strings for the site shell: header, footer, cookie notice, account links, 404 and error pages.
 * Every language must define every key (the interface enforces it). Legal page names are
 * translated, but the legal pages themselves are English-only, so `legalNote` says so.
 */
export interface ShellStrings {
  skipToContent: string;
  homeAria: string;
  mainNav: string;
  nav: {
    check: string;
    goal: string;
    offerCheck: string;
    partners: string;
    method: string;
    fairness: string;
    report: string;
  };
  account: { signIn: string; account: string };
  menu: { open: string; close: string; title: string; description: string };
  language: string;
  footer: {
    tagline: string;
    disclaimerTitle: string;
    disclaimer: string;
    product: string;
    company: string;
    legal: string;
    terms: string;
    privacy: string;
    licenses: string;
    /** Empty in English; elsewhere it says the legal pages are in English. */
    legalNote: string;
    source: string;
    newTab: string;
    copyright: string;
    footerNav: string;
  };
  notice: {
    regionLabel: string;
    body: string;
    ok: string;
    privacy: string;
  };
  notFound: {
    code: string;
    title: string;
    body: string;
    suggestions: string;
    checkHint: string;
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
    nav: {
      check: "Check my loan",
      goal: "Goal planner",
      offerCheck: "Offer check",
      partners: "For lenders",
      method: "How it works",
      fairness: "Fairness audit",
      report: "Lender report",
    },
    account: { signIn: "Sign in", account: "My plans" },
    menu: {
      open: "Open menu",
      close: "Close menu",
      title: "Menu",
      description: "Pathway's tools and your language.",
    },
    language: "Language",
    footer: {
      tagline: "Find out why a loan was declined, what to change, and when you can apply again.",
      disclaimerTitle: "Please note",
      disclaimer:
        "Pathway is an educational simulation built on synthetic data. It is not a credit decision, not financial advice, and not linked to any lender, bank or credit bureau.",
      product: "Tools",
      company: "Pathway",
      legal: "Legal",
      terms: "Terms and conditions",
      privacy: "Privacy policy",
      licenses: "Licences and credits",
      legalNote: "",
      source: "Source code",
      newTab: "(opens in a new tab)",
      copyright: "© 2026 Pathway. Code released under the MIT Licence.",
      footerNav: "Footer",
    },
    notice: {
      regionLabel: "Cookie notice",
      body: "Pathway sets no tracking or advertising cookies. If you sign in, one cookie keeps you signed in.",
      ok: "OK",
      privacy: "Privacy policy",
    },
    notFound: {
      code: "Error 404",
      title: "We could not find that page",
      body: "The link may be mistyped, or the page may have moved.",
      suggestions: "Try one of these instead",
      checkHint: "See why a loan was declined and what to change.",
      goalHint: "Start from the loan you want and work backwards.",
      offerHint: "Find the real yearly cost of a loan offer.",
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
    nav: {
      check: "मेरा ऋण जाँचें",
      goal: "लक्ष्य योजनाकार",
      offerCheck: "ऑफ़र जाँच",
      partners: "ऋणदाताओं के लिए",
      method: "यह कैसे काम करता है",
      fairness: "निष्पक्षता जाँच",
      report: "ऋणदाता रिपोर्ट",
    },
    account: { signIn: "साइन इन", account: "मेरी योजनाएँ" },
    menu: {
      open: "मेनू खोलें",
      close: "मेनू बंद करें",
      title: "मेनू",
      description: "पाथवे के टूल और आपकी भाषा।",
    },
    language: "भाषा",
    footer: {
      tagline: "जानिए ऋण क्यों अस्वीकार हुआ, क्या बदलना है, और आप दोबारा कब आवेदन कर सकते हैं।",
      disclaimerTitle: "कृपया ध्यान दें",
      disclaimer:
        "पाथवे कृत्रिम डेटा पर बना एक शैक्षिक सिमुलेशन है। यह कोई ऋण निर्णय या वित्तीय सलाह नहीं है, और किसी भी ऋणदाता, बैंक या क्रेडिट ब्यूरो से जुड़ा नहीं है।",
      product: "टूल",
      company: "पाथवे",
      legal: "कानूनी",
      terms: "नियम और शर्तें",
      privacy: "गोपनीयता नीति",
      licenses: "लाइसेंस और श्रेय",
      legalNote: "कानूनी पृष्ठ अंग्रेज़ी में हैं।",
      source: "सोर्स कोड",
      newTab: "(नए टैब में खुलता है)",
      copyright: "© 2026 पाथवे। कोड MIT लाइसेंस के तहत जारी किया गया है।",
      footerNav: "फ़ुटर",
    },
    notice: {
      regionLabel: "कुकी सूचना",
      body: "पाथवे कोई ट्रैकिंग या विज्ञापन कुकी नहीं लगाता। साइन इन करने पर एक कुकी आपको साइन इन रखती है।",
      ok: "ठीक है",
      privacy: "गोपनीयता नीति",
    },
    notFound: {
      code: "त्रुटि 404",
      title: "यह पृष्ठ नहीं मिला",
      body: "हो सकता है लिंक में कोई गलती हो, या पृष्ठ कहीं और चला गया हो।",
      suggestions: "इनमें से कोई आज़माएँ",
      checkHint: "देखें कि ऋण क्यों अस्वीकार हुआ और क्या बदलना है।",
      goalHint: "जो ऋण चाहिए वहाँ से शुरू करें और पीछे की ओर हिसाब लगाएँ।",
      offerHint: "किसी ऋण ऑफ़र की असली सालाना लागत जानें।",
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
    nav: {
      check: "माझे कर्ज तपासा",
      goal: "ध्येय नियोजक",
      offerCheck: "ऑफर तपासणी",
      partners: "कर्जदात्यांसाठी",
      method: "हे कसे चालते",
      fairness: "निष्पक्षता तपासणी",
      report: "कर्जदाता अहवाल",
    },
    account: { signIn: "साइन इन", account: "माझ्या योजना" },
    menu: {
      open: "मेनू उघडा",
      close: "मेनू बंद करा",
      title: "मेनू",
      description: "पाथवेची साधने आणि तुमची भाषा.",
    },
    language: "भाषा",
    footer: {
      tagline: "कर्ज का नाकारले गेले, काय बदलायचे आणि पुन्हा अर्ज कधी करता येईल ते जाणून घ्या.",
      disclaimerTitle: "कृपया लक्षात घ्या",
      disclaimer:
        "पाथवे हे कृत्रिम डेटावर बनवलेले शैक्षणिक सिम्युलेशन आहे. हा कर्जाचा निर्णय किंवा आर्थिक सल्ला नाही, आणि कोणत्याही कर्जदाता, बँक किंवा क्रेडिट ब्युरोशी जोडलेले नाही.",
      product: "साधने",
      company: "पाथवे",
      legal: "कायदेशीर",
      terms: "नियम आणि अटी",
      privacy: "गोपनीयता धोरण",
      licenses: "परवाने आणि श्रेय",
      legalNote: "कायदेशीर पाने इंग्रजीत आहेत.",
      source: "सोर्स कोड",
      newTab: "(नवीन टॅबमध्ये उघडते)",
      copyright: "© 2026 पाथवे. कोड MIT परवान्याअंतर्गत प्रसिद्ध केला आहे.",
      footerNav: "फूटर",
    },
    notice: {
      regionLabel: "कुकी सूचना",
      body: "पाथवे कोणतीही ट्रॅकिंग किंवा जाहिरात कुकी वापरत नाही. साइन इन केल्यास एक कुकी तुम्हाला साइन इन ठेवते.",
      ok: "ठीक आहे",
      privacy: "गोपनीयता धोरण",
    },
    notFound: {
      code: "त्रुटी 404",
      title: "हे पान सापडले नाही",
      body: "कदाचित लिंकमध्ये चूक असेल, किंवा पान दुसरीकडे हलवले गेले असेल.",
      suggestions: "यापैकी एखादे वापरून पाहा",
      checkHint: "कर्ज का नाकारले गेले आणि काय बदलायचे ते पाहा.",
      goalHint: "हवे असलेल्या कर्जापासून सुरुवात करा आणि उलट हिशेब करा.",
      offerHint: "कर्जाच्या ऑफरचा खरा वार्षिक खर्च शोधा.",
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

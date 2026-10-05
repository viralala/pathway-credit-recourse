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
  nav: { home: string; goal: string; offerCheck: string; partners: string };
  account: { signIn: string; account: string };
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
    /** Empty in English; elsewhere it says the legal pages are in English. */
    legalNote: string;
    source: string;
    sourceBody: string;
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
    nav: { home: "Home", goal: "Goal planner", offerCheck: "Offer check", partners: "For lenders" },
    account: { signIn: "Sign in", account: "My plans" },
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
      terms: "Terms and conditions",
      privacy: "Privacy policy",
      licenses: "Licenses & credits",
      legalNote: "",
      source: "Source on GitHub",
      sourceBody: "The model, the data pipeline and this site are open for anyone to review.",
      newTab: "(opens in a new tab)",
      copyright: "© 2026 Pathway contributors. Code released under the MIT License.",
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
    nav: { home: "होम", goal: "लक्ष्य योजनाकार", offerCheck: "ऑफ़र जाँच", partners: "ऋणदाताओं के लिए" },
    account: { signIn: "साइन इन", account: "मेरी योजनाएँ" },
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
      terms: "नियम और शर्तें",
      privacy: "गोपनीयता नीति",
      licenses: "लाइसेंस और श्रेय",
      legalNote: "कानूनी पृष्ठ अंग्रेज़ी में हैं।",
      source: "GitHub पर सोर्स कोड",
      sourceBody: "मॉडल, डेटा पाइपलाइन और यह वेबसाइट, सब कोई भी जाँच सकता है।",
      newTab: "(नए टैब में खुलता है)",
      copyright: "© 2026 पाथवे योगदानकर्ता। कोड MIT लाइसेंस के तहत जारी किया गया है।",
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
    nav: { home: "मुख्यपृष्ठ", goal: "ध्येय नियोजक", offerCheck: "ऑफर तपासणी", partners: "कर्जदात्यांसाठी" },
    account: { signIn: "साइन इन", account: "माझ्या योजना" },
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
      terms: "नियम आणि अटी",
      privacy: "गोपनीयता धोरण",
      licenses: "परवाने आणि श्रेय",
      legalNote: "कायदेशीर पाने इंग्रजीत आहेत.",
      source: "GitHub वर सोर्स कोड",
      sourceBody: "मॉडेल, डेटा पाइपलाइन आणि ही वेबसाइट, सर्व काही कोणालाही तपासता येते.",
      newTab: "(नवीन टॅबमध्ये उघडते)",
      copyright: "© 2026 पाथवे योगदानकर्ते. कोड MIT परवान्याअंतर्गत प्रसिद्ध केला आहे.",
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

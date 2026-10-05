import type { Lang } from "@/lib/i18n";

/** Business model strings for the home page. Every language must define every key. */
export interface HomeStrings {
  business: {
    eyebrow: string;
    title: string;
    aside: string;
    plans: { id: "borrowers" | "lenders" | "fintechs"; who: string; price: string; items: string[]; cta: string }[];
    note: string;
  };
}

export const HOME: Record<Lang, HomeStrings> = {
  en: {
    business: {
      eyebrow: "Business model",
      title: "Free for borrowers. Paid for by lenders.",
      aside: "People who are declined never pay. Lenders and lending apps pay for explanations they can stand behind.",
      plans: [
        {
          id: "borrowers",
          who: "Borrowers",
          price: "Free",
          items: ["Reasons, plan and timeline", "Goal planner and offer check", "English, Hindi and Marathi"],
          cta: "Check my loan",
        },
        {
          id: "lenders",
          who: "Banks and NBFCs",
          price: "Licence",
          items: [
            "Plain-language reasons for every declined application, which RBI's Fair Practices Code asks lenders to give in writing",
            "A printable rejection letter that includes a plan to approval",
            "A fairness audit across age and income groups",
          ],
          cta: "Talk to us",
        },
        {
          id: "fintechs",
          who: "Fintechs and lending apps",
          price: "API",
          items: ["The borrower's plan shown inside your own app", "Reason codes in three languages", "API in development: pilots come first"],
          cta: "Talk to us",
        },
      ],
      note: "We have not set prices yet. We are looking for a first lender or fintech to pilot with.",
    },
  },
  hi: {
    business: {
      eyebrow: "बिज़नेस मॉडल",
      title: "कर्ज़दारों के लिए मुफ़्त। भुगतान ऋणदाता करते हैं।",
      aside: "जिनका आवेदन अस्वीकार होता है, वे कभी भुगतान नहीं करते। ऋणदाता और लेंडिंग ऐप ऐसे स्पष्टीकरण के लिए भुगतान करते हैं जिन पर वे भरोसा कर सकें।",
      plans: [
        {
          id: "borrowers",
          who: "कर्ज़दार",
          price: "मुफ़्त",
          items: ["कारण, योजना और समयरेखा", "लक्ष्य योजनाकार और ऑफ़र जाँच", "अंग्रेज़ी, हिंदी और मराठी"],
          cta: "मेरा ऋण जाँचें",
        },
        {
          id: "lenders",
          who: "बैंक और NBFC",
          price: "लाइसेंस",
          items: [
            "हर अस्वीकृत आवेदन के सरल भाषा में कारण, जो RBI की उचित व्यवहार संहिता ऋणदाताओं से लिखित में देने को कहती है",
            "स्वीकृति तक की योजना वाला प्रिंट करने योग्य अस्वीकृति पत्र",
            "आयु और आय समूहों में निष्पक्षता जाँच",
          ],
          cta: "हमसे बात करें",
        },
        {
          id: "fintechs",
          who: "फ़िनटेक और लेंडिंग ऐप",
          price: "API",
          items: ["कर्ज़दार की योजना आपके अपने ऐप में", "तीन भाषाओं में कारण-कोड", "API पर काम जारी है: पहले पायलट"],
          cta: "हमसे बात करें",
        },
      ],
      note: "हमने अभी कीमतें तय नहीं की हैं। हम पायलट के लिए पहले ऋणदाता या फ़िनटेक की तलाश में हैं।",
    },
  },
  mr: {
    business: {
      eyebrow: "व्यवसाय मॉडेल",
      title: "कर्जदारांसाठी मोफत. पैसे कर्जदाते देतात.",
      aside: "ज्यांचा अर्ज नाकारला जातो ते कधीही पैसे देत नाहीत. कर्जदाते आणि लेंडिंग ॲप्स विश्वासार्ह स्पष्टीकरणांसाठी पैसे देतात.",
      plans: [
        {
          id: "borrowers",
          who: "कर्जदार",
          price: "मोफत",
          items: ["कारणे, योजना आणि वेळापत्रक", "ध्येय नियोजक आणि ऑफर तपासणी", "इंग्रजी, हिंदी आणि मराठी"],
          cta: "माझे कर्ज तपासा",
        },
        {
          id: "lenders",
          who: "बँका आणि NBFC",
          price: "परवाना",
          items: [
            "प्रत्येक नाकारलेल्या अर्जाची सोप्या भाषेत कारणे, जी RBI ची उचित व्यवहार संहिता कर्जदात्यांना लेखी द्यायला सांगते",
            "मंजुरीपर्यंतची योजना असलेले छापता येणारे नकार पत्र",
            "वय आणि उत्पन्न गटांमध्ये निष्पक्षता तपासणी",
          ],
          cta: "आमच्याशी बोला",
        },
        {
          id: "fintechs",
          who: "फिनटेक आणि लेंडिंग ॲप्स",
          price: "API",
          items: ["कर्जदाराची योजना तुमच्या स्वतःच्या ॲपमध्ये", "तीन भाषांमध्ये कारण-कोड", "API वर काम सुरू आहे: आधी पायलट"],
          cta: "आमच्याशी बोला",
        },
      ],
      note: "आम्ही अजून किमती ठरवलेल्या नाहीत. पायलटसाठी आम्ही पहिल्या कर्जदाता किंवा फिनटेकच्या शोधात आहोत.",
    },
  },
};

export const homeStrings = (lang: Lang): HomeStrings => HOME[lang];

import type { Lang } from "@/lib/i18n";

/** Home page and business model strings. Every language must define every key. */
export interface HomeStrings {
  hero: { eyebrow: string; title: string; body: string; cta: string; sample: string };
  example: {
    title: string;
    score: string;
    needs: string;
    reasons: string;
    plan: string;
    approvedIn: string;
    months: string;
    saved: string;
    note: string;
  };
  steps: {
    eyebrow: string;
    title: string;
    aside: string;
    items: { k: string; title: string; body: string }[];
  };
  tools: {
    eyebrow: string;
    title: string;
    goalTitle: string;
    goalBody: string;
    offerTitle: string;
    offerBody: string;
    open: string;
  };
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
    hero: {
      eyebrow: "For borrowers in India",
      title: "Loan declined? See why, what to change and when to apply again.",
      body: "Pathway reads a credit profile the way a lender's scoring model does. It names the reasons in English, Hindi or Marathi, finds the smallest realistic set of changes that turns the decision around, and shows the month you could reapply.",
      cta: "Check my loan",
      sample: "See a worked example",
    },
    example: {
      title: "Worked example: Asha, 29",
      score: "Pathway score",
      needs: "Approval needs",
      reasons: "Top reasons",
      plan: "Plan",
      approvedIn: "Approved in",
      months: "{n} months",
      saved: "Interest saved on a {amount} loan",
      note: "Real output from the Pathway engine for a sample applicant. Synthetic data, not a real person.",
    },
    steps: {
      eyebrow: "What you get",
      title: "Three answers",
      aside: "The ones a rejection letter rarely gives.",
      items: [
        { k: "01", title: "Why", body: "The reasons, ranked by how many score points each one costs you." },
        {
          k: "02",
          title: "What to change",
          body: "The smallest set of realistic changes that flips the decision. Age, dependants and home loans are never part of the plan.",
        },
        {
          k: "03",
          title: "When, and what it saves",
          body: "A month-by-month projection with best and worst cases, and the interest you save in rupees by applying after the plan.",
        },
      ],
    },
    tools: {
      eyebrow: "Plan ahead",
      title: "Two more tools",
      goalTitle: "Goal planner",
      goalBody: "Start from the loan you want, say ₹5 lakh over 3 years at 12% a year, and work back to the score you need and the plan to reach it.",
      offerTitle: "Offer check",
      offerBody: "Enter an instant loan app's offer and see its real yearly cost (APR) once fees and short repayment periods are counted.",
      open: "Open",
    },
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
    hero: {
      eyebrow: "भारत के कर्ज़दारों के लिए",
      title: "ऋण अस्वीकार हुआ? जानिए क्यों, क्या बदलें और दोबारा कब आवेदन करें।",
      body: "पाथवे आपकी क्रेडिट प्रोफ़ाइल को वैसे ही पढ़ता है जैसे ऋणदाता का स्कोरिंग मॉडल। यह अंग्रेज़ी, हिंदी या मराठी में कारण बताता है, निर्णय बदलने वाले सबसे छोटे व्यावहारिक बदलाव ढूँढता है, और बताता है कि आप किस महीने दोबारा आवेदन कर सकते हैं।",
      cta: "मेरा ऋण जाँचें",
      sample: "एक उदाहरण देखें",
    },
    example: {
      title: "उदाहरण: आशा, 29",
      score: "पाथवे स्कोर",
      needs: "स्वीकृति के लिए चाहिए",
      reasons: "मुख्य कारण",
      plan: "योजना",
      approvedIn: "स्वीकृति",
      months: "{n} महीनों में",
      saved: "{amount} के ऋण पर ब्याज की बचत",
      note: "एक नमूना आवेदक के लिए पाथवे इंजन का असली नतीजा। कृत्रिम डेटा, कोई असली व्यक्ति नहीं।",
    },
    steps: {
      eyebrow: "आपको क्या मिलता है",
      title: "तीन जवाब",
      aside: "जो अस्वीकृति पत्र में शायद ही मिलते हैं।",
      items: [
        { k: "01", title: "क्यों", body: "कारण, इस क्रम में कि हर कारण से आपके कितने स्कोर अंक घटते हैं।" },
        {
          k: "02",
          title: "क्या बदलें",
          body: "निर्णय बदलने वाले सबसे छोटे व्यावहारिक बदलाव। आयु, आश्रित और होम लोन कभी योजना का हिस्सा नहीं होते।",
        },
        {
          k: "03",
          title: "कब, और कितनी बचत",
          body: "सबसे अच्छी और सबसे खराब स्थिति के साथ महीने-दर-महीने अनुमान, और योजना के बाद आवेदन करने पर रुपयों में ब्याज की बचत।",
        },
      ],
    },
    tools: {
      eyebrow: "आगे की योजना",
      title: "दो और टूल",
      goalTitle: "लक्ष्य योजनाकार",
      goalBody: "जो ऋण चाहिए वहाँ से शुरू करें, जैसे 3 साल के लिए 12% सालाना पर ₹5 लाख, और जानें कि कितना स्कोर चाहिए और वहाँ तक कैसे पहुँचें।",
      offerTitle: "ऑफ़र जाँच",
      offerBody: "किसी इंस्टेंट लोन ऐप का ऑफ़र डालें और फ़ीस व कम अवधि को जोड़कर उसकी असली सालाना लागत (APR) देखें।",
      open: "खोलें",
    },
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
    hero: {
      eyebrow: "भारतातील कर्जदारांसाठी",
      title: "कर्ज नाकारले? का, काय बदलायचे आणि पुन्हा अर्ज कधी करायचा ते पाहा.",
      body: "पाथवे तुमची क्रेडिट प्रोफाइल कर्जदात्याच्या स्कोअरिंग मॉडेलप्रमाणेच वाचतो. तो इंग्रजी, हिंदी किंवा मराठीत कारणे सांगतो, निर्णय बदलणारे सर्वात लहान व्यवहार्य बदल शोधतो, आणि तुम्ही कोणत्या महिन्यात पुन्हा अर्ज करू शकता ते दाखवतो.",
      cta: "माझे कर्ज तपासा",
      sample: "एक उदाहरण पाहा",
    },
    example: {
      title: "उदाहरण: आशा, 29",
      score: "पाथवे स्कोअर",
      needs: "मंजुरीसाठी आवश्यक",
      reasons: "मुख्य कारणे",
      plan: "योजना",
      approvedIn: "मंजुरी",
      months: "{n} महिन्यांत",
      saved: "{amount} च्या कर्जावर व्याजाची बचत",
      note: "एका नमुना अर्जदारासाठी पाथवे इंजिनचा खरा निकाल. कृत्रिम डेटा, खरी व्यक्ती नाही.",
    },
    steps: {
      eyebrow: "तुम्हाला काय मिळते",
      title: "तीन उत्तरे",
      aside: "जी नकाराच्या पत्रात क्वचितच मिळतात.",
      items: [
        { k: "01", title: "का", body: "कारणे, प्रत्येक कारणामुळे तुमचे किती स्कोअर गुण कमी होतात त्या क्रमाने." },
        {
          k: "02",
          title: "काय बदलायचे",
          body: "निर्णय बदलणारे सर्वात लहान व्यवहार्य बदल. वय, अवलंबित आणि गृहकर्जे कधीही योजनेचा भाग नसतात.",
        },
        {
          k: "03",
          title: "कधी, आणि किती बचत",
          body: "सर्वोत्तम आणि सर्वात वाईट स्थितीसह महिना-दर-महिना अंदाज, आणि योजनेनंतर अर्ज केल्यास रुपयांत व्याजाची बचत.",
        },
      ],
    },
    tools: {
      eyebrow: "पुढचे नियोजन",
      title: "आणखी दोन साधने",
      goalTitle: "ध्येय नियोजक",
      goalBody: "हवे असलेल्या कर्जापासून सुरुवात करा, उदा. 3 वर्षांसाठी 12% वार्षिक दराने ₹5 लाख, आणि किती स्कोअर लागेल व तिथे कसे पोहोचायचे ते पाहा.",
      offerTitle: "ऑफर तपासणी",
      offerBody: "इन्स्टंट लोन ॲपची ऑफर भरा आणि शुल्क व कमी मुदत धरून तिचा खरा वार्षिक खर्च (APR) पाहा.",
      open: "उघडा",
    },
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

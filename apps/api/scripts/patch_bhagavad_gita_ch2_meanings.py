#!/usr/bin/env python3
"""Fill chapter-2 meaning_en / meaning_ne on data/documents_source/bhagavad-gita.json.

Glosses follow this recension's 2.1–2.72 Sanskrit (not a copyrighted
published translation). Combined 2.42–43 in the source note are split here.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/bhagavad-gita.json"

CH2 = {
    "2.1": {
        "meaning_ne": "सञ्जयले भने: करुणाले ग्रस्त, आँसुले आँखा डुबेका, विषादमा डुबेका अर्जुनलाई मधुसूदनले यसो भने।",
        "meaning_en": "Sanjaya said: To Arjuna thus overcome with pity, eyes blurred with tears, sinking in grief, Madhusudana spoke these words.",
    },
    "2.2": {
        "meaning_ne": "श्रीभगवान्ले भने: हे अर्जुन, यो सङ्कटमा यो कश्मल तिमीमा कहाँबाट आयो? यो अनार्यले गर्ने काम हो, स्वर्ग दिँदैन, कीर्ति नाश गर्छ।",
        "meaning_en": "The Blessed Lord said: Whence has this faintheartedness come upon you in this crisis, Arjuna? It is not the way of the noble, it does not lead to heaven, and it brings disgrace.",
    },
    "2.3": {
        "meaning_ne": "हे पार्थ, नपुंसकतामा नजाओ; यो तिमीलाई सुहाउँदैन। क्षुद्र हृदयदौर्बल्य छाडेर उठ, हे परन्तप।",
        "meaning_en": "Do not yield to this impotence, O Partha; it does not become you. Cast off this petty weakness of heart and stand up, O scorcher of foes.",
    },
    "2.4": {
        "meaning_ne": "अर्जुनले भने: हे मधुसूदन, हे अरिसूदन, पूज्य भीष्म र द्रोणलाई युद्धमा बाणले कसरी सामना गरूँ?",
        "meaning_en": "Arjuna said: O Madhusudana, destroyer of foes, how can I strike with arrows in battle Bhishma and Drona, who are worthy of worship?",
    },
    "2.5": {
        "meaning_ne": "महानुभाव गुरुहरूलाई नमारी यस लोकमा भिक्षा खाएर बाँच्नु श्रेयस्कर छ। उनीहरू मारेर रगतले लिप्त भोग भोग्नुभन्दा।",
        "meaning_en": "Better to live in this world by begging than to slay these great-souled teachers. If I kill them, even for gain, the enjoyments I would eat here would be stained with blood.",
    },
    "2.6": {
        "meaning_ne": "हामी जित्ने कि उनीहरूले हामीलाई जित्ने, के श्रेय हो थाहा छैन। जसलाई मारेर बाँच्न चाहन्नौं, ती धार्तराष्ट्रहरू नै सामु उभिएका छन्।",
        "meaning_en": "We do not know which is better for us — that we should conquer them, or they us. Those whom we would not wish to live after killing now stand before us: the sons of Dhritarashtra.",
    },
    "2.7": {
        "meaning_ne": "कार्पण्यदोषले स्वभाव थलिएको, धर्ममा मोहित चित्तले म तिमीलाई सोध्छु: जे निश्चित श्रेय हो त्यो भन। म तिम्रो शिष्य हुँ, शरणागतलाई शिक्षा देओ।",
        "meaning_en": "My nature struck down by the fault of pity, my mind confused about dharma, I ask you: tell me for certain what is better. I am your disciple; teach me, who have taken refuge in you.",
    },
    "2.8": {
        "meaning_ne": "इन्द्रिय सुकाउने यो शोक हटाउने उपाय म देख्दिनँ — निष्कण्टक समृद्ध पृथ्वी राज्य वा देवहरूको अधिपत्य पाए पनि।",
        "meaning_en": "I see nothing that would drive off this grief that dries up my senses — not even an unrivalled prosperous kingdom on earth, nor lordship over the gods.",
    },
    "2.9": {
        "meaning_ne": "सञ्जयले भने: परन्तप गुडाकेशले हृषीकेशलाई यसो भनेर, «हे गोविन्द, म लड्दिनँ» भनी चुप लागे।",
        "meaning_en": "Sanjaya said: Having spoken thus to Hrishikesha, Gudakesha, scorcher of foes, said to Govinda, \"I will not fight,\" and fell silent.",
    },
    "2.10": {
        "meaning_ne": "हे भारत, दुवै सेनाको बीचमा विषादमा डुबेका उनलाई हृषीकेशले हाँसेजस्तै गरी यो वचन भने।",
        "meaning_en": "O Bharata, smiling as it were, Hrishikesha then spoke this to him who sat grieving between the two armies.",
    },
    "2.11": {
        "meaning_ne": "श्रीभगवान्ले भने: नशोच्नुपर्ने कुरामा तिमी शोक गर्छौ, र प्रज्ञाका कुरा पनि बोल्छौ। गएका र नगएका प्राणहरूका लागि पण्डितहरू शोक गर्दैनन्।",
        "meaning_en": "The Blessed Lord said: You grieve for those who should not be grieved, yet you speak words of wisdom. The wise do not grieve for the dead or for the living.",
    },
    "2.12": {
        "meaning_ne": "कहिल्यै यस्तो थिएन कि म थिइनँ, तिमी थिएनौ, यी राजहरू थिएनन्; र यसपछि हामी सबै हुनेछैनौं भन्ने पनि होइन।",
        "meaning_en": "Never was there a time when I was not, nor you, nor these lords of men; nor shall we all ever cease to be hereafter.",
    },
    "2.13": {
        "meaning_ne": "देहीले यस देहमा जसरी बाल्य, यौवन र जरा पाउँछ, त्यसरी नै अर्को देह पाउँछ; धीर त्यहाँ मोहित हुँदैन।",
        "meaning_en": "As the embodied one passes in this body from childhood to youth to old age, so he passes to another body; the steady one is not bewildered by that.",
    },
    "2.14": {
        "meaning_ne": "हे कौन्तेय, मात्रासम्पर्कले शीत-उष्ण, सुख-दुःख दिन्छन्; यी आउने-जाने अनित्य हुन् — हे भारत, सहो।",
        "meaning_en": "Contacts of the senses with their objects, O son of Kunti, give cold and heat, pleasure and pain. They come and go; they are fleeting. Endure them, O Bharata.",
    },
    "2.15": {
        "meaning_ne": "हे पुरुषर्षभ, यिनले नबिथोलिने, सुख-दुःखमा सम, धीर पुरुष अमृतत्वका लागि योग्य हुन्छ।",
        "meaning_en": "The person whom these do not torment, O best of men — the steady one, even-minded in pain and pleasure — is fit for immortality.",
    },
    "2.16": {
        "meaning_ne": "असत्को भाव हुँदैन, सत्को अभाव हुँदैन; यी दुवैको अन्त्य तत्त्वदर्शीहरूले देखेका छन्।",
        "meaning_en": "Of the unreal there is no being; of the real there is no non-being. The seers of truth have seen the end of both.",
    },
    "2.17": {
        "meaning_ne": "जसले यो सबै व्याप्त छ त्यो अविनाशी जान; यस अव्ययको विनाश कसैले गर्न सक्तैन।",
        "meaning_en": "Know that to be indestructible by which all this is pervaded. No one can bring about the destruction of this imperishable.",
    },
    "2.18": {
        "meaning_ne": "नित्य, अनाशी, अप्रमेय शरीरिन्का यी देह अन्त्यवान् भनिएका छन्; तसर्थ हे भारत, युद्ध गर।",
        "meaning_en": "These bodies of the eternal, indestructible, immeasurable embodied one are said to have an end. Therefore fight, O Bharata.",
    },
    "2.19": {
        "meaning_ne": "यसलाई मार्ने ठान्ने र मारिएको ठान्ने दुवै जान्दैनन्; यो न मार्छ, न मारिन्छ।",
        "meaning_en": "The one who thinks this the slayer, and the one who thinks it slain — both do not know. This does not slay, nor is it slain.",
    },
    "2.20": {
        "meaning_ne": "यो कहिल्यै जन्मँदैन, मर्दैन; भएर फेरि नहुने पनि होइन। अज, नित्य, शाश्वत, पुराण; शरीर मारिँदा पनि यो मारिँदैन।",
        "meaning_en": "It is never born, nor does it ever die; nor, having been, will it not be again. Unborn, eternal, everlasting, ancient — it is not slain when the body is slain.",
    },
    "2.21": {
        "meaning_ne": "हे पार्थ, यसलाई अविनाशी, नित्य, अज, अव्यय जान्ने पुरुष कसरी कसलाई मार्छ, कसलाई मार्न लगाउँछ?",
        "meaning_en": "The one who knows this as indestructible, eternal, unborn, and imperishable — how can that person, O Partha, cause anyone to be slain, or slay anyone?",
    },
    "2.22": {
        "meaning_ne": "जसरी मानिस पुराना वस्त्र छाडेर नयाँ लगाउँछ, त्यसरी देही जीर्ण शरीर छाडेर अरू नयाँमा जान्छ।",
        "meaning_en": "As a man casts off worn clothes and takes others that are new, so the embodied one casts off worn bodies and goes to others that are new.",
    },
    "2.23": {
        "meaning_ne": "यसलाई शस्त्रले काट्दैन, आगोले जलाउँदैन, पानीले भिज्दैन, वायुले सुकाउँदैन।",
        "meaning_en": "Weapons do not cut it, fire does not burn it, waters do not wet it, wind does not dry it.",
    },
    "2.24": {
        "meaning_ne": "यो अच्छेद्य, अदाह्य, अक्लेद्य, अशोष्य हो; नित्य, सर्वगत, स्थाणु, अचल, सनातन।",
        "meaning_en": "It cannot be cut, burned, wetted, or dried. It is eternal, all-pervading, stable, immovable, and everlasting.",
    },
    "2.25": {
        "meaning_ne": "यो अव्यक्त, अचिन्त्य, अविकार्य भनिन्छ; यसलाई यसरी जानेर तिमी शोक गर्न योग्य छैनौ।",
        "meaning_en": "It is called unmanifest, unthinkable, unchanging. Knowing it thus, you ought not to grieve.",
    },
    "2.26": {
        "meaning_ne": "यदि यसलाई सधैं जन्मने र सधैं मर्ने ठान्छौ भने पनि, हे महाबाहो, यसरी शोक गर्न योग्य छैनौ।",
        "meaning_en": "And if you hold it to be always born and always dying, even then, O mighty-armed, you ought not to grieve thus.",
    },
    "2.27": {
        "meaning_ne": "जन्मेकोको मृत्यु निश्चित छ, मरेकोको जन्म निश्चित छ; यस अपरिहार्य कुरामा तिमी शोक गर्न योग्य छैनौ।",
        "meaning_en": "For one who is born, death is certain; for one who has died, birth is certain. Therefore you ought not to grieve over an unavoidable matter.",
    },
    "2.28": {
        "meaning_ne": "हे भारत, भूतहरू आदिमा अव्यक्त, मध्यमा व्यक्त, अन्तमा फेरि अव्यक्त हुन्; त्यहाँ के विलाप?",
        "meaning_en": "Beings are unmanifest in the beginning, manifest in the middle, unmanifest again at the end, O Bharata. What is there to lament?",
    },
    "2.29": {
        "meaning_ne": "कोही यसलाई आश्चर्य मान्छ, कोही आश्चर्य भन्छ, कोही आश्चर्य सुन्छ; सुनेर पनि कुनै-कुनै जान्दैन।",
        "meaning_en": "Someone sees this as a wonder, another speaks of it as a wonder, another hears of it as a wonder; and even having heard, no one truly knows it.",
    },
    "2.30": {
        "meaning_ne": "हे भारत, सबैको देहमा रहने यो देही सधैं अवध्य छ; तसर्थ सबै भूतका लागि तिमी शोक गर्न योग्य छैनौ।",
        "meaning_en": "This embodied one in the body of all is eternally unslayable, O Bharata. Therefore you ought not to grieve for any being.",
    },
    "2.31": {
        "meaning_ne": "स्वधर्म हेरेर पनि तिमी डगमगाउन योग्य छैनौ; क्षत्रियका लागि धर्म्य युद्धभन्दा अर्को श्रेय छैन।",
        "meaning_en": "Looking also to your own dharma, you ought not to waver. For a kshatriya there is nothing better than a battle that is righteous.",
    },
    "2.32": {
        "meaning_ne": "अनायास आएको यो युद्ध सुखी क्षत्रियहरूले पाउँछन्, हे पार्थ — स्वर्गको द्वार खुलेको जस्तै।",
        "meaning_en": "Happy the kshatriyas, O Partha, who obtain such a battle unsought, as an open gate to heaven.",
    },
    "2.33": {
        "meaning_ne": "यदि तिमी यो धर्म्य संग्राम गर्दैनौ भने स्वधर्म र कीर्ति छाडेर पाप पाउनेछौ।",
        "meaning_en": "But if you will not wage this righteous war, then, abandoning your own dharma and fame, you will incur sin.",
    },
    "2.34": {
        "meaning_ne": "प्राणीहरू तिमीलाई अनन्त अकीर्ति भन्नेछन्; सम्मानितको लागि अकीर्ति मृत्युभन्दा पनि बढी हो।",
        "meaning_en": "Beings will tell of your unending disgrace; and for one who has been honoured, disgrace is worse than death.",
    },
    "2.35": {
        "meaning_ne": "महारथीहरू तिमीलाई भयले युद्ध छाडेको ठान्नेछन्; जसका नजरमा तिमी ठूला थियौ, त्यहाँ तुच्छ हुनेछौ।",
        "meaning_en": "The great warriors will think you withdrew from battle out of fear; having been highly regarded by them, you will come to lightness.",
    },
    "2.36": {
        "meaning_ne": "तिम्रा शत्रुहरू धेरै नबोल्नुपर्ने कुरा भनेर तिम्रो सामर्थ्य निन्दा गर्नेछन्; त्योभन्दा दुःख के हो?",
        "meaning_en": "Your enemies will speak many unspeakable things, scoffing at your strength. What could be more painful than that?",
    },
    "2.37": {
        "meaning_ne": "मारिए स्वर्ग पाउनेछौ, जिते पृथ्वी भोग्नेछौ; तसर्थ हे कौन्तेय, युद्धको निश्चय गरेर उठ।",
        "meaning_en": "If slain you will gain heaven; if victorious you will enjoy the earth. Therefore stand up, O son of Kunti, resolved on battle.",
    },
    "2.38": {
        "meaning_ne": "सुख-दुःख, लाभ-हानि, जय-पराजयलाई सम मानेर युद्धमा लाग्; यसरी पाप लाग्दैन।",
        "meaning_en": "Holding pleasure and pain, gain and loss, victory and defeat as equal, then yoke yourself to battle. Thus you will not incur sin.",
    },
    "2.39": {
        "meaning_ne": "यो बुद्धि तिमीलाई साङ्ख्यमा भनियो; अब योगमा यो सुन। यस बुद्धिले युक्त भए कर्मबन्धन छाड्नेछौ, हे पार्थ।",
        "meaning_en": "This understanding has been declared to you in Sankhya; now hear it in yoga. Yoked with this insight, O Partha, you will cast off the bondage of action.",
    },
    "2.40": {
        "meaning_ne": "यहाँ आरम्भको नाश छैन, प्रत्यवाय पनि छैन; यस धर्मको थोरै अंशले पनि महान् भयबाट बचाउँछ।",
        "meaning_en": "In this there is no loss of effort, nor any reverse. Even a little of this dharma protects from great fear.",
    },
    "2.41": {
        "meaning_ne": "हे कुरुनन्दन, यहाँ व्यवसायात्मिका बुद्धि एक हो; अव्यवसायीहरूका बुद्धि चाहिँ अनेक शाखा, अनन्त।",
        "meaning_en": "Here the understanding that is resolute is one, O joy of the Kurus; the thoughts of the irresolute are many-branched and endless.",
    },
    "2.42": {
        "meaning_ne": "हे पार्थ, पुष्पित वाणी बोल्ने अविपश्चित्हरू, वेदवादमा रमाउने, «यसबाहेक अरू छैन» भन्नेहरू;",
        "meaning_en": "The unwise speak this flowery speech, O Partha — devoted to the letter of the Veda, saying there is nothing else.",
    },
    "2.43": {
        "meaning_ne": "काममय, स्वर्गपरायण; जन्म-कर्मफल दिने, भोग-ऐश्वर्यतिर लैजाने अनेक क्रियाहरू भन्ने।",
        "meaning_en": "Full of desire, heaven as their goal, they recommend many rites that yield birth and the fruit of works, aimed at enjoyment and lordship.",
    },
    "2.44": {
        "meaning_ne": "भोग-ऐश्वर्यमा आसक्त, त्यस वाणीले चित्त हरिएकाहरूमा समाधिमा व्यवसायात्मिका बुद्धि बन्दैन।",
        "meaning_en": "For those attached to enjoyment and lordship, their minds carried away by that speech, the resolute understanding is not established in samadhi.",
    },
    "2.45": {
        "meaning_ne": "वेदहरू त्रैगुण्यका विषय हुन्; हे अर्जुन, त्रिगुणभन्दा पर होओ — निर्द्वन्द्व, नित्य सत्त्वमा स्थित, योगक्षेममुक्त, आत्मवान्।",
        "meaning_en": "The Vedas have the three gunas as their scope. Become free of the three gunas, Arjuna — beyond the pairs, established in abiding sattva, free of getting and keeping, possessed of the Self.",
    },
    "2.46": {
        "meaning_ne": "जति प्रयोजन सानो कुवामा, सबैतिर जल भरिएको ठूलो जलाशयमा त्यो सबै हुन्छ; जान्ने ब्राह्मणका लागि सबै वेदमा त्यति नै हो।",
        "meaning_en": "As much use as there is in a well when water is flooding everywhere, so much is there in all the Vedas for a brahmana who knows.",
    },
    "2.47": {
        "meaning_ne": "कर्ममा मात्र तिम्रो अधिकार छ, फलमा कहिल्यै होइन। कर्मफलको हेतु नबन; अकर्ममा पनि आसक्ति नहोस्।",
        "meaning_en": "Your claim is to action alone, never to its fruits. Do not be the cause of the fruits of works; let there be no attachment in you to inaction.",
    },
    "2.48": {
        "meaning_ne": "हे धनञ्जय, सङ्ग छाडेर योगमा स्थित भई कर्म गर; सिद्धि-असिद्धिमा सम भएर — समत्व नै योग भनिन्छ।",
        "meaning_en": "Fixed in yoga, perform actions, O Dhananjaya, abandoning attachment, even-minded in success and failure. Evenness is called yoga.",
    },
    "2.49": {
        "meaning_ne": "हे धनञ्जय, बुद्धियोगबाट कर्म धेरै तुच्छ छ; बुद्धिमा शरण खोज। फललाई हेतु मान्नेहरू कृपण हुन्।",
        "meaning_en": "Action is far inferior to the yoga of insight, O Dhananjaya. Seek refuge in insight. Wretched are those who make the fruit their motive.",
    },
    "2.50": {
        "meaning_ne": "बुद्धियुक्त यस लोकमै सुकृत र दुष्कृत दुवै छाड्छ; तसर्थ योगमा लाग् — योग कर्ममा कौशल हो।",
        "meaning_en": "The one yoked in insight casts off here both good and ill deed. Therefore yoke yourself to yoga; yoga is skill in action.",
    },
    "2.51": {
        "meaning_ne": "बुद्धियुक्त मनीषीहरू कर्मज फल त्यागेर जन्मबन्धनमुक्त भई अनामय पदमा जान्छन्।",
        "meaning_en": "The wise, yoked in insight, abandoning the fruit born of works, freed from the bond of birth, go to the place beyond ill.",
    },
    "2.52": {
        "meaning_ne": "जब तिम्रो बुद्धि मोहको कलिल पार गर्नेछ, तब सुनिएको र सुन्नुपर्नेबाट निर्वेद हुनेछौ।",
        "meaning_en": "When your insight has crossed the thicket of delusion, then you will become indifferent to what has been heard and what is yet to be heard.",
    },
    "2.53": {
        "meaning_ne": "श्रुतिले विचलित तिम्रो बुद्धि जब निश्चल रहनेछ, समाधिमा अचल, तब योग पाउनेछौ।",
        "meaning_en": "When your insight, confused by the many hearings, stands unmoved, unshaken in samadhi, then you will attain yoga.",
    },
    "2.54": {
        "meaning_ne": "अर्जुनले भने: हे केशव, समाधिस्थित स्थितप्रज्ञको के लक्षण? स्थितधी कसरी बोल्छ, बस्छ, हिँड्छ?",
        "meaning_en": "Arjuna said: O Keshava, what is the description of one of steady insight, established in samadhi? How does one of steady wisdom speak, sit, walk?",
    },
    "2.55": {
        "meaning_ne": "श्रीभगवान्ले भने: हे पार्थ, जब मनका सबै काम छाड्छ, आत्मामा आत्माद्वारा सन्तुष्ट हुन्छ, त्यस बेला स्थितप्रज्ञ भनिन्छ।",
        "meaning_en": "The Blessed Lord said: When one abandons all desires of the mind, O Partha, and is content in the Self by the Self, then one is called of steady insight.",
    },
    "2.56": {
        "meaning_ne": "दुःखमा अनुद्विग्न मन, सुखमा स्पृहारहित, राग-भय-क्रोध मुक्त — त्यस स्थितधीलाई मुनि भनिन्छ।",
        "meaning_en": "The one whose mind is unshaken in sorrows, without longing in pleasures, free of passion, fear, and anger, is called a sage of steady wisdom.",
    },
    "2.57": {
        "meaning_ne": "सर्वत्र अनासक्त, शुभ-अशुभ पाएर न खुशी हुने न द्वेष गर्ने — त्यसको प्रज्ञा प्रतिष्ठित छ।",
        "meaning_en": "The one who is without clinging anywhere, who neither rejoices nor hates on meeting good or ill — that one's insight is established.",
    },
    "2.58": {
        "meaning_ne": "कछुवाले अङ्ग जस्तै जब यो इन्द्रियहरूलाई इन्द्रियार्थबाट सबैतिर समेट्छ, त्यसको प्रज्ञा प्रतिष्ठित छ।",
        "meaning_en": "When one draws in the senses from their objects on every side, as a tortoise draws in its limbs, that one's insight is established.",
    },
    "2.59": {
        "meaning_ne": "निराहार देहीका विषय हट्छन्, रस बाँकी रहन्छ; पर देखेपछि रस पनि हट्छ।",
        "meaning_en": "Objects turn away from the embodied one who does not feed on them, but the taste remains; even the taste turns away when the highest is seen.",
    },
    "2.60": {
        "meaning_ne": "हे कौन्तेय, प्रयत्न गर्ने विपश्चित् पुरुषको पनि प्रमथी इन्द्रियहरूले मन बलपूर्वक हरिदिन्छन्।",
        "meaning_en": "Even of a discriminating person who is striving, O son of Kunti, the turbulent senses carry away the mind by force.",
    },
    "2.61": {
        "meaning_ne": "ती सबै संयम गरेर मत्पर भई युक्त बस्नु; जसका इन्द्रिय वशमा छन्, त्यसको प्रज्ञा प्रतिष्ठित छ।",
        "meaning_en": "Restraining them all, one should sit yoked, intent on Me. The one whose senses are under control — that one's insight is established.",
    },
    "2.62": {
        "meaning_ne": "विषयहरूको ध्यान गर्दा तिनमा सङ्ग जन्मन्छ; सङ्गबाट काम, कामबाट क्रोध जन्मन्छ।",
        "meaning_en": "Dwelling on objects, a person develops attachment to them; from attachment arises desire; from desire, anger is born.",
    },
    "2.63": {
        "meaning_ne": "क्रोधबाट सम्मोह, सम्मोहबाट स्मृतिविभ्रम, स्मृतिभ्रंशबाट बुद्धिनाश, बुद्धिनाशबाट पतन।",
        "meaning_en": "From anger comes delusion; from delusion, wandering of memory; from loss of memory, destruction of insight; from destruction of insight, one is lost.",
    },
    "2.64": {
        "meaning_ne": "राग-द्वेषमुक्त, आत्मवश इन्द्रियले विषयमा चरने विधेयात्मा प्रसाद पाउँछ।",
        "meaning_en": "But moving among objects with the senses freed from attraction and aversion, self-controlled, the disciplined self attains clarity.",
    },
    "2.65": {
        "meaning_ne": "प्रसादमा सबै दुःखको हानि हुन्छ; प्रसन्न चित्तको बुद्धि चाँडै स्थिर हुन्छ।",
        "meaning_en": "In that clarity, all his sorrows cease; the intelligence of one whose mind is clear soon stands firm.",
    },
    "2.66": {
        "meaning_ne": "अयुक्तको बुद्धि हुँदैन, भावना पनि हुँदैन; भावना नभएकोलाई शान्ति छैन; अशान्तलाई सुख कहाँ?",
        "meaning_en": "There is no insight for the unyoked, nor meditation; without meditation there is no peace; and without peace, where is happiness?",
    },
    "2.67": {
        "meaning_ne": "चरिरहेका इन्द्रियमध्ये मन जसलाई पछ्याउँछ, त्यो प्रज्ञा हर्छ — जलमा नाउँ वायुले जस्तै।",
        "meaning_en": "When the mind is led by the roaming senses, it carries away a person's insight, as the wind carries a boat on the water.",
    },
    "2.68": {
        "meaning_ne": "तसर्थ हे महाबाहो, जसका इन्द्रिय इन्द्रियार्थबाट सबैतिर निगृहीत छन्, त्यसको प्रज्ञा प्रतिष्ठित छ।",
        "meaning_en": "Therefore, O mighty-armed, the one whose senses are held back on every side from their objects — that one's insight is established.",
    },
    "2.69": {
        "meaning_ne": "सबै भूतका लागि रात जो हो, त्यसमा संयमी जाग्छ; भूतहरू जाग्ने बेला ज्ञानी मुनिका लागि रात हो।",
        "meaning_en": "What is night for all beings, in that the restrained one is awake; when beings are awake, that is night for the sage who sees.",
    },
    "2.70": {
        "meaning_ne": "जसरी नदीहरू भरिँदै स्थिर समुद्रमा प्रवेश गर्छन्, त्यसरी सबै काम जसमा प्रवेश गर्छन् उसले शान्ति पाउँछ — कामकामीले होइन।",
        "meaning_en": "As waters enter the ocean, filled yet unmoved in its bed, so the one into whom all desires enter attains peace — not the one who chases desires.",
    },
    "2.71": {
        "meaning_ne": "सबै काम छाडेर निःस्पृह विचरने, निर्मम, निरहङ्कार पुरुषले शान्ति पाउँछ।",
        "meaning_en": "The person who lives abandoning all desires, without longing, without the sense of mine, without I-making — that one attains peace.",
    },
    "2.72": {
        "meaning_ne": "हे पार्थ, यो ब्राह्मी स्थिति हो; यो पाएपछि मोहित हुँदैन। अन्तकालमा पनि यसमा स्थित भए ब्रह्मनिर्वाण पाउँछ।",
        "meaning_en": "This is the brahmi state, O Partha; attaining it, one is not deluded. Established in it even at the time of death, one reaches brahma-nirvana.",
    },
}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    chapter = next(c for c in data["chapters"] if c["number"] == 2)
    missing = []
    filled = 0
    for shloka in chapter["shlokas"]:
        extra = CH2.get(shloka["verse_label"])
        if extra is None:
            if shloka["verse_label"].startswith("इति"):
                continue
            missing.append(shloka["verse_label"])
            continue
        shloka["meaning_ne"] = extra["meaning_ne"]
        shloka["meaning_en"] = extra["meaning_en"]
        filled += 1
    if missing:
        raise SystemExit(f"no gloss for {missing}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"filled {filled} chapter-2 meanings in {OUT}")


if __name__ == "__main__":
    main()

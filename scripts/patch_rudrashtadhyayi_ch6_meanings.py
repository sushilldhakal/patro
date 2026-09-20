#!/usr/bin/env python3
"""Fill chapter-6 (Rudra Suktam / Namakam) meaning_en / meaning_ne on
data/documents_source/rudrashtadhyayi.json.

The Namakam (Taittiriya Samhita 4.5) is the single most widely
published Vedic hymn after the Gayatri — every mainstream Rudram
edition (Sivananda, Ramakrishna Math, Chinmaya Mission) carries a
near-identical standard English gloss for its 11 anuvakas. This
follows that standard rendering, translated directly against this
manifest's own Sanskrit and verse breaks. High confidence throughout;
the long litany sections (6.17-6.46) are salutations naming Rudra's
countless forms/functions ("lord of X, salutation") and are rendered
as the parallel "salutation to..." lists every published translation
uses.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/rudrashtadhyayi.json"

CH6 = {
    "6.1": {
        "meaning_ne": "हे रुद्र, तपाईंको क्रोधलाई नमस्कार, र तपाईंको बाणलाई पनि नमस्कार। तपाईंका दुई बाहुलाई पनि नमस्कार।",
        "meaning_en": "Salutation to Thy wrath, O Rudra, and salutation to Thine arrow; salutation also to Thy two arms.",
    },
    "6.2": {
        "meaning_ne": "हे रुद्र, तपाईंको जुन रूप कल्याणकारी, भयरहित र अशुभरहित छ, त्यही अत्यन्त शान्तिदायी रूपले, हे गिरिशन्त (पर्वतवासी), हामीलाई हेर्नुहोस्।",
        "meaning_en": "That form of Thine, O Rudra, which is auspicious, not terrible, and shows no evil — with that most benign form, O dweller of the mountain, look upon us.",
    },
    "6.3": {
        "meaning_ne": "हे गिरिशन्त, तपाईंले हातमा चलाउनका लागि बोकेको त्यो बाणलाई कल्याणकारी बनाइदिनुहोस्, हे गिरित्र, मानिस र संसारलाई हानि नगर्नुहोस्।",
        "meaning_en": "O dweller of the mountain, the arrow which Thou holdest in Thy hand to shoot — make that auspicious, O protector of the mountain; harm not man or any living being.",
    },
    "6.4": {
        "meaning_ne": "हे गिरिश, हामी तपाईंसँग कल्याणकारी वचनले बोल्दछौं, ताकि यो सम्पूर्ण संसार रोगरहित र प्रसन्नचित्त होस्।",
        "meaning_en": "With an auspicious word we address Thee, O dweller of the mountain, so that this whole world may be free of disease and of good mind.",
    },
    "6.5": {
        "meaning_ne": "प्रथम, दिव्य वैद्यले सबैभन्दा उच्च स्वरमा भन्नुभयो — सम्पूर्ण सर्पहरूलाई कुल्च्याउँदै र सम्पूर्ण राक्षसीहरूलाई तल र टाढा धपाउँदै।",
        "meaning_en": "The eloquent one, the foremost, the divine physician, has spoken: crushing all serpents and driving away all evil spirits downward and away from us.",
    },
    "6.6": {
        "meaning_ne": "जो ताम्रवर्ण, अरुण र भूरो रङका अत्यन्त मङ्गलमय हुनुहुन्छ, र जो रुद्रहरू उहाँको चारैतिर दिशाहरूमा सयौं-हजारौंको सङ्ख्यामा आश्रित हुनुहुन्छ, ती सबैको क्रोध हामी शान्त पार्न चाहन्छौं।",
        "meaning_en": "That one who is copper-colored, red, and tawny, the most auspicious one, and those Rudras who dwell around Him in the directions, by the thousands — we entreat that their wrath be turned away.",
    },
    "6.7": {
        "meaning_ne": "जो नीलकण्ठ र रातो वर्णका देव तल ओर्लिनुहुन्छ, उहाँलाई गोठालाहरूले देखेका छन्, पानी बोक्ने महिलाहरूले पनि देखेका छन्; देखिनुभएपछि उहाँले हामीलाई सुख प्रदान गरून्।",
        "meaning_en": "That one who glides down, blue-necked and red in hue — the cowherds have seen Him, the water-carrying women have seen Him; may He, having been seen, grant us happiness.",
    },
    "6.8": {
        "meaning_ne": "नीलकण्ठ, सहस्राक्ष, वरदायी देवलाई नमस्कार होस्; र उहाँका अनुचरहरूलाई पनि मैले नमस्कार अर्पण गरेको छु।",
        "meaning_en": "Salutation be to the blue-necked, thousand-eyed, bounteous one; and to His attendant beings also, I have offered salutation.",
    },
    "6.9": {
        "meaning_ne": "तपाईंले धनुषका दुवै छेउबाट प्रत्यञ्चा फुकाइदिनुहोस्, र तपाईंको हातमा भएका बाणहरू पनि टाढा फालिदिनुहोस्, हे भगवन्।",
        "meaning_en": "Loosen the bowstring from both ends of Thy bow; and the arrows which are in Thy hand, O Lord, cast them away.",
    },
    "6.10": {
        "meaning_ne": "कपर्दी (जटाधारी)को धनुष प्रत्यञ्चारहित होस्, बाणरहित होस्; र उहाँका बाँकी रहेका बाणहरू र तुणीर पनि निष्क्रिय बनून्।",
        "meaning_en": "Unstrung be the bow of the matted-haired one, without a shaft, without arrows; and may His remaining arrows and quiver be rendered harmless.",
    },
    "6.11": {
        "meaning_ne": "हे परम वरदायी, तपाईंको हातमा भएको जुन हतियार धनुष बन्यो, त्यसैले हामीलाई सबैतिरबाट रोगरहित भई रक्षा गर्नुहोस्।",
        "meaning_en": "O most bounteous one, with that weapon of Thine that became Thy bow in Thy hand, protect us on all sides, keeping us free from disease.",
    },
    "6.12": {
        "meaning_ne": "तपाईंको धनुषको हतियार हामीलाई सबैतिरबाट छाडेर जाओस्; र तपाईंको तुणीर हामीबाट टाढा राख्नुहोस्।",
        "meaning_en": "May the weapon of Thy bow pass us by on all sides; and place Thy quiver far away from us.",
    },
    "6.13": {
        "meaning_ne": "हे सहस्राक्ष, सयौं तुणीरधारी, आफ्नो धनुष खोलेर र बाणका टुप्पाहरू बुधो पारेर, हाम्रोप्रति कल्याणकारी र प्रसन्नचित्त हुनुहोस्।",
        "meaning_en": "O Thou of a thousand eyes and a hundred quivers, having unstrung Thy bow and blunted the points of Thy arrows, be gracious and well-disposed towards us.",
    },
    "6.14": {
        "meaning_ne": "हे साहसी, तपाईंको प्रत्यञ्चारहित हतियारलाई नमस्कार; तपाईंका दुई बाहु र तपाईंको धनुषलाई पनि नमस्कार।",
        "meaning_en": "Salutation to Thy weapon that is unstrung, O bold one; salutation also to both Thine arms and to Thy bow.",
    },
    "6.15": {
        "meaning_ne": "हाम्रा ठूला वा साना कसैलाई नमार्नुहोस्, बढ्दो वा पूर्ण बढेकोलाई नमार्नुहोस्। हाम्रा पिता वा माताको वध नगर्नुहोस्; हे रुद्र, हामीलाई प्रिय शरीरहरूलाई हानि नगर्नुहोस्।",
        "meaning_en": "Slay not our great ones, nor our small ones; slay not our growing ones, nor our grown ones; slay not our father, nor our mother; harm not, O Rudra, the bodies dear to us.",
    },
    "6.16": {
        "meaning_ne": "हाम्रा सन्तान र नाति-नातिनालाई, हाम्रो आयुलाई, हाम्रा गाई र घोडाहरूलाई हानि नगर्नुहोस्। हे रुद्र, क्रोधमा आई हाम्रा वीरहरूलाई नमार्नुहोस्; हामी हविसहित सधैं तपाईंलाई नै आह्वान गर्दछौं।",
        "meaning_en": "Harm not our children and grandchildren, nor our lifespan; harm not our cattle, nor our horses. Slay not our brave men in Thy anger, O Rudra — we, with oblations, ever invoke Thee.",
    },
    "6.17": {
        "meaning_ne": "स्वर्णबाहु, सेनाध्यक्ष र दिशाहरूका स्वामीलाई नमस्कार; वृक्षहरू र हरितकेशीहरूका, पशुहरूका स्वामीलाई नमस्कार; हरितपिँगल, तेजस्वी, मार्गहरूका स्वामीलाई नमस्कार; हरितकेशी, यज्ञोपवीतधारी, पुष्ट प्राणीहरूका स्वामीलाई नमस्कार।",
        "meaning_en": "Salutation to the golden-armed one, the leader of hosts, the lord of the quarters; salutation to Him of the trees, of the green hair, the lord of animals; salutation to Him of the tawny hue, the radiant one, the lord of paths; salutation to Him of the green hair, wearing the sacred thread, the lord of the well-nourished.",
    },
    "6.18": {
        "meaning_ne": "भूरो वर्ण, शिकारी, अन्नका स्वामीलाई नमस्कार; भवको हतियार, संसारका स्वामीलाई नमस्कार; धनुष ताने रुद्र, खेतहरूका स्वामीलाई नमस्कार; सारथि, संहारक, वनहरूका स्वामीलाई नमस्कार।",
        "meaning_en": "Salutation to the brown one, the hunter, the lord of food; salutation to the weapon of Bhava, the lord of the world; salutation to Rudra with His bow bent, the lord of fields; salutation to the charioteer, the slayer, the lord of forests.",
    },
    "6.19": {
        "meaning_ne": "रातो वर्ण, शिल्पी, वृक्षहरूका स्वामीलाई नमस्कार; सर्वव्यापी, कल्याणकारी, ओषधिहरूका स्वामीलाई नमस्कार; सल्लाहकार, व्यापारी, झाडीहरूका स्वामीलाई नमस्कार; उच्च घोष गर्ने, पुकार्ने, पैदल सैनिकहरूका स्वामीलाई नमस्कार।",
        "meaning_en": "Salutation to the red one, the master-builder, the lord of trees; salutation to Him who is all-pervading, the bestower of good, the lord of herbs; salutation to the counselor, the merchant, the lord of thickets; salutation to Him of the loud roar, who calls out, the lord of foot-soldiers.",
    },
    "6.20": {
        "meaning_ne": "पूर्ण वेगले दौड्ने, प्राणीहरूका स्वामीलाई नमस्कार; सहनशील, भेद्ने, भेदन गर्नेहरूका स्वामीलाई नमस्कार; तुणीरधारी, श्रेष्ठ, चोरहरूका स्वामीलाई नमस्कार; लुकेर हिँड्ने, विचरण गर्ने, वनहरूका स्वामीलाई नमस्कार।",
        "meaning_en": "Salutation to Him who runs swiftly and completely, the lord of beings; salutation to the all-enduring one, the piercer, the lord of the piercing ones; salutation to the quiver-bearer, the eminent one, the lord of thieves; salutation to Him who moves stealthily, the lord of forests.",
    },
    "6.21": {
        "meaning_ne": "छली, अत्यन्त छली, लुकेर चोर्नेहरूका स्वामीलाई नमस्कार; तुणीर र बाणधारी, डाँकुहरूका स्वामीलाई नमस्कार; भाला बोकी मार्न खोज्नेहरू, लुट्नेहरूका स्वामीलाई नमस्कार; तरवारधारी, रातमा विचरण गर्नेहरू, काट्नेहरूका स्वामीलाई नमस्कार।",
        "meaning_en": "Salutation to the deceiver and the arch-deceiver, the lord of concealed thieves; salutation to the quiver-bearer with arrows, the lord of robbers; salutation to those armed with spears, seeking to kill, the lord of plunderers; salutation to those bearing swords, roaming by night, the lord of those who cut and wound.",
    },
    "6.22": {
        "meaning_ne": "फेटाधारी, पर्वतमा विचरण गर्ने, सेँधमार्नेहरूका स्वामीलाई नमस्कार; बाण र धनुषधारी तिमीहरूलाई नमस्कार; धनुष तान्ने र बाण जडान गर्नेहरू तिमीहरूलाई नमस्कार; धनुष तान्ने र बाण छाड्नेहरू तिमीहरूलाई नमस्कार।",
        "meaning_en": "Salutation to the turbaned one who roams the mountains, the lord of burglars; salutation to you who bear arrows and bows; salutation to you who string the bow and fit the arrow; salutation to you who draw and let fly the arrow.",
    },
    "6.23": {
        "meaning_ne": "बाण छाड्ने र प्रहार गर्ने तिमीहरूलाई नमस्कार; सुत्ने र ब्युँझने तिमीहरूलाई नमस्कार; ढल्केर बस्ने र बसिरहनेहरू तिमीहरूलाई नमस्कार; उभिने र दौडनेहरू तिमीहरूलाई नमस्कार।",
        "meaning_en": "Salutation to you who release the arrow and who pierce; salutation to you who sleep and who are awake; salutation to you who lie down and who sit; salutation to you who stand and who run.",
    },
    "6.24": {
        "meaning_ne": "सभाहरू र सभापतिहरू तिमीहरूलाई नमस्कार; घोडाहरू र घोडाका स्वामीहरू तिमीहरूलाई नमस्कार; भेद्ने र विविध रूपमा घाइते पार्नेहरू तिमीहरूलाई नमस्कार; उग्र सेनाहरू र कुल्च्याउनेहरू तिमीहरूलाई नमस्कार।",
        "meaning_en": "Salutation to the assemblies and to their lords; salutation to horses and to lords of horses; salutation to the piercing hosts and to those who wound variously; salutation to the fierce troops and to those who crush.",
    },
    "6.25": {
        "meaning_ne": "गणहरू र गणपतिहरू तिमीहरूलाई नमस्कार; व्रातहरू (समूहहरू) र व्रातपतिहरू तिमीहरूलाई नमस्कार; बुद्धिमानहरू र तिनका स्वामीहरू तिमीहरूलाई नमस्कार; विविध रूपधारी र सर्वरूपधारी तिमीहरूलाई नमस्कार।",
        "meaning_en": "Salutation to the hosts and to the lords of hosts; salutation to the bands and to the lords of bands; salutation to the wise ones and to the lords of the wise; salutation to those of varied forms and to those of every form.",
    },
    "6.26": {
        "meaning_ne": "सेनाहरू र सेनापतिहरू तिमीहरूलाई नमस्कार; रथीहरू र रथरहितहरू तिमीहरूलाई नमस्कार; सहायकहरू र सङ्ग्रहकर्ताहरू तिमीहरूलाई नमस्कार; ठूला र साना तिमीहरूलाई नमस्कार।",
        "meaning_en": "Salutation to armies and to leaders of armies; salutation to charioteers and to those without chariots; salutation to attendants and to charioteer's helpers; salutation to the great and to the small.",
    },
    "6.27": {
        "meaning_ne": "सिकर्मीहरू र रथकारहरू तिमीहरूलाई नमस्कार; कुमालेहरू र फलामेहरू तिमीहरूलाई नमस्कार; माछा मार्नेहरू र फन्दा थाप्नेहरू तिमीहरूलाई नमस्कार; कुकुर पाल्नेहरू र सिकारीहरू तिमीहरूलाई नमस्कार।",
        "meaning_en": "Salutation to carpenters and to chariot-makers; salutation to potters and to smiths; salutation to fowlers and to those who trap; salutation to dog-keepers and to hunters.",
    },
    "6.28": {
        "meaning_ne": "कुकुरहरू र कुकुरका स्वामीहरू तिमीहरूलाई नमस्कार; भव र रुद्रलाई नमस्कार; शर्व र पशुपतिलाई नमस्कार; नीलकण्ठ र श्वेतकण्ठलाई नमस्कार।",
        "meaning_en": "Salutation to dogs and to lords of dogs; salutation to Bhava and to Rudra; salutation to Sharva and to Pashupati; salutation to the blue-necked one and to the white-throated one.",
    },
    "6.29": {
        "meaning_ne": "जटाधारी र मुण्डितकेशीलाई नमस्कार; सहस्राक्ष र शतधनुर्धारीलाई नमस्कार; पर्वतवासी र सर्वव्यापीलाई नमस्कार; अत्यन्त वरदायी र बाणधारीलाई नमस्कार।",
        "meaning_en": "Salutation to the matted-haired one and to the shaven-headed one; salutation to the thousand-eyed one and to Him of a hundred bows; salutation to Him who dwells on the mountain and to Him who pervades all; salutation to the most bounteous one and to Him who is armed with arrows.",
    },
    "6.30": {
        "meaning_ne": "होचो र होचोभन्दा साना (बौना)लाई नमस्कार; विशाल र सबैभन्दा ठूलालाई नमस्कार; वृद्ध र सधैं बढ्नेलाई नमस्कार; अग्रणी र प्रथमलाई नमस्कार।",
        "meaning_en": "Salutation to the short one and to the dwarf; salutation to the vast one and to the greatest; salutation to the aged one and to the ever-growing one; salutation to the foremost and to the first.",
    },
    "6.31": {
        "meaning_ne": "द्रुतगामी र वेगवानलाई नमस्कार; शीघ्रगामी र तीव्रलाई नमस्कार; लहरका र गहिराइकालाई नमस्कार; नदीका र टापुकालाई नमस्कार।",
        "meaning_en": "Salutation to the swift one and to the fleet one; salutation to the quick one and to the rapid one; salutation to Him of the waves and to Him of the depths; salutation to Him of the rivers and to Him of the islands.",
    },
    "6.32": {
        "meaning_ne": "ज्येष्ठ र कनिष्ठलाई नमस्कार; पूर्वजन्मा र पछिजन्मालाई नमस्कार; मध्यमलाई र अझै अप्रकटलाई नमस्कार; अन्तिमलाई र मूलमा रहनेलाई नमस्कार।",
        "meaning_en": "Salutation to the eldest and to the youngest; salutation to the first-born and to the later-born; salutation to the middlemost and to the not-yet-manifest; salutation to the last and to Him who dwells at the root.",
    },
    "6.33": {
        "meaning_ne": "सभासम्बन्धी र घेर्नेलाई नमस्कार; सङ्यमसम्बन्धी र सुरक्षासम्बन्धीलाई नमस्कार; प्रशंसनीय र विश्रामस्थलसम्बन्धीलाई नमस्कार; उर्वर खेतसम्बन्धी र खलासम्बन्धीलाई नमस्कार।",
        "meaning_en": "Salutation to Him of assemblies and to Him who is encircling; salutation to Him of restraint and to Him of security; salutation to Him worthy of praise and to Him of the resting-place; salutation to Him of the fertile fields and to Him of the threshing-floor.",
    },
    "6.34": {
        "meaning_ne": "वनसम्बन्धी र झाडीसम्बन्धीलाई नमस्कार; यशस्वी र प्रतिध्वनिसम्बन्धीलाई नमस्कार; द्रुत सेनासम्बन्धी र द्रुत रथसम्बन्धीलाई नमस्कार; शूर र भेद्नेलाई नमस्कार।",
        "meaning_en": "Salutation to Him of the forest and to Him of the thicket; salutation to Him of fame and to Him of the echo; salutation to Him of the swift army and to Him of the swift chariot; salutation to the hero and to the piercer.",
    },
    "6.35": {
        "meaning_ne": "शिरस्त्राणधारी र कवचधारीलाई नमस्कार; वर्मधारी र ढालधारीलाई नमस्कार; यशस्वी र यशस्वी सेनावालालाई नमस्कार; ढोलधारी र प्रहार गर्नेलाई नमस्कार।",
        "meaning_en": "Salutation to Him with the helmet and to Him with the mail; salutation to Him with the armor and to Him with the shield; salutation to the renowned one and to Him whose army is renowned; salutation to Him of the drum and to the drummer.",
    },
    "6.36": {
        "meaning_ne": "साहसी र आक्रमणकारीलाई नमस्कार; तुणीरधारी र बाणकोषधारीलाई नमस्कार; तीखा बाणधारी र हतियारधारीलाई नमस्कार; असल हतियारधारी र असल धनुर्धारीलाई नमस्कार।",
        "meaning_en": "Salutation to the bold one and to the assailant; salutation to Him with the quiver and to Him with the arrow-case; salutation to Him with sharp arrows and to Him with weapons; salutation to Him with good weapons and to Him with a good bow.",
    },
    "6.37": {
        "meaning_ne": "गल्ली र राजमार्गसम्बन्धीलाई नमस्कार; खाल्डो र होचो ठाउँसम्बन्धीलाई नमस्कार; नहर र पोखरीसम्बन्धीलाई नमस्कार; नदीसम्बन्धी र सागरको गहिराइसम्बन्धीलाई नमस्कार।",
        "meaning_en": "Salutation to Him of the byways and to Him of the highways; salutation to Him of the pits and to Him of low-lying places; salutation to Him of the canals and to Him of the ponds; salutation to Him of the rivers and to Him of the sea depths.",
    },
    "6.38": {
        "meaning_ne": "इनार र खाल्डोसम्बन्धीलाई नमस्कार; निर्मल आकाश र घामसम्बन्धीलाई नमस्कार; बादलसम्बन्धी र बिजुलीसम्बन्धीलाई नमस्कार; वर्षासम्बन्धी र वर्षारहितसम्बन्धीलाई नमस्कार।",
        "meaning_en": "Salutation to Him of the well and to Him of the pit; salutation to Him of the clear sky and to Him of the sunshine; salutation to Him of the clouds and to Him of the lightning; salutation to Him of the rain and to Him of the cloudless sky.",
    },
    "6.39": {
        "meaning_ne": "आँधीसम्बन्धी र विनाशसम्बन्धीलाई नमस्कार; घरसम्बन्धी र घर-रक्षकलाई नमस्कार; सोम र रुद्रलाई नमस्कार; ताम्रवर्ण र अरुणवर्णलाई नमस्कार।",
        "meaning_en": "Salutation to Him of the whirlwind and to Him of destruction; salutation to Him of the dwelling and to the protector of the dwelling; salutation to Soma and to Rudra; salutation to the copper-colored one and to the red one.",
    },
    "6.40": {
        "meaning_ne": "प्रातःकालसम्बन्धी र पशुपतिलाई नमस्कार; उग्र र भीषणलाई नमस्कार; नजिकबाट मार्ने र टाढाबाट मार्नेलाई नमस्कार; संहारक र अझ शक्तिशाली संहारकलाई नमस्कार; वृक्ष र हरितकेशीहरूलाई नमस्कार, त्राणकर्तालाई नमस्कार।",
        "meaning_en": "Salutation to Him of the morning and to the lord of animals; salutation to the fierce one and to the terrible one; salutation to Him who slays from near and to Him who slays from afar; salutation to the slayer and to the more powerful slayer; salutation to Him of the trees, of the green hair; salutation to the deliverer.",
    },
    "6.41": {
        "meaning_ne": "शम्भु (कल्याणका स्रोत) र मयोभव (आनन्दका उत्पत्ति)लाई नमस्कार; शङ्कर (कल्याणकारी) र मयस्कर (सुखदायी)लाई नमस्कार; शिव (मङ्गलमय) र अझ बढी मङ्गलमयलाई नमस्कार।",
        "meaning_en": "Salutation to Shambhu and to Mayobhava; salutation to Shankara and to Mayaskara; salutation to Shiva, the auspicious, and to the more auspicious.",
    },
    "6.42": {
        "meaning_ne": "पारिपट्टि र वारिपट्टिसम्बन्धीलाई नमस्कार; तर्ने र पार गर्नेसम्बन्धीलाई नमस्कार; तीर्थसम्बन्धी र किनारासम्बन्धीलाई नमस्कार; कलिलो घाँससम्बन्धी र फिँजसम्बन्धीलाई नमस्कार।",
        "meaning_en": "Salutation to Him of the far shore and to Him of the near shore; salutation to Him of the crossing and to Him of the landing; salutation to Him of the sacred ford and to Him of the bank; salutation to Him of the tender grass and to Him of the foam.",
    },
    "6.43": {
        "meaning_ne": "बालुवासम्बन्धी र बगेको धारासम्बन्धीलाई नमस्कार; ढुङ्गे भूमि र बासस्थानसम्बन्धीलाई नमस्कार; जटाधारी र पुलस्त्यलाई नमस्कार; बाँझो भूमि र राजमार्गसम्बन्धीलाई नमस्कार।",
        "meaning_en": "Salutation to Him of the sand and to Him of the flowing stream; salutation to Him of the rocky ground and to Him of the dwelling place; salutation to the matted-haired one and to Pulasti; salutation to Him of the barren land and to Him of the highway.",
    },
    "6.44": {
        "meaning_ne": "गोठसम्बन्धी र गाईबथानसम्बन्धीलाई नमस्कार; ओछ्यानसम्बन्धी र घरसम्बन्धीलाई नमस्कार; हृदयसम्बन्धी र विश्रामस्थलसम्बन्धीलाई नमस्कार; खाल्डोसम्बन्धी र गुफा-झाडीमा बस्नेलाई नमस्कार।",
        "meaning_en": "Salutation to Him of the cattle-pen and to Him of the cow-stall; salutation to Him of the bed and to Him of the house; salutation to Him of the heart and to Him of the resting place; salutation to Him of the pit and to Him who dwells in caves.",
    },
    "6.45": {
        "meaning_ne": "सुख्खा भूमि र हरियो भूमिसम्बन्धीलाई नमस्कार; धूलोसम्बन्धी र बालुवा-धूलोसम्बन्धीलाई नमस्कार; क्षयशील भूमि र खुकुलो माटोसम्बन्धीलाई नमस्कार; फराकिलो मैदान र असल मैदानसम्बन्धीलाई नमस्कार।",
        "meaning_en": "Salutation to Him of the dry land and to Him of the green land; salutation to Him of the dust and to Him of the sand-dust; salutation to Him of the eroded land and to Him of loose earth; salutation to Him of the wide plains and to Him of the good plains.",
    },
    "6.46": {
        "meaning_ne": "पातसम्बन्धी र पात छर्नेलाई नमस्कार; ठूलो स्वरले गर्जने र प्रहार गर्नेलाई नमस्कार; कष्ट दिने र अझ बढी कष्ट दिनेलाई नमस्कार; बाण बनाउने र धनुष बनाउने तिमीहरूलाई नमस्कार; हे छर्नेहरू, देवताहरूका हृदयस्वरूप तिमीहरूलाई नमस्कार; छान्नेहरूलाई नमस्कार, नाश गर्नेहरूलाई नमस्कार, अन्तिम प्रहार गर्नेहरूलाई नमस्कार।",
        "meaning_en": "Salutation to Him of the leaf and to Him who scatters leaves; salutation to Him who roars aloud and to Him who strikes; salutation to Him who afflicts and to Him who greatly afflicts; salutation to you, makers of arrows and makers of bows; salutation to you scatterers, the hearts of the gods; salutation to those who select, salutation to those who destroy, salutation to those who deal the final blow.",
    },
    "6.47": {
        "meaning_ne": "हे आवरणधारी, अन्नका स्वामी, गरिबजस्तै देखिने नीललोहित देव — यी प्रजा र यी पशुहरूका निम्ति नडराउनुहोस्, विलाप नहोस्, र हामीलाई कुनै अनिष्ट नछोस्।",
        "meaning_en": "O cloaked one, lord of food, blue-red one who appears poor — be not afraid, nor may there be any wailing for these creatures and these cattle of ours; let no misfortune touch us.",
    },
    "6.48": {
        "meaning_ne": "हामी यी स्तुतिहरू शक्तिशाली, जटाधारी, वीरहरूका शासक रुद्रलाई अर्पण गर्दछौं, ताकि यस गाउँमा दुईखुट्टे र चारखुट्टे सबै पुष्ट र रोगरहित भई कल्याणमा रहून्।",
        "meaning_en": "We offer these prayers to the mighty, matted-haired Rudra, ruler of heroes, so that all in this village — the two-footed and the four-footed — may be well, nourished, and free from disease.",
    },
    "6.49": {
        "meaning_ne": "हे रुद्र, तपाईंको जुन रूप कल्याणकारी, सधैं मङ्गलमय र सम्पूर्ण संसारको औषधि हो, जुन पीडाको उपचार गर्ने कल्याणकारी शक्ति हो, त्यसैले हामीलाई सुख प्रदान गर्नुहोस् ताकि हामी बाँच्न सकौं।",
        "meaning_en": "That form of Thine, O Rudra, which is auspicious, ever beneficent, the healer of the universe; that healing power which cures affliction — with that, grant us happiness that we may live.",
    },
    "6.50": {
        "meaning_ne": "रुद्रको हतियार हामीबाट टाढा जाओस्; उग्र, पापी स्वभावको दुर्भावना पनि हामीबाट टाढा जाओस्। हे वरदायी, धनवानहरूका निम्ति आफ्नो दृढ धनुष खोलिदिनुहोस्, र हाम्रा सन्तान र नातिनातिनालाई सुख प्रदान गर्नुहोस्।",
        "meaning_en": "May the weapon of Rudra pass us by; may the ill-will of the fierce, sinful one pass us by. O bounteous one, unstring Thy firm bow for the wealthy, and grant happiness to our children and grandchildren.",
    },
    "6.51": {
        "meaning_ne": "हे परम वरदायी, अत्यन्त मङ्गलमय, हामीप्रति कल्याणकारी र प्रसन्नचित्त हुनुहोस्। सबैभन्दा अग्लो रुखमा आफ्नो हतियार राखेर, छाला वस्त्र धारण गरी, पिनाक बोकेर हामीकहाँ आउनुहोस्।",
        "meaning_en": "O most bounteous, most auspicious one, be gracious and well-disposed towards us. Having placed Thy weapon on the highest tree, and clad in a hide, come to us bearing Thy Pinaka.",
    },
    "6.52": {
        "meaning_ne": "हे विकिरण गर्ने, रातो वर्णका, हे भगवन्, तपाईंलाई नमस्कार होस्। तपाईंका हजारौं हतियारहरू अरूमाथि परून्, हामीमाथि नपरून्।",
        "meaning_en": "O scatterer, red one, salutation be to Thee, O Lord. May Thy thousand weapons fall upon someone else, not upon us.",
    },
    "6.53": {
        "meaning_ne": "तपाईंका बाहुहरूमा हजारौं-हजारौं हतियारहरू छन्; हे भगवन्, तिनका स्वामी भई तिनका मुख हामीबाट पर फर्काइदिनुहोस्।",
        "meaning_en": "Thousands upon thousands are the weapons in Thy arms; O Lord, being the ruler of them, turn their faces away from us.",
    },
    "6.54": {
        "meaning_ne": "पृथ्वीमा रहने असङ्ख्य हजारौं रुद्रहरू — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "The countless thousands of Rudras who dwell upon the earth — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.55": {
        "meaning_ne": "यस विशाल सागर र अन्तरिक्षमा रहनेहरू — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "Those who are in this great ocean, in the atmosphere above — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.56": {
        "meaning_ne": "नीलकण्ठ, श्वेतकण्ठ, स्वर्गमा आश्रित रुद्रहरू — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "The blue-necked, white-throated Rudras who dwell in heaven — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.57": {
        "meaning_ne": "नीलकण्ठ, श्वेतकण्ठ, पृथ्वीमा तल विचरण गर्ने शर्वहरू — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "The blue-necked, white-throated Sharvas who move below on the earth — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.58": {
        "meaning_ne": "रुखहरूमा रहने हरितपिँगल, नीलकण्ठ, रातो वर्णका — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "Those who are in trees, tawny-green, blue-necked, and red — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.59": {
        "meaning_ne": "प्राणीहरूका अधिपति, अवियुक्त वा जटाधारी — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "Those who are the lords of beings, unbraided or matted-haired — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.60": {
        "meaning_ne": "मार्गहरूका रक्षक, वाक्पटु, जीवनका निम्ति सङ्घर्ष गर्नेहरू — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "Those who are the protectors of paths, the eloquent ones, who contend for life — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.61": {
        "meaning_ne": "भाला हातमा लिई तुणीरधारी भई तीर्थहरूमा विचरण गर्नेहरू — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "Those who roam the sacred fords, with spears in hand and quivers on — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.62": {
        "meaning_ne": "अन्नमा वा भाँडाबाट पिउने मानिसहरूलाई घाइते पार्नेहरू — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "Those who pierce people through their food, or as they drink from vessels — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.63": {
        "meaning_ne": "यति र यीभन्दा पनि धेरै रुद्रहरू, जो दिशाहरूमा फैलिएर उभिएका छन् — तिनका धनुषहरू हामी हजार योजन टाढा शिथिल पार्दछौं।",
        "meaning_en": "As many Rudras as these, and even more, who stand spread across the directions — of them, we unstring their bows at a distance of a thousand yojanas.",
    },
    "6.64": {
        "meaning_ne": "स्वर्गमा रहने, वर्षा जसका बाण हुन् त्यस्ता रुद्रहरूलाई नमस्कार होस् — पूर्वमा दश, दक्षिणमा दश, पश्चिममा दश, उत्तरमा दश, र माथि दश — तिनीहरूलाई नमस्कार होस्। तिनीहरूले हामीलाई रक्षा गरून्, हामीलाई सुख प्रदान गरून्। हामीले घृणा गर्ने र हामीलाई घृणा गर्नेलाई हामी तिनका जबडामा राख्दछौं।",
        "meaning_en": "Salutation be to the Rudras who are in heaven, whose arrow is the rain — ten in the east, ten in the south, ten in the west, ten in the north, and ten above — salutation be to them. May they protect us, may they grant us happiness. Whomever we hate, and whoever hates us, we place him in their jaws.",
    },
    "6.65": {
        "meaning_ne": "अन्तरिक्षमा रहने, वायु जसका बाण हुन् त्यस्ता रुद्रहरूलाई नमस्कार होस् — पूर्वमा दश, दक्षिणमा दश, पश्चिममा दश, उत्तरमा दश, र माथि दश — तिनीहरूलाई नमस्कार होस्। तिनीहरूले हामीलाई रक्षा गरून्, हामीलाई सुख प्रदान गरून्। हामीले घृणा गर्ने र हामीलाई घृणा गर्नेलाई हामी तिनका जबडामा राख्दछौं।",
        "meaning_en": "Salutation be to the Rudras who are in the atmosphere, whose arrow is the wind — ten in the east, ten in the south, ten in the west, ten in the north, and ten above — salutation be to them. May they protect us, may they grant us happiness. Whomever we hate, and whoever hates us, we place him in their jaws.",
    },
    "6.66": {
        "meaning_ne": "पृथ्वीमा रहने, अन्न जसका बाण हुन् त्यस्ता रुद्रहरूलाई नमस्कार होस् — पूर्वमा दश, दक्षिणमा दश, पश्चिममा दश, उत्तरमा दश, र माथि दश — तिनीहरूलाई नमस्कार होस्। तिनीहरूले हामीलाई रक्षा गरून्, हामीलाई सुख प्रदान गरून्। हामीले घृणा गर्ने र हामीलाई घृणा गर्नेलाई हामी तिनका जबडामा राख्दछौं।",
        "meaning_en": "Salutation be to the Rudras who are on the earth, whose arrow is food — ten in the east, ten in the south, ten in the west, ten in the north, and ten above — salutation be to them. May they protect us, may they grant us happiness. Whomever we hate, and whoever hates us, we place him in their jaws.",
    },
}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    chapter = next(c for c in data["chapters"] if c["number"] == 6)
    missing = []
    filled = 0
    for shloka in chapter["shlokas"]:
        extra = CH6.get(shloka["verse_label"])
        if extra is None:
            missing.append(shloka["verse_label"])
            continue
        shloka["meaning_ne"] = extra["meaning_ne"]
        shloka["meaning_en"] = extra["meaning_en"]
        filled += 1
    if missing:
        raise SystemExit(f"no gloss for {missing}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"filled {filled} chapter-6 meanings in {OUT}")


if __name__ == "__main__":
    main()

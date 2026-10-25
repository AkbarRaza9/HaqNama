-- HaqNama seed data
-- 10 approved FAQs + helplines + sensitive keywords + disclaimers

-- ─────────────────────────────────────────────
-- Disclaimers
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO disclaimers (id, lang, body) VALUES
(1, 'en', 'This information is provided for general educational purposes only and does not constitute legal advice. Laws and procedures change over time and may vary by province. For advice specific to your situation, please consult a qualified lawyer or contact the helpline shown above.'),
(2, 'ur', 'یہ معلومات صرف عام تعلیمی مقاصد کے لیے فراہم کی گئی ہیں اور قانونی مشورے کی جگہ نہیں لیتیں۔ قوانین اور طریقے وقت کے ساتھ بدلتے رہتے ہیں اور صوبے کے لحاظ سے مختلف ہو سکتے ہیں۔ اپنی صورت حال کے لیۏ مخصوص رہنمائی کے لیے براہ کرم کسی مستند وکیل سے رابطہ کریں یا اوپر دکھائے گئے ہیلپ لین پر کال کریں۔');

-- ─────────────────────────────────────────────
-- Helplines
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO helplines (id, name_en, name_ur, number, hours_en, hours_ur, notes_en, notes_ur) VALUES
(1, 'Madadgaar National Helpline', 'مددگار قومی ہیلپ لین', '1098',
 '24 hours, 7 days', '24 گھنٹے، 7 دن',
 'For women and children facing violence, abuse, or distress.', 'خواتین اور بچوں کے لیے جو تشدد، یا مشکل صورت حال کا سامنا کر رہے ہوں۔'),
(2, 'Police Emergency', 'پولیس ایمرجنسی', '15',
 '24 hours, 7 days', '24 گھنٹے، 7 دن',
 'For immediate police assistance.', 'فوری پولیس مدد کے لیے۔'),
(3, 'Ministry of Human Rights Helpline', 'انسانی حقوق وزارت ہیلپ لین', '1099',
 '24 hours, 7 days', '24 گھنٹے، 7 دن',
 'For human rights violations including unlawful detention.', 'انسانی حقوق کی خلاف ورزیوں بشمول غیر قانونی حراست کے لیے۔'),
(4, 'Legal Aid Society', 'لیگل ایڈ سوسائٹی', '0800-7080',
 'Mon–Fri, 9am–5pm', 'پیر جمعہ، صبح 9 سے شام 5',
 'Free legal advice for those who cannot afford a lawyer.', 'وہ لوگ جو وکیل کا کرایہ نہیں دے سکتے ان کے لیۏ مفت قانونی مشورہ۔'),
(5, 'Punjab Women Helpline', 'پنجاب وومن ہیلپ لین', '1043',
 '24 hours, 7 days', '24 گھنٹے، 7 دن',
 'Punjab-specific helpline for women.', 'خواتین کے لیۏ پنجاب مخصوص ہیلپ لین۔'),
(6, 'Islamabad Women''s Safety Helpline', 'اسلام آباد وومن سیفٹی ہیلپ لین', '1815',
 '24 hours, 7 days', '24 گھنٹے، 7 دن',
 'Islamabad-specific women''s safety helpline.', 'خواتین کے لیۏ اسلام آباد مخصوص سیفٹی ہیلپ لین۔'),
(7, 'Rescue / Ambulance', 'رسکیو / ایبلنس', '1122',
 '24 hours, 7 days', '24 گھنٹے، 7 دن',
 'Medical emergencies, ambulance, rescue services.', 'طبی ایمرجنسی، ایبلنس، رسکیو خدمات۔');

-- ─────────────────────────────────────────────
-- Sensitive keywords → helplines
-- keyword is matched case-insensitively against the user query.
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO sensitive_keywords (keyword, lang, helpline_id) VALUES
-- Domestic / gender-based violence
('violence',     'en', 1),
('abuse',        'en', 1),
('beaten',       'en', 1),
('assault',      'en', 1),
('rape',         'en', 1),
('harassment',   'en', 1),
('acid',         'en', 1),
('burn',         'en', 1),
('forced marriage','en', 1),
('kidnap',       'en', 2),
('تشدد',         'ur', 1),
('گالی',         'ur', 1),
('زیادتی',       'ur', 1),
('اگ',           'ur', 1),
('جبری شادی',    'ur', 1),

-- Arrest / detention
('arrest',       'en', 3),
('arrested',     'en', 3),
('custody',      'en', 3),
('detained',     'en', 3),
('jail',         'en', 3),
('prison',       'en', 3),
('locked up',    'en', 3),
('حراست',       'ur', 3),
('جیل',         'ur', 3),
('گرفتار',       'ur', 3),
('گرفتاری',      'ur', 3),

-- Inheritance / property disputes
('inheritance',  'en', 4),
('property dispute','en', 4),
('land dispute', 'en', 4),
('evict',        'en', 4),
('eviction',     'en', 4),
('میراث',       'ur', 4),
('جائیداد',      'ur', 4),
('زمین کا جھگڑا','ur', 4),
('بے دخل',       'ur', 4);

-- ─────────────────────────────────────────────
-- Distress lexicon — general crisis phrases → 1099 helpline
-- These fire ONLY when no category-specific keyword matches.
-- They are matched against the normalized (lowercased,
-- diacritic-stripped, alias-substituted) query.
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO distress_lexicon (term, lang) VALUES
-- English
('i am not safe',    'en'),
('not safe',         'en'),
('help me',          'en'),
('please help',      'en'),
('i need help',      'en'),
('someone help',     'en'),
('i am scared',      'en'),
('i''m scared',      'en'),
('i am in danger',   'en'),
('save me',          'en'),
('i want to die',    'en'),
('suicide',          'en'),
('kill myself',      'en'),
('i am alone',       'en'),
('i am trapped',     'en'),
('emergency',        'en'),
('please someone',   'en'),
('i can''t do this', 'en'),
('i am crying',      'en'),
('i am dying',       'en'),
('please save me',   'en'),
('no one is helping','en'),
('i am helpless',    'en'),
('i am suffering',   'en'),
('i want to end it', 'en'),
('end my life',      'en'),
-- Nastaliq Urdu
('مدد',             'ur'),
('میں محفوظ نہیں',  'ur'),
('میں ڈر رہا ہوں',  'ur'),
('میں ڈر رہی ہوں',  'ur'),
('کوئی نہیں',       'ur'),
('میں اکیلا ہوں',   'ur'),
('میں اکیلی ہوں',   'ur'),
('خطرے میں ہوں',   'ur'),
('بچاؤ',            'ur'),
('میں مرنا چاہتا ہوں','ur'),
('میں مرنا چاہتی ہوں','ur'),
('خودکشی',          'ur'),
('ایمرجنسی',        'ur'),
('پکڑ لیا گیا',     'ur'),
('سانس نہیں آتی',   'ur'),
('روکو',            'ur'),
('میں قید ہوں',     'ur'),
('ڈرا ہوا ہوں',     'ur'),
-- Roman Urdu
('koi nahi hai',        'ur'),
('dar lag raha hai',    'ur'),
('dar lag rahi hai',    'ur'),
('mujhe madad chahiye', 'ur'),
('main mehfooz nahi hoon', 'ur'),
('main mehfooz nahi',   'ur'),
('main akela hoon',     'ur'),
('main akeli hoon',     'ur'),
('bachao',              'ur'),
('koi nahi a raha',     'ur'),
('mujhe koi nahi mila', 'ur'),
('san nahi aa rahi',    'ur'),
('qaidi hoon',          'ur'),
('mujhe dar lag raha hai','ur'),
('koi toh madad karo',  'ur'),
('zindagi mushkil hai', 'ur'),
('main toot raha hoon', 'ur');

-- ─────────────────────────────────────────────
-- Roman Urdu aliases → canonical keyword tokens
-- These are substituted during query normalization so that
-- a user typing "tashaddud" matches the keyword "تشدد".
-- Aliases are matched longest-first with word boundaries.
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO roman_urdu_aliases (alias, canonical, lang) VALUES
-- Violence → تشدد
('tashaddud',   'تشدد', 'ur'),
('tashadud',    'تشدد', 'ur'),
('zulam',       'تشدد', 'ur'),
('zulm',        'تشدد', 'ur'),
('maar',        'تشدد', 'ur'),
('maarna',      'تشدد', 'ur'),
('peet',        'تشدد', 'ur'),
-- Abuse / swearing → گالی
('gali',        'گالی', 'ur'),
('galiyan',     'گالی', 'ur'),
-- Harassment → زیادتی
('zyadtari',    'زیادتی', 'ur'),
('ziyadati',    'زیادتی', 'ur'),
('zyadti',      'زیادتی', 'ur'),
-- Acid / burn → اگ
('aag',         'اگ', 'ur'),
('jalana',      'اگ', 'ur'),
('jalaya',      'اگ', 'ur'),
-- Forced marriage → جبری شادی
('jabri shadi',        'جبری شادی', 'ur'),
('jabri nikah',        'جبری شادی', 'ur'),
('zabardasti shadi',   'جبری شادی', 'ur'),
-- Detention / arrest → گرفتاری / گرفتار / جیل
('giriftari',   'گرفتاری', 'ur'),
('giriftar',    'گرفتار', 'ur'),
('qaid',        'جیل', 'ur'),
('qaidi',       'جیل', 'ur'),
-- Inheritance → میراث
('miraas',      'میراث', 'ur'),
('mairath',     'میراث', 'ur'),
('miras',       'میراث', 'ur'),
('wirasat',     'میراث', 'ur'),
-- Property / land → جائیداد / زمین کا جھگڑا
('jaidad',              'جائیداد', 'ur'),
('jaidad ka jhagra',    'جائیداد', 'ur'),
('zameen ka jhagra',    'زمین کا جھگڑا', 'ur'),
-- Eviction → بے دخل
('qabza',       'بے دخل', 'ur'),
('bekhali',     'بے دخل', 'ur'),
('beqadri',     'بے دخل', 'ur');

-- ─────────────────────────────────────────────
-- 10 Approved FAQs
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO faqs (slug, category_en, category_ur, question_en, question_ur, answer_en, answer_ur, tags_en, tags_ur, sort_order) VALUES
('apply-for-cnic',
 'Identity Documents', 'شناختی دستاویزات',
 'How do I apply for a CNIC or NICOP?',
 'CNIC یا NICOP کے لیے درخواست کیسے دوں؟',
 'You can apply for a CNIC (Computerized National Identity Card) or NICOP (National Identity Card for Overseas Pakistanis) at any NADRA registration center.\n\nRequired documents typically include: a birth certificate or B-form, CNICs of parents or spouse, and a recent photograph. You will also need to provide biometric data (fingerprints and photo) at the center.\n\nVisit the NADRA website (nadra.gov.pk) to find your nearest center and check current fees and requirements. Processing usually takes 4–6 weeks for a standard CNIC.',
 'آپ کسی بھی NADRA رجسٹریشن سینٹر سے CNIC (کمپیوٹرائزڈ نشانی کارڈ) یا NICOP (بیرون ملک مقیم پاکستانیوں کے لیے قومی شناختی کارڈ) کے لیے درخواست دے سکتے ہیں۔\n\nعام طور پر مطلوبہ دستاویزات میں شامل ہیں: پیدائش کا سرٹیفکیٹ یا B-فارم، والدین یا شریک حیات کی CNIC، اور ایک حالیہ تصویر۔ سینٹر پر آپ کو بایومیٹرک ڈیٹا (انگلیوں کے نشانات اور تصویر) بھی فراہم کرنا ہوگا۔\n\nاپنا قریبی سینٹر تلاش کرنے اور موجودہ فیس اور ضروریات چیک کرنے کے لیے NADRA ویب سائٹ (nadra.gov.pk) ملاحظہ کریں۔ معیاری CNIC کی پروسیسنگ عام طور پر 4 سے 6 ہفتے لگتی ہے۔',
 'cnic,nicop,nadra,identity,card,id card,apply',
 'cnic,nicop,nadra,شناخت,کارڈ,درخواست', 1),

('register-birth',
 'Birth & Death', 'پیدائش اور وفات',
 'How do I register a birth and get a birth certificate?',
 'پیدائش رجسٹر کروانے اور پیدائش کا سرٹیفکیٹ کیسے حاصل کروں؟',
 'Birth registration is done through your local Union Council, Cantonment Board, or the relevant local government office.\n\nYou typically need: hospital or midwife birth record, CNICs of both parents, and the marriage certificate of the parents (if applicable). There is a time limit — births should ideally be registered within 60 days, though late registration is possible with additional documentation.\n\nThe Union Council will issue a birth certificate (شناختی سرٹیفکیٹ / بی فارم) after verification.',
 'پیدائش کی رجسٹریشن آپ کے مقامی یونین کونسل، کینٹمنٹ بورڈ، یا متعلقہ مقامی حکومتی دفتر کے ذریعے ہوتی ہے۔\n\nعام طور پر آپ کو ضرورت ہوتی ہے: ہسپتال یا ڈایی کے پیدائش ریکارڈ، دونوں والدین کی CNIC، اور والدین کی شادی کا سرٹیفکیٹ (اگر لاگو ہو)۔ ایک وقتی حد ہے — پیدائش کو مثالی طور پر 60 دنوں کے اندر رجسٹر کیا جانا چاہیے، اگرچہ اضافی دستاویزات کے ساتھ دیر سے رجسٹریشن ممکن ہے۔\n\nتصدیق کے بعد یونین کونسل پیدائش کا سرٹیفکیٹ (بی فارم) جاری کرے گی۔',
 'birth,certificate,register,union council,b-form,newborn,baby',
 'پیدائش,سرٹیفکیٹ,رجسٹر,یونین کونسل,بی فارم,بچہ', 2),

('register-marriage',
 'Marriage & Family', 'شادی اور خاندان',
 'How do I register a marriage and get a Nikah Nama?',
 'شادی رجسٹر کروانے اور نکاح نامہ کیسے حاصل کروں؟',
 'A Nikah Nama (marriage certificate) is the official record of an Islamic marriage. The Nikah is performed by a licensed Nikah Khawan (marriage registrar), who fills out the Nikah Nama form.\n\nBoth parties sign the Nikah Nama along with witnesses. After the ceremony, the signed Nikah Nama must be submitted to the local Union Council or relevant authority for official registration.\n\nYou can obtain a certified copy of the marriage certificate from the Union Council after registration. Fees and exact procedures may vary by province.',
 'نکاح نامہ اسلامی شادی کا سرکاری ریکارڈ ہے۔ نکاح کا انجام لائسنس یافتہ نکاح خوان (شادی رجسٹرار) کرتے ہیں، جو نکاح نامہ فارم پُر کرتے ہیں۔\n\nدونوں فریق گواہوں کے ساتھ نکاح نامہ پر دستخط کرتے ہیں۔ تقریب کے بعد، دستخط شدہ نکاح نامہ کو سرکاری رجسٹریشن کے لیے مقامی یونین کونسل یا متعلقہ حکام کو جمع کرانا ضروری ہے۔\n\nرجسٹریشن کے بعد آپ یونین کونسل سے شادی کا سرٹیفکیٹ کی تصدیق شدہ کاپی حاصل کر سکتے ہیں۔ فیس اور درست طریقے صوبے کے لحاظ سے مختلف ہو سکتے ہیں۔',
 'marriage,nikah,nikah nama,wedding,register,certificate,union council',
 'شادی,نکاح,نکاح نامہ,تقریب,رجسٹر,سرٹیفکیٹ,یونین کونسل', 3),

('file-fir',
 'Police & FIR', 'پولیس اور FIR',
 'How do I file an FIR (First Information Report)?',
 'FIR (پہلی اطلاع رپورٹ) کیسے درج کروں؟',
 'An FIR is the first step in reporting a crime to the police. You can file an FIR at the police station (thanā) nearest to where the crime occurred.\n\nBring your CNIC and any evidence or documents related to the incident. The police are legally required to register your FIR — they cannot refuse. If a station refuses, you can approach the Superintendent of Police (SP) or the District Police Officer (DPO).\n\nIn some provinces (e.g., Punjab), you can also file an FIR online through the Punjab Police online FIR portal. Always obtain a copy of the FIR for your records.',
 'FIR پولیس کو کسی جرم کی اطلاع دینے کا پہلا قدم ہے۔ آپ اس پولیس اسٹیشن (تھانہ) سے FIR درج کروا سکتے ہیں جو اس جگہ سب سے قریب ہو جہاں جرم پیش آیا۔\n\nاپنی CNIC اور واقعے سے متعلق کوئی بھی ثبوت یا دستاویزات لے جائیں۔ پولیس پر قانونی طور پر آپ کی FIR رجسٹر کرنا لازم ہے — وہ انکار نہیں کر سکتے۔ اگر کوئی اسٹیشن انکار کرے، آپ سپرنٹنڈنٹ آف پولیس (SP) یا ڈسٹرکٹ پولیس آفیسر (DPO) سے رابطہ کر سکتے ہیں۔\n\nکچھ صوبوں میں (مثلاً پنجاب)، آپ پنجاب پولیس آن لائن FIR پورٹل کے ذریعے بھی FIR آن لائن درج کروا سکتے ہیں۔ ہمیشہ اپنے ریکارڈ کے لیے FIR کی ایک کاپی حاصل کریں۔',
 'fir,first information report,police,crime,complaint,report,thanā',
 'fir,پولیس,جرم,شکایت,اطلاع,تھانہ,رپورٹ', 4),

('get-domicile',
 'Domicile & Residence', 'ڈومیسائل اور رہائش',
 'How do I get a domicile certificate?',
 'ڈومیسائل سرٹیفکیٹ کیسے حاصل کروں؟',
 'A domicile certificate proves your permanent residence in a particular district or province. It is required for government jobs, admissions, and some scholarships.\n\nApply at the office of the Deputy Commissioner (DC) or Assistant Commissioner (AC) of your district. Required documents typically include: CNIC, proof of residence (utility bills, rent agreement, or property documents), an affidavit stating your period of residence, and photographs.\n\nProcessing times vary — usually 1–4 weeks. Fees are set by the provincial government and are generally modest.',
 'ڈومیسائل سرٹیفکیٹ آپ کی کسی خاص ضلع یا صوبے میں مستقل رہائش کا ثبوت ہے۔ یہ سرکاری نوکریوں، داخلہ، اور کچھ اسکالرشپس کے لیۏ ضروری ہے۔\n\nاپنے ضلع کے ڈپٹی کمشنر (DC) یا اسسٹنٹ کمشنر (AC) کے دفتر میں درخواست دیں۔ عام طور پر مطلوبہ دستاویزات میں شامل ہیں: CNIC، رہائش کا ثبوت (یوٹیلیٹی بل، کرایہ کا معاہدہ، یا جائیداد کے دستاویزات)، اپنی رہائش کے دورانیے کے بارے میں حلفیہ بیان، اور تصویریں۔\n\nپروسیسنگ کا وقت مختلف ہوتا ہے — عام طور پر 1 سے 4 ہفتے۔ فیس صوبائی حکومت کی طرف سے طی کی جاتی ہے اور عام طور پر معمولی ہوتی ہے۔',
 'domicile,certificate,residence,district,province,dc,ac',
 'ڈومیسائل,سرٹیفکیٹ,رہائش,ضلع,صوبہ', 5),

('apply-passport',
 'Passport & Travel', 'پاسپورٹ اور سفر',
 'How do I apply for a Pakistani passport?',
 'پاکستانی پاسپورٹ کے لیے درخواست کیسے دوں؟',
 'You can apply for a Pakistani passport at any Regional Passport Office (RPO) or through the online portal at passport.gov.pk.\n\nRequired documents typically include: original CNIC, previous passport (if renewing), photographs meeting specifications, and the applicable fee. You will need to visit the office for biometrics and an interview.\n\nPassports are issued as either urgent (faster, higher fee) or normal. Processing times vary — normal is typically 4–6 weeks, urgent is 1–2 weeks. Check the official website for current fees and requirements.',
 'آپ کسی بھی علاقائی پاسپورٹ آفیس (RPO) میں یا passport.gov.pk آن لائن پورٹل کے ذریعے پاکستانی پاسپورٹ کے لیے درخواست دے سکتے ہیں۔\n\nعام طور پر مطلوبہ دستاویزات میں شامل ہیں: اصل CNIC، پچھلا پاسپورٹ (اگر تجدید کر رہے ہیں)، تصویریں جو خصوصیات پوری کرتی ہوں، اور لاگو فیس۔ آپ کو بایومیٹرکس اور انٹرویو کے لیۏ دفتر جانا ہوگا۔\n\nپاسپورٹ یا تو فوری (تیز، زیادہ فیس) یا عام طور پر جاری کیے جاتے ہیں۔ پروسیسنگ کا وقت مختلف ہوتا ہے — عام طور پر 4 سے 6 ہفتے، فوری 1 سے 2 ہفتے۔ موجودہ فیس اور ضروریات کے لیۏ سرکاری ویب سائٹ چیک کریں۔',
 'passport,apply,travel,document,foreign,visa,rpo',
 'پاسپورٹ,درخواست,سفر,دستاویز,خارجہ,ویزا,rpo', 6),

('register-death',
 'Birth & Death', 'پیدائش اور وفات',
 'How do I register a death and get a death certificate?',
 'وفات رجسٹر کروانے اور وفات کا سرٹیفکیٹ کیسے حاصل کروں؟',
 'Death registration is handled by the local Union Council or Cantonment Board.\n\nYou typically need: a hospital death certificate or medical report, the CNIC of the deceased, and the CNICs of the family members registering the death. The death should be registered promptly — delays can cause complications for inheritance and legal matters.\n\nThe Union Council issues an official death certificate after verification. This document is essential for inheritance proceedings, pension claims, and other legal matters.',
 'وفات کی رجسٹریشن مقامی یونین کونسل یا کینٹمنٹ بورڈ کے ذریعے ہوتی ہے۔\n\nعام طور پر آپ کو ضرورت ہوتی ہے: ہسپتال کا وفات کا سرٹیفکیٹ یا طبی رپورٹ، متوفی کی CNIC، اور وفات رجسٹر کرنے والے خاندان کے افراد کی CNIC۔ وفات کی رجسٹریشن فوری طور پر کی جانی چاہیے — تاخیر میراث اور قانونی معاملات میں پیچیدگیاں پیدا کر سکتی ہے۔\n\nتصدیق کے بعد یونین کونسل سرکاری وفات کا سرٹیفکیٹ جاری کرتی ہے۔ یہ دستاویز میراث کے إجراء، پینشن کے دعوے، اور دیگر قانونی معاملات کے لیۏ لازمی ہے۔',
 'death,certificate,funeral,inheritance,register,deceased',
 'وفات,سرٹیفکیٹ,جنازہ,میراث,رجسٹر,متوفی', 7),

('get-driving-license',
 'Driving License', 'ڈرائیونگ لائسنس',
 'How do I get a driving license in Pakistan?',
 'پاکستان میں ڈرائیونگ لائسنس کیسے حاصل کروں؟',
 'You can apply for a driving license through the relevant licensing authority in your province (e.g., the Traffic Police or Excise & Taxation office).\n\nRequired documents typically include: CNIC, a medical certificate, passport-sized photographs, and the applicable fee. You will need to pass a written test and a practical driving test.\n\nLicenses are issued for different vehicle categories (motorcycle, car, commercial). The process and fees vary by province — check your provincial licensing authority''s website for details.',
 'آپ اپنے صوبے کے متعلقہ لائسنسنگ حکام (مثلاً ٹریفک پولیس یا ایکسائز اینڈ ٹیکسیشن آفیس) کے ذریعے ڈرائیونگ لائسنس کے لیے درخواست دے سکتے ہیں۔\n\nعام طور پر مطلوبہ دستاویزات میں شمل ہیں: CNIC، طبی سرٹیفکیٹ، پاسپورٹ سائز کی تصویریں، اور لاگو فیس۔ آپ کو ایک تحریری امتحان اور عملی ڈرائینگ امتحان پاس کرنا ہوگا۔\n\nلائسنس مختلف گاڑیوں کے زمروں (موٹر سائیکل، کار، کمرشیل) کے لیے جاری کیے جاتے ہیں۔ عمل اور فیس صوبے کے لحاظ سے مختلف ہوتے ہیں — تفصیلات کے لیے اپنے صوبائی لائسنسنگ حکام کی ویب سائٹ چیک کریں۔',
 'driving,license,motorcycle,car,traffic,test,permit',
 'ڈرائیونگ,لائسنس,موٹر سائیکل,کار,ٹریفک,امتحان,پرمٹ', 8),

('pay-electricity-bill',
 'Utilities & Bills', 'یوٹیلیٹی اور بل',
 'How do I check and pay my electricity bill?',
 'بجلی کا بل کیسے چیک کروں اور ادا کروں؟',
 'You can check and pay your electricity bill online through your local electric supply company''s website (e.g., LESCO, FESCO, MEPCO, KE, etc.) or through banking apps and mobile wallets.\n\nYou will need your 14-digit reference number (printed on your paper bill). Enter it on the company''s website to view your current bill and due date.\n\nPayment options include: online bank transfer, credit/debit card, mobile banking apps (JazzCash, EasyPaisa), and authorized payment centers. Always keep the payment receipt for your records.',
 'آپ اپنی مقامی بجلی سپلائی کمپنی کی ویب سائٹ (مثلاً LESCO، FESCO، MEPCO، KE، وغیرہ) کے ذریعے آن لائن اپنا بجلی کا بل چیک اور ادا کر سکتے ہیں، یا بینکنگ ایپس اور موبائل والٹ کے ذریعے۔\n\nآپ کو اپنا 14 ہندسہ کا حوالہ نمبر چاہیے ہوگا (جو آپ کے کاغذی بل پر چھپا ہوتا ہے)۔ کمپنی کی ویب سائٹ پر اسے درج کریں تاکہ آپ کا موجودہ بل اور آخری تاریخ دیکھ سکیں۔\n\nادائیگی کے اختیارات میں شامل ہیں: آن لائن بینک ٹرانسفر، کریڈٹ/ڈیبٹ کارڈ، موبائل بینکنگ ایپس (JazzCash، EasyPaisa)، اور مجاز ادائیگی مراکز۔ ہمیشہ ادائیگی کی رسید اپنے ریکارڈ کے لیۏ رکھیں۔',
 'electricity,bill,pay,utility,lesco,fesco,mepco,ke,discos,bijli',
 'بجلی,بل,ادائیگی,یوٹیلیٹی,لیسکو,فیسکو,میپکو,ڈسکوز', 9),

('file-income-tax',
 'Tax & Finance', 'ٹیکس اور مالیات',
 'How do I file an income tax return in Pakistan?',
 'پاکستان میں انکم ٹیکس ریٹرن کیسے درج کروں؟',
 'Income tax returns in Pakistan are filed online through the Federal Board of Revenue (FBR) portal at iris.fbr.gov.pk.\n\nFirst, you need an NTN (National Tax Number). If you don''t have one, you can register on the FBR portal. You will need your CNIC, bank details, and income information.\n\nThe tax year runs from July 1 to June 30. Returns are typically due by September 30 of the following year, though deadlines can be extended. Late filing may result in penalties.\n\nMany people use tax consultants or the FBR''s online guides to complete their return. Always keep copies of your filed return and supporting documents.',
 'پاکستان میں انکم ٹیکس ریٹرن وفاقی بورڈ آف ریونیو (FBR) پورٹل iris.fbr.gov.pk کے ذریعے آن لائن درج کیے جاتے ہیں۔\n\nپہلے، آپ کو ایک NTN (نشانی ٹیکس نمبر) چاہیے ہوتا ہے۔ اگر آپ کے پاس نہیں ہے، آپ FBR پورٹل پر رجسٹر ہو سکتے ہیں۔ آپ کو اپنی CNIC، بینک کی تفصیلات، اور آمدنی کی معلومات چاہیں ہوں گی۔\n\nٹیکس سال 1 جولائی سے 30 جون تک چلتا ہے۔ ریٹرن عام طور پر اگلے سال 30 ستمبر تک درج کرنے ہوتے ہیں، اگرچہ آخری تاریخ بڑھائی جا سکتی ہے۔ دیر سے درج کرنے پر جرمانہ ہو سکتا ہے۔\n\nبہت سے لوگ اپنا ریٹرن مکمل کرنے کے لیۏ ٹیکس مشیرین یا FBR کے آن لائن گائیڈز استعمال کرتے ہیں۔ ہمیشہ اپنے درج شدہ ریٹرن اور معاون دستاویزات کی کاپیاں رکھیں۔',
 'tax,income tax,ntn,fbr,return,iris,filing,revenue',
 'ٹیکس,انکم ٹیکس,ntn,fbr,ریٹرن,iris,درج,ریونیو', 10);

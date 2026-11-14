// دادهٔ نمایشی ۲۰ بیمار برای دموی پزشک — همهٔ فیلدها پر می‌شوند تا داشبورد، پرونده،
// پیگیری‌ها و شاخص‌های ادمین با دادهٔ واقع‌نما نمایش داده شوند.
// این داده‌ها ساختگی‌اند (شمارهٔ ملی/تلفن الگویی) و فقط برای محیط توسعه/دمو استفاده می‌شوند.
//
// هر بیمار: مشخصات، رضایت، و ۱ تا ۳ ویزیت. هر ویزیت: متن خام، پیش‌نویس ساخت‌یافته،
// نسخهٔ تأییدشده (اختیاری)، داروها، پیگیری‌ها، هشدارها و وضعیت پردازش.

export const DEMO_PATIENTS = [
  {
    fullName: 'مریم احمدی',
    nationalId: '0012345671',
    phone: '09121000001',
    consent: { channel: 'in_person', daysAgo: 120 },
    visits: [
      {
        daysAgo: 26,
        status: 'approved',
        rawInput:
          'بیمار خانم ۵۴ ساله، دیابت نوع ۲ از ۸ سال پیش. قند ناشتای امروز ۱۶۸، HbA1c هفت و نُه دهم درصد. ' +
          'متفورمین ۱۰۰۰ روزی دو بار می‌خورد. تکرر ادرار شبانه و بی‌حسی نوک انگشتان پا از دو ماه پیش. ' +
          'فشار خون ۱۳۰ روی ۸۵. وزن ۷۸ کیلو. توصیه به کاهش وزن و پیگیری آزمایش سه ماه بعد.',
        draft: {
          history: 'خانم ۵۴ ساله با سابقهٔ ۸ سالهٔ دیابت نوع ۲؛ تکرر ادرار شبانه و بی‌حسی نوک انگشتان پا از دو ماه پیش.',
          findings: 'قند ناشتا ۱۶۸ mg/dL، HbA1c ۷.۹٪، فشار خون ۱۳۰/۸۵، وزن ۷۸ کیلوگرم.',
          differential_diagnosis_draft: ['دیابت نوع ۲ با کنترل نامناسب', 'نوروپاتی محیطی دیابتی'],
          treatment_plan: 'ادامهٔ متفورمین ۱۰۰۰ میلی‌گرم روزی دو بار، توصیهٔ کاهش وزن و رژیم کم‌قند، آزمایش HbA1c سه ماه بعد.',
          medications: [
            { name: 'متفورمین', dosage: '۱۰۰۰ میلی‌گرم', instructions: 'روزی دو بار همراه غذا' },
          ],
          patient_summary: 'قند خون شما کمی بالاتر از حد مطلوب است. داروی فعلی را ادامه دهید، وزن را کم کنید و سه ماه بعد آزمایش بدهید.',
          warnings: ['بی‌حسی انگشتان پا — بررسی نوروپاتی'],
          follow_up: [
            { description: 'آزمایش HbA1c و قند ناشتا', due_hint: 'سه ماه بعد' },
            { description: 'بررسی معاینهٔ پا و حس انگشتان', due_hint: 'ویزیت بعدی' },
          ],
          missing_or_ambiguous: ['میزان فعالیت بدنی هفتگی ذکر نشده'],
          parse_error: false,
        },
        approved: 'same',
        followUps: [
          { description: 'آزمایش HbA1c و قند ناشتا', dueInDays: 64, status: 'pending' },
          { description: 'بررسی معاینهٔ پا و حس انگشتان', dueInDays: 4, status: 'pending' },
        ],
        alerts: ['بی‌حسی انگشتان پا — بررسی نوروپاتی'],
        sms: { sent: true, minutesAfterApproval: 6 },
      },
      {
        daysAgo: 3,
        status: 'approved',
        rawInput:
          'ویزیت پیگیری دیابت. قند ناشتا ۱۴۲، فشار ۱۲۵ روی ۸۰. بی‌حسی پا بهتر شده. متفورمین ادامه. ' +
          'آزمایش HbA1c هفتهٔ آینده.',
        draft: {
          history: 'پیگیری دیابت نوع ۲؛ بی‌حسی انگشتان پا نسبت به ویزیت قبل بهتر شده است.',
          findings: 'قند ناشتا ۱۴۲ mg/dL، فشار خون ۱۲۵/۸۰.',
          differential_diagnosis_draft: ['دیابت نوع ۲ با روند بهبود کنترل قند'],
          treatment_plan: 'ادامهٔ متفورمین ۱۰۰۰ میلی‌گرم روزی دو بار؛ انجام HbA1c هفتهٔ آینده.',
          medications: [
            { name: 'متفورمین', dosage: '۱۰۰۰ میلی‌گرم', instructions: 'روزی دو بار همراه غذا' },
          ],
          patient_summary: 'قند خون شما بهتر شده است. دارو را ادامه دهید و هفتهٔ آینده آزمایش بدهید.',
          warnings: [],
          follow_up: [{ description: 'دریافت نتیجهٔ HbA1c', due_hint: 'هفتهٔ آینده' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [{ description: 'دریافت نتیجهٔ HbA1c', dueInDays: 5, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 4 },
      },
    ],
  },
  {
    fullName: 'علی رضایی',
    nationalId: '0012345672',
    phone: '09121000002',
    consent: { channel: 'verbal', daysAgo: 90 },
    visits: [
      {
        daysAgo: 21,
        status: 'approved',
        rawInput:
          'آقای ۶۲ ساله، فشار خون بالا از ۵ سال پیش. امروز فشار ۱۵۵ روی ۹۵ دو بار اندازه‌گیری شد. ' +
          'لوزارتان ۵۰ روزی یک بار. سردرد خفیف صبح‌ها. نمک غذا زیاد است.',
        draft: {
          history: 'آقای ۶۲ ساله با سابقهٔ ۵ سالهٔ فشار خون بالا؛ سردرد خفیف صبح‌ها.',
          findings: 'فشار خون ۱۵۵/۹۵ در دو اندازه‌گیری متوالی.',
          differential_diagnosis_draft: ['فشار خون بالا با کنترل نامناسب'],
          treatment_plan: 'افزایش لوزارتان به ۵۰ میلی‌گرم روزی دو بار، کاهش نمک مصرفی، اندازه‌گیری فشار در منزل و ثبت روزانه.',
          medications: [
            { name: 'لوزارتان', dosage: '۵۰ میلی‌گرم', instructions: 'روزی دو بار' },
          ],
          patient_summary: 'فشار خون شما بالاست. دوز دارو افزایش یافت؛ نمک را کم کنید و فشار را هر روز در خانه اندازه بگیرید.',
          warnings: ['فشار خون ۱۵۵/۹۵ — کنترل نامناسب'],
          follow_up: [
            { description: 'بررسی دفترچهٔ ثبت فشار خون منزل', due_hint: 'دو هفته بعد' },
            { description: 'آزمایش عملکرد کلیه و الکترولیت‌ها', due_hint: 'یک ماه بعد' },
          ],
          missing_or_ambiguous: ['سابقهٔ مصرف داروی دیگر ذکر نشده'],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [
          { description: 'بررسی دفترچهٔ ثبت فشار خون منزل', dueInDays: -2, status: 'done' },
          { description: 'آزمایش عملکرد کلیه و الکترولیت‌ها', dueInDays: 9, status: 'pending' },
        ],
        alerts: ['فشار خون ۱۵۵/۹۵ — کنترل نامناسب'],
        sms: { sent: true, minutesAfterApproval: 9 },
      },
      {
        daysAgo: 0,
        status: 'draft',
        rawInput:
          'پیگیری فشار خون. فشار ۱۳۸ روی ۸۸. دفترچهٔ منزل میانگین ۱۴۰ روی ۹۰. سردرد کمتر شده. ' +
          'لوزارتان روزی دو بار ادامه.',
        draft: {
          history: 'پیگیری فشار خون بالا؛ سردرد صبحگاهی کاهش یافته است.',
          findings: 'فشار مطب ۱۳۸/۸۸؛ میانگین ثبت منزل ۱۴۰/۹۰.',
          differential_diagnosis_draft: ['فشار خون بالا با روند بهبود'],
          treatment_plan: 'ادامهٔ لوزارتان ۵۰ میلی‌گرم روزی دو بار؛ ادامهٔ ثبت فشار منزل.',
          medications: [
            { name: 'لوزارتان', dosage: '۵۰ میلی‌گرم', instructions: 'روزی دو بار' },
          ],
          patient_summary: 'فشار خون شما بهتر شده است. دارو را ادامه دهید و فشار را ثبت کنید.',
          warnings: [],
          follow_up: [{ description: 'بررسی نتیجهٔ آزمایش کلیه', due_hint: 'یک هفته بعد' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: null,
        followUps: [],
        alerts: [],
        sms: null,
      },
    ],
  },
  {
    fullName: 'زهرا کریمی',
    nationalId: '0012345673',
    phone: '09121000003',
    consent: { channel: 'sms', daysAgo: 60 },
    visits: [
      {
        daysAgo: 18,
        status: 'approved',
        rawInput:
          'خانم ۳۸ ساله، ضایعهٔ قرمز و پوسته‌ریزی روی آرنج چپ از سه هفته پیش. خارش دارد. ' +
          'کرم هیدروکورتیزون یک درصد شب‌ها. سابقهٔ حساسیت فصلی.',
        draft: {
          history: 'خانم ۳۸ ساله با ضایعهٔ قرمز و پوسته‌ریز روی آرنج چپ از سه هفته پیش همراه خارش؛ سابقهٔ حساسیت فصلی.',
          findings: 'ضایعهٔ اریتماتو با پوسته‌ریزی در سطح اکستانسور آرنج چپ.',
          differential_diagnosis_draft: ['درماتیت آتوپیک', 'درماتیت تماسی'],
          treatment_plan: 'کرم هیدروکورتیزون ۱٪ شب‌ها به مدت دو هفته؛ مرطوب‌کنندهٔ روزانه؛ پرهیز از مواد محرک.',
          medications: [
            { name: 'هیدروکورتیزون کرم ۱٪', dosage: 'لایهٔ نازک', instructions: 'شب‌ها به مدت دو هفته' },
          ],
          patient_summary: 'پوست آرنج شما التهاب دارد. کرم را شب‌ها بزنید و پوست را مرطوب نگه دارید.',
          warnings: [],
          follow_up: [{ description: 'ویزیت کنترل پوست', due_hint: 'دو هفته بعد' }],
          missing_or_ambiguous: ['مدت‌زمان دقیق خارش شبانه ذکر نشده'],
          parse_error: false,
        },
        approved: 'same',
        followUps: [{ description: 'ویزیت کنترل پوست', dueInDays: -4, status: 'done' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 3 },
      },
    ],
  },
  {
    fullName: 'حسین موسوی',
    nationalId: '0012345674',
    phone: '09121000004',
    consent: { channel: 'in_person', daysAgo: 200 },
    visits: [
      {
        daysAgo: 24,
        status: 'approved',
        rawInput:
          'آقای ۵۸ ساله، دیس‌لیپیدمی. LDL ۱۶۸، تری‌گلیسرید ۲۴۰. آتورواستاتین ۲۰ شب‌ها. ' +
          'رژیم غذایی نامناسب. سابقهٔ فامیلی بیماری قلبی.',
        draft: {
          history: 'آقای ۵۸ ساله با دیس‌لیپیدمی و سابقهٔ فامیلی بیماری قلبی؛ رژیم غذایی نامناسب.',
          findings: 'LDL ۱۶۸ mg/dL، تری‌گلیسرید ۲۴۰ mg/dL.',
          differential_diagnosis_draft: ['دیس‌لیپیدمی مختلط'],
          treatment_plan: 'آتورواستاتین ۲۰ میلی‌گرم شب‌ها؛ مشاورهٔ تغذیه؛ کنترل چربی خون سه ماه بعد.',
          medications: [
            { name: 'آتورواستاتین', dosage: '۲۰ میلی‌گرم', instructions: 'شب‌ها' },
          ],
          patient_summary: 'چربی خون شما بالاست. دارو را شب‌ها مصرف کنید و رژیم غذایی را اصلاح کنید.',
          warnings: ['سابقهٔ فامیلی بیماری قلبی'],
          follow_up: [{ description: 'کنترل پروفایل چربی', due_hint: 'سه ماه بعد' }],
          missing_or_ambiguous: ['فشار خون امروز ثبت نشده'],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [{ description: 'کنترل پروفایل چربی', dueInDays: 66, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 12 },
      },
      {
        daysAgo: 1,
        status: 'reviewed',
        rawInput:
          'پیگیری چربی خون. LDL ۱۳۵. آتورواستاتین ادامه. درد عضلانی ندارد. آزمایش کبدی طبیعی.',
        draft: {
          history: 'پیگیری دیس‌لیپیدمی؛ بدون درد عضلانی.',
          findings: 'LDL ۱۳۵ mg/dL؛ آنزیم‌های کبدی در محدودهٔ طبیعی.',
          differential_diagnosis_draft: ['دیس‌لیپیدمی با روند بهبود'],
          treatment_plan: 'ادامهٔ آتورواستاتین ۲۰ میلی‌گرم شب‌ها؛ کنترل چربی خون شش ماه بعد.',
          medications: [
            { name: 'آتورواستاتین', dosage: '۲۰ میلی‌گرم', instructions: 'شب‌ها' },
          ],
          patient_summary: 'چربی خون شما بهتر شده است. دارو را ادامه دهید.',
          warnings: [],
          follow_up: [{ description: 'کنترل پروفایل چربی', due_hint: 'شش ماه بعد' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: null,
        followUps: [],
        alerts: [],
        sms: null,
      },
    ],
  },
  {
    fullName: 'فاطمه نوری',
    nationalId: '0012345675',
    phone: '09121000005',
    consent: { channel: 'in_person', daysAgo: 45 },
    visits: [
      {
        daysAgo: 15,
        status: 'approved',
        rawInput:
          'خانم ۴۵ ساله، کم‌خونی فقر آهن. هموگلوبین ۹.۸، فریتین ۸. خستگی و ریزش مو. ' +
          'قرص آهن روزی یک بار. سابقهٔ خونریزی قاعدگی شدید.',
        draft: {
          history: 'خانم ۴۵ ساله با خستگی و ریزش مو؛ سابقهٔ خونریزی قاعدگی شدید.',
          findings: 'هموگلوبین ۹.۸ g/dL، فریتین ۸ ng/mL.',
          differential_diagnosis_draft: ['کم‌خونی فقر آهن', 'خونریزی قاعدگی شدید'],
          treatment_plan: 'فروس سولفات روزی یک بار همراه ویتامین C؛ ارجاع به زنان؛ کنترل CBC یک ماه بعد.',
          medications: [
            { name: 'فروس سولفات', dosage: '۲۰۰ میلی‌گرم', instructions: 'روزی یک بار همراه ویتامین C' },
          ],
          patient_summary: 'آهن خون شما کم است. قرص آهن را روزانه مصرف کنید و برای بررسی خونریزی به متخصص زنان مراجعه کنید.',
          warnings: ['هموگلوبین ۹.۸ — کم‌خونی'],
          follow_up: [
            { description: 'کنترل CBC', due_hint: 'یک ماه بعد' },
            { description: 'ارجاع به متخصص زنان', due_hint: 'دو هفته بعد' },
          ],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: 'same',
        followUps: [
          { description: 'کنترل CBC', dueInDays: 15, status: 'pending' },
          { description: 'ارجاع به متخصص زنان', dueInDays: 1, status: 'pending' },
        ],
        alerts: ['هموگلوبین ۹.۸ — کم‌خونی'],
        sms: { sent: true, minutesAfterApproval: 5 },
      },
    ],
  },
  {
    fullName: 'محمد حسینی',
    nationalId: '0012345676',
    phone: '09121000006',
    consent: { channel: 'verbal', daysAgo: 30 },
    visits: [
      {
        daysAgo: 12,
        status: 'approved',
        rawInput:
          'آقای ۷۰ ساله، دیابت و فشار خون. قند ناشتا ۱۹۵، فشار ۱۴۵ روی ۹۰. متفورمین و آملودیپین. ' +
          'تورم مچ پا. کاهش دوز آملودیپین بررسی شود.',
        draft: {
          history: 'آقای ۷۰ ساله با دیابت و فشار خون بالا؛ تورم مچ پا.',
          findings: 'قند ناشتا ۱۹۵ mg/dL، فشار خون ۱۴۵/۹۰، ادم مچ پا.',
          differential_diagnosis_draft: ['دیابت با کنترل نامناسب', 'ادم ناشی از آملودیپین'],
          treatment_plan: 'ادامهٔ متفورمین؛ کاهش آملودیپین به ۵ میلی‌گرم و بررسی ادم؛ کنترل قند و فشار دو هفته بعد.',
          medications: [
            { name: 'متفورمین', dosage: '۵۰۰ میلی‌گرم', instructions: 'روزی دو بار' },
            { name: 'آملودیپین', dosage: '۵ میلی‌گرم', instructions: 'روزی یک بار' },
          ],
          patient_summary: 'قند و فشار خون شما بالاست. دوز یکی از داروها کم شد؛ دو هفته بعد دوباره بررسی می‌شود.',
          warnings: ['قند ناشتا ۱۹۵ — کنترل نامناسب', 'ادم مچ پا'],
          follow_up: [{ description: 'کنترل قند و فشار خون', due_hint: 'دو هفته بعد' }],
          missing_or_ambiguous: ['عملکرد کلیه در آزمایش اخیر ذکر نشده'],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [{ description: 'کنترل قند و فشار خون', dueInDays: 2, status: 'pending' }],
        alerts: ['قند ناشتا ۱۹۵ — کنترل نامناسب'],
        sms: { sent: true, minutesAfterApproval: 7 },
      },
    ],
  },
  {
    fullName: 'سارا جعفری',
    nationalId: '0012345677',
    phone: '09121000007',
    consent: { channel: 'in_person', daysAgo: 75 },
    visits: [
      {
        daysAgo: 9,
        status: 'approved',
        rawInput:
          'خانم ۲۹ ساله، آکنهٔ صورت از شش ماه پیش. پاپول و پوسچول روی گونه‌ها. ' +
          'بنزوئیل پروکساید پنج درصد شب‌ها. سابقهٔ حساسیت به کرم ضدآفتاب.',
        draft: {
          history: 'خانم ۲۹ ساله با آکنهٔ صورت از شش ماه پیش؛ سابقهٔ حساسیت به کرم ضدآفتاب.',
          findings: 'پاپول و پوسچول روی گونه‌ها.',
          differential_diagnosis_draft: ['آکنهٔ ولگاریس'],
          treatment_plan: 'بنزوئیل پروکساید ۵٪ شب‌ها؛ شویندهٔ ملایم؛ پرهیز از دست‌کاری ضایعات.',
          medications: [
            { name: 'بنزوئیل پروکساید ۵٪', dosage: 'لایهٔ نازک', instructions: 'شب‌ها روی ضایعات' },
          ],
          patient_summary: 'جوش‌های صورت شما نیاز به درمان موضعی دارد. کرم را شب‌ها بزنید و جوش‌ها را دست نزنید.',
          warnings: ['سابقهٔ حساسیت به ضدآفتاب'],
          follow_up: [{ description: 'ویزیت کنترل آکنه', due_hint: 'یک ماه بعد' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: 'same',
        followUps: [{ description: 'ویزیت کنترل آکنه', dueInDays: 21, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 2 },
      },
    ],
  },
  {
    fullName: 'رضا صادقی',
    nationalId: '0012345678',
    phone: '09121000008',
    consent: { channel: 'in_person', daysAgo: 150 },
    visits: [
      {
        daysAgo: 28,
        status: 'approved',
        rawInput:
          'آقای ۴۸ ساله، ریفلاکس معده. سوزش سر دل شب‌ها، سرفهٔ خشک. امپرازول ۲۰ روزی یک بار. ' +
          'کاهش وزن ندارد. آندوسکوپی سال گذشته نرمال.',
        draft: {
          history: 'آقای ۴۸ ساله با سوزش سر دل شبانه و سرفهٔ خشک؛ آندوسکوپی سال گذشته نرمال.',
          findings: 'بدون کاهش وزن؛ معاینهٔ شکم بدون یافتهٔ خاص.',
          differential_diagnosis_draft: ['بیماری ریفلاکس معده به مری'],
          treatment_plan: 'امپرازول ۲۰ میلی‌گرم روزی یک بار نیم ساعت قبل صبحانه؛ پرهیز از غذای چرب و دراز کشیدن بعد از غذا.',
          medications: [
            { name: 'امپرازول', dosage: '۲۰ میلی‌گرم', instructions: 'روزی یک بار نیم ساعت قبل صبحانه' },
          ],
          patient_summary: 'سوزش معدهٔ شما به ریفلاکس مربوط است. دارو را صبح ناشتا بخورید و از غذای چرب پرهیز کنید.',
          warnings: [],
          follow_up: [{ description: 'ویزیت کنترل ریفلاکس', due_hint: 'شش هفته بعد' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [{ description: 'ویزیت کنترل ریفلاکس', dueInDays: 14, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 8 },
      },
      {
        daysAgo: 0,
        status: 'draft',
        rawInput:
          'پیگیری ریفلاکس. سوزش شب‌ها کمتر شده. سرفهٔ خشک باقی است. امپرازول ادامه.',
        draft: {
          history: 'پیگیری ریفلاکس؛ سوزش شبانه کاهش یافته، سرفهٔ خشک باقی است.',
          findings: 'معاینهٔ ریه بدون یافتهٔ خاص.',
          differential_diagnosis_draft: ['ریفلاکس با بهبود نسبی', 'سرفهٔ ناشی از ریفلاکس'],
          treatment_plan: 'ادامهٔ امپرازول ۲۰ میلی‌گرم روزی یک بار؛ بررسی علل دیگر سرفه در صورت تداوم.',
          medications: [
            { name: 'امپرازول', dosage: '۲۰ میلی‌گرم', instructions: 'روزی یک بار نیم ساعت قبل صبحانه' },
          ],
          patient_summary: 'سوزش معدهٔ شما بهتر شده است. دارو را ادامه دهید.',
          warnings: [],
          follow_up: [{ description: 'ویزیت کنترل سرفه', due_hint: 'یک ماه بعد' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: null,
        followUps: [],
        alerts: [],
        sms: null,
      },
    ],
  },
  {
    fullName: 'نرگس شریفی',
    nationalId: '0012345679',
    phone: '09121000009',
    consent: { channel: 'sms', daysAgo: 20 },
    visits: [
      {
        daysAgo: 6,
        status: 'approved',
        rawInput:
          'خانم ۳۳ ساله، میگرن. سردرد ضربان‌دار یک‌طرفه با تهوع، ماهی سه بار. ' +
          'سوماتریپتان در حمله. دفترچهٔ سردرد توصیه شد.',
        draft: {
          history: 'خانم ۳۳ ساله با سردرد ضربان‌دار یک‌طرفه همراه تهوع، ماهی سه بار.',
          findings: 'معاینهٔ عصبی طبیعی.',
          differential_diagnosis_draft: ['میگرن بدون اورا'],
          treatment_plan: 'سوماتریپتان در شروع حمله؛ ثبت دفترچهٔ سردرد؛ بررسی محرک‌ها.',
          medications: [
            { name: 'سوماتریپتان', dosage: '۵۰ میلی‌گرم', instructions: 'در شروع حمله، حداکثر دو بار در روز' },
          ],
          patient_summary: 'سردردهای شما از نوع میگرن است. دارو را در شروع حمله مصرف کنید و سردردها را ثبت کنید.',
          warnings: [],
          follow_up: [{ description: 'بررسی دفترچهٔ سردرد', due_hint: 'یک ماه بعد' }],
          missing_or_ambiguous: ['مصرف مسکن بیش از حد بررسی نشده'],
          parse_error: false,
        },
        approved: 'same',
        followUps: [{ description: 'بررسی دفترچهٔ سردرد', dueInDays: 24, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 3 },
      },
    ],
  },
  {
    fullName: 'امیر کاظمی',
    nationalId: '0012345680',
    phone: '09121000010',
    consent: { channel: 'in_person', daysAgo: 110 },
    visits: [
      {
        daysAgo: 20,
        status: 'approved',
        rawInput:
          'آقای ۵۵ ساله، آسم. سرفهٔ شبانه و خس‌خس سینه. اسپری سالبوتامول در صورت نیاز. ' +
          'اسپیرومتری FEV1 هفتاد درصد.',
        draft: {
          history: 'آقای ۵۵ ساله با سرفهٔ شبانه و خس‌خس سینه.',
          findings: 'اسپیرومتری: FEV1 ۷۰٪ پیش‌بینی.',
          differential_diagnosis_draft: ['آسم'],
          treatment_plan: 'اسپری سالبوتامول در صورت نیاز؛ آموزش تکنیک اسپری؛ کنترل اسپیرومتری سه ماه بعد.',
          medications: [
            { name: 'سالبوتامول اسپری', dosage: '۱۰۰ میکروگرم', instructions: 'در صورت نیاز، حداکثر چهار بار در روز' },
          ],
          patient_summary: 'راه‌های هوایی شما حساس است. اسپری را در صورت تنگی نفس استفاده کنید.',
          warnings: [],
          follow_up: [{ description: 'کنترل اسپیرومتری', due_hint: 'سه ماه بعد' }],
          missing_or_ambiguous: ['میزان استفادهٔ هفتگی از اسپری ذکر نشده'],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [{ description: 'کنترل اسپیرومتری', dueInDays: 70, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 10 },
      },
    ],
  },
  {
    fullName: 'لیلا رحیمی',
    nationalId: '0012345681',
    phone: '09121000011',
    consent: { channel: 'in_person', daysAgo: 65 },
    visits: [
      {
        daysAgo: 11,
        status: 'approved',
        rawInput:
          'خانم ۴۱ ساله، هیپوتیروئیدی. TSH شش و دو دهم، T4 پایین نرمال. خستگی و یبوست. ' +
          'لووتیروکسین ۵۰ میکروگرم صبح ناشتا.',
        draft: {
          history: 'خانم ۴۱ ساله با خستگی و یبوست.',
          findings: 'TSH ۶.۲ mIU/L، T4 آزاد در محدودهٔ پایین نرمال.',
          differential_diagnosis_draft: ['کم‌کاری تیروئید'],
          treatment_plan: 'لووتیروکسین ۵۰ میکروگرم صبح ناشتا؛ کنترل TSH شش هفته بعد.',
          medications: [
            { name: 'لووتیروکسین', dosage: '۵۰ میکروگرم', instructions: 'صبح ناشتا، نیم ساعت قبل صبحانه' },
          ],
          patient_summary: 'تیروئید شما کم‌کار است. قرص را صبح ناشتا بخورید و شش هفته بعد آزمایش بدهید.',
          warnings: [],
          follow_up: [{ description: 'کنترل TSH', due_hint: 'شش هفته بعد' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: 'same',
        followUps: [{ description: 'کنترل TSH', dueInDays: 31, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 4 },
      },
    ],
  },
  {
    fullName: 'بهرام قاسمی',
    nationalId: '0012345682',
    phone: '09121000012',
    consent: { channel: 'verbal', daysAgo: 40 },
    visits: [
      {
        daysAgo: 17,
        status: 'approved',
        rawInput:
          'آقای ۶۵ ساله، نارسایی قلبی. تنگی نفس با فعالیت، ادم پا. فوروزماید و کارودیلول. ' +
          'اکو EF چهل درصد. وزن ۸۵ کیلو.',
        draft: {
          history: 'آقای ۶۵ ساله با تنگی نفس در فعالیت و ادم پا.',
          findings: 'اکوکاردیوگرافی: EF ۴۰٪؛ وزن ۸۵ کیلوگرم.',
          differential_diagnosis_draft: ['نارسایی قلبی با کسر جهشی کاهش‌یافته'],
          treatment_plan: 'فوروزماید ۴۰ میلی‌گرم روزی یک بار؛ کارودیلول ۶.۲۵ میلی‌گرم روزی دو بار؛ کنترل وزن روزانه و محدودیت نمک.',
          medications: [
            { name: 'فوروزماید', dosage: '۴۰ میلی‌گرم', instructions: 'روزی یک بار صبح' },
            { name: 'کارودیلول', dosage: '۶.۲۵ میلی‌گرم', instructions: 'روزی دو بار' },
          ],
          patient_summary: 'قلب شما ضعیف‌تر از حد طبیعی کار می‌کند. داروها را منظم مصرف کنید و وزن را هر روز اندازه بگیرید.',
          warnings: ['افزایش وزن بیش از ۲ کیلو در سه روز — تماس فوری'],
          follow_up: [
            { description: 'کنترل وزن و ادم', due_hint: 'یک هفته بعد' },
            { description: 'اکوی کنترل', due_hint: 'سه ماه بعد' },
          ],
          missing_or_ambiguous: ['فشار خون امروز ثبت نشده'],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [
          { description: 'کنترل وزن و ادم', dueInDays: -3, status: 'done' },
          { description: 'اکوی کنترل', dueInDays: 73, status: 'pending' },
        ],
        alerts: ['افزایش وزن بیش از ۲ کیلو در سه روز — تماس فوری'],
        sms: { sent: true, minutesAfterApproval: 15 },
      },
    ],
  },
  {
    fullName: 'شیرین اکبری',
    nationalId: '0012345683',
    phone: '09121000013',
    consent: { channel: 'in_person', daysAgo: 85 },
    visits: [
      {
        daysAgo: 8,
        status: 'approved',
        rawInput:
          'خانم ۳۶ ساله، اگزما دست. خشکی و ترک پوست، خارش شبانه. کرم مرطوب‌کننده و ' +
          'بتامتازون یک بار در روز به مدت یک هفته.',
        draft: {
          history: 'خانم ۳۶ ساله با خشکی، ترک پوست و خارش شبانهٔ دست.',
          findings: 'لیکنیفیکاسیون و ترک پوست در پشت دست‌ها.',
          differential_diagnosis_draft: ['اگزما دست'],
          treatment_plan: 'بتامتازون یک بار در روز به مدت یک هفته؛ مرطوب‌کنندهٔ ضخیم بعد از هر شست‌وشو؛ دستکش در شست‌وشو.',
          medications: [
            { name: 'بتامتازون کرم', dosage: 'لایهٔ نازک', instructions: 'روزی یک بار به مدت یک هفته' },
          ],
          patient_summary: 'پوست دست شما خشک و ملتهب است. کرم را یک هفته استفاده کنید و دست‌ها را مرطوب نگه دارید.',
          warnings: [],
          follow_up: [{ description: 'ویزیت کنترل اگزما', due_hint: 'یک هفته بعد' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: 'same',
        followUps: [{ description: 'ویزیت کنترل اگزما', dueInDays: 6, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 2 },
      },
    ],
  },
  {
    fullName: 'کامران بهرامی',
    nationalId: '0012345684',
    phone: '09121000014',
    consent: { channel: 'in_person', daysAgo: 130 },
    visits: [
      {
        daysAgo: 23,
        status: 'approved',
        rawInput:
          'آقای ۵۲ ساله، نقرس. درد شدید مفصل شست پا از دیشب، قرمزی و تورم. اسید اوریک ۹.۲. ' +
          'کولشیسین و ایندومتاسین.',
        draft: {
          history: 'آقای ۵۲ ساله با درد شدید، قرمزی و تورم مفصل شست پا از شب گذشته.',
          findings: 'اسید اوریک ۹.۲ mg/dL؛ تورم و قرمزی مفصل متاتارسوفالانژیال.',
          differential_diagnosis_draft: ['حملهٔ حاد نقرس'],
          treatment_plan: 'کولشیسین در حملهٔ حاد؛ ایندومتاسین کوتاه‌مدت؛ پرهیز از گوشت قرمز و الکل؛ کنترل اسید اوریک یک ماه بعد.',
          medications: [
            { name: 'کولشیسین', dosage: '۰.۵ میلی‌گرم', instructions: 'روزی دو بار تا بهبود درد' },
            { name: 'ایندومتاسین', dosage: '۲۵ میلی‌گرم', instructions: 'روزی دو بار حداکثر پنج روز' },
          ],
          patient_summary: 'درد پای شما از نقرس است. داروها را طبق دستور مصرف کنید و گوشت قرمز و الکل را کم کنید.',
          warnings: ['اسید اوریک ۹.۲ — بالا'],
          follow_up: [{ description: 'کنترل اسید اوریک', due_hint: 'طبق برنامهٔ پیگیری' }],
          missing_or_ambiguous: ['عملکرد کلیه ذکر نشده'],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [{ description: 'کنترل اسید اوریک', dueInDays: 7, status: 'pending' }],
        alerts: ['اسید اوریک ۹.۲ — بالا'],
        sms: { sent: true, minutesAfterApproval: 6 },
      },
    ],
  },
  {
    fullName: 'پریسا مرادی',
    nationalId: '0012345685',
    phone: '09121000015',
    consent: { channel: 'sms', daysAgo: 10 },
    visits: [
      {
        daysAgo: 2,
        status: 'reviewed',
        rawInput:
          'خانم ۲۷ ساله، کهیر مزمن. کهیر و خارش شب‌ها از دو ماه پیش. لوراتادین روزی یک بار. ' +
          'آزمایش تیروئید نرمال.',
        draft: {
          history: 'خانم ۲۷ ساله با کهیر و خارش شبانه از دو ماه پیش.',
          findings: 'کهیر منتشر روی تنه و اندام‌ها؛ آزمایش تیروئید طبیعی.',
          differential_diagnosis_draft: ['کهیر مزمن خودبه‌خودی'],
          treatment_plan: 'لوراتادین ۱۰ میلی‌گرم روزی یک بار؛ در صورت کنترل ناکافی افزایش دوز با نظر پزشک؛ ثبت محرک‌ها.',
          medications: [
            { name: 'لوراتادین', dosage: '۱۰ میلی‌گرم', instructions: 'روزی یک بار شب‌ها' },
          ],
          patient_summary: 'کهیر شما نیاز به داروی روزانه دارد. دارو را شب‌ها مصرف کنید و محرک‌ها را یادداشت کنید.',
          warnings: [],
          follow_up: [{ description: 'ویزیت کنترل کهیر', due_hint: 'یک ماه بعد' }],
          missing_or_ambiguous: ['سابقهٔ مصرف داروی جدید ذکر نشده'],
          parse_error: false,
        },
        approved: null,
        followUps: [],
        alerts: [],
        sms: null,
      },
    ],
  },
  {
    fullName: 'سعید طاهری',
    nationalId: '0012345686',
    phone: '09121000016',
    consent: { channel: 'in_person', daysAgo: 95 },
    visits: [
      {
        daysAgo: 19,
        status: 'approved',
        rawInput:
          'آقای ۶۰ ساله، پیش‌دیابت. قند ناشتا ۱۱۲، HbA1c شش درصد. اضافه‌وزن. ' +
          'توصیه به فعالیت بدنی و رژیم. دارو شروع نشد.',
        draft: {
          history: 'آقای ۶۰ ساله با اضافه‌وزن؛ بدون علامت.',
          findings: 'قند ناشتا ۱۱۲ mg/dL، HbA1c ۶.۰٪.',
          differential_diagnosis_draft: ['پیش‌دیابت'],
          treatment_plan: 'تغییر سبک زندگی: فعالیت بدنی ۱۵۰ دقیقه در هفته و رژیم کم‌قند؛ کنترل قند شش ماه بعد.',
          medications: [],
          patient_summary: 'قند خون شما در مرز دیابت است. با ورزش و رژیم غذایی می‌توانید از پیشرفت آن جلوگیری کنید.',
          warnings: [],
          follow_up: [{ description: 'کنترل قند ناشتا و HbA1c', due_hint: 'طبق برنامهٔ پیگیری' }],
          missing_or_ambiguous: ['دور کمر ذکر نشده'],
          parse_error: false,
        },
        approved: 'same',
        followUps: [{ description: 'کنترل قند ناشتا و HbA1c', dueInDays: 160, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 5 },
      },
    ],
  },
  {
    fullName: 'مینا فرهادی',
    nationalId: '0012345687',
    phone: '09121000017',
    consent: { channel: 'in_person', daysAgo: 55 },
    visits: [
      {
        daysAgo: 13,
        status: 'approved',
        rawInput:
          'خانم ۳۱ ساله، ویتیلیگو روی دست‌ها. لکه‌های سفید از یک سال پیش. ' +
          'تاکرولیموس موضعی. ارجاع به پوست برای بررسی.',
        draft: {
          history: 'خانم ۳۱ ساله با لکه‌های سفید روی دست‌ها از یک سال پیش.',
          findings: 'ماکول‌های هیپوپیگمانته روی پشت دست‌ها.',
          differential_diagnosis_draft: ['ویتیلیگو'],
          treatment_plan: 'تاکرولیموس موضعی دو بار در روز؛ محافظت از آفتاب؛ ویزیت کنترل سه ماه بعد.',
          medications: [
            { name: 'تاکرولیموس پماد ۰.۱٪', dosage: 'لایهٔ نازک', instructions: 'روزی دو بار' },
          ],
          patient_summary: 'لکه‌های سفید پوست شما نیاز به درمان موضعی دارد. پماد را روزی دو بار بزنید و از آفتاب محافظت کنید.',
          warnings: [],
          follow_up: [{ description: 'ویزیت کنترل ویتیلیگو', due_hint: 'طبق برنامهٔ پیگیری' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [{ description: 'ویزیت کنترل ویتیلیگو', dueInDays: 77, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 4 },
      },
    ],
  },
  {
    fullName: 'جواد نیک‌پور',
    nationalId: '0012345688',
    phone: '09121000018',
    consent: { channel: 'verbal', daysAgo: 25 },
    visits: [
      {
        daysAgo: 5,
        status: 'approved',
        rawInput:
          'آقای ۶۸ ساله، COPD. تنگی نفس با فعالیت، سرفهٔ خلط‌دار صبح‌ها. ' +
          'اسپری تیوتروپیوم و سالبوتامول. ترک سیگار توصیه شد.',
        draft: {
          history: 'آقای ۶۸ ساله با تنگی نفس در فعالیت و سرفهٔ خلط‌دار صبحگاهی؛ مصرف سیگار.',
          findings: 'خس‌خس بازدمی دوطرفه؛ SpO2 ۹۳٪.',
          differential_diagnosis_draft: ['بیماری انسدادی مزمن ریه'],
          treatment_plan: 'تیوتروپیوم روزی یک بار و سالبوتامول در صورت نیاز؛ ترک سیگار؛ واکسن آنفلوآنزا.',
          medications: [
            { name: 'تیوتروپیوم اسپری', dosage: '۱۸ میکروگرم', instructions: 'روزی یک بار' },
            { name: 'سالبوتامول اسپری', dosage: '۱۰۰ میکروگرم', instructions: 'در صورت نیاز' },
          ],
          patient_summary: 'ریه‌های شما آسیب دیده است. اسپری‌ها را منظم استفاده کنید و سیگار را ترک کنید.',
          warnings: ['SpO2 ۹۳٪ — پایش اشباع اکسیژن'],
          follow_up: [{ description: 'کنترل SpO2 و علائم تنفسی', due_hint: 'طبق برنامهٔ پیگیری' }],
          missing_or_ambiguous: ['تعداد پاکت-سال سیگار ذکر نشده'],
          parse_error: false,
        },
        approved: 'edited',
        followUps: [{ description: 'کنترل SpO2 و علائم تنفسی', dueInDays: 9, status: 'pending' }],
        alerts: ['SpO2 ۹۳٪ — پایش اشباع اکسیژن'],
        sms: { sent: true, minutesAfterApproval: 11 },
      },
    ],
  },
  {
    fullName: 'الهام سلطانی',
    nationalId: '0012345689',
    phone: '09121000019',
    consent: { channel: 'in_person', daysAgo: 70 },
    visits: [
      {
        daysAgo: 7,
        status: 'approved',
        rawInput:
          'خانم ۴۹ ساله، استئوآرتریت زانو. درد زانو در راه رفتن و پله. ' +
          'استامینوفن و تمرین تقویتی. کاهش وزن توصیه شد.',
        draft: {
          history: 'خانم ۴۹ ساله با درد زانو در راه رفتن و بالا رفتن از پله.',
          findings: 'کریپیتوس و محدودیت خفیف دامنهٔ حرکتی زانوی راست.',
          differential_diagnosis_draft: ['استئوآرتریت زانو'],
          treatment_plan: 'استامینوفن در صورت درد؛ تمرین تقویتی چهارسر؛ کاهش وزن؛ فیزیوتراپی.',
          medications: [
            { name: 'استامینوفن', dosage: '۵۰۰ میلی‌گرم', instructions: 'در صورت درد، حداکثر سه بار در روز' },
          ],
          patient_summary: 'درد زانوی شما از ساییدگی مفصل است. تمرین تقویتی و کاهش وزن به شما کمک می‌کند.',
          warnings: [],
          follow_up: [{ description: 'ویزیت کنترل درد زانو', due_hint: 'طبق برنامهٔ پیگیری' }],
          missing_or_ambiguous: [],
          parse_error: false,
        },
        approved: 'same',
        followUps: [{ description: 'ویزیت کنترل درد زانو', dueInDays: 23, status: 'pending' }],
        alerts: [],
        sms: { sent: true, minutesAfterApproval: 3 },
      },
    ],
  },
  {
    fullName: 'آرش دهقان',
    nationalId: '0012345690',
    phone: '09121000020',
    consent: { channel: 'in_person', daysAgo: 5 },
    visits: [
      {
        daysAgo: 0,
        status: 'draft',
        rawInput:
          'آقای ۳۴ ساله، اولین ویزیت. خستگی و سرگیجه خفیف از دو هفته پیش. ' +
          'فشار ۱۱۰ روی ۷۰. آزمایش CBC و فریتین درخواست شد.',
        draft: {
          history: 'آقای ۳۴ ساله با خستگی و سرگیجهٔ خفیف از دو هفته پیش.',
          findings: 'فشار خون ۱۱۰/۷۰؛ معاینهٔ عمومی بدون یافتهٔ خاص.',
          differential_diagnosis_draft: ['خستگی با علت نامشخص', 'احتمال کم‌خونی'],
          treatment_plan: 'درخواست CBC و فریتین؛ مصرف مایعات کافی؛ ویزیت پیگیری پس از آماده‌شدن آزمایش.',
          medications: [],
          patient_summary: 'برای بررسی خستگی و سرگیجه آزمایش خون درخواست شد. پس از آماده‌شدن نتیجه دوباره مراجعه کنید.',
          warnings: [],
          follow_up: [{ description: 'بررسی نتیجهٔ CBC و فریتین', due_hint: 'یک هفته بعد' }],
          missing_or_ambiguous: ['مدت و کیفیت خواب ذکر نشده'],
          parse_error: false,
        },
        approved: null,
        followUps: [],
        alerts: [],
        sms: null,
      },
    ],
  },
];

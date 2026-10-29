const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const CropExpense = require('../models/CropExpense');
const CropSale = require('../models/CropSale');
const Crop = require('../models/Crop');

/**
 * Format currency in Indian Numbering System (e.g. ₹1,25,000)
 */
function formatCurrency(amount) {
  const num = Math.round(Number(amount) || 0);
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Category names mapping to Marathi
 */
const CATEGORY_MAP = {
  seeds: 'बियाणे',
  fertilizers: 'रासायनिक व सेंद्रिय खते',
  pesticides: 'कीटकनाशके व फवारणी औषधे',
  irrigation: 'पाणी व सिंचन',
  fuel: 'डिझेल व इंधन',
  machinery: 'ट्रॅक्टर व मशिनरी भाडे',
  labor_misc: 'इतर मजुरी व काम',
  transport: 'वाहतूक व हमाली',
  other: 'इतर शेती खर्च',
  worker_wages: 'मजुरांची हजेरी मजुरी',
};

/**
 * Extensive crop aliases (Marathi Devanagari, English, and phonetic transliterations)
 */
const CROP_ALIASES = {
  'कापूस': ['कापूस', 'कपाशी', 'कापसाचा', 'कापसावर', 'कापसाचे', 'कापसाची', 'cotton', 'kapus', 'kapas', 'kapsacha'],
  'सोयाबीन': ['सोयाबीन', 'सोया', 'सोयाबीनचा', 'सोयाबीनचे', 'सोयाबीनची', 'soybean', 'soya', 'soyabean', 'soyabeanache'],
  'कांदा': ['कांदा', 'कांद्याचा', 'कांद्याचे', 'कांद्याची', 'कांद्याला', 'onion', 'kanda', 'kandyacha'],
  'ऊस': ['ऊस', 'उसाचा', 'उसाचे', 'उसाची', 'उसावर', 'sugarcane', 'us', 'oosa', 'usacha'],
  'गहू': ['गहू', 'गव्हाचा', 'गव्हाचे', 'गव्हाची', 'wheat', 'gahu', 'gehu', 'gavhacha'],
  'मका': ['मका', 'मक्याचा', 'मक्याचे', 'मक्याची', 'maize', 'corn', 'maka', 'makyacha'],
  'हरभरा': ['हरभरा', 'चना', 'हरभऱ्याचा', 'हरभऱ्याचे', 'gram', 'harbhara', 'chana'],
  'टोमॅटो': ['टोमॅटो', 'टोमॅटोचा', 'टोमॅटोचे', 'tomato', 'tamatar'],
  'डाळिंब': ['डाळिंब', 'डाळिंबाचा', 'डाळिंबाचे', 'pomegranate', 'dalimb'],
  'द्राक्षे': ['द्राक्षे', 'द्राक्ष', 'द्राक्षांचा', 'grapes', 'draksh'],
  'हळद': ['हळद', 'हळदीचा', 'हळदीचे', 'turmeric', 'halad'],
  'आले': ['आल्याचा', 'आल्याचे', 'आल्याची', 'आले पीक', 'आल्याचे पीक', 'ginger', 'aale pik'],
  'बाजरी': ['बाजरी', 'बाजरीचा', 'बाजरीचे', 'bajra', 'bajari'],
  'ज्वारी': ['ज्वारी', 'ज्वारीचा', 'ज्वारीचे', 'jowar', 'jwari'],
};

/**
 * Category aliases for flexible expense query matching
 */
const CATEGORY_ALIASES = {
  fertilizers: [
    'खत', 'खते', 'खतांचा', 'खतांवर', 'खताचे', 'खतांची', 'युरिया', 'डीएपी', 'खतपाणी', 'सेंद्रिय', 'रासायनिक',
    'fertilizer', 'fertilizers', 'khat', 'kht'
  ],
  seeds: [
    'बियाणे', 'बियाण्यांचा', 'बियाण्यांचे', 'बियाण्यावर', 'बी-बियाणे', 'बी', 'बियाण', 'बियाण्या',
    'seed', 'seeds', 'biyane', 'beej'
  ],
  pesticides: [
    'औषध', 'औषधे', 'औषधांचा', 'औषधांवर', 'फवारणी', 'कीटकनाशक', 'कीटकनाशके', 'कीटकनाशकांचा', 'कीड', 'बुरशीनाशक',
    'pesticide', 'pesticides', 'spray', 'aushadh', 'favarni'
  ],
  fuel: [
    'डिझेल', 'डिझेलचा', 'डिझेलचे', 'पेट्रोल', 'इंधन', 'तेल',
    'fuel', 'diesel', 'petrol', 'indhan'
  ],
  machinery: [
    'ट्रॅक्टर', 'ट्रॅक्टरचा', 'ट्रॅक्टरचे', 'नांगरणी', 'रोटाव्हेटर', 'मशिनरी', 'अवजारे', 'यंत्रे', 'भाडे',
    'machinery', 'tractor', 'yantra', 'rotavator', 'nangarni'
  ],
  irrigation: [
    'पाणी', 'पाण्याचा', 'पाण्याचे', 'सिंचन', 'ठिबक', 'तुषार', 'विहीर', 'मोटर', 'लाइट बिल', 'वीज बिल',
    'irrigation', 'water', 'drip', 'pani', 'light bill', 'electricity'
  ],
  transport: [
    'वाहतूक', 'वाहतुकीचा', 'वाहतुकीचे', 'गाडीभाडे', 'हमाली', 'टेंपो', 'भाडे',
    'transport', 'hamali', 'tempo', 'vahtuk'
  ],
  labor_misc: [
    'निंदणी', 'खुरपणी', 'छाटणी', 'तोडणी', 'इतर काम', 'श्रम',
    'labor', 'weeding', 'khurpani', 'todani'
  ]
};

/**
 * Normalized text cleaner for flexible phrasing comparison
 */
function normalizeQuery(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[?!,.:;"'(){}[\]\-–—/\\@#$%^&*+=<>~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch complete live financial context for a farmer from MongoDB
 * NEVER INVENT FINANCIAL DATA - ONLY LIVE AGGREGATED DB RECORDS!
 */
async function getFarmerDatabaseContext(farmerId) {
  // 1. Sales / Revenue Aggregation
  const salesAgg = await CropSale.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalRevenue' },
        totalReceived: { $sum: '$amountReceived' },
        totalSalesCount: { $sum: 1 },
      },
    },
  ]);
  const totalRevenue = salesAgg[0]?.totalRevenue || 0;
  const totalReceived = salesAgg[0]?.totalReceived || 0;
  const pendingFromBuyers = Math.max(0, totalRevenue - totalReceived);

  // Crop-wise sales breakdown
  const cropSales = await CropSale.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: '$cropName',
        totalRevenue: { $sum: '$totalRevenue' },
        totalReceived: { $sum: '$amountReceived' },
        totalQuantity: { $sum: '$quantity' },
        unit: { $first: '$unit' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  // 2. Crop Expenses Aggregation
  const expensesAgg = await CropExpense.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const totalCropExpenses = expensesAgg[0]?.totalAmount || 0;

  // Category breakdown
  const categoryExpenses = await CropExpense.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  // Crop-wise expenses
  const cropExpenses = await CropExpense.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: '$cropName',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  // 3. Worker Attendance & Wages Incurred
  const attendanceAgg = await Attendance.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: null,
        totalWagesEarned: { $sum: '$dailyWage' },
        totalDaysWorked: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 0, 1] } },
      },
    },
  ]);
  const totalWagesIncurred = attendanceAgg[0]?.totalWagesEarned || 0;
  const totalDaysWorked = attendanceAgg[0]?.totalDaysWorked || 0;

  // 4. Worker Payments Actually Paid
  const paymentsAgg = await Payment.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const totalWagesPaid = paymentsAgg[0]?.totalPaid || 0;
  const pendingWorkerDues = Math.max(0, totalWagesIncurred - totalWagesPaid);

  // 5. Worker-wise breakdown for all registered workers of this farmer
  const workers = await User.find({ farmerId, role: 'worker' }).lean();
  const workerBalances = await Promise.all(
    workers.map(async (worker) => {
      const attData = await Attendance.aggregate([
        { $match: { worker: worker._id, farmer: farmerId } },
        {
          $group: {
            _id: null,
            totalEarned: { $sum: '$dailyWage' },
            daysWorked: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 0, 1] } },
          },
        },
      ]);
      const payData = await Payment.aggregate([
        { $match: { worker: worker._id, farmer: farmerId } },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$amount' },
            lastDate: { $max: '$date' },
          },
        },
      ]);
      const earned = attData[0]?.totalEarned || 0;
      const paid = payData[0]?.totalPaid || 0;
      const pending = earned - paid;
      return {
        id: worker._id,
        name: worker.name,
        phone: worker.phone,
        status: worker.status,
        dailyWageRate: worker.dailyWageRate,
        daysWorked: attData[0]?.daysWorked || 0,
        totalEarned: earned,
        totalPaid: paid,
        pendingWages: pending,
        lastPaymentDate: payData[0]?.lastDate || null,
      };
    })
  );

  const workersWithPending = workerBalances.filter((w) => w.pendingWages > 0);

  // 6. Registered Crops
  const activeCrops = await Crop.find({ farmer: farmerId }).sort({ acreage: -1 }).lean();

  // 7. Overall Financial Standing
  const totalOperationalExpenses = totalCropExpenses + totalWagesIncurred;
  const netProfitLoss = totalRevenue - totalOperationalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfitLoss / totalRevenue) * 100).toFixed(1) : 0;

  return {
    totalRevenue,
    totalReceived,
    pendingFromBuyers,
    cropSales,
    totalCropExpenses,
    categoryExpenses,
    cropExpenses,
    totalWagesIncurred,
    totalDaysWorked,
    totalWagesPaid,
    pendingWorkerDues,
    workerBalances,
    workersWithPending,
    activeCrops,
    totalOperationalExpenses,
    netProfitLoss,
    profitMargin,
  };
}

/**
 * Intelligent Rule-Based Intent Detector Supporting Flexible Natural Phrasings
 */
function detectIntent(rawQuery, context) {
  const q = normalizeQuery(rawQuery);

  // 1. Check for Greeting or Help
  const greetingKeywords = [
    'नमस्कार', 'राम राम', 'हॅलो', 'हाय', 'शंभू', 'गणेश', 'जय', 'मदत', 'काय विचारू', 'पर्याय', 'मदतनीस', 'धन्यवाद', 'थँक्यू', 'आभार',
    'namaskar', 'ram ram', 'hello', 'hi', 'help', 'madat', 'thanks', 'dhanyawad'
  ];
  if (greetingKeywords.some((k) => q.includes(k)) && q.split(' ').length <= 4 && !q.includes('खर्च') && !q.includes('मजुरी') && !q.includes('उत्पन्न')) {
    return { type: 'greeting' };
  }

  // 2. Extract Worker Entity (Flexible matching on first name, last name, or full name)
  let matchedWorker = null;
  if (context.workerBalances && context.workerBalances.length > 0) {
    for (const w of context.workerBalances) {
      const fullName = w.name.toLowerCase();
      const parts = fullName.split(' ');
      for (const part of parts) {
        if (part.length >= 3) {
          // Check if query contains worker's name stem (e.g., 'प्रणव', 'प्रणवला', 'pranav', 'pranavla')
          const cleanPart = part.replace(/[^\w\u0900-\u097F]/g, '');
          if (q.includes(cleanPart)) {
            matchedWorker = w;
            break;
          }
        }
      }
      if (matchedWorker) break;
    }
  }

  // 3. Extract Crop Entity (Matches against database crops and standard alias map)
  let matchedCropName = null;
  let matchedCropDisplay = null;

  // Check alias dictionary
  for (const [cropDisplay, aliases] of Object.entries(CROP_ALIASES)) {
    for (const alias of aliases) {
      if (q.includes(alias.toLowerCase())) {
        matchedCropName = alias;
        matchedCropDisplay = cropDisplay;
        break;
      }
    }
    if (matchedCropName) break;
  }

  // Also check database crops if not found in dictionary
  if (!matchedCropName && context.activeCrops) {
    for (const c of context.activeCrops) {
      const cName = c.cropName.toLowerCase();
      if (q.includes(cName)) {
        matchedCropName = c.cropName;
        matchedCropDisplay = c.cropName;
        break;
      }
    }
  }

  // Also check crop expenses and sales names from database
  if (!matchedCropName) {
    const allDBCropNames = [
      ...context.cropExpenses.map((e) => e._id),
      ...context.cropSales.map((s) => s._id),
    ];
    for (const dbName of allDBCropNames) {
      if (dbName && q.includes(dbName.toLowerCase())) {
        matchedCropName = dbName;
        matchedCropDisplay = dbName;
        break;
      }
    }
  }

  // 4. Extract Category Entity (for expenses)
  let matchedCategory = null;
  for (const [catKey, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      if (q.includes(alias.toLowerCase())) {
        matchedCategory = catKey;
        break;
      }
    }
    if (matchedCategory) break;
  }

  // 5. Calculate Intent Match Scores for Flexible Phrasings

  // Score A: Worker Wages & Labor Dues
  let workerScore = 0;
  const workerTerms = [
    'मजुरी', 'मजूर', 'मजुरांचे', 'मजुरांना', 'मजुराला', 'कामगार', 'कामगारांचे', 'कामगारांना', 'कामगाराला',
    'हजेरी', 'हजेरीचे', 'रोजंदारी', 'रोज', 'वेतन', 'पगार', 'पगाराचे', 'बाकी', 'देणे', 'देणी', 'राहिले',
    'द्यायचे', 'द्यायचेत', 'द्यायचे बाकी', 'पैसे बाकी', 'रुपये बाकी', 'शिल्लक मजुरी', 'कोणाचे पैसे', 'कोणाचे बाकी',
    'majuri', 'majur', 'kamgar', 'hajeri', 'pagar', 'baki', 'dene', 'rahile', 'dyayche', 'worker', 'wage', 'salary'
  ];
  workerTerms.forEach((term) => {
    if (q.includes(term)) workerScore += 2;
  });
  if (q.includes('पैसे बाकी') || q.includes('देणे राहिले') || q.includes('द्यायचे राहिले') || q.includes('बाकी मजुरी')) {
    workerScore += 4;
  }
  if (matchedWorker) workerScore += 5; // Strongly boost worker intent if a worker's name is found

  // Score B: Crop Expenses & Inputs
  let expenseScore = 0;
  const expenseTerms = [
    'खर्च', 'खर्चाचा', 'खर्चाचे', 'खर्चाची', 'खर्चामध्ये', 'खर्चाबाबत', 'खर्चिले', 'लागले', 'गेले',
    'रुपये गेले', 'पैसे गेले', 'निविष्ठा', 'भांडवल', 'गुंतवणूक', 'बिल', 'देयक', 'किती गेले', 'किती लागले',
    'kharch', 'kharcha', 'kharche', 'kharchi', 'lagle', 'gele', 'expense', 'expenses', 'cost', 'spending'
  ];
  expenseTerms.forEach((term) => {
    if (q.includes(term)) expenseScore += 2;
  });
  if (matchedCategory) expenseScore += 4; // Strongly boost expense if specific category found
  // Score C: Income & Harvest Sales
  let incomeScore = 0;
  const incomeTerms = [
    'विक्री', 'विक्रीचे', 'विक्रीतून', 'विकले', 'विकला', 'विकली', 'विकलेत', 'विकलाय', 'उत्पन्न',
    'उत्पन्नाचा', 'उत्पन्नाचे', 'उत्पन्नातून', 'शेतमाल', 'माल', 'माल विकला', 'मालाचे', 'पैसे आले',
    'रुपये आले', 'मिळाले', 'कमाई', 'आवक', 'जमा', 'भाव', 'बाजारभाव', 'दर', 'मंडी', 'व्यापारी',
    'व्यापाऱ्याकडून', 'व्यापाऱ्याने', 'आडत्या', 'पट्टी',
    'vikri', 'vikla', 'vikli', 'vikle', 'utpanna', 'shetmal', 'paise ale', 'milale', 'bhav', 'mandi', 'income', 'sale', 'sales', 'revenue'
  ];
  incomeTerms.forEach((term) => {
    if (q.includes(term)) incomeScore += 2;
  })
  if (
    q.includes('पैसे आले') ||
    q.includes('रुपये आले') ||
    q.includes('पैसे मिळाले') ||
    q.includes('विकून किती') ||
    q.includes('विकून आले') ||
    (q.includes('पैसे') && (q.includes('आले') || q.includes('मिळाले') || q.includes('जमा') || q.includes('आवक') || q.includes('किती आले')))
  ) {
    incomeScore += 5;
  }
  // Score D: Budget, Net Profit/Loss, Financial Balance
  let budgetScore = 0;
  const budgetTerms = [
    'ताळेबंद', 'ताळेबंदाचा', 'ताळेबंदाचे', 'हिशोब', 'हिशोबाचा', 'शिल्लक', 'उरले', 'उरली', 'हातात',
    'हातात किती', 'लेखाजोखा', 'अंदाजपत्रक', 'बजेट', 'नफा', 'नफ्याचा', 'नफ्यात', 'फायदा', 'फायद्यात',
    'तोटा', 'तोट्यात', 'नुकसान', 'परवडली', 'परवडले', 'शेती कशी चालू', 'परिस्थिती', 'आर्थिक', 'तुलना',
    'taleband', 'shillak', 'urle', 'andajpatrak', 'budget', 'nafa', 'fayda', 'tota', 'parvadli', 'profit', 'loss', 'balance'
  ];
  budgetTerms.forEach((term) => {
    if (q.includes(term)) budgetScore += 2;
  });

  // 6. Contextual Decision Matrix

  // Case A: Specific Worker is addressed
  if (matchedWorker) {
    return {
      type: 'worker_wages',
      worker: matchedWorker,
      workerName: matchedWorker.name,
    };
  }

  // Case B: Specific Crop is addressed
  if (matchedCropName) {
    if (incomeScore > expenseScore) {
      // User is asking specifically about crop income/sale
      return {
        type: 'income_sales',
        cropName: matchedCropName,
        cropDisplayName: matchedCropDisplay,
      };
    } else if (expenseScore > incomeScore) {
      // User is asking specifically about crop expense
      return {
        type: 'crop_expense',
        cropName: matchedCropName,
        cropDisplayName: matchedCropDisplay,
        category: matchedCategory,
      };
    } else {
      // User asked about the crop in general -> Provide complete 360° crop ledger
      return {
        type: 'crop_360_ledger',
        cropName: matchedCropName,
        cropDisplayName: matchedCropDisplay,
      };
    }
  }

  // Case C: Determine highest scoring domain for general queries
  const maxScore = Math.max(workerScore, expenseScore, incomeScore, budgetScore);

  if (maxScore > 0) {
    if (maxScore === budgetScore) {
      return { type: 'budget_summary' };
    }
    if (maxScore === workerScore) {
      return { type: 'worker_wages' };
    }
    if (maxScore === expenseScore) {
      return {
        type: 'crop_expense',
        category: matchedCategory,
      };
    }
    if (maxScore === incomeScore) {
      return { type: 'income_sales' };
    }
  }

  // Case D: Crop acreage / info check
  if (q.includes('पीक') || q.includes('पिके') || q.includes('क्षेत्र') || q.includes('वाण') || q.includes('हंगाम') || q.includes('crop')) {
    return { type: 'crop_info' };
  }

  // Fallback to overview with helpful guidance
  return { type: 'unknown' };
}

/**
 * Generate context-aware, non-restrictive suggested question shortcuts
 */
function generateDynamicShortcuts(context, currentIntent) {
  const shortcuts = [];

  // Top dynamic suggestions based on real database entries
  if (context.workersWithPending && context.workersWithPending.length > 0) {
    const topWorker = context.workersWithPending[0];
    shortcuts.push(`${topWorker.name.split(' ')[0]}चे बाकी पैसे किती?`);
  }

  if (context.activeCrops && context.activeCrops.length > 0) {
    const topCrop = context.activeCrops[0].cropName;
    shortcuts.push(`${topCrop} पिकाचा खर्च व नफा`);
  }

  // Standard high-value financial shortcuts
  if (currentIntent !== 'crop_expense') {
    shortcuts.push('💰 एकूण शेती खर्च किती?');
  }
  if (currentIntent !== 'worker_wages') {
    shortcuts.push('👷 मजुरांची बाकी मजुरी');
  }
  if (currentIntent !== 'income_sales') {
    shortcuts.push('🌾 शेतमाल विक्री व उत्पन्न');
  }
  if (currentIntent !== 'budget_summary') {
    shortcuts.push('📊 संपूर्ण ताळेबंद व नफा');
  }

  return shortcuts.slice(0, 5);
}

/**
 * Process any natural language Marathi query and generate database-grounded response
 */
async function processFarmerQuery(farmerId, rawQuery, farmerUser) {
  const query = (rawQuery || '').trim();
  const context = await getFarmerDatabaseContext(farmerId);

  const farmerName = farmerUser?.name || 'शेतकरी मित्र';
  const farmName = farmerUser?.farmName || 'आपले शेत';

  // Detect intent using multi-keyword and semantic matching
  const intent = detectIntent(query, context);

  let reply = '';
  let speechText = '';
  const quickReplies = generateDynamicShortcuts(context, intent.type);

  // Friendly non-restrictive tip added to responses
  const shortcutNotice = `\n\n💡 *टीप: खालील बटणे ही केवळ आपल्या सोयीसाठीचे शॉर्टकट आहेत. आपण कोणताही शेतीविषयक प्रश्न आपल्या स्वतःच्या भाषेत टाईप करून किंवा बोलून विचारू शकता.*`;

  switch (intent.type) {
    // ----------------------------------------------------
    // CASE 1: 360° CROP FINANCIAL LEDGER (संपूर्ण पीक हिशोब)
    // ----------------------------------------------------
    case 'crop_360_ledger': {
      const cropName = intent.cropDisplayName || intent.cropName;

      // 1. Fetch live DB expenses for this crop
      const matchedExpense = context.cropExpenses.find((c) =>
        c._id.toLowerCase().includes(intent.cropName.toLowerCase())
      );
      const expAmount = matchedExpense?.total || 0;

      // Detailed category breakdown from database
      const specificCategories = await CropExpense.aggregate([
        { $match: { farmer: farmerId, cropName: new RegExp(intent.cropName, 'i') } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]);

      // 2. Fetch live DB sales for this crop
      const matchedSale = context.cropSales.find((s) =>
        s._id.toLowerCase().includes(intent.cropName.toLowerCase())
      );
      const saleRevenue = matchedSale?.totalRevenue || 0;
      const saleQty = matchedSale?.totalQuantity || 0;
      const saleUnit = matchedSale?.unit || '';

      // 3. Registered Crop details from database
      const registeredCrop = context.activeCrops.find((c) =>
        c.cropName.toLowerCase().includes(intent.cropName.toLowerCase())
      );

      const netCropProfit = saleRevenue - expAmount;

      reply = `🌱 **${cropName} – संपूर्ण पीक ताळेबंद व हिशोब:**\n\n`;

      if (registeredCrop) {
        reply += `📋 **लागवड तपशील:** क्षेत्र: **${registeredCrop.acreage} एकर** | वाण: **${registeredCrop.variety || 'नोंद नाही'}** | हंगाम: **${registeredCrop.season}**\n\n`;
      }

      reply += `💰 **पिकाचा एकूण खर्च:** **${formatCurrency(expAmount)}**\n`;
      if (specificCategories.length > 0) {
        specificCategories.forEach((cat) => {
          reply += `   ↳ ${CATEGORY_MAP[cat._id] || cat._id}: ${formatCurrency(cat.total)}\n`;
        });
      } else {
        reply += `   ↳ या पिकाचा कोणताही खर्च अद्याप डेटाबेसमध्ये नोंदवलेला नाही.\n`;
      }

      reply += `\n🌾 **शेतमाल विक्री उत्पन्न:** **${formatCurrency(saleRevenue)}**\n`;
      if (matchedSale) {
        reply += `   ↳ विकलेला माल: **${saleQty} ${saleUnit}** | जमा: **${formatCurrency(matchedSale.totalReceived)}**\n`;
      } else {
        reply += `   ↳ या पिकाची विक्री अद्याप झालेली नाही किंवा नोंदवलेली नाही.\n`;
      }

      reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
      reply += `${netCropProfit >= 0 ? '📈' : '📉'} **या पिकाचा निव्वळ नफा / शिल्लक:** **${formatCurrency(netCropProfit)}** (${netCropProfit >= 0 ? 'नफ्यात' : 'तोट्यात'})\n`;

      speechText = `${cropName} पिकाचा एकूण खर्च ${formatCurrency(expAmount)} आणि विक्री उत्पन्न ${formatCurrency(saleRevenue)} आहे. सध्या या पिकातून ${formatCurrency(netCropProfit)} निव्वळ नफा झाला आहे.`;

      reply += shortcutNotice;
      break;
    }

    // ----------------------------------------------------
    // CASE 2: CROP EXPENSES (पिकांचा खर्च)
    // ----------------------------------------------------
    case 'crop_expense': {
      if (intent.cropName) {
        // Specific crop expenses
        const matchedCropExpense = context.cropExpenses.find((c) =>
          c._id.toLowerCase().includes(intent.cropName.toLowerCase())
        );
        const expAmount = matchedCropExpense?.total || 0;
        const expCount = matchedCropExpense?.count || 0;

        const specificCategories = await CropExpense.aggregate([
          { $match: { farmer: farmerId, cropName: new RegExp(intent.cropName, 'i') } },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
        ]);

        reply = `🌱 **${intent.cropDisplayName || intent.cropName} पिकाचा एकूण खर्च:**\n\n`;
        reply += `• एकूण झालेला खर्च: **${formatCurrency(expAmount)}** (${expCount} नोंदी)\n`;

        if (specificCategories.length > 0) {
          reply += `\n**खर्चाचे घटक (तपशील):**\n`;
          specificCategories.forEach((cat) => {
            reply += `• ${CATEGORY_MAP[cat._id] || cat._id}: **${formatCurrency(cat.total)}**\n`;
          });
        } else {
          reply += `\n(या पिकाचा कोणताही खर्च अद्याप नोंदवलेला नाही.)\n`;
        }

        speechText = `${intent.cropDisplayName || intent.cropName} पिकाचा एकूण खर्च ${formatCurrency(expAmount)} आहे.`;

      } else if (intent.category) {
        // Specific expense category (e.g. fertilizers, seeds, fuel, machinery)
        const matchedCat = context.categoryExpenses.find((c) => c._id === intent.category);
        const catName = CATEGORY_MAP[intent.category] || intent.category;
        const amount = matchedCat?.total || 0;
        const count = matchedCat?.count || 0;

        reply = `🧪 **${catName} वरील प्रत्यक्ष खर्च:**\n\n`;
        reply += `• एकूण झालेली रक्कम: **${formatCurrency(amount)}**\n`;
        reply += `• एकूण व्यवहारांची संख्या: **${count} वेळा**\n\n`;
        reply += `हा खर्च आपल्या एकूण पिकांच्या खर्चाच्या **${context.totalCropExpenses > 0 ? Math.round((amount / context.totalCropExpenses) * 100) : 0}%** आहे.`;

        speechText = `${catName} वर आतापर्यंत एकूण ${formatCurrency(amount)} खर्च झाला आहे.`;

      } else {
        // Overall farm expenses
        reply = `💰 **आपल्या शेतीतील संपूर्ण खर्च तपशील:**\n\n`;
        reply += `• **पिकांचा निविष्ठा खर्च:** **${formatCurrency(context.totalCropExpenses)}**\n`;
        reply += `• **कामगारांची मजुरी (हजेरीनुसार):** **${formatCurrency(context.totalWagesIncurred)}**\n`;
        reply += `• **एकूण एकत्रित शेती खर्च:** **${formatCurrency(context.totalOperationalExpenses)}**\n\n`;

        reply += `📌 **प्रकारानुसार खर्चाचे वर्गीकरण:**\n`;
        if (context.categoryExpenses.length > 0) {
          context.categoryExpenses.forEach((item) => {
            reply += `• ${CATEGORY_MAP[item._id] || item._id}: **${formatCurrency(item.total)}**\n`;
          });
        } else {
          reply += `• अद्याप कोणताही खर्च डेटाबेसमध्ये नोंदवलेला नाही.\n`;
        }

        if (context.cropExpenses.length > 0) {
          reply += `\n🌱 **पिकांनुसार खर्च:**\n`;
          context.cropExpenses.forEach((crop) => {
            reply += `• ${crop._id}: **${formatCurrency(crop.total)}**\n`;
          });
        }

        speechText = `आपल्या शेतीचा पिकांचा एकूण खर्च ${formatCurrency(context.totalCropExpenses)} आहे, आणि कामगारांची मजुरी ${formatCurrency(context.totalWagesIncurred)} मिळून एकूण शेती खर्च ${formatCurrency(context.totalOperationalExpenses)} झाला आहे.`;
      }

      reply += shortcutNotice;
      break;
    }

    // ----------------------------------------------------
    // CASE 3: WORKER WAGES & PENDING DUES (मजुरी व कामगार बाकी)
    // ----------------------------------------------------
    case 'worker_wages': {
      if (intent.worker) {
        // Specific worker dues from database
        const w = intent.worker;
        const lastPayText = w.lastPaymentDate ? new Date(w.lastPaymentDate).toLocaleDateString('mr-IN') : 'अद्याप भरणा नाही';

        reply = `👷 **कामगार हिशोब – ${w.name}:**\n\n`;
        reply += `• उपस्थिती: **${w.daysWorked} कामाचे दिवस**\n`;
        reply += `• रोजंदारी दर: **${formatCurrency(w.dailyWageRate)} / दिवस**\n`;
        reply += `• एकूण झालेली मजुरी: **${formatCurrency(w.totalEarned)}**\n`;
        reply += `• दिलेली रक्कम: **${formatCurrency(w.totalPaid)}** (शेवटचा भरणा: ${lastPayText})\n`;
        reply += `• **बाकी शिल्लक: ${w.pendingWages > 0 ? `₹${w.pendingWages.toLocaleString('en-IN')}` : '₹0 (पूर्ण अदा केले)'}**\n`;

        if (w.pendingWages > 0) {
          speechText = `${w.name} यांचे एकूण ${formatCurrency(w.pendingWages)} देणे बाकी आहे.`;
        } else {
          speechText = `${w.name} यांची सर्व मजुरी पूर्ण दिलेली आहे, कोणतेही पैसे बाकी नाहीत.`;
        }

      } else {
        // Overall workforce pending wages
        reply = `👷 **कामगार मजुरी व बाकी हिशोब:**\n\n`;
        reply += `• **एकूण मजुरी बाकी (देणे):** **${formatCurrency(context.pendingWorkerDues)}**\n`;
        reply += `• मजुरांनी केलेले एकूण काम: **${context.totalDaysWorked} दिवस**\n`;
        reply += `• एकूण झालेली मजुरी: **${formatCurrency(context.totalWagesIncurred)}**\n`;
        reply += `• प्रत्यक्षात अदा केलेली रक्कम: **${formatCurrency(context.totalWagesPaid)}**\n\n`;

        if (context.workersWithPending.length > 0) {
          reply += `📋 **कोणत्या मजुरांचे किती पैसे बाकी आहेत?**\n`;
          context.workersWithPending.forEach((w, idx) => {
            reply += `${idx + 1}. **${w.name}**: बाकी **${formatCurrency(w.pendingWages)}** (${w.daysWorked} दिवस काम)\n`;
          });
          speechText = `आपल्या शेतातील मजुरांची एकूण बाकी मजुरी ${formatCurrency(context.pendingWorkerDues)} आहे. एकूण ${context.workersWithPending.length} कामगारांचे पैसे देणे बाकी आहे.`;
        } else {
          reply += `✅ **सर्व मजुरांची मजुरी पूर्ण भरलेली आहे. कोणाचेही पैसे बाकी नाहीत.** 👍\n`;
          speechText = `अभिनंदन! आपल्या सर्व कामगारांची मजुरी पूर्ण दिलेली आहे. कोणतीही बाकी शिल्लक नाही.`;
        }
      }

      reply += shortcutNotice;
      break;
    }

    // ----------------------------------------------------
    // CASE 4: INCOME & HARVEST SALES (उत्पन्न व शेतमाल विक्री)
    // ----------------------------------------------------
    case 'income_sales': {
      if (intent.cropName) {
        const cropName = intent.cropDisplayName || intent.cropName;
        const matchedSale = context.cropSales.find((s) =>
          s._id.toLowerCase().includes(intent.cropName.toLowerCase())
        );

        if (matchedSale) {
          const pending = Math.max(0, matchedSale.totalRevenue - matchedSale.totalReceived);
          reply = `🌾 **${cropName} – शेतमाल विक्री व उत्पन्न:**\n\n`;
          reply += `• एकूण विक्री उत्पन्न: **${formatCurrency(matchedSale.totalRevenue)}**\n`;
          reply += `• विकलेला एकूण माल: **${matchedSale.totalQuantity} ${matchedSale.unit}**\n`;
          reply += `• जमा झालेली रक्कम: **${formatCurrency(matchedSale.totalReceived)}**\n`;
          if (pending > 0) {
            reply += `• व्यापाऱ्याकडून बाकी येणे: **${formatCurrency(pending)}**\n`;
          } else {
            reply += `• सर्व रक्कम पूर्ण जमा झाली आहे.\n`;
          }

          speechText = `${cropName} पिकाची एकूण विक्री ${formatCurrency(matchedSale.totalRevenue)} झाली आहे. यातून ${formatCurrency(matchedSale.totalReceived)} जमा झाले आहेत.`;
        } else {
          reply = `🌾 '${cropName}' या पिकाची विक्री अद्याप डेटाबेसमध्ये नोंदवलेली नाही.\n\nआपल्या इतर पिकांची विक्री खालीलप्रमाणे आहे:\n`;
          if (context.cropSales.length > 0) {
            context.cropSales.forEach((s) => {
              reply += `• ${s._id}: ${formatCurrency(s.totalRevenue)} (${s.totalQuantity} ${s.unit})\n`;
            });
          } else {
            reply += `(अद्याप कोणत्याही पिकाची विक्री नोंदवलेली नाही.)\n`;
          }
          speechText = `${cropName} ची विक्री अद्याप झालेली नाही.`;
        }

      } else {
        // Overall harvest sales and income
        reply = `🌾 **शेतमाल विक्री व एकूण उत्पन्न:**\n\n`;
        reply += `• **एकूण शेतमाल विक्री महसूल:** **${formatCurrency(context.totalRevenue)}**\n`;
        reply += `• **प्रत्यक्ष खात्यावर / रोख जमा:** **${formatCurrency(context.totalReceived)}**\n`;
        if (context.pendingFromBuyers > 0) {
          reply += `• **व्यापाऱ्यांकडे बाकी येणे:** **${formatCurrency(context.pendingFromBuyers)}**\n`;
        }

        reply += `\n📊 **पिकांनुसार विक्री तपशील:**\n`;
        if (context.cropSales.length > 0) {
          context.cropSales.forEach((s) => {
            reply += `• **${s._id}:** **${formatCurrency(s.totalRevenue)}** (${s.totalQuantity} ${s.unit})\n`;
          });
        } else {
          reply += `• अद्याप कोणत्याही पिकाची विक्री नोंदवलेली नाही.\n`;
        }

        speechText = `आपल्या शेतमालाची एकूण विक्री ${formatCurrency(context.totalRevenue)} झाली आहे, ज्यापैकी ${formatCurrency(context.totalReceived)} जमा झाले आहेत.`;
      }

      reply += shortcutNotice;
      break;
    }

    // ----------------------------------------------------
    // CASE 5: BUDGET & FINANCIAL BALANCE (संपूर्ण ताळेबंद व नफा-तोटा)
    // ----------------------------------------------------
    case 'budget_summary': {
      const isProfit = context.netProfitLoss >= 0;

      reply = `📊 **${farmName} – संपूर्ण आर्थिक ताळेबंद व शिल्लक:**\n\n`;
      reply += `🟢 **एकूण उत्पन्न (शेतमाल विक्री):** **${formatCurrency(context.totalRevenue)}**\n`;
      reply += `🔴 **एकूण खर्च (पिके + मजुरी):** **${formatCurrency(context.totalOperationalExpenses)}**\n`;
      reply += `   ↳ पिकांचा निविष्ठा खर्च: ${formatCurrency(context.totalCropExpenses)}\n`;
      reply += `   ↳ मजुरांची एकूण मजुरी: ${formatCurrency(context.totalWagesIncurred)}\n`;
      reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
      reply += `${isProfit ? '📈' : '📉'} **निव्वळ नफा / शिल्लक:** **${formatCurrency(context.netProfitLoss)}**\n`;
      reply += `• नफा प्रमाण (Profit Margin): **${context.profitMargin}%**\n\n`;

      reply += `💵 **प्रत्यक्ष रोख स्थिती (Cash Flow Status):**\n`;
      reply += `• विक्रीतून प्रत्यक्षात जमा: ${formatCurrency(context.totalReceived)}\n`;
      reply += `• मजुरांना प्रत्यक्षात दिलेली रक्कम: ${formatCurrency(context.totalWagesPaid)}\n`;
      reply += `• मजुरांना देणे बाकी: **${formatCurrency(context.pendingWorkerDues)}**\n`;
      if (context.pendingFromBuyers > 0) {
        reply += `• व्यापाऱ्यांकडून येणे बाकी: **${formatCurrency(context.pendingFromBuyers)}**\n`;
      }

      reply += `\n💡 **शेती सल्ला:** ${isProfit
        ? 'आपली शेती सध्या चांगल्या नफ्यात आहे! खर्च व उत्पन्न नियंत्रित ठेवल्याने फायदा कायम राहील.'
        : 'सध्या खर्च उत्पन्नापेक्षा जास्त दिसत आहे. खते, औषधे व अनावश्यक खर्चावर नियंत्रण ठेवा.'
        }`;

      speechText = `आपल्या शेतीचा एकूण ताळेबंद असा आहे: एकूण उत्पन्न ${formatCurrency(context.totalRevenue)}, एकूण खर्च ${formatCurrency(context.totalOperationalExpenses)}, आणि निव्वळ शिल्लक ${formatCurrency(context.netProfitLoss)} आहे.`;

      reply += shortcutNotice;
      break;
    }

    // ----------------------------------------------------
    // CASE 6: CROP INFORMATION (उभी पिके व लागवड)
    // ----------------------------------------------------
    case 'crop_info': {
      reply = `🌱 **${farmName} – शेतातील पिके व लागवड तपशील:**\n\n`;
      if (context.activeCrops.length > 0) {
        context.activeCrops.forEach((c, idx) => {
          reply += `${idx + 1}. **${c.cropName}** ${c.variety ? `(${c.variety})` : ''}\n`;
          reply += `   • क्षेत्र: **${c.acreage} एकर** | हंगाम: **${c.season}** | स्थिती: **${c.status}**\n`;
        });
      } else {
        reply += `शेतात अद्याप पिकांची नोंद झालेली नाही. आपण 'Crop Records' मधून नवीन पीक नोंदवू शकता.\n`;
      }

      speechText = `आपल्या शेतात एकूण ${context.activeCrops.length} पिकांची लागवड नोंदवलेली आहे.`;
      reply += shortcutNotice;
      break;
    }

    // ----------------------------------------------------
    // CASE 7: GREETING & GUIDANCE (नमस्कार व मदत)
    // ----------------------------------------------------
    case 'greeting': {
      reply = `🙏 **राम राम, ${farmerName}!**\n\nमी आपला **शेतकरी मित्र AI** सहाय्यक आहे. आपल्या **${farmName}** चे सर्व हिशोब, पिकांचा खर्च, कामगारांची मजुरी, उत्पन्न आणि ताळेबंद मी मराठीत सांगू शकतो.\n\n`;
      reply += `**आपण मला कोणताही प्रश्न आपल्या नेहमीच्या भाषेत विचारू शकता किंवा बोलू शकता, उदाहरणार्थ:**\n`;
      reply += `• "माझे किती पैसे खर्च झाले?"\n`;
      reply += `• "कामगारांचे काही देणे राहिले का?"\n`;
      reply += `• "सोयाबीन विकून किती पैसे आले?"\n`;
      reply += `• "कापसाचा संपूर्ण हिशोब सांगा"\n`;
      reply += `• "शेती परवडली का? नफा किती झाला?"\n`;

      speechText = `राम राम ${farmerName}! मी आपला शेतकरी मित्र सहाय्यक आहे. आपण मला खर्च, मजुरांची बाकी मजुरी, उत्पन्न किंवा ताळेबंदाबद्दल काहीही विचारू शकता.`;
      reply += shortcutNotice;
      break;
    }

    // ----------------------------------------------------
    // CASE 8: INTELLIGENT FALLBACK (तथ्यनिष्ठ माहिती)
    // ----------------------------------------------------
    default: {
      reply = `मी आपल्या प्रश्नाचा अभ्यास केला. आपल्या शेताचा थेट डेटाबेसवरील सारांश खालीलप्रमाणे आहे:\n\n`;
      reply += `• 🌾 **एकूण शेतमाल विक्री:** ${formatCurrency(context.totalRevenue)}\n`;
      reply += `• 💰 **एकूण शेती खर्च:** ${formatCurrency(context.totalOperationalExpenses)}\n`;
      reply += `• 👷 **मजुरांची बाकी मजुरी:** ${formatCurrency(context.pendingWorkerDues)}\n`;
      reply += `• 📊 **निव्वळ नफा / शिल्लक:** **${formatCurrency(context.netProfitLoss)}**\n\n`;
      reply += `आपण खर्च, मजुरी, विक्री, विशिष्ट पीक (उदा. कापूस, सोयाबीन, कांदा) किंवा कामगाराचे नाव विचारू शकता.`;

      speechText = `आपल्या शेताचा एकूण खर्च ${formatCurrency(context.totalOperationalExpenses)}, उत्पन्न ${formatCurrency(context.totalRevenue)}, आणि मजुरांची बाकी मजुरी ${formatCurrency(context.pendingWorkerDues)} आहे.`;
      reply += shortcutNotice;
      break;
    }
  }

  return {
    reply,
    speechText,
    intent: intent.type,
    quickReplies,
    metrics: {
      totalRevenue: context.totalRevenue,
      totalCropExpenses: context.totalCropExpenses,
      totalWagesIncurred: context.totalWagesIncurred,
      pendingWorkerDues: context.pendingWorkerDues,
      netProfitLoss: context.netProfitLoss,
    },
  };
}

module.exports = {
  getFarmerDatabaseContext,
  processFarmerQuery,
};

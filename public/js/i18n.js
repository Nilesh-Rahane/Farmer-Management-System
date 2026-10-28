/**
 * Farm Ledger - Comprehensive Marathi / English Internationalization Engine (i18n)
 * Supports dynamic runtime switching, persistence, and automated DOM translation.
 */
const I18n = (() => {
  const STORAGE_KEY = 'farm_ledger_lang';
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

  const translations = {
    en: {
      // Branding & Common
      appName: 'Farm Ledger',
      appSubtitle: 'Agricultural ERP & Wage System',
      tagline: 'Modern Farm Management Platform',
      signOut: 'Sign Out',
      signIn: 'Sign In',
      registerNewFarm: 'Register New Farm',
      registerFarmBtn: 'Register Farm & Continue',
      workerPortal: 'Worker Portal',
      farmerPortal: 'Farmer Portal',
      loading: 'Loading...',
      actions: 'Actions',
      status: 'Status',
      date: 'Date',
      search: 'Search',
      reset: 'Reset',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      filter: 'Filter',
      total: 'Total',
      notes: 'Notes',
      optional: 'Optional',
      selectOption: 'Select Option',
      all: 'All',

      // Auth Screen
      loginEmailLabel: 'Registered Email Address',
      loginPasswordLabel: 'Password',
      signInBtn: 'Sign In to Dashboard',
      workerSignInNotice: 'Farm workers are registered and onboarded directly by their farm owner. Please sign in with the email and password provided by your farmer.',
      fullNameLabel: 'Farmer Full Name *',
      phoneLabel: 'Phone Number',
      farmNameLabel: 'Farm / Estate Name',
      farmSizeLabel: 'Farm Size (Acres)',
      farmLocationLabel: 'Farm Location / Region',
      authFooterNotice: 'Protected by JWT Authentication • Shared Live MongoDB Backend',

      // Farmer Sidebar Navigation
      navWorkspace: 'Farm Workspace',
      navOverview: 'Overview Dashboard',
      navWorkers: 'Workers & Wages',
      navAttendance: 'Attendance Register',
      navPayments: 'Wage Payments',
      navExpenses: 'Crop Expenses',
      navSales: 'Harvest & Sales',
      navCrops: 'Crop Records',
      navCorrections: 'Correction Requests',
      navAnalytics: 'Analytics & Ledger',
      navReports: 'Financial Reports',

      // Farmer Overview Dashboard
      kpiTotalRevenue: 'Total Crop Revenue',
      kpiNetProfit: 'Net Farm Profit',
      kpiOperationalCost: 'Total Operating Cost',
      kpiWorkerDues: 'Pending Worker Dues',
      chartFinancialTrends: 'Financial Trends & Cash Flow',
      chartMonthlySubtitle: 'Compare monthly harvest sales against total expenses and labor wages',
      chartExpenseBreakdown: 'Expense Breakdown by Category',
      recentActivityFeed: 'Recent Farm Transactions Feed',

      // Worker Section
      workersHeader: 'Farm Hands & Workforce Directory',
      workersSub: 'Manage worker credentials, daily wage rates, active status, and outstanding balances',
      btnAddWorker: 'Add New Worker',
      cardTotalAttendance: 'Total Attendance',
      cardTotalEarned: 'Total Salary Earned',
      cardAmountPaid: 'Amount Paid',
      cardPendingSalary: 'Pending Salary',
      workforceAttendanceSub: 'Total workdays logged across team',
      workforceEarnedSub: 'Cumulative gross wages earned',
      workforcePaidSub: 'Total disbursements made to workers',
      workforcePendingSub: 'Outstanding payable wages balance',
      payWages: 'Pay Wages',
      markAttendance: 'Mark Attendance',

      // Attendance Register
      attHeader: 'Daily Attendance & Workdays Register',
      attSub: 'Record presence, hours worked, field activities, and automatic daily wage calculations',
      btnMarkAttendance: 'Mark Workday Attendance',
      thWorker: 'Worker',
      thDate: 'Date',
      thStatus: 'Attendance Status',
      thHours: 'Hours Worked',
      thDailyWage: 'Calculated Daily Wage',
      thFieldActivity: 'Crop Field & Activity',
      thActions: 'Actions',

      // Wage Payments
      payHeader: 'Wage Disbursements & Payout Records',
      paySub: 'Record payments made to workers via Cash, UPI, or Bank Transfer to clear dues',
      btnRecordPayment: 'Record Wage Payment',
      thAmountPaid: 'Amount Paid',
      thPaymentMode: 'Mode',
      thReference: 'Reference / Voucher',

      // Crop Expenses
      expHeader: 'Crop Expenses & Input Costs',
      expSub: 'Track seeds, fertilizers, pesticides, irrigation, fuel, and machinery expenses',
      btnAddExpense: 'Add Expense',
      totalExpensesTally: 'Total Expenses',

      // Crop Sales
      salesHeader: 'Crop Harvest Sales & Revenue',
      salesSub: 'Record agricultural produce sales, monitor buyers, and track payment receipts',
      btnAddSale: 'Record Crop Sale',
      filterAllCrops: 'All Crops',
      filterAllBuyers: 'All Buyers',
      filterAllStatuses: 'All Statuses',
      searchSalesPlaceholder: 'Search crop, buyer, invoice...',
      resetFilters: 'Reset Filters',
      thCrop: 'Crop Sold',
      thBuyer: 'Buyer Name',
      thQuantity: 'Quantity',
      thRate: 'Rate / Unit',
      thTotalRevenue: 'Total Revenue',
      thPaymentStatus: 'Payment Status',

      // Crop Records
      cropsHeader: 'Crop Cultivation & Field Management',
      cropsSub: 'Manage planted crops, acreage, sowing dates, expected harvests, and yield targets',
      btnAddCrop: 'Add New Crop Record',
      kpiTotalCrops: 'Total Cultivations',
      kpiActiveCrops: 'Active Crops Growing',
      kpiTotalAcreage: 'Total Acreage Sown',
      thAcreage: 'Area (Acres)',
      thSowingDate: 'Sowing Date',
      thExpectedHarvest: 'Expected Harvest',
      thEstYield: 'Est. Yield',

      // Farmer Correction Requests
      farmerCorrectionsHeader: 'Worker Attendance & Salary Correction Requests',
      farmerCorrectionsSub: 'Review and approve/reject attendance adjustments and wage discrepancy claims submitted by workers',
      pendingApprovalBadge: 'Pending Approval',
      approvedBadge: 'Approved',
      rejectedBadge: 'Rejected',
      thRequestType: 'Type',
      thTargetDate: 'Target Date',
      thCurrentVal: 'Current Record',
      thRequestedVal: 'Requested Correction',
      thReason: 'Worker Explanation',
      thFarmerRemarks: 'Farmer Remarks',
      btnApprove: 'Approve',
      btnReject: 'Reject',

      // Worker Portal
      workerDashboardTitle: 'Worker Personal Ledger',
      workerDashboardSub: 'Your personal attendance records, wage earnings, and payment history',
      myOverview: 'My Overview & Balance',
      myAttendance: 'My Attendance Log',
      myPayments: 'Payment Vouchers',
      myCorrections: 'Correction Requests',
      workerActivePayroll: 'Active Payroll Status',
      workerWagesEarned: 'Total Wages Earned',
      workerPaymentsReceived: 'Payments Received',
      workerPendingBalance: 'Pending Wage Balance',
      workerWorkdaysLogged: 'Workdays Logged',
      workerRequestCorrectionBtn: 'New Correction Request',
      requestCorrectionQuick: 'Request Correction',

      // Modals
      modalWorkerCorrectionTitle: 'Submit Attendance / Salary Correction Request',
      modalReviewCorrectionTitle: 'Review Worker Correction Request',
      correctionTypeLabel: 'Request Type',
      typeAttendance: 'Attendance Correction',
      typeSalary: 'Salary / Wage Discrepancy',
      correctionDateLabel: 'Date of Work / Event',
      currentStatusLabel: 'Current Status',
      requestedStatusLabel: 'Requested Status',
      hoursLabel: 'Hours Worked',
      currentAmountLabel: 'Current Amount (₹)',
      requestedAmountLabel: 'Claimed / Requested Amount (₹)',
      reasonExplanationLabel: 'Reason / Explanation *',
      reasonPlaceholder: 'Describe the issue (e.g. marked absent by mistake, overtime not counted, wage mismatch)...',
      farmerRemarksLabel: 'Farmer Remarks / Decision Note',
      farmerRemarksPlaceholder: 'Optional feedback for worker...',

      // Status values
      statusPresent: 'Present',
      statusHalfDay: 'Half Day',
      statusOvertime: 'Overtime',
      statusAbsent: 'Absent',
      statusPending: 'Pending',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
      statusPaid: 'Paid',
      statusPartial: 'Partial',
      statusUnpaid: 'Unpaid',

      // Categories
      catSeeds: 'Seeds',
      catFertilizers: 'Fertilizers',
      catPesticides: 'Pesticides',
      catIrrigation: 'Irrigation',
      catFuel: 'Fuel & Diesel',
      catMachinery: 'Machinery Rental',
      catTransport: 'Transport',
      catOther: 'Other',

      // Notifications
      langSwitchedMsg: 'Language switched to English',
    },

    mr: {
      // Branding & Common
      appName: 'फार्म लेजर',
      appSubtitle: 'कृषी व्यवस्थापन व मजुरी प्रणाली',
      tagline: 'आधुनिक शेतकरी व मजूर व्यवस्थापन मंच',
      signOut: 'बाहेर पडा (Sign Out)',
      signIn: 'साइन इन करा',
      registerNewFarm: 'नवीन शेती खाते नोंदवा',
      registerFarmBtn: 'शेत नोंदवा आणि सुरू करा',
      workerPortal: 'मजूर पोर्टल',
      farmerPortal: 'शेतकरी पोर्टल',
      loading: 'माहिती लोड होत आहे...',
      actions: 'कृती',
      status: 'स्थिती',
      date: 'दिनांक',
      search: 'शोधा',
      reset: 'रीसेट करा',
      save: 'जतन करा',
      cancel: 'रद्द करा',
      confirm: 'निश्चित करा',
      close: 'बंद करा',
      delete: 'हटवा',
      edit: 'बदला',
      filter: 'फिल्टर',
      total: 'एकूण',
      notes: 'नोंद/शेरा',
      optional: 'ऐच्छिक',
      selectOption: 'पर्याय निवडा',
      all: 'सर्व',

      // Auth Screen
      loginEmailLabel: 'नोंदणीकृत ईमेल पत्ता',
      loginPasswordLabel: 'पासवर्ड',
      signInBtn: 'डॅशबोर्डमध्ये प्रवेश करा',
      workerSignInNotice: 'शेतमजुरांची नोंदणी थेट संबंधित शेतकऱ्यांकडून केली जाते. कृपया आपल्या मालकाने दिलेल्या ईमेल व पासवर्डने लॉगिन करा.',
      fullNameLabel: 'शेतकऱ्याचे पूर्ण नाव *',
      phoneLabel: 'मोबाईल नंबर',
      farmNameLabel: 'शेतीचे / मळ्याचे नाव',
      farmSizeLabel: 'शेतीचे क्षेत्र (एकर)',
      farmLocationLabel: 'शेतीचे ठिकाण / गाव',
      authFooterNotice: 'सुरक्षित JWT प्रमाणीकरण • थेट MongoDB डेटाबेसशी जोडलेले',

      // Farmer Sidebar Navigation
      navWorkspace: 'शेती कार्यक्षेत्र',
      navOverview: 'मुख्य डॅशबोर्ड',
      navWorkers: 'मजूर व मजुरी',
      navAttendance: 'हजेरी नोंदवही',
      navPayments: 'मजुरी वाटप',
      navExpenses: 'पिकांचा खर्च',
      navSales: 'उत्पादन व विक्री',
      navCrops: 'पिकांची नोंद',
      navCorrections: 'दुरुस्ती विनंत्या',
      navAnalytics: 'हिशोब व विश्लेषण',
      navReports: 'आर्थिक अहवाल',

      // Farmer Overview Dashboard
      kpiTotalRevenue: 'एकूण पीक विक्री उत्पन्न',
      kpiNetProfit: 'एकूण निव्वळ नफा',
      kpiOperationalCost: 'एकूण शेती खर्च',
      kpiWorkerDues: 'बाकी मजुरी देणे',
      chartFinancialTrends: 'आर्थिक चढ-उतार व नफा',
      chartMonthlySubtitle: 'मासिक पीक विक्री, शेती खर्च आणि मजुरीची तुलना',
      chartExpenseBreakdown: 'खर्चाचे प्रकारानुसार वर्गीकरण',
      recentActivityFeed: 'शेतातील नुकत्याच झालेल्या नोंदी',

      // Worker Section
      workersHeader: 'शेतमजूर व कामगार यादी',
      workersSub: 'मजुरांची माहिती, रोजचा मजुरी दर, सक्रिय स्थिती व शिल्लक बाकी व्यवस्थापित करा',
      btnAddWorker: 'नवीन मजूर जोडा',
      cardTotalAttendance: 'एकूण हजेरी',
      cardTotalEarned: 'एकूण मिळवलेली मजुरी',
      cardAmountPaid: 'दिलेली मजुरी',
      cardPendingSalary: 'शिल्लक मजुरी बाकी',
      workforceAttendanceSub: 'सर्व मजुरांचे एकूण कामाचे दिवस',
      workforceEarnedSub: 'मजुरांनी मिळवलेली एकूण मजुरी',
      workforcePaidSub: 'मजुरांना प्रत्यक्षात दिलेली रक्कम',
      workforcePendingSub: 'शेतकऱ्याकडे बाकी असलेले देणे',
      payWages: 'मजुरी द्या',
      markAttendance: 'हजेरी नोंदवा',

      // Attendance Register
      attHeader: 'दैनिक हजेरी व काम नोंदवही',
      attSub: 'रोजची उपस्थिती, कामाचे तास, शेतातील काम आणि स्वयंचलित मजुरी हिशोब',
      btnMarkAttendance: 'आजची हजेरी भरा',
      thWorker: 'मजूर',
      thDate: 'तारीख',
      thStatus: 'हजेरी स्थिती',
      thHours: 'कामाचे तास',
      thDailyWage: 'दैनिक मजुरी (₹)',
      thFieldActivity: 'शेत व कामाचे स्वरूप',
      thActions: 'कृती',

      // Wage Payments
      payHeader: 'मजुरी वाटप व पावती नोंदी',
      paySub: 'रोख, UPI किंवा बँक ट्रान्सफरद्वारे मजुरांना दिलेल्या रकमांची नोंद',
      btnRecordPayment: 'मजुरी वाटप नोंदवा',
      thAmountPaid: 'दिलेली रक्कम (₹)',
      thPaymentMode: 'पद्धत',
      thReference: 'संदर्भ / व्हाउचर क्र.',

      // Crop Expenses
      expHeader: 'पिकांवरील खर्च व निविष्ठा',
      expSub: 'बियाणे, खते, कीटकनाशके, पाणी, डिझेल आणि यंत्रसामग्री खर्चाची नोंद',
      btnAddExpense: 'नवीन खर्च जोडा',
      totalExpensesTally: 'एकूण खर्च',

      // Crop Sales
      salesHeader: 'पीक उत्पादन विक्री व महसूल',
      salesSub: 'शेतीमालाची विक्री, व्यापारी आणि मिळालेल्या पैशांची नोंद ठेवा',
      btnAddSale: 'पीक विक्री नोंदवा',
      filterAllCrops: 'सर्व पिके',
      filterAllBuyers: 'सर्व व्यापारी',
      filterAllStatuses: 'सर्व देयक स्थिती',
      searchSalesPlaceholder: 'पीक, व्यापारी, पावती शोधा...',
      resetFilters: 'फिल्टर रीसेट करा',
      thCrop: 'विकलेले पीक',
      thBuyer: 'व्यापाऱ्याचे नाव',
      thQuantity: 'प्रमाण',
      thRate: 'दर / एकक',
      thTotalRevenue: 'एकूण महसूल',
      thPaymentStatus: 'देयक स्थिती',

      // Crop Records
      cropsHeader: 'पीक लागवड व शेत व्यवस्थापन',
      cropsSub: 'लागवड केलेली पिके, क्षेत्र, पेरणी तारीख, काढणी अंदाज आणि अपेक्षित उत्पादन',
      btnAddCrop: 'नवीन पीक नोंदवा',
      kpiTotalCrops: 'एकूण पिके',
      kpiActiveCrops: 'सध्या उभी पिके',
      kpiTotalAcreage: 'पेरणी केलेले एकर',
      thAcreage: 'क्षेत्र (एकर)',
      thSowingDate: 'पेरणी तारीख',
      thExpectedHarvest: 'अपेक्षित काढणी',
      thEstYield: 'अपेक्षित उत्पादन',

      // Farmer Correction Requests
      farmerCorrectionsHeader: 'मजूर हजेरी व मजुरी दुरुस्ती विनंत्या',
      farmerCorrectionsSub: 'मजुरांनी नोंदवलेल्या चुकीच्या हजेरी व मजुरी फरकाच्या विनंत्या तपासा आणि मंजूर/नाकारा',
      pendingApprovalBadge: 'मंजुरी प्रलंबित',
      approvedBadge: 'मंजूर',
      rejectedBadge: 'नाकारले',
      thRequestType: 'प्रकार',
      thTargetDate: 'कामाचा दिनांक',
      thCurrentVal: 'सध्याची नोंद',
      thRequestedVal: 'मागितलेली दुरुस्ती',
      thReason: 'मजुराचे कारण',
      thFarmerRemarks: 'शेतकऱ्याचा शेरा',
      btnApprove: 'मंजूर करा',
      btnReject: 'नाकारा',

      // Worker Portal
      workerDashboardTitle: 'मजूर वैयक्तिक खातेवही',
      workerDashboardSub: 'तुमची हजेरी, मिळवलेली मजुरी आणि मिळालेल्या पैशांचा संपूर्ण हिशोब',
      myOverview: 'माझे खाते व शिल्लक',
      myAttendance: 'माझी हजेरी नोंद',
      myPayments: 'मजुरी पावत्या',
      myCorrections: 'दुरुस्ती विनंत्या',
      workerActivePayroll: 'सक्रिय कामगार स्थिती',
      workerWagesEarned: 'एकूण मिळवलेली मजुरी',
      workerPaymentsReceived: 'मिळालेली मजुरी',
      workerPendingBalance: 'शिल्लक बाकी मजुरी',
      workerWorkdaysLogged: 'कामाचे दिवस',
      workerRequestCorrectionBtn: 'नवीन दुरुस्ती विनंती',
      requestCorrectionQuick: 'दुरुस्ती विनंती करा',

      // Modals
      modalWorkerCorrectionTitle: 'हजेरी किंवा मजुरी दुरुस्ती विनंती सादर करा',
      modalReviewCorrectionTitle: 'मजुराची दुरुस्ती विनंती तपासा',
      correctionTypeLabel: 'विनंतीचा प्रकार',
      typeAttendance: 'हजेरी दुरुस्ती (उपस्थिती / तास)',
      typeSalary: 'मजुरी / वेतनात तफावत',
      correctionDateLabel: 'कामाचा किंवा नोंदीचा दिनांक',
      currentStatusLabel: 'सध्याची नोंदवलेली स्थिती',
      requestedStatusLabel: 'मागितलेली खरी स्थिती',
      hoursLabel: 'कामाचे तास',
      currentAmountLabel: 'सध्याची रक्कम (₹)',
      requestedAmountLabel: 'मागितलेली खरी रक्कम (₹)',
      reasonExplanationLabel: 'तपशील व कारण *',
      reasonPlaceholder: 'चुकीचे कारण लिहा (उदा. हजर असताना गैरहजर नोंदवले, जास्त तासांची नोंद राहिली, मजुरी दर कमी लावला)...',
      farmerRemarksLabel: 'शेतकऱ्याची टिप्पणी / निर्णय शेरा',
      farmerRemarksPlaceholder: 'मजुरासाठी ऐच्छिक शेरा किंवा कारण...',

      // Status values
      statusPresent: 'हजर (पूर्ण दिवस)',
      statusHalfDay: 'अर्धा दिवस',
      statusOvertime: 'ओव्हरटाईम',
      statusAbsent: 'गैरहजर',
      statusPending: 'प्रलंबित',
      statusApproved: 'मंजूर',
      statusRejected: 'नाकारले',
      statusPaid: 'पूर्ण भरले',
      statusPartial: 'अंशतः भरले',
      statusUnpaid: 'बाकी',

      // Categories
      catSeeds: 'बियाणे',
      catFertilizers: 'खते',
      catPesticides: 'कीटकनाशके',
      catIrrigation: 'पाणी व सिंचन',
      catFuel: 'डिझेल व इंधन',
      catMachinery: 'यंत्र भाडे',
      catTransport: 'वाहतूक',
      catOther: 'इतर खर्च',

      // Notifications
      langSwitchedMsg: 'भाषा मराठी मध्ये बदलली आहे',
    },
  };

  const getLanguage = () => currentLang;

  const t = (key, fallback = '') => {
    const dict = translations[currentLang] || translations.en;
    return dict[key] !== undefined ? dict[key] : (fallback || key);
  };

  const setLanguage = (lang) => {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;

    applyTranslationsToDOM();
    updateToggleButtons();

    // Notify other components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));

    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(t('langSwitchedMsg'), 'info');
    }
  };

  const toggleLanguage = () => {
    setLanguage(currentLang === 'en' ? 'mr' : 'en');
  };

  const applyTranslationsToDOM = () => {
    // 1. Text elements
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const translation = t(key);
      if (translation) {
        // If element contains child icons, preserve them
        const icon = el.querySelector('i.fa, i.fas, i.far');
        if (icon) {
          el.innerHTML = `${icon.outerHTML} ${translation}`;
        } else {
          el.textContent = translation;
        }
      }
    });

    // 2. Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translation = t(key);
      if (translation) el.setAttribute('placeholder', translation);
    });

    // 3. Titles / Tooltips
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const translation = t(key);
      if (translation) el.setAttribute('title', translation);
    });
  };

  const updateToggleButtons = () => {
    document.querySelectorAll('.btn-lang-toggle').forEach((btn) => {
      const textSpan = btn.querySelector('.lang-current-label');
      if (textSpan) {
        textSpan.textContent = currentLang === 'en' ? 'मराठी' : 'English';
      }
      btn.setAttribute('title', currentLang === 'en' ? 'मराठी मध्ये बदला' : 'Switch to English');
    });
  };

  const formatStatus = (status) => {
    const map = {
      present: t('statusPresent'),
      half_day: t('statusHalfDay'),
      overtime: t('statusOvertime'),
      absent: t('statusAbsent'),
      pending: t('statusPending'),
      approved: t('statusApproved'),
      rejected: t('statusRejected'),
      paid: t('statusPaid'),
      partial: t('statusPartial'),
      unpaid: t('statusUnpaid'),
    };
    return map[status] || status;
  };

  const formatCategory = (category) => {
    const map = {
      seeds: t('catSeeds'),
      fertilizers: t('catFertilizers'),
      pesticides: t('catPesticides'),
      irrigation: t('catIrrigation'),
      fuel: t('catFuel'),
      machinery: t('catMachinery'),
      transport: t('catTransport'),
      other: t('catOther'),
    };
    return map[category] || category;
  };

  const init = () => {
    document.documentElement.lang = currentLang;
    applyTranslationsToDOM();
    updateToggleButtons();

    // Bind all language toggle buttons
    document.querySelectorAll('.btn-lang-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleLanguage();
      });
    });
  };

  return {
    init,
    t,
    getLanguage,
    setLanguage,
    toggleLanguage,
    applyTranslationsToDOM,
    formatStatus,
    formatCategory,
  };
})();

// Auto-run translation on DOMContentLoaded if not already initialized
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', I18n.init);
} else {
  I18n.init();
}

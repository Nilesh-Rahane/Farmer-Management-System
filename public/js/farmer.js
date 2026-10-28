/**
 * Farm Ledger - Farmer Dashboard Controller
 */
const FarmerDashboard = (() => {
  let dashboardData = null;
  let workersList = [];
  let monthlyChartInstance = null;
  let categoryChartInstance = null;

  const init = async () => {
    bindEvents();
    await loadSummary();
  };

  const bindEvents = () => {
    // Navigation tabs in sidebar
    document.querySelectorAll('.farmer-nav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        switchTab(tab);
      });
    });

    // Refresh / Live Sync Button
    const refreshBtn = document.getElementById('farmer-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('spin-anim');
        await loadActiveTab();
        setTimeout(() => refreshBtn.classList.remove('spin-anim'), 600);
        App.showToast('Data synced with MongoDB', 'success');
      });
    }

    // Modal Triggers
    const btnAddWorker = document.getElementById('btn-add-worker');
    if (btnAddWorker) btnAddWorker.addEventListener('click', () => openWorkerModal());

    const btnAddCrop = document.getElementById('btn-add-crop');
    if (btnAddCrop) btnAddCrop.addEventListener('click', () => openCropModal());

    const btnMarkAttendance = document.getElementById('btn-mark-attendance');
    if (btnMarkAttendance) btnMarkAttendance.addEventListener('click', () => openAttendanceModal());

    const btnRecordPayment = document.getElementById('btn-record-payment');
    if (btnRecordPayment) btnRecordPayment.addEventListener('click', () => openPaymentModal());

    const btnAddExpense = document.getElementById('btn-add-expense');
    if (btnAddExpense) btnAddExpense.addEventListener('click', () => openExpenseModal());

    const btnAddSale = document.getElementById('btn-add-sale');
    if (btnAddSale) btnAddSale.addEventListener('click', () => openSaleModal());

    // Crop Filter Listeners
    const statusFilterCrop = document.getElementById('filter-crop-status');
    const seasonFilterCrop = document.getElementById('filter-crop-season');
    const searchFilterCrop = document.getElementById('filter-crop-search');
    const btnResetCrop = document.getElementById('btn-reset-crop-filters');

    if (statusFilterCrop) statusFilterCrop.addEventListener('change', loadCropsTable);
    if (seasonFilterCrop) seasonFilterCrop.addEventListener('change', loadCropsTable);
    if (searchFilterCrop) searchFilterCrop.addEventListener('input', debounce(loadCropsTable, 300));
    if (btnResetCrop) {
      btnResetCrop.addEventListener('click', () => {
        if (statusFilterCrop) statusFilterCrop.value = '';
        if (seasonFilterCrop) seasonFilterCrop.value = '';
        if (searchFilterCrop) searchFilterCrop.value = '';
        loadCropsTable();
      });
    }

    // Filter Listeners
    const workerFilterAtt = document.getElementById('filter-att-worker');
    const statusFilterAtt = document.getElementById('filter-att-status');
    if (workerFilterAtt) workerFilterAtt.addEventListener('change', loadAttendanceTable);
    if (statusFilterAtt) statusFilterAtt.addEventListener('change', loadAttendanceTable);

    const workerFilterPay = document.getElementById('filter-pay-worker');
    const modeFilterPay = document.getElementById('filter-pay-mode');
    if (workerFilterPay) workerFilterPay.addEventListener('change', loadPaymentsTable);
    if (modeFilterPay) modeFilterPay.addEventListener('change', loadPaymentsTable);

    const catFilterExp = document.getElementById('filter-exp-category');
    const searchFilterExp = document.getElementById('filter-exp-search');
    if (catFilterExp) catFilterExp.addEventListener('change', loadExpensesTable);
    if (searchFilterExp) searchFilterExp.addEventListener('input', debounce(loadExpensesTable, 300));

    // Selling Section Filters (Date range, Crop name, Buyer, Status, Search, Reset)
    const startDateSale = document.getElementById('filter-sale-start-date');
    const endDateSale = document.getElementById('filter-sale-end-date');
    const cropFilterSale = document.getElementById('filter-sale-crop');
    const buyerFilterSale = document.getElementById('filter-sale-buyer');
    const statusFilterSale = document.getElementById('filter-sale-status');
    const searchFilterSale = document.getElementById('filter-sale-search');
    const btnResetSale = document.getElementById('btn-reset-sale-filters');

    if (startDateSale) startDateSale.addEventListener('change', loadSalesTable);
    if (endDateSale) endDateSale.addEventListener('change', loadSalesTable);
    if (cropFilterSale) cropFilterSale.addEventListener('change', loadSalesTable);
    if (buyerFilterSale) buyerFilterSale.addEventListener('change', loadSalesTable);
    if (statusFilterSale) statusFilterSale.addEventListener('change', loadSalesTable);
    if (searchFilterSale) searchFilterSale.addEventListener('input', debounce(loadSalesTable, 300));
    if (btnResetSale) {
      btnResetSale.addEventListener('click', () => {
        if (startDateSale) startDateSale.value = '';
        if (endDateSale) endDateSale.value = '';
        if (cropFilterSale) cropFilterSale.value = '';
        if (buyerFilterSale) buyerFilterSale.value = '';
        if (statusFilterSale) statusFilterSale.value = '';
        if (searchFilterSale) searchFilterSale.value = '';
        loadSalesTable();
      });
    }

    const typeFilterTx = document.getElementById('filter-tx-type');
    const searchFilterTx = document.getElementById('filter-tx-search');
    if (typeFilterTx) typeFilterTx.addEventListener('change', loadTransactionsTable);
    if (searchFilterTx) searchFilterTx.addEventListener('input', debounce(loadTransactionsTable, 300));

    // Report Period Selector
    const reportPeriodSelect = document.getElementById('report-period-select');
    if (reportPeriodSelect) reportPeriodSelect.addEventListener('change', loadReports);

    // Export CSV & Print
    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) btnExportCSV.addEventListener('click', exportLedgerCSV);

    const btnPrintReport = document.getElementById('btn-print-report');
    if (btnPrintReport) btnPrintReport.addEventListener('click', () => window.print());

    // Worker Correction Requests Filters & Review Actions
    const corrStatusFilter = document.getElementById('filter-farmer-corr-status');
    const corrTypeFilter = document.getElementById('filter-farmer-corr-type');
    if (corrStatusFilter) corrStatusFilter.addEventListener('change', loadCorrectionsTable);
    if (corrTypeFilter) corrTypeFilter.addEventListener('change', loadCorrectionsTable);

    const btnApprove = document.getElementById('btn-review-approve');
    const btnReject = document.getElementById('btn-review-reject');
    if (btnApprove) btnApprove.addEventListener('click', () => handleReviewSubmit('approved'));
    if (btnReject) btnReject.addEventListener('click', () => handleReviewSubmit('rejected'));

    window.addEventListener('languageChanged', () => {
      loadActiveTab();
    });

    // Worker rate change listener in attendance modal for live calculation
    const attWorkerSelect = document.getElementById('modal-att-worker');
    const attStatusSelect = document.getElementById('modal-att-status');
    const attRateInput = document.getElementById('modal-att-rate');
    const attWageDisplay = document.getElementById('modal-att-wage-calc');

    if (attWorkerSelect) {
      attWorkerSelect.addEventListener('change', () => {
        const selectedOption = attWorkerSelect.options[attWorkerSelect.selectedIndex];
        const defaultRate = selectedOption?.dataset?.rate || 500;
        if (attRateInput) attRateInput.value = defaultRate;
        calculateModalWage();
      });
    }

    if (attStatusSelect) attStatusSelect.addEventListener('change', calculateModalWage);
    if (attRateInput) attRateInput.addEventListener('input', calculateModalWage);

    // Sale quantity / unit price change listener for live total calculation
    const saleQtyInput = document.getElementById('modal-sale-qty');
    const salePriceInput = document.getElementById('modal-sale-price');
    const saleTotalDisplay = document.getElementById('modal-sale-total-calc');

    const updateSaleCalc = () => {
      const q = parseFloat(saleQtyInput?.value) || 0;
      const p = parseFloat(salePriceInput?.value) || 0;
      const total = Math.round(q * p * 100) / 100;
      if (saleTotalDisplay) saleTotalDisplay.textContent = `₹${total.toLocaleString('en-IN')}`;
    };

    if (saleQtyInput) saleQtyInput.addEventListener('input', updateSaleCalc);
    if (salePriceInput) salePriceInput.addEventListener('input', updateSaleCalc);

    // Form Submits in Modals
    const formWorker = document.getElementById('form-modal-worker');
    if (formWorker) formWorker.addEventListener('submit', handleWorkerSubmit);

    const formCrop = document.getElementById('form-modal-crop');
    if (formCrop) formCrop.addEventListener('submit', handleCropSubmit);

    const formAttendance = document.getElementById('form-modal-attendance');
    if (formAttendance) formAttendance.addEventListener('submit', handleAttendanceSubmit);

    const formPayment = document.getElementById('form-modal-payment');
    if (formPayment) formPayment.addEventListener('submit', handlePaymentSubmit);

    const formExpense = document.getElementById('form-modal-expense');
    if (formExpense) formExpense.addEventListener('submit', handleExpenseSubmit);

    const formSale = document.getElementById('form-modal-sale');
    if (formSale) formSale.addEventListener('submit', handleSaleSubmit);
  };

  const calculateModalWage = () => {
    const status = document.getElementById('modal-att-status')?.value || 'present';
    const rate = parseFloat(document.getElementById('modal-att-rate')?.value) || 500;
    const hours = parseFloat(document.getElementById('modal-att-hours')?.value) || 8;
    const calcEl = document.getElementById('modal-att-wage-calc');

    let wage = rate;
    if (status === 'half_day') wage = Math.round(rate * 0.5);
    else if (status === 'overtime') {
      const overtimeHours = hours > 8 ? hours - 8 : 2;
      wage = Math.round(rate + overtimeHours * (rate / 8) * 1.5);
    } else if (status === 'absent') wage = 0;

    if (calcEl) calcEl.textContent = `₹${wage.toLocaleString('en-IN')}`;
  };

  const switchTab = (tabId) => {
    // Update active nav button
    document.querySelectorAll('.farmer-nav-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });

    // Update active tab panel
    document.querySelectorAll('.farmer-tab-pane').forEach((pane) => {
      pane.style.display = pane.id === `farmer-tab-${tabId}` ? 'block' : 'none';
    });

    // Update topbar breadcrumb
    const tabTitles = {
      overview: { title: 'Farm Financial Overview', sub: 'Comprehensive KPIs, Revenue, Expenses & Real-time Analytics' },
      crops: { title: 'Crop Records & Cultivation Ledger', sub: 'Track Planting Dates, Sowing Schedules, Acreage & Expected Harvests' },
      workers: { title: 'Worker Directory & Wage Ledgers', sub: 'Manage Farm Hands, Daily Wage Rates & Outstanding Balances' },
      attendance: { title: 'Attendance & Workday Register', sub: 'Record Daily Field Presence, Shifts, Activities & Earned Wages' },
      payments: { title: 'Wage Disbursements & Payouts', sub: 'Record Payments, Settle Pending Dues & Print Vouchers' },
      expenses: { title: 'Crop Expenses & Input Costs', sub: 'Log Seeds, Fertilizers, Fuel, Machinery & Field Expenses' },
      sales: { title: 'Crop Harvest Sales & Revenue', sub: 'Track Harvest Sales, Market Mandis, Buyers & Total Realization' },
      transactions: { title: 'Unified Farm Ledger', sub: 'Chronological Audit Timeline of All Inflows and Outflows' },
      reports: { title: 'Analytics & Financial Reports', sub: 'Production Summaries, Crop Margins, Cost Breakdowns & CSV Export' },
      corrections: { title: 'Worker Attendance & Salary Correction Requests', sub: 'Review and approve/reject attendance adjustments and wage discrepancy claims' },
    };

    const currentTitle = tabTitles[tabId] || { title: 'Farmer Dashboard', sub: 'Farm Ledger Management System' };
    const pageTitleEl = document.getElementById('farmer-page-title');
    const pageSubEl = document.getElementById('farmer-page-subtitle');
    if (pageTitleEl) pageTitleEl.textContent = currentTitle.title;
    if (pageSubEl) pageSubEl.textContent = currentTitle.sub;

    // Load tab content
    loadActiveTab();
  };

  const getActiveTab = () => {
    const activeBtn = document.querySelector('.farmer-nav-btn.active');
    return activeBtn ? activeBtn.dataset.tab : 'overview';
  };

  const loadActiveTab = async () => {
    const active = getActiveTab();
    if (active === 'overview') await loadSummary();
    else if (active === 'crops') await loadCropsTable();
    else if (active === 'workers') await loadWorkersGrid();
    else if (active === 'attendance') await loadAttendanceTable();
    else if (active === 'payments') await loadPaymentsTable();
    else if (active === 'expenses') await loadExpensesTable();
    else if (active === 'sales') await loadSalesTable();
    else if (active === 'transactions') await loadTransactionsTable();
    else if (active === 'reports') await loadReports();
    else if (active === 'corrections') await loadCorrectionsTable();
  };

  // ==========================================
  // 1. OVERVIEW & KPI SUMMARY
  // ==========================================
  const loadSummary = async () => {
    try {
      const res = await API.farmer.getDashboard();
      dashboardData = res;
      const s = res.summary;

      // Update Top KPI Cards
      document.getElementById('kpi-revenue').textContent = `₹${(s.totalRevenue || 0).toLocaleString('en-IN')}`;
      document.getElementById('kpi-expenses').textContent = `₹${(s.totalCropExpenses || 0).toLocaleString('en-IN')}`;
      document.getElementById('kpi-wages-paid').textContent = `₹${(s.totalWagesPaid || 0).toLocaleString('en-IN')}`;
      document.getElementById('kpi-wages-pending').textContent = `₹${(s.pendingWorkerDues || 0).toLocaleString('en-IN')}`;

      // Net Profit/Loss Card
      const profitEl = document.getElementById('kpi-profit');
      const profitBadge = document.getElementById('kpi-profit-margin');
      if (profitEl) {
        const net = s.netProfitLoss || 0;
        profitEl.textContent = `${net >= 0 ? '+' : '-'}₹${Math.abs(net).toLocaleString('en-IN')}`;
        profitEl.style.color = net >= 0 ? 'var(--primary-600)' : 'var(--danger)';
      }
      if (profitBadge) {
        profitBadge.textContent = `${s.profitMargin}% Net Margin`;
        profitBadge.className = s.netProfitLoss >= 0 ? 'trend-up' : 'trend-down';
      }

      document.getElementById('kpi-workers-count').textContent = s.activeWorkersCount || 0;

      // Update pending corrections badge
      const pendingCorrBadge = document.getElementById('nav-farmer-corrections-badge');
      if (pendingCorrBadge) {
        const pCount = s.pendingCorrectionsCount || 0;
        pendingCorrBadge.textContent = pCount;
        pendingCorrBadge.style.display = pCount > 0 ? 'inline-block' : 'none';
      }

      // Render Charts
      renderMonthlyChart(res.charts.monthlyTrends);
      renderCategoryChart(res.charts.categoryBreakdown);

      // Render Recent Activity Feed
      renderRecentActivity(res.recentActivity);

      // Also refresh workers cache in background for dropdowns
      refreshWorkersCache();
    } catch (err) {
      console.error('Error loading dashboard summary:', err);
      App.showToast('Failed to load overview KPIs', 'error');
    }
  };

  const renderMonthlyChart = (trends) => {
    const canvas = document.getElementById('chart-monthly-trends');
    if (!canvas) return;

    if (monthlyChartInstance) {
      monthlyChartInstance.destroy();
    }

    const labels = trends.map((t) => t.label);
    const revenueData = trends.map((t) => t.revenue);
    const expensesData = trends.map((t) => t.expenses);
    const profitData = trends.map((t) => t.profit);

    monthlyChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Crop Revenue (₹)',
            data: revenueData,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10b981',
            borderRadius: 6,
            order: 2,
          },
          {
            label: 'Total Expenses (Crop + Wages) (₹)',
            data: expensesData,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: '#ef4444',
            borderRadius: 6,
            order: 2,
          },
          {
            label: 'Net Profit (₹)',
            data: profitData,
            type: 'line',
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.15)',
            borderWidth: 3,
            fill: false,
            tension: 0.35,
            pointBackgroundColor: '#059669',
            pointRadius: 5,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Plus Jakarta Sans', weight: '600' } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `₹${(val / 1000).toFixed(0)}k`,
            },
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
          },
          x: {
            grid: { display: false },
          },
        },
      },
    });
  };

  const renderCategoryChart = (categories) => {
    const canvas = document.getElementById('chart-expense-categories');
    if (!canvas) return;

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }

    const labels = categories.map((c) =>
      c.category === 'worker_wages'
        ? 'Worker Wages'
        : c.category.charAt(0).toUpperCase() + c.category.slice(1)
    );
    const dataValues = categories.map((c) => c.total);

    const bgColors = [
      '#10b981', // emerald
      '#f59e0b', // harvest gold
      '#3b82f6', // sky
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f97316', // orange
      '#64748b', // slate
      '#06b6d4', // cyan
    ];

    categoryChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: dataValues,
            backgroundColor: bgColors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 14, font: { family: 'Plus Jakarta Sans', size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}`,
            },
          },
        },
        cutout: '68%',
      },
    });
  };

  const renderRecentActivity = (activities) => {
    const listEl = document.getElementById('recent-activity-list');
    if (!listEl) return;

    if (!activities || activities.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No recent transactions or activity recorded yet.</p>
        </div>`;
      return;
    }

    listEl.innerHTML = activities
      .map((item) => {
        const isPos = item.isPositive;
        const icon =
          item.type === 'sale'
            ? 'fa-wheat-awn'
            : item.type === 'payment'
            ? 'fa-hand-holding-dollar'
            : 'fa-receipt';
        const iconColor = isPos ? 'var(--success)' : 'var(--danger)';
        const dateStr = new Date(item.date).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
        });

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--slate-100);">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:36px; height:36px; border-radius:var(--radius-sm); background:var(--slate-100); display:flex; align-items:center; justify-content:center; color:${iconColor};">
                <i class="fas ${icon}"></i>
              </div>
              <div>
                <div style="font-weight:700; font-size:0.88rem; color:var(--slate-900);">${item.title}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${item.details} • <span style="color:var(--slate-400);">${dateStr}</span></div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:0.95rem; color:${isPos ? 'var(--success)' : 'var(--slate-800)'};">
                ${isPos ? '+' : '-'}₹${item.amount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  };

  // ==========================================
  // 2. WORKERS DIRECTORY
  // ==========================================
  const refreshWorkersCache = async () => {
    try {
      const res = await API.farmer.getWorkers();
      workersList = res.workers || [];
      populateWorkerDropdowns();
    } catch (err) {
      console.error('Error fetching workers list:', err);
    }
  };

  const populateWorkerDropdowns = () => {
    const selects = [
      document.getElementById('filter-att-worker'),
      document.getElementById('filter-pay-worker'),
      document.getElementById('modal-att-worker'),
      document.getElementById('modal-pay-worker'),
    ];

    selects.forEach((sel) => {
      if (!sel) return;
      const isFilter = sel.id.startsWith('filter-');
      const currentVal = sel.value;

      let html = isFilter ? '<option value="">All Workers</option>' : '<option value="" disabled selected>Select Worker</option>';

      workersList.forEach((w) => {
        html += `<option value="${w._id}" data-rate="${w.dailyWageRate}">${w.name} (${w.specialization || 'Labor'} - ₹${w.dailyWageRate}/day)</option>`;
      });

      sel.innerHTML = html;
      if (currentVal) sel.value = currentVal;
    });
  };

  const loadWorkersGrid = async () => {
    const gridEl = document.getElementById('workers-grid');
    if (!gridEl) return;

    gridEl.innerHTML = '<div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    try {
      const res = await API.farmer.getWorkers();
      workersList = res.workers || [];
      populateWorkerDropdowns();

      // Populate Workforce Overview Summary Bar
      const summary = res.workforceSummary || {};
      const elAtt = document.getElementById('worker-summary-attendance');
      const elEarned = document.getElementById('worker-summary-earned');
      const elPaid = document.getElementById('worker-summary-paid');
      const elPending = document.getElementById('worker-summary-pending');

      if (elAtt) elAtt.textContent = `${summary.totalAttendance || 0} Days`;
      if (elEarned) elEarned.textContent = `₹${(summary.totalSalaryEarned || 0).toLocaleString('en-IN')}`;
      if (elPaid) elPaid.textContent = `₹${(summary.totalAmountPaid || 0).toLocaleString('en-IN')}`;
      if (elPending) elPending.textContent = `₹${(summary.totalPendingSalary || 0).toLocaleString('en-IN')}`;

      if (workersList.length === 0) {
        gridEl.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-icon"><i class="fas fa-users"></i></div>
            <h4>No Farm Workers Added Yet</h4>
            <p>Add your farm workers to record their daily attendance, calculate wages, and manage payouts.</p>
            <button class="btn btn-primary" onclick="FarmerDashboard.openWorkerModal()">
              <i class="fas fa-user-plus"></i> Add First Worker
            </button>
          </div>`;
        return;
      }

      gridEl.innerHTML = workersList
        .map((w) => {
          const initials = w.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
          const pending = w.pendingWages || 0;
          const statusClass = w.status === 'active' ? 'badge-success' : 'badge-secondary';

          return `
            <div class="worker-card">
              <div class="worker-card-header">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div class="worker-avatar-box">${initials}</div>
                  <div>
                    <h4 style="font-size:1.05rem; font-weight:800; color:var(--slate-900);">${w.name}</h4>
                    <div style="font-size:0.75rem; color:var(--primary-700); font-weight:600;">${w.specialization || 'Farm Worker'}</div>
                    <div style="font-size:0.75rem; color:var(--slate-500);"><i class="fas fa-phone fa-xs"></i> ${w.phone || 'No phone'}</div>
                  </div>
                </div>
                <span class="badge ${statusClass}">${w.status.toUpperCase()}</span>
              </div>

              <div class="worker-card-stats">
                <div class="worker-stat-item">
                  <span class="worker-stat-label">Total Attendance</span>
                  <span class="worker-stat-val">${w.daysWorked || 0} days</span>
                </div>
                <div class="worker-stat-item">
                  <span class="worker-stat-label">Total Salary Earned</span>
                  <span class="worker-stat-val">₹${(w.totalEarned || 0).toLocaleString('en-IN')}</span>
                </div>
                <div class="worker-stat-item">
                  <span class="worker-stat-label">Amount Paid</span>
                  <span class="worker-stat-val text-success">₹${(w.totalPaid || 0).toLocaleString('en-IN')}</span>
                </div>
                <div class="worker-stat-item">
                  <span class="worker-stat-label">Pending Salary</span>
                  <span class="worker-stat-val ${pending > 0 ? 'val-pending' : ''}">₹${pending.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style="display:flex; gap:8px; margin-top:auto;">
                <button class="btn btn-outline-primary btn-sm btn-block" onclick="FarmerDashboard.openPaymentForWorker('${w._id}', '${w.name}', ${pending})">
                  <i class="fas fa-money-bill-wave"></i> Pay Wages
                </button>
                <button class="btn btn-secondary btn-sm" title="Mark Attendance" onclick="FarmerDashboard.openAttendanceForWorker('${w._id}', ${w.dailyWageRate})">
                  <i class="fas fa-calendar-check"></i>
                </button>
                <button class="btn btn-secondary btn-sm" title="Edit Worker" onclick="FarmerDashboard.editWorker('${w._id}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-secondary btn-sm" title="Deactivate Worker" onclick="FarmerDashboard.deleteWorker('${w._id}', '${w.name}')">
                  <i class="fas fa-trash-alt text-danger"></i>
                </button>
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      gridEl.innerHTML = `<div class="empty-state text-danger">Failed to load workers: ${err.message}</div>`;
    }
  };

  // ==========================================
  // 2.5 CROP CULTIVATION RECORDS TABLE
  // ==========================================
  let cropsCache = [];

  const loadCropsTable = async () => {
    const tbody = document.getElementById('crops-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading crop records...</td></tr>';

    try {
      const status = document.getElementById('filter-crop-status')?.value || '';
      const season = document.getElementById('filter-crop-season')?.value || '';
      const search = document.getElementById('filter-crop-search')?.value || '';

      let queryParams = '?';
      if (status) queryParams += `status=${encodeURIComponent(status)}&`;
      if (season) queryParams += `season=${encodeURIComponent(season)}&`;
      if (search) queryParams += `search=${encodeURIComponent(search)}&`;

      const res = await API.farmer.getCrops(queryParams);
      cropsCache = res.crops || [];

      // Update Summary Cards
      const sum = res.summary || {};
      const elTotal = document.getElementById('crop-summary-total');
      const elActive = document.getElementById('crop-summary-active');
      const elArea = document.getElementById('crop-summary-area');

      if (elTotal) elTotal.textContent = sum.totalCrops || cropsCache.length;
      if (elActive) elActive.textContent = sum.activeCrops || 0;
      if (elArea) elArea.textContent = `${sum.totalAreaAcres || 0} Acres`;

      if (cropsCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--slate-500);">No crop records found matching filters.</td></tr>';
        return;
      }

      tbody.innerHTML = cropsCache
        .map((c) => {
          const dateStr = new Date(c.date || c.sowingDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          const harvestStr = c.expectedHarvestDate
            ? new Date(c.expectedHarvestDate).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '<span style="color:var(--slate-400);">Not set</span>';

          const seasonBadge = `<span class="badge badge-secondary">${(c.season || 'kharif').toUpperCase()}</span>`;

          let statusBadge = '<span class="badge badge-success">Growing</span>';
          if (c.status === 'sown') statusBadge = '<span class="badge badge-primary">Sown</span>';
          else if (c.status === 'planned') statusBadge = '<span class="badge badge-secondary">Planned</span>';
          else if (c.status === 'harvesting') statusBadge = '<span class="badge badge-warning">Harvesting</span>';
          else if (c.status === 'harvested') statusBadge = '<span class="badge badge-info">Harvested</span>';
          else if (c.status === 'completed') statusBadge = '<span class="badge badge-dark">Completed</span>';

          return `
            <tr>
              <td><strong>${dateStr}</strong></td>
              <td>
                <div style="font-weight:700; color:var(--slate-900);">${c.cropName}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${c.variety || '-'}</div>
              </td>
              <td>${seasonBadge}</td>
              <td><strong>${c.areaAcres || 1}</strong> acres</td>
              <td>${statusBadge}</td>
              <td><strong>${harvestStr}</strong></td>
              <td>${c.fieldLocation || 'Main Field'}</td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-secondary btn-sm" title="Edit Crop" onclick="FarmerDashboard.editCrop('${c._id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-secondary btn-sm" title="Delete Crop" onclick="FarmerDashboard.deleteCrop('${c._id}', '${c.cropName}')">
                    <i class="fas fa-trash-alt text-danger"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-danger" style="text-align:center; padding:20px;">Error: ${err.message}</td></tr>`;
    }
  };

  const openCropModal = () => {
    const form = document.getElementById('form-modal-crop');
    if (form) form.reset();
    document.getElementById('modal-crop-id').value = '';
    document.getElementById('modal-crop-title').textContent = 'Add Crop Record';
    document.getElementById('modal-crop-date').value = new Date().toISOString().slice(0, 10);
    App.openModal('modal-crop');
  };

  const editCrop = (id) => {
    const crop = cropsCache.find((c) => c._id === id);
    if (!crop) return;

    document.getElementById('modal-crop-id').value = crop._id;
    document.getElementById('modal-crop-title').textContent = 'Edit Crop Record';
    document.getElementById('modal-crop-name').value = crop.cropName || '';
    document.getElementById('modal-crop-variety').value = crop.variety || '';
    document.getElementById('modal-crop-season').value = crop.season || 'kharif';
    document.getElementById('modal-crop-status').value = crop.status || 'growing';
    document.getElementById('modal-crop-date').value = crop.date
      ? new Date(crop.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    document.getElementById('modal-crop-harvest-date').value = crop.expectedHarvestDate
      ? new Date(crop.expectedHarvestDate).toISOString().slice(0, 10)
      : '';
    document.getElementById('modal-crop-area').value = crop.areaAcres || 1;
    document.getElementById('modal-crop-yield').value = crop.estimatedYieldQuintals || '';
    document.getElementById('modal-crop-location').value = crop.fieldLocation || '';
    document.getElementById('modal-crop-notes').value = crop.notes || '';

    App.openModal('modal-crop');
  };

  const handleCropSubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('modal-crop-id').value;
    const cropName = document.getElementById('modal-crop-name').value.trim();
    const variety = document.getElementById('modal-crop-variety').value.trim();
    const season = document.getElementById('modal-crop-season').value;
    const status = document.getElementById('modal-crop-status').value;
    const date = document.getElementById('modal-crop-date').value;
    const expectedHarvestDate = document.getElementById('modal-crop-harvest-date').value || null;
    const areaAcres = parseFloat(document.getElementById('modal-crop-area').value) || 0;
    const estimatedYieldQuintals = parseFloat(document.getElementById('modal-crop-yield').value) || 0;
    const fieldLocation = document.getElementById('modal-crop-location').value.trim();
    const notes = document.getElementById('modal-crop-notes').value.trim();

    const payload = {
      cropName,
      variety,
      season,
      status,
      date,
      sowingDate: date,
      expectedHarvestDate,
      areaAcres,
      estimatedYieldQuintals,
      fieldLocation,
      notes,
    };

    try {
      if (id) {
        await API.farmer.updateCrop(id, payload);
        App.showToast('Crop record updated successfully', 'success');
      } else {
        await API.farmer.createCrop(payload);
        App.showToast('Crop record saved in MongoDB with date field', 'success');
      }
      App.closeModal('modal-crop');
      await loadCropsTable();
    } catch (err) {
      App.showToast(err.message || 'Error saving crop record', 'error');
    }
  };

  const deleteCrop = async (id, name) => {
    if (!confirm(`Are you sure you want to delete crop record for "${name}"?`)) return;
    try {
      await API.farmer.deleteCrop(id);
      App.showToast('Crop record deleted', 'info');
      await loadCropsTable();
    } catch (err) {
      App.showToast(err.message || 'Error deleting crop record', 'error');
    }
  };

  // ==========================================
  // 3. ATTENDANCE TABLE
  // ==========================================
  const loadAttendanceTable = async () => {
    const tbody = document.getElementById('attendance-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading attendance register...</td></tr>';

    try {
      const workerId = document.getElementById('filter-att-worker')?.value || '';
      const status = document.getElementById('filter-att-status')?.value || '';

      let queryParams = '?';
      if (workerId) queryParams += `workerId=${workerId}&`;
      if (status) queryParams += `status=${status}&`;

      const res = await API.farmer.getAttendance(queryParams);
      const records = res.attendance || [];

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--slate-500);">No attendance records found matching filters.</td></tr>';
        return;
      }

      tbody.innerHTML = records
        .map((r) => {
          const dateStr = new Date(r.date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          let statusBadge = '<span class="badge badge-success"><span class="badge-dot"></span> Full Day</span>';
          if (r.status === 'half_day') statusBadge = '<span class="badge badge-warning"><span class="badge-dot"></span> Half Day</span>';
          else if (r.status === 'overtime') statusBadge = '<span class="badge badge-info"><span class="badge-dot"></span> Overtime</span>';
          else if (r.status === 'absent') statusBadge = '<span class="badge badge-danger"><span class="badge-dot"></span> Absent</span>';

          const workerName = r.worker ? r.worker.name : 'Unknown Worker';
          const specialization = r.worker?.specialization || '';

          return `
            <tr>
              <td><strong>${dateStr}</strong></td>
              <td>
                <div style="font-weight:700; color:var(--slate-900);">${workerName}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${specialization}</div>
              </td>
              <td>${statusBadge}</td>
              <td><strong>${r.hoursWorked} hrs</strong></td>
              <td>₹${r.wageRate}</td>
              <td><strong style="color:var(--primary-700); font-size:0.95rem;">₹${r.dailyWage.toLocaleString('en-IN')}</strong></td>
              <td>
                <div>${r.cropField}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${r.activity}</div>
              </td>
              <td>
                <button class="btn btn-secondary btn-sm" title="Delete Entry" onclick="FarmerDashboard.deleteAttendance('${r._id}')">
                  <i class="fas fa-trash-alt text-danger"></i>
                </button>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-danger" style="text-align:center; padding:20px;">Error: ${err.message}</td></tr>`;
    }
  };

  // ==========================================
  // 4. WAGE PAYMENTS TABLE
  // ==========================================
  const loadPaymentsTable = async () => {
    const tbody = document.getElementById('payments-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading wage payments...</td></tr>';

    try {
      const workerId = document.getElementById('filter-pay-worker')?.value || '';
      const mode = document.getElementById('filter-pay-mode')?.value || '';

      let queryParams = '?';
      if (workerId) queryParams += `workerId=${workerId}&`;
      if (mode) queryParams += `paymentMode=${mode}&`;

      const res = await API.farmer.getPayments(queryParams);
      const records = res.payments || [];

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--slate-500);">No payment records found.</td></tr>';
        return;
      }

      tbody.innerHTML = records
        .map((p) => {
          const dateStr = new Date(p.date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          const modeBadge = `<span class="badge badge-secondary">${p.paymentMode.toUpperCase()}</span>`;
          const workerName = p.worker ? p.worker.name : 'Unknown Worker';

          return `
            <tr>
              <td><strong>${dateStr}</strong></td>
              <td>
                <div style="font-weight:700; color:var(--slate-900);">${workerName}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${p.worker?.specialization || ''}</div>
              </td>
              <td><strong style="color:var(--success); font-size:1.05rem;">₹${p.amount.toLocaleString('en-IN')}</strong></td>
              <td>${modeBadge}</td>
              <td><code>${p.referenceNumber || 'N/A'}</code></td>
              <td>${p.notes || '-'}</td>
              <td>
                <button class="btn btn-secondary btn-sm" title="Delete Payment" onclick="FarmerDashboard.deletePayment('${p._id}')">
                  <i class="fas fa-trash-alt text-danger"></i>
                </button>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger" style="text-align:center; padding:20px;">Error: ${err.message}</td></tr>`;
    }
  };

  // ==========================================
  // 5. CROP EXPENSES TABLE
  // ==========================================
  const loadExpensesTable = async () => {
    const tbody = document.getElementById('expenses-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading expenses...</td></tr>';

    try {
      const category = document.getElementById('filter-exp-category')?.value || '';
      const search = document.getElementById('filter-exp-search')?.value || '';

      let queryParams = '?';
      if (category) queryParams += `category=${category}&`;
      if (search) queryParams += `search=${encodeURIComponent(search)}&`;

      const res = await API.farmer.getExpenses(queryParams);
      const records = res.expenses || [];

      const totalSpan = document.getElementById('total-expenses-tally');
      if (totalSpan) totalSpan.textContent = `₹${(res.totalAmount || 0).toLocaleString('en-IN')}`;

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--slate-500);">No crop expenses recorded.</td></tr>';
        return;
      }

      tbody.innerHTML = records
        .map((e) => {
          const dateStr = new Date(e.date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          return `
            <tr>
              <td><strong>${dateStr}</strong></td>
              <td><span class="badge badge-warning">${e.category.toUpperCase()}</span></td>
              <td><strong>${e.cropName}</strong></td>
              <td>${e.vendor || '-'}</td>
              <td>${e.description || '-'}</td>
              <td><strong style="color:var(--danger); font-size:1.05rem;">₹${e.amount.toLocaleString('en-IN')}</strong></td>
              <td><span class="badge badge-secondary">${(e.paymentMode || 'cash').toUpperCase()}</span></td>
              <td>
                <button class="btn btn-secondary btn-sm" title="Delete Expense" onclick="FarmerDashboard.deleteExpense('${e._id}')">
                  <i class="fas fa-trash-alt text-danger"></i>
                </button>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-danger" style="text-align:center; padding:20px;">Error: ${err.message}</td></tr>`;
    }
  };

  // ==========================================
  // 6. CROP SALES TABLE & FILTERS
  // ==========================================
  const populateSaleDropdowns = (crops = [], buyers = [], currentCrop = '', currentBuyer = '') => {
    const cropSelect = document.getElementById('filter-sale-crop');
    const buyerSelect = document.getElementById('filter-sale-buyer');

    if (cropSelect && crops && crops.length > 0) {
      let cropHtml = '<option value="">All Crops</option>';
      crops.forEach((c) => {
        cropHtml += `<option value="${c}" ${c === currentCrop ? 'selected' : ''}>${c}</option>`;
      });
      cropSelect.innerHTML = cropHtml;
    }

    if (buyerSelect && buyers && buyers.length > 0) {
      let buyerHtml = '<option value="">All Buyers</option>';
      buyers.forEach((b) => {
        buyerHtml += `<option value="${b}" ${b === currentBuyer ? 'selected' : ''}>${b}</option>`;
      });
      buyerSelect.innerHTML = buyerHtml;
    }
  };

  const loadSalesTable = async () => {
    const tbody = document.getElementById('sales-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading crop sales...</td></tr>';

    try {
      const startDate = document.getElementById('filter-sale-start-date')?.value || '';
      const endDate = document.getElementById('filter-sale-end-date')?.value || '';
      const cropName = document.getElementById('filter-sale-crop')?.value || '';
      const buyerName = document.getElementById('filter-sale-buyer')?.value || '';
      const status = document.getElementById('filter-sale-status')?.value || '';
      const search = document.getElementById('filter-sale-search')?.value || '';

      let queryParams = '?';
      if (startDate) queryParams += `startDate=${encodeURIComponent(startDate)}&`;
      if (endDate) queryParams += `endDate=${encodeURIComponent(endDate)}&`;
      if (cropName) queryParams += `cropName=${encodeURIComponent(cropName)}&`;
      if (buyerName) queryParams += `buyerName=${encodeURIComponent(buyerName)}&`;
      if (status) queryParams += `paymentStatus=${encodeURIComponent(status)}&`;
      if (search) queryParams += `search=${encodeURIComponent(search)}&`;

      const res = await API.farmer.getSales(queryParams);
      const records = res.sales || [];

      // Populate filter dropdowns dynamically
      populateSaleDropdowns(res.uniqueCrops, res.uniqueBuyers, cropName, buyerName);

      const totalSpan = document.getElementById('total-sales-tally');
      if (totalSpan) totalSpan.textContent = `₹${(res.totalRevenue || 0).toLocaleString('en-IN')}`;

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--slate-500);">No crop sales found matching the selected filters.</td></tr>';
        return;
      }

      tbody.innerHTML = records
        .map((s) => {
          const dateStr = new Date(s.saleDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          let statusBadge = '<span class="badge badge-success">Received</span>';
          if (s.paymentStatus === 'pending') statusBadge = '<span class="badge badge-danger">Pending</span>';
          else if (s.paymentStatus === 'partial') statusBadge = '<span class="badge badge-warning">Partial</span>';

          return `
            <tr>
              <td><strong>${dateStr}</strong></td>
              <td>
                <div style="font-weight:700; color:var(--slate-900);">${s.cropName}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${s.variety || ''}</div>
              </td>
              <td><strong>${s.quantity} ${s.unit}</strong></td>
              <td>₹${s.unitPrice}/${s.unit}</td>
              <td><strong style="color:var(--success); font-size:1.05rem;">₹${s.totalRevenue.toLocaleString('en-IN')}</strong></td>
              <td>
                <div>${s.buyerName}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${s.buyerContact || ''}</div>
              </td>
              <td>${statusBadge}</td>
              <td>₹${(s.amountReceived || 0).toLocaleString('en-IN')}</td>
              <td>
                <button class="btn btn-secondary btn-sm" title="Delete Sale Record" onclick="FarmerDashboard.deleteSale('${s._id}')">
                  <i class="fas fa-trash-alt text-danger"></i>
                </button>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-danger" style="text-align:center; padding:20px;">Error: ${err.message}</td></tr>`;
    }
  };

  // ==========================================
  // 7. UNIFIED TRANSACTIONS LEDGER
  // ==========================================
  const loadTransactionsTable = async () => {
    const tbody = document.getElementById('transactions-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Compiling ledger timeline...</td></tr>';

    try {
      const type = document.getElementById('filter-tx-type')?.value || 'all';
      const search = document.getElementById('filter-tx-search')?.value || '';

      let queryParams = `?type=${type}&`;
      if (search) queryParams += `search=${encodeURIComponent(search)}&`;

      const res = await API.farmer.getTransactions(queryParams);
      const txs = res.transactions || [];

      // Update Top Ledger Metric Totals
      document.getElementById('tx-total-credits').textContent = `+₹${(res.totalCredits || 0).toLocaleString('en-IN')}`;
      document.getElementById('tx-total-debits').textContent = `-₹${(res.totalDebits || 0).toLocaleString('en-IN')}`;

      const netEl = document.getElementById('tx-net-cashflow');
      if (netEl) {
        const net = res.netCashFlow || 0;
        netEl.textContent = `${net >= 0 ? '+' : '-'}₹${Math.abs(net).toLocaleString('en-IN')}`;
        netEl.style.color = net >= 0 ? 'var(--primary-600)' : 'var(--danger)';
      }

      if (txs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--slate-500);">No transactions found in ledger.</td></tr>';
        return;
      }

      tbody.innerHTML = txs
        .map((t) => {
          const dateStr = new Date(t.date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          const typeBadge = t.isCredit
            ? '<span class="badge badge-success"><i class="fas fa-arrow-down"></i> Revenue</span>'
            : t.type === 'wage_payout'
            ? '<span class="badge badge-warning"><i class="fas fa-hand-holding-dollar"></i> Wage Payout</span>'
            : '<span class="badge badge-danger"><i class="fas fa-arrow-up"></i> Expense</span>';

          const amountFormatted = `${t.isCredit ? '+' : '-'}₹${t.amount.toLocaleString('en-IN')}`;
          const amountColor = t.isCredit ? 'var(--success)' : 'var(--danger)';

          return `
            <tr>
              <td><strong>${dateStr}</strong></td>
              <td>${typeBadge}</td>
              <td><strong>${t.category}</strong></td>
              <td>
                <div style="font-weight:700; color:var(--slate-900);">${t.title}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${t.description}</div>
              </td>
              <td><strong>${t.party}</strong></td>
              <td><span class="badge badge-secondary">${(t.status || 'completed').toUpperCase()}</span></td>
              <td style="text-align:right;"><strong style="color:${amountColor}; font-size:1.05rem;">${amountFormatted}</strong></td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger" style="text-align:center; padding:20px;">Error: ${err.message}</td></tr>`;
    }
  };

  // ==========================================
  // 8. REPORTS & ANALYTICS
  // ==========================================
  const loadReports = async () => {
    const reportContainer = document.getElementById('report-metrics-container');
    if (!reportContainer) return;

    const period = document.getElementById('report-period-select')?.value || 'season';

    try {
      const res = await API.farmer.getReports(`?period=${period}`);
      const m = res.metrics;

      // Populate Report Metric Cards
      document.getElementById('report-revenue').textContent = `₹${m.totalSalesRevenue.toLocaleString('en-IN')}`;
      document.getElementById('report-expenses').textContent = `₹${m.totalCropExpenses.toLocaleString('en-IN')}`;
      document.getElementById('report-wages').textContent = `₹${m.totalWagesIncurred.toLocaleString('en-IN')}`;
      document.getElementById('report-total-cost').textContent = `₹${m.totalCost.toLocaleString('en-IN')}`;

      const netEl = document.getElementById('report-net-profit');
      if (netEl) {
        netEl.textContent = `${m.netProfit >= 0 ? '+' : '-'}₹${Math.abs(m.netProfit).toLocaleString('en-IN')}`;
        netEl.style.color = m.netProfit >= 0 ? 'var(--primary-600)' : 'var(--danger)';
      }
      document.getElementById('report-margin').textContent = `${m.profitMargin}%`;

      // Crop production summary table
      const cropTbody = document.getElementById('report-crops-tbody');
      if (cropTbody) {
        if (!res.cropSummary || res.cropSummary.length === 0) {
          cropTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No harvest sales in selected period.</td></tr>';
        } else {
          cropTbody.innerHTML = res.cropSummary
            .map(
              (c) => `
              <tr>
                <td><strong>${c.cropName}</strong></td>
                <td>${c.quantity} ${c.unit}</td>
                <td>₹${c.revenue.toLocaleString('en-IN')}</td>
                <td><strong style="color:var(--success);">₹${Math.round(c.revenue / c.quantity).toLocaleString('en-IN')} / ${c.unit}</strong></td>
              </tr>
            `
            )
            .join('');
        }
      }

      // Expense category summary table
      const expTbody = document.getElementById('report-expense-tbody');
      if (expTbody) {
        const expEntries = Object.entries(res.expenseSummary || {});
        if (expEntries.length === 0) {
          expTbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">No expenses recorded in period.</td></tr>';
        } else {
          expTbody.innerHTML = expEntries
            .map(
              ([cat, amt]) => `
              <tr>
                <td><strong>${cat.toUpperCase()}</strong></td>
                <td>₹${amt.toLocaleString('en-IN')}</td>
                <td>${m.totalCost > 0 ? ((amt / m.totalCost) * 100).toFixed(1) : 0}%</td>
              </tr>
            `
            )
            .join('');
        }
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      App.showToast('Failed to compile reports', 'error');
    }
  };

  const exportLedgerCSV = async () => {
    try {
      const res = await API.farmer.getTransactions();
      const txs = res.transactions || [];

      if (txs.length === 0) {
        App.showToast('No transaction data to export', 'warning');
        return;
      }

      const headers = ['Date', 'Type', 'Category', 'Title', 'Party / Counterpart', 'Description', 'Amount (INR)', 'Status'];
      const rows = txs.map((t) => [
        new Date(t.date).toISOString().slice(0, 10),
        t.type,
        t.category,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.party.replace(/"/g, '""')}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        t.isCredit ? t.amount : -t.amount,
        t.status,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `farm_ledger_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      App.showToast('Transaction Ledger CSV exported successfully', 'success');
    } catch (err) {
      App.showToast('Error exporting CSV', 'error');
    }
  };

  // ==========================================
  // MODAL HANDLERS & CRUD OPERATIONS
  // ==========================================
  const openWorkerModal = (worker = null) => {
    const modal = document.getElementById('modal-worker');
    const form = document.getElementById('form-modal-worker');
    form.reset();

    const titleEl = document.getElementById('modal-worker-title');
    const workerIdInput = document.getElementById('modal-worker-id');

    if (worker) {
      titleEl.textContent = 'Edit Worker Details';
      workerIdInput.value = worker._id;
      document.getElementById('modal-worker-name').value = worker.name;
      document.getElementById('modal-worker-email').value = worker.email;
      document.getElementById('modal-worker-email').readOnly = true;
      document.getElementById('modal-worker-phone').value = worker.phone || '';
      document.getElementById('modal-worker-rate').value = worker.dailyWageRate || 500;
      document.getElementById('modal-worker-spec').value = worker.specialization || 'General Labor';
      document.getElementById('modal-worker-status').value = worker.status || 'active';
      document.getElementById('modal-worker-pass-group').style.display = 'none';
    } else {
      titleEl.textContent = 'Add New Farm Worker';
      workerIdInput.value = '';
      document.getElementById('modal-worker-email').readOnly = false;
      document.getElementById('modal-worker-pass-group').style.display = 'block';
    }

    App.openModal('modal-worker');
  };

  const handleWorkerSubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('modal-worker-id').value;
    const name = document.getElementById('modal-worker-name').value.trim();
    const email = document.getElementById('modal-worker-email').value.trim();
    const phone = document.getElementById('modal-worker-phone').value.trim();
    const dailyWageRate = document.getElementById('modal-worker-rate').value;
    const specialization = document.getElementById('modal-worker-spec').value.trim();
    const status = document.getElementById('modal-worker-status').value;
    const password = document.getElementById('modal-worker-password')?.value;

    try {
      if (id) {
        // Update
        await API.farmer.updateWorker(id, { name, phone, dailyWageRate, specialization, status });
        App.showToast(`Updated worker: ${name}`, 'success');
      } else {
        // Create
        if (!password || password.length < 6) {
          App.showToast('Please provide a password of at least 6 characters for the worker', 'warning');
          return;
        }
        await API.farmer.createWorker({ name, email, password, phone, dailyWageRate, specialization, status });
        App.showToast(`Worker ${name} added successfully!`, 'success');
      }

      App.closeModal('modal-worker');
      await refreshWorkersCache();
      await loadWorkersGrid();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Worker operation failed', 'error');
    }
  };

  const editWorker = (workerId) => {
    const worker = workersList.find((w) => w._id === workerId);
    if (worker) openWorkerModal(worker);
  };

  const deleteWorker = async (workerId, name) => {
    if (!confirm(`Are you sure you want to remove or deactivate worker "${name}"?`)) return;

    try {
      const res = await API.farmer.deleteWorker(workerId);
      App.showToast(res.message || 'Worker updated', 'info');
      await refreshWorkersCache();
      await loadWorkersGrid();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Error removing worker', 'error');
    }
  };

  // Attendance Modal
  const openAttendanceModal = () => {
    const form = document.getElementById('form-modal-attendance');
    form.reset();
    document.getElementById('modal-att-date').value = new Date().toISOString().slice(0, 10);
    calculateModalWage();
    App.openModal('modal-attendance');
  };

  const openAttendanceForWorker = (workerId, rate) => {
    openAttendanceModal();
    const sel = document.getElementById('modal-att-worker');
    if (sel) sel.value = workerId;
    const rateEl = document.getElementById('modal-att-rate');
    if (rateEl) rateEl.value = rate;
    calculateModalWage();
  };

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    const workerId = document.getElementById('modal-att-worker').value;
    const date = document.getElementById('modal-att-date').value;
    const status = document.getElementById('modal-att-status').value;
    const hoursWorked = document.getElementById('modal-att-hours').value;
    const customWageRate = document.getElementById('modal-att-rate').value;
    const cropField = document.getElementById('modal-att-field').value;
    const activity = document.getElementById('modal-att-activity').value;
    const notes = document.getElementById('modal-att-notes').value;

    try {
      const res = await API.farmer.markAttendance({
        workerId,
        date,
        status,
        hoursWorked,
        customWageRate,
        cropField,
        activity,
        notes,
      });

      App.showToast(res.message || 'Attendance logged successfully', 'success');
      App.closeModal('modal-attendance');
      await loadAttendanceTable();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Error marking attendance', 'error');
    }
  };

  const deleteAttendance = async (id) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await API.farmer.deleteAttendance(id);
      App.showToast('Attendance record deleted', 'info');
      await loadAttendanceTable();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Error deleting attendance', 'error');
    }
  };

  // Payment Modal
  const openPaymentModal = () => {
    const form = document.getElementById('form-modal-payment');
    form.reset();
    document.getElementById('modal-pay-date').value = new Date().toISOString().slice(0, 10);
    App.openModal('modal-payment');
  };

  const openPaymentForWorker = (workerId, name, pending) => {
    openPaymentModal();
    const sel = document.getElementById('modal-pay-worker');
    if (sel) sel.value = workerId;
    const amtEl = document.getElementById('modal-pay-amount');
    if (amtEl && pending > 0) amtEl.value = pending;
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const workerId = document.getElementById('modal-pay-worker').value;
    const amount = document.getElementById('modal-pay-amount').value;
    const date = document.getElementById('modal-pay-date').value;
    const paymentMode = document.getElementById('modal-pay-mode').value;
    const referenceNumber = document.getElementById('modal-pay-ref').value;
    const notes = document.getElementById('modal-pay-notes').value;

    try {
      const res = await API.farmer.createPayment({
        workerId,
        amount,
        date,
        paymentMode,
        referenceNumber,
        notes,
      });

      App.showToast(res.message || 'Payment recorded successfully', 'success');
      App.closeModal('modal-payment');
      await loadPaymentsTable();
      await loadWorkersGrid();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Error recording payment', 'error');
    }
  };

  const deletePayment = async (id) => {
    if (!confirm('Are you sure you want to delete this payment disbursement record?')) return;
    try {
      await API.farmer.deletePayment(id);
      App.showToast('Payment record removed', 'info');
      await loadPaymentsTable();
      await loadWorkersGrid();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Error deleting payment', 'error');
    }
  };

  // Expense Modal
  const openExpenseModal = () => {
    const form = document.getElementById('form-modal-expense');
    form.reset();
    document.getElementById('modal-exp-date').value = new Date().toISOString().slice(0, 10);
    App.openModal('modal-expense');
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const cropName = document.getElementById('modal-exp-crop').value;
    const category = document.getElementById('modal-exp-category').value;
    const amount = document.getElementById('modal-exp-amount').value;
    const date = document.getElementById('modal-exp-date').value;
    const vendor = document.getElementById('modal-exp-vendor').value;
    const description = document.getElementById('modal-exp-desc').value;
    const paymentMode = document.getElementById('modal-exp-mode').value;

    try {
      const res = await API.farmer.createExpense({
        cropName,
        category,
        amount,
        date,
        vendor,
        description,
        paymentMode,
      });

      App.showToast(res.message || 'Crop expense logged', 'success');
      App.closeModal('modal-expense');
      await loadExpensesTable();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Error recording expense', 'error');
    }
  };

  const deleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await API.farmer.deleteExpense(id);
      App.showToast('Expense record deleted', 'info');
      await loadExpensesTable();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Error deleting expense', 'error');
    }
  };

  // Sale Modal
  const openSaleModal = () => {
    const form = document.getElementById('form-modal-sale');
    form.reset();
    document.getElementById('modal-sale-date').value = new Date().toISOString().slice(0, 10);
    const saleTotalDisplay = document.getElementById('modal-sale-total-calc');
    if (saleTotalDisplay) saleTotalDisplay.textContent = '₹0';
    App.openModal('modal-sale');
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    const cropName = document.getElementById('modal-sale-crop').value;
    const variety = document.getElementById('modal-sale-variety').value;
    const saleDate = document.getElementById('modal-sale-date').value;
    const quantity = document.getElementById('modal-sale-qty').value;
    const unit = document.getElementById('modal-sale-unit').value;
    const unitPrice = document.getElementById('modal-sale-price').value;
    const buyerName = document.getElementById('modal-sale-buyer').value;
    const buyerContact = document.getElementById('modal-sale-contact').value;
    const paymentStatus = document.getElementById('modal-sale-status').value;
    const amountReceived = document.getElementById('modal-sale-received').value;
    const notes = document.getElementById('modal-sale-notes').value;

    try {
      const res = await API.farmer.createSale({
        cropName,
        variety,
        saleDate,
        quantity,
        unit,
        unitPrice,
        buyerName,
        buyerContact,
        paymentStatus,
        amountReceived,
        notes,
      });

      App.showToast(res.message || 'Crop sale recorded successfully!', 'success');
      App.closeModal('modal-sale');
      await loadSalesTable();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Error recording crop sale', 'error');
    }
  };

  const deleteSale = async (id) => {
    if (!confirm('Are you sure you want to delete this crop sale record?')) return;
    try {
      await API.farmer.deleteSale(id);
      App.showToast('Sale record deleted', 'info');
      await loadSalesTable();
      await loadSummary();
    } catch (err) {
      App.showToast(err.message || 'Error deleting sale', 'error');
    }
  };

  // ==========================================
  // 7. CORRECTION REQUESTS MANAGEMENT
  // ==========================================
  let cachedCorrections = [];

  const loadCorrectionsTable = async () => {
    const tbody = document.getElementById('farmer-corrections-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading correction requests...</td></tr>';

    try {
      const status = document.getElementById('filter-farmer-corr-status')?.value || '';
      const type = document.getElementById('filter-farmer-corr-type')?.value || '';

      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      if (type) queryParams.append('requestType', type);

      const res = await API.farmer.getCorrections(queryParams.toString() ? `?${queryParams.toString()}` : '');
      cachedCorrections = res.corrections || [];

      // Update Tally Summary Cards
      const counts = res.counts || { total: 0, pending: 0, approved: 0, rejected: 0 };
      const elTotal = document.getElementById('farmer-corr-total');
      const elPending = document.getElementById('farmer-corr-pending');
      const elApproved = document.getElementById('farmer-corr-approved');
      const elRejected = document.getElementById('farmer-corr-rejected');
      const badgeNav = document.getElementById('nav-farmer-corrections-badge');

      if (elTotal) elTotal.textContent = counts.total || 0;
      if (elPending) elPending.textContent = counts.pending || 0;
      if (elApproved) elApproved.textContent = counts.approved || 0;
      if (elRejected) elRejected.textContent = counts.rejected || 0;
      if (badgeNav) {
        badgeNav.textContent = counts.pending || 0;
        badgeNav.style.display = counts.pending > 0 ? 'inline-block' : 'none';
      }

      if (cachedCorrections.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align:center; padding:40px; color:var(--slate-500);">
              <i class="fas fa-clipboard-check fa-2x" style="margin-bottom:8px; display:block; color:var(--slate-400);"></i>
              No correction requests found matching current filter.
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = cachedCorrections
        .map((c) => {
          const dateStr = new Date(c.targetDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

          const workerName = c.worker ? c.worker.name : 'Unknown Worker';
          const typeBadge = c.requestType === 'attendance'
            ? '<span class="badge badge-primary"><i class="fas fa-calendar-check"></i> Attendance</span>'
            : '<span class="badge badge-warning"><i class="fas fa-coins"></i> Salary</span>';

          const statusBadge = c.status === 'approved'
            ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Approved</span>'
            : c.status === 'rejected'
            ? '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Rejected</span>'
            : '<span class="badge badge-warning"><i class="fas fa-clock"></i> Pending Review</span>';

          let currText = '';
          let reqText = '';

          if (c.requestType === 'attendance') {
            currText = c.currentStatus ? `${c.currentStatus.toUpperCase()} (${c.currentHours || 0} hrs)` : 'Not Recorded';
            reqText = `<strong>${c.requestedStatus.toUpperCase()}</strong> (${c.requestedHours || 8} hrs)`;
          } else {
            currText = `₹${(c.currentAmount || 0).toLocaleString('en-IN')}`;
            reqText = `<strong style="color:var(--primary-700);">₹${(c.requestedAmount || 0).toLocaleString('en-IN')}</strong>`;
          }

          const actionHtml = c.status === 'pending'
            ? `<button class="btn btn-primary btn-xs" onclick="FarmerDashboard.openReviewModal('${c._id}')">
                <i class="fas fa-gavel"></i> Review
               </button>`
            : `<span style="font-size:0.75rem; color:var(--slate-500);"><i class="fas fa-check-double"></i> Resolved</span>`;

          return `
            <tr>
              <td><span style="font-weight:600;">${dateStr}</span></td>
              <td>
                <div style="font-weight:700; color:var(--slate-900);">${workerName}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${c.worker?.specialization || 'Farm Hand'}</div>
              </td>
              <td>${typeBadge}</td>
              <td style="color:var(--slate-600);">${currText}</td>
              <td>${reqText}</td>
              <td style="max-width:240px; font-size:0.84rem;" title="${c.reason}">
                ${c.reason}
              </td>
              <td>${statusBadge}</td>
              <td style="font-size:0.82rem; color:var(--slate-600); max-width:180px;">
                ${c.farmerRemarks || '<em style="color:var(--slate-400);">None</em>'}
              </td>
              <td>${actionHtml}</td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--danger); padding:20px;">Failed to load correction requests: ${err.message}</td></tr>`;
    }
  };

  const openReviewModal = (id) => {
    const item = cachedCorrections.find((c) => c._id === id);
    if (!item) return;

    document.getElementById('modal-review-id').value = item._id;
    document.getElementById('review-worker-name').textContent = item.worker?.name || 'Worker';
    document.getElementById('review-request-type').textContent = item.requestType === 'attendance' ? 'Attendance Correction' : 'Salary Discrepancy';
    document.getElementById('review-target-date').textContent = new Date(item.targetDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (item.requestType === 'attendance') {
      document.getElementById('review-current-val').textContent = `${(item.currentStatus || 'Absent').toUpperCase()} (${item.currentHours || 0} hrs)`;
      document.getElementById('review-requested-val').textContent = `${(item.requestedStatus || 'Present').toUpperCase()} (${item.requestedHours || 8} hrs)`;
    } else {
      document.getElementById('review-current-val').textContent = `₹${(item.currentAmount || 0).toLocaleString('en-IN')}`;
      document.getElementById('review-requested-val').textContent = `₹${(item.requestedAmount || 0).toLocaleString('en-IN')}`;
    }

    document.getElementById('review-reason').textContent = item.reason;
    document.getElementById('modal-review-remarks').value = '';

    App.openModal('modal-review-correction');
  };

  const handleReviewSubmit = async (decision) => {
    const id = document.getElementById('modal-review-id').value;
    const remarks = document.getElementById('modal-review-remarks').value;
    if (!id) return;

    try {
      const res = await API.farmer.reviewCorrection(id, {
        status: decision,
        farmerRemarks: remarks,
      });

      App.closeModal('modal-review-correction');
      App.showToast(res.message || `Correction request ${decision}!`, decision === 'approved' ? 'success' : 'info');
      await loadCorrectionsTable();
      await loadSummary();
      await refreshWorkersCache();
    } catch (err) {
      App.showToast(err.message || 'Error processing correction request', 'error');
    }
  };

  // Utility Debounce
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return {
    init,
    loadSummary,
    switchTab,
    openWorkerModal,
    openCropModal,
    openAttendanceModal,
    openAttendanceForWorker,
    openPaymentModal,
    openPaymentForWorker,
    openExpenseModal,
    openSaleModal,
    openReviewModal,
    loadCorrectionsTable,
    editWorker,
    deleteWorker,
    editCrop,
    deleteCrop,
    deleteAttendance,
    deletePayment,
    deleteExpense,
    deleteSale,
  };
})();

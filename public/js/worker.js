/**
 * Farm Ledger - Worker Dashboard Controller
 */
const WorkerDashboard = (() => {
  let workerChartInstance = null;

  const init = async () => {
    bindEvents();
    await loadWorkerData();
  };

  const bindEvents = () => {
    // Worker navigation tabs
    document.querySelectorAll('.worker-nav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        switchTab(tab);
      });
    });

    // Worker Live Sync Button
    const refreshBtn = document.getElementById('worker-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('spin-anim');
        await loadActiveTab();
        setTimeout(() => refreshBtn.classList.remove('spin-anim'), 600);
        App.showToast('Your attendance & wage balance synced with MongoDB', 'success');
      });
    }

    // Attendance Filters
    const attStatusFilter = document.getElementById('worker-filter-att-status');
    if (attStatusFilter) attStatusFilter.addEventListener('change', loadWorkerAttendance);

    // Payments Filters
    const payModeFilter = document.getElementById('worker-filter-pay-mode');
    if (payModeFilter) payModeFilter.addEventListener('change', loadWorkerPayments);
  };

  const switchTab = (tabId) => {
    document.querySelectorAll('.worker-nav-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });

    document.querySelectorAll('.worker-tab-pane').forEach((pane) => {
      pane.style.display = pane.id === `worker-tab-${tabId}` ? 'block' : 'none';
    });

    loadActiveTab();
  };

  const getActiveTab = () => {
    const activeBtn = document.querySelector('.worker-nav-btn.active');
    return activeBtn ? activeBtn.dataset.tab : 'overview';
  };

  const loadActiveTab = async () => {
    const active = getActiveTab();
    if (active === 'overview') await loadWorkerData();
    else if (active === 'attendance') await loadWorkerAttendance();
    else if (active === 'payments') await loadWorkerPayments();
  };

  const loadWorkerData = async () => {
    try {
      const res = await API.worker.getDashboard();
      const m = res.metrics;
      const w = res.worker;
      const f = res.farmInfo;

      // Populate Worker Hero Card
      const nameEl = document.getElementById('worker-hero-name');
      const specEl = document.getElementById('worker-hero-spec');
      const farmEl = document.getElementById('worker-hero-farm');
      const avatarEl = document.getElementById('worker-hero-avatar');

      if (nameEl) nameEl.textContent = w.name;
      if (specEl) specEl.textContent = `${w.specialization || 'Farm Worker'} • Daily Wage Rate: ₹${w.dailyWageRate}/day`;
      if (farmEl && f) {
        farmEl.innerHTML = `<i class="fas fa-tractor"></i> <strong>${f.farmName}</strong> (${f.farmLocation || 'Farm'}) • Farmer: <strong>${f.farmerName}</strong>`;
      }
      if (avatarEl) {
        avatarEl.textContent = w.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
      }

      // Populate Metric Cards
      document.getElementById('worker-kpi-earned').textContent = `₹${m.totalEarned.toLocaleString('en-IN')}`;
      document.getElementById('worker-kpi-received').textContent = `₹${m.totalReceived.toLocaleString('en-IN')}`;

      const pendingEl = document.getElementById('worker-kpi-pending');
      const pendingBox = document.getElementById('worker-pending-box');
      if (pendingEl) pendingEl.textContent = `₹${m.pendingWages.toLocaleString('en-IN')}`;
      if (pendingBox) {
        if (m.pendingWages > 0) pendingBox.classList.add('highlight');
        else pendingBox.classList.remove('highlight');
      }

      document.getElementById('worker-kpi-days').textContent = `${m.totalWorkdays} Days`;
      document.getElementById('worker-kpi-hours').textContent = `${m.totalHours} hrs logged (${m.overtimeDays} overtime)`;

      // Render Worker Monthly Chart
      renderWorkerChart(res.monthlyTrends);

      // Render Recent Attendance
      renderRecentAttendance(res.recentAttendance);

      // Render Recent Payments
      renderRecentPayments(res.recentPayments);
    } catch (err) {
      console.error('Error loading worker dashboard:', err);
      App.showToast('Failed to load worker dashboard details', 'error');
    }
  };

  const renderWorkerChart = (trends) => {
    const canvas = document.getElementById('chart-worker-trends');
    if (!canvas || !trends) return;

    if (workerChartInstance) {
      workerChartInstance.destroy();
    }

    const labels = trends.map((t) => t.label);
    const earnedData = trends.map((t) => t.earned);
    const receivedData = trends.map((t) => t.received);

    workerChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Wages Earned (₹)',
            data: earnedData,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10b981',
            borderRadius: 6,
          },
          {
            label: 'Payments Received (₹)',
            data: receivedData,
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            borderColor: '#3b82f6',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', weight: '600' } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `₹${val}`,
            },
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
          },
          x: { grid: { display: false } },
        },
      },
    });
  };

  const renderRecentAttendance = (records) => {
    const tbody = document.getElementById('worker-recent-att-tbody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--slate-500);">No attendance marked yet.</td></tr>';
      return;
    }

    tbody.innerHTML = records
      .map((r) => {
        const dateStr = new Date(r.date).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        let statusBadge = '<span class="badge badge-success">Present</span>';
        if (r.status === 'half_day') statusBadge = '<span class="badge badge-warning">Half Day</span>';
        else if (r.status === 'overtime') statusBadge = '<span class="badge badge-info">Overtime</span>';
        else if (r.status === 'absent') statusBadge = '<span class="badge badge-danger">Absent</span>';

        return `
          <tr>
            <td><strong>${dateStr}</strong></td>
            <td>${statusBadge}</td>
            <td><strong>${r.hoursWorked} hrs</strong></td>
            <td><div>${r.cropField}</div><div style="font-size:0.75rem; color:var(--slate-500);">${r.activity}</div></td>
            <td><strong style="color:var(--primary-700); font-size:1.05rem;">₹${r.dailyWage.toLocaleString('en-IN')}</strong></td>
          </tr>
        `;
      })
      .join('');
  };

  const renderRecentPayments = (records) => {
    const tbody = document.getElementById('worker-recent-pay-tbody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--slate-500);">No payments received yet.</td></tr>';
      return;
    }

    tbody.innerHTML = records
      .map((p) => {
        const dateStr = new Date(p.date).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return `
          <tr>
            <td><strong>${dateStr}</strong></td>
            <td><strong style="color:var(--success); font-size:1.05rem;">₹${p.amount.toLocaleString('en-IN')}</strong></td>
            <td><span class="badge badge-secondary">${p.paymentMode.toUpperCase()}</span></td>
            <td><code>${p.referenceNumber || 'Cash Payout'}</code></td>
          </tr>
        `;
      })
      .join('');
  };

  // Full Attendance History
  const loadWorkerAttendance = async () => {
    const tbody = document.getElementById('worker-full-att-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading attendance logs...</td></tr>';

    try {
      const status = document.getElementById('worker-filter-att-status')?.value || '';
      let query = status ? `?status=${status}` : '';

      const res = await API.worker.getAttendance(query);
      const records = res.attendance || [];

      // Update Tally badge
      document.getElementById('worker-att-days-tally').textContent = `${res.daysWorked || 0} Workdays`;
      document.getElementById('worker-att-earned-tally').textContent = `₹${(res.totalEarned || 0).toLocaleString('en-IN')}`;

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--slate-500);">No records found matching filters.</td></tr>';
        return;
      }

      tbody.innerHTML = records
        .map((r) => {
          const dateStr = new Date(r.date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          let statusBadge = '<span class="badge badge-success">Full Day</span>';
          if (r.status === 'half_day') statusBadge = '<span class="badge badge-warning">Half Day</span>';
          else if (r.status === 'overtime') statusBadge = '<span class="badge badge-info">Overtime</span>';
          else if (r.status === 'absent') statusBadge = '<span class="badge badge-danger">Absent</span>';

          return `
            <tr>
              <td><strong>${dateStr}</strong></td>
              <td>${statusBadge}</td>
              <td><strong>${r.hoursWorked} hrs</strong></td>
              <td>₹${r.wageRate}</td>
              <td><strong style="color:var(--primary-700); font-size:1.05rem;">₹${r.dailyWage.toLocaleString('en-IN')}</strong></td>
              <td>
                <div>${r.cropField}</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${r.activity}${r.notes ? ` • ${r.notes}` : ''}</div>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger" style="text-align:center; padding:20px;">Error: ${err.message}</td></tr>`;
    }
  };

  // Full Payment Receipts History
  const loadWorkerPayments = async () => {
    const tbody = document.getElementById('worker-full-pay-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading payment vouchers...</td></tr>';

    try {
      const mode = document.getElementById('worker-filter-pay-mode')?.value || '';
      let query = mode ? `?paymentMode=${mode}` : '';

      const res = await API.worker.getPayments(query);
      const records = res.payments || [];

      // Update Tally badge
      document.getElementById('worker-pay-tally').textContent = `₹${(res.totalPaid || 0).toLocaleString('en-IN')}`;

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--slate-500);">No payment records found.</td></tr>';
        return;
      }

      tbody.innerHTML = records
        .map((p) => {
          const dateStr = new Date(p.date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          return `
            <tr>
              <td><strong>${dateStr}</strong></td>
              <td><strong style="color:var(--success); font-size:1.15rem;">₹${p.amount.toLocaleString('en-IN')}</strong></td>
              <td><span class="badge badge-secondary">${p.paymentMode.toUpperCase()}</span></td>
              <td><code>${p.referenceNumber || 'Voucher Slip'}</code></td>
              <td>${p.notes || 'Wage Settlement'}</td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-danger" style="text-align:center; padding:20px;">Error: ${err.message}</td></tr>`;
    }
  };

  return {
    init,
    loadWorkerData,
    switchTab,
  };
})();

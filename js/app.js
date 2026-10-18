/**
 * Workload Balancer — Core Application Controller
 * Coordinates Views, Modals, Event Listeners, State Transitions, CSV Exports & Chart Lifecycle.
 */

const AppController = {
  currentView: 'dashboard',
  selectedTaskIdForAssignment: null,
  isDarkMode: false,

  init() {
    // 1. Initialize Storage
    window.StorageManager.init();

    // 2. Load Theme
    const settings = window.StorageManager.getSettings();
    if (settings && settings.theme === 'dark') {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }

    // 3. Setup Navigation & Global Events
    this.bindEvents();

    // 4. Render initial view
    this.navigateTo('dashboard');
    this.updateNotificationBadge();

    // 5. Initialize Lucide Icons if available
    this.refreshIcons();
  },

  refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  },

  setTheme(theme) {
    this.isDarkMode = (theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.innerHTML = this.isDarkMode 
        ? '<i data-lucide="sun" class="icon"></i>' 
        : '<i data-lucide="moon" class="icon"></i>';
    }
    const settings = window.StorageManager.getSettings();
    settings.theme = theme;
    window.StorageManager.saveSettings(settings);

    // Refresh charts if visible
    if (this.currentView === 'dashboard') {
      this.renderDashboardCharts();
    } else if (this.currentView === 'reports') {
      this.renderReportCharts();
    }
    this.refreshIcons();
  },

  toggleTheme() {
    this.setTheme(this.isDarkMode ? 'light' : 'dark');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
      <span style="flex: 1;">${message}</span>
    `;
    container.appendChild(toast);
    this.refreshIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  },

  bindEvents() {
    // Navigation items
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const view = el.getAttribute('data-nav');
        this.navigateTo(view);
        // On mobile, close sidebar
        const sidebar = document.getElementById('appSidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar) sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
      });
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (mobileMenuBtn && sidebarBackdrop) {
      mobileMenuBtn.addEventListener('click', () => {
        document.getElementById('appSidebar').classList.toggle('open');
        sidebarBackdrop.classList.toggle('active');
      });
      sidebarBackdrop.addEventListener('click', () => {
        document.getElementById('appSidebar').classList.remove('open');
        sidebarBackdrop.classList.remove('active');
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Modal close buttons (all elements with data-modal-close)
    document.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', () => {
        const modal = el.closest('.modal-backdrop');
        if (modal) modal.classList.remove('active');
      });
    });

    // Backdrop click close
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // Employee Form Submission
    const empForm = document.getElementById('employeeModalForm');
    if (empForm) {
      empForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveEmployee();
      });
    }

    // Task Form Submission
    const taskForm = document.getElementById('taskModalForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveTask();
      });

      // Listen to employee selection change in Task Form to warn if capacity exceeded
      const assigneeSelect = document.getElementById('taskFormAssignedTo');
      const effortInput = document.getElementById('taskFormEffort');
      const capacityWarningBox = document.getElementById('taskFormCapacityWarning');

      const checkWarning = () => {
        const empId = assigneeSelect.value;
        const effort = Number(effortInput.value) || 0;
        const currentTaskId = document.getElementById('taskFormId').value;
        if (!empId) {
          capacityWarningBox.style.display = 'none';
          return;
        }
        const warning = window.TaskManager.checkCapacityWarning(empId, effort, currentTaskId);
        if (warning.willOverload) {
          capacityWarningBox.style.display = 'block';
          capacityWarningBox.innerHTML = `
            <strong>Warning: Workload Overload!</strong> Assigning this task will increase ${warning.employeeName}'s total assigned effort to 
            <strong>${warning.projected}h</strong> (${warning.currentHours}h current + ${effort}h task), 
            exceeding maximum capacity of ${warning.maxCapacity}h by <strong>+${warning.excessHours}h</strong>.
          `;
        } else {
          capacityWarningBox.style.display = 'none';
        }
      };

      if (assigneeSelect) assigneeSelect.addEventListener('change', checkWarning);
      if (effortInput) effortInput.addEventListener('input', checkWarning);
    }

    // Employee filter listeners
    const empSearch = document.getElementById('empSearchInput');
    const empDept = document.getElementById('empDeptFilter');
    const empAvail = document.getElementById('empAvailFilter');
    const empSort = document.getElementById('empSortSelect');
    [empSearch, empDept, empAvail, empSort].forEach(el => {
      if (el) el.addEventListener('input', () => this.renderEmployeesView());
    });

    // Task filter listeners
    const taskSearch = document.getElementById('taskSearchInput');
    const taskPriority = document.getElementById('taskPriorityFilter');
    const taskStatus = document.getElementById('taskStatusFilter');
    const taskEmployee = document.getElementById('taskEmployeeFilter');
    const taskSort = document.getElementById('taskSortSelect');
    [taskSearch, taskPriority, taskStatus, taskEmployee, taskSort].forEach(el => {
      if (el) el.addEventListener('input', () => this.renderTasksView());
    });

    // Smart assignment task select change
    const saTaskSelect = document.getElementById('saTaskSelect');
    if (saTaskSelect) {
      saTaskSelect.addEventListener('change', () => {
        this.selectedTaskIdForAssignment = saTaskSelect.value;
        this.renderSmartAssignmentDetails();
      });
    }

    // Smart assignment recommend button
    const saRecommendBtn = document.getElementById('saRecommendBtn');
    if (saRecommendBtn) {
      saRecommendBtn.addEventListener('click', () => this.runSmartAssignment());
    }

    // Settings weight inputs validation listener
    const weightInputs = ['weightSkill', 'weightCapacity', 'weightDeadline', 'weightTasks'];
    weightInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.validateSettingsWeights());
    });

    // Save Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveSettings();
      });
    }

    // Reset demo button
    const resetDemoBtn = document.getElementById('resetDemoBtn');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all data back to original demo state? Any custom employees or tasks will be replaced.')) {
          window.StorageManager.resetToDemo();
          this.onDataChanged();
          this.showToast('Demo data reset successfully!', 'success');
        }
      });
    }

    // Export JSON
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        window.StorageManager.exportAllAsJSON();
        this.showToast('JSON backup exported.', 'success');
      });
    }

    // Import JSON
    const importFileInput = document.getElementById('importJsonFileInput');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const res = window.StorageManager.importFromJSON(event.target.result);
          if (res.success) {
            this.onDataChanged();
            this.showToast(res.message, 'success');
          } else {
            alert('Failed to import JSON: ' + res.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // Reports export CSV buttons
    const btnExpEmp = document.getElementById('btnExportEmployeeCSV');
    if (btnExpEmp) btnExpEmp.addEventListener('click', () => this.exportEmployeeWorkloadCSV());

    const btnExpTsk = document.getElementById('btnExportTaskCSV');
    if (btnExpTsk) btnExpTsk.addEventListener('click', () => this.exportTasksCSV());

    const btnExpOvd = document.getElementById('btnExportOverdueCSV');
    if (btnExpOvd) btnExpOvd.addEventListener('click', () => this.exportOverdueCSV());

    const btnExpHist = document.getElementById('btnExportHistoryCSV');
    if (btnExpHist) btnExpHist.addEventListener('click', () => this.exportHistoryCSV());
  },

  onDataChanged() {
    this.updateNotificationBadge();
    this.refreshCurrentView();
  },

  updateNotificationBadge() {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    const count = window.NotificationCenter.getUnresolvedCriticalCount(employees, tasks);
    const badge = document.getElementById('navNotificationBadge');
    if (badge) {
      if (count > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = count;
      } else {
        badge.style.display = 'none';
      }
    }
  },

  navigateTo(viewId) {
    this.currentView = viewId;

    // Update nav link active states
    document.querySelectorAll('[data-nav]').forEach(el => {
      if (el.getAttribute('data-nav') === viewId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update views visibility
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.classList.add('active');
    }

    // Update Header Title
    const titles = {
      dashboard: 'Dashboard Overview',
      employees: 'Employee Management',
      tasks: 'Task Management',
      assignment: 'Smart Task Allocation Engine',
      workload: 'Workload & Imbalance Analysis',
      notifications: 'Deadline & Notification Center',
      approvals: 'Manager Approval & Audit Log',
      reports: 'Analytics & Export Reports',
      settings: 'System Settings'
    };
    const breadcrumb = document.getElementById('pageBreadcrumb');
    if (breadcrumb) breadcrumb.textContent = titles[viewId] || 'Workload Balancer';

    // Render corresponding view
    this.refreshCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  refreshCurrentView() {
    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboardView();
        break;
      case 'employees':
        this.renderEmployeesView();
        break;
      case 'tasks':
        this.renderTasksView();
        break;
      case 'assignment':
        this.renderSmartAssignmentView();
        break;
      case 'workload':
        this.renderWorkloadView();
        break;
      case 'notifications':
        this.renderNotificationsView();
        break;
      case 'approvals':
        this.renderApprovalsView();
        break;
      case 'reports':
        this.renderReportsView();
        break;
      case 'settings':
        this.renderSettingsView();
        break;
    }
    this.refreshIcons();
  },

  /* ==========================================================================
     DASHBOARD VIEW
     ========================================================================== */
  renderDashboardView() {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    const imbalance = window.AnalyticsEngine.analyzeImbalance(employees, tasks);

    let inProgress = 0;
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    const now = new Date();

    tasks.forEach(t => {
      if (t.status === 'Completed') {
        completed++;
      } else {
        if (t.deadline && new Date(t.deadline) < now) overdue++;
        if (t.status === 'In Progress') inProgress++;
        else if (t.status === 'Pending' || t.status === 'Assigned') pending++;
      }
    });

    const fullCapacityEmployees = imbalance.overloaded.length + imbalance.highWorkload.length;

    // Set KPI counters
    document.getElementById('kpiTotalEmployees').textContent = employees.length;
    document.getElementById('kpiTotalTasks').textContent = tasks.length;
    document.getElementById('kpiInProgress').textContent = inProgress;
    document.getElementById('kpiCompleted').textContent = completed;
    document.getElementById('kpiPending').textContent = pending;
    document.getElementById('kpiOverdue').textContent = overdue;
    document.getElementById('kpiFullCapacity').textContent = fullCapacityEmployees;
    
    // Balance Score Pill
    const balanceElem = document.getElementById('kpiBalanceScore');
    if (balanceElem) {
      balanceElem.textContent = `${imbalance.balanceScore}/100`;
      balanceElem.className = `stat-value ${imbalance.balanceScore >= 75 ? 'text-emerald-600' : (imbalance.balanceScore >= 50 ? 'text-blue-600' : 'text-amber-600')}`;
    }

    // Overloaded banner
    const alertBox = document.getElementById('dashboardOverloadAlert');
    if (alertBox) {
      if (imbalance.overloaded.length > 0) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge badge-overload" style="font-size: 0.8rem; padding: 0.35rem 0.65rem;">Attention</span>
              <span style="font-size: 0.9rem; font-weight: 600; color: #b91c1c;">
                ${imbalance.overloaded.length} employee(s) are currently overloaded (>100% capacity): 
                ${imbalance.overloaded.map(o => `<strong>${o.employee.name} (${o.utilizationPercent}%)</strong>`).join(', ')}.
              </span>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="AppController.navigateTo('workload')" style="border-color: #fca5a5; color: #991b1b;">
              View Redistribution Plan
            </button>
          </div>
        `;
      } else {
        alertBox.style.display = 'none';
      }
    }

    // Render Charts
    this.renderDashboardCharts();

    // Upcoming Deadlines List
    const deadlinesContainer = document.getElementById('dashboardUpcomingDeadlines');
    if (deadlinesContainer) {
      const activeTasksWithDeadlines = tasks
        .filter(t => t.status !== 'Completed' && t.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);

      if (activeTasksWithDeadlines.length === 0) {
        deadlinesContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No upcoming deadlines.</div>`;
      } else {
        const empMap = {};
        employees.forEach(e => { empMap[e.id] = e; });

        deadlinesContainer.innerHTML = activeTasksWithDeadlines.map(t => {
          const dlInfo = window.TaskManager.getDeadlineInfo(t.deadline);
          const assignee = t.assignedTo && empMap[t.assignedTo] ? empMap[t.assignedTo].name : 'Unassigned';
          let dlBadgeClass = 'badge-balanced';
          if (dlInfo.urgency === 'overdue') dlBadgeClass = 'badge-overload';
          else if (dlInfo.urgency === 'urgent') dlBadgeClass = 'badge-high';

          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-light);">
              <div style="max-width: 60%;">
                <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${t.title}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  Assigned to: <strong style="color: var(--text-main);">${assignee}</strong> • ${t.effortHours}h • Priority: <span class="badge priority-${t.priority}">${t.priority}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <span class="badge ${dlBadgeClass}">${dlInfo.text}</span>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">${t.deadline}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Recent Activity Feed (Audit logs)
    const activityContainer = document.getElementById('dashboardRecentActivity');
    if (activityContainer) {
      const logs = window.StorageManager.getAuditLogs().slice(0, 6);
      if (logs.length === 0) {
        activityContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No recent allocation events recorded.</div>`;
      } else {
        const empMap = {};
        employees.forEach(e => { empMap[e.id] = e; });

        activityContainer.innerHTML = logs.map(l => {
          const prevName = l.previousEmployeeId && empMap[l.previousEmployeeId] ? empMap[l.previousEmployeeId].name : 'None';
          const newName = l.newEmployeeId && empMap[l.newEmployeeId] ? empMap[l.newEmployeeId].name : 'Unassigned';
          
          return `
            <div style="display: flex; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-light);">
              <div style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--primary); margin-top: 6px; flex-shrink: 0;"></div>
              <div style="flex: 1;">
                <div style="font-size: 0.84rem; color: var(--text-main);">
                  <strong>${l.action}:</strong> ${l.taskTitle || l.taskId}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
                  ${l.previousEmployeeId ? `${prevName} → ${newName}` : `Assigned to ${newName}`} • <em>"${l.reason}"</em>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-subtle); margin-top: 0.2rem;">
                  ${l.timestamp} by ${l.decidedBy}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  renderDashboardCharts() {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    window.AnalyticsEngine.renderWorkloadBarChart('dashboardWorkloadChart', employees, tasks, this.isDarkMode);
    window.AnalyticsEngine.renderTaskStatusDoughnut('dashboardTaskStatusChart', tasks, this.isDarkMode);
  },

  /* ==========================================================================
     EMPLOYEE MANAGEMENT VIEW
     ========================================================================== */
  renderEmployeesView() {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();

    // Populate department filter options dynamically
    const deptSelect = document.getElementById('empDeptFilter');
    if (deptSelect && deptSelect.options.length <= 1) {
      const depts = Array.from(new Set(employees.map(e => e.department || 'General')));
      depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        deptSelect.appendChild(opt);
      });
    }

    // Populate skill filter options dynamically
    const skillSelect = document.getElementById('empSkillFilter');
    if (skillSelect && skillSelect.options.length <= 1) {
      const allSkills = new Set();
      employees.forEach(e => (e.skills || []).forEach(s => allSkills.add(s)));
      Array.from(allSkills).sort().forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        skillSelect.appendChild(opt);
      });
    }

    const search = document.getElementById('empSearchInput')?.value || '';
    const dept = document.getElementById('empDeptFilter')?.value || 'All';
    const skill = document.getElementById('empSkillFilter')?.value || 'All';
    const avail = document.getElementById('empAvailFilter')?.value || 'All';
    const sort = document.getElementById('empSortSelect')?.value || 'workload_desc';

    const filtered = window.EmployeeManager.filterAndSort(employees, tasks, {
      search, department: dept, skill, availability: avail, sortBy: sort
    });

    const metrics = window.AnalyticsEngine.getEmployeeWorkloadMetrics(employees, tasks);
    const metricMap = {};
    metrics.forEach(m => { metricMap[m.employee.id] = m; });

    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            No employees match the selected criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(emp => {
      const m = metricMap[emp.id] || {
        assignedHours: 0,
        maxCapacity: emp.maxCapacity,
        utilizationPercent: 0,
        availableHours: emp.maxCapacity,
        activeTasksCount: 0,
        status: 'Low',
        statusColor: 'emerald'
      };

      let fillClass = 'fill-low';
      let badgeClass = 'badge-low';
      if (m.utilizationPercent > 100) { fillClass = 'fill-overload'; badgeClass = 'badge-overload'; }
      else if (m.utilizationPercent >= 80) { fillClass = 'fill-high'; badgeClass = 'badge-high'; }
      else if (m.utilizationPercent >= 50) { fillClass = 'fill-balanced'; badgeClass = 'badge-balanced'; }

      let availBadge = '<span class="badge" style="background: #ecfdf5; color: #047857;">Available</span>';
      if (emp.availability === 'On Leave') {
        availBadge = '<span class="badge" style="background: #f1f5f9; color: #64748b;">On Leave</span>';
      } else if (emp.availability === 'Busy') {
        availBadge = '<span class="badge" style="background: #fef2f2; color: #b91c1c;">Busy</span>';
      }

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <img src="${emp.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`}" 
                   alt="${emp.name}" 
                   style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-light);" />
              <div>
                <div style="font-weight: 600; color: var(--text-main);">${emp.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${emp.id} • ${emp.email}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.84rem; font-weight: 500;">${emp.role || 'Engineer'}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${emp.department}</div>
          </td>
          <td>
            <div class="skill-tag-group" style="max-width: 200px;">
              ${(emp.skills || []).slice(0, 3).map(s => `<span class="skill-tag">${s}</span>`).join('')}
              ${(emp.skills || []).length > 3 ? `<span class="skill-tag">+${emp.skills.length - 3}</span>` : ''}
            </div>
          </td>
          <td>${availBadge}</td>
          <td>
            <div class="workload-bar-wrap" style="width: 160px;">
              <div class="workload-bar-track">
                <div class="workload-bar-fill ${fillClass}" style="width: ${Math.min(100, m.utilizationPercent)}%;"></div>
              </div>
              <div class="workload-bar-label">
                <span><strong>${m.assignedHours}h</strong> / ${m.maxCapacity}h</span>
                <span class="badge ${badgeClass}" style="font-size: 0.68rem; padding: 0.1rem 0.4rem;">${m.utilizationPercent}%</span>
              </div>
            </div>
          </td>
          <td>
            <span style="font-weight: 600;">${m.activeTasksCount}</span> active
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-secondary btn-icon-only" title="View Profile" onclick="AppController.openEmployeeProfileModal('${emp.id}')">
              <i data-lucide="user" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn btn-secondary btn-icon-only" title="Edit Employee" onclick="AppController.openEditEmployeeModal('${emp.id}')">
              <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn btn-secondary btn-icon-only" title="Delete Employee" onclick="AppController.handleDeleteEmployee('${emp.id}')" style="color: #ef4444;">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddEmployeeModal() {
    document.getElementById('employeeModalTitle').textContent = 'Add New Employee';
    document.getElementById('empFormIsEdit').value = 'false';
    document.getElementById('empFormOriginalId').value = '';
    
    // Auto generate next ID
    const employees = window.StorageManager.getEmployees();
    const nextNum = employees.length + 101;
    document.getElementById('empFormId').value = `EMP-${nextNum}`;
    document.getElementById('empFormId').removeAttribute('readonly');

    document.getElementById('empFormName').value = '';
    document.getElementById('empFormEmail').value = '';
    document.getElementById('empFormDepartment').value = 'Engineering';
    document.getElementById('empFormRole').value = '';
    document.getElementById('empFormSkills').value = '';
    document.getElementById('empFormCapacity').value = '40';
    document.getElementById('empFormAvailability').value = 'Available';

    document.getElementById('employeeModalBackdrop').classList.add('active');
  },

  openEditEmployeeModal(id) {
    const employees = window.StorageManager.getEmployees();
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('employeeModalTitle').textContent = `Edit Employee: ${emp.name}`;
    document.getElementById('empFormIsEdit').value = 'true';
    document.getElementById('empFormOriginalId').value = emp.id;

    document.getElementById('empFormId').value = emp.id;
    document.getElementById('empFormId').setAttribute('readonly', 'true');
    document.getElementById('empFormName').value = emp.name;
    document.getElementById('empFormEmail').value = emp.email;
    document.getElementById('empFormDepartment').value = emp.department || 'Engineering';
    document.getElementById('empFormRole').value = emp.role || '';
    document.getElementById('empFormSkills').value = (emp.skills || []).join(', ');
    document.getElementById('empFormCapacity').value = emp.maxCapacity || 40;
    document.getElementById('empFormAvailability').value = emp.availability || 'Available';

    document.getElementById('employeeModalBackdrop').classList.add('active');
  },

  handleSaveEmployee() {
    const isEdit = document.getElementById('empFormIsEdit').value === 'true';
    const originalId = document.getElementById('empFormOriginalId').value;

    const payload = {
      id: document.getElementById('empFormId').value,
      name: document.getElementById('empFormName').value,
      email: document.getElementById('empFormEmail').value,
      department: document.getElementById('empFormDepartment').value,
      role: document.getElementById('empFormRole').value,
      skills: document.getElementById('empFormSkills').value.split(',').map(s => s.trim()).filter(Boolean),
      maxCapacity: Number(document.getElementById('empFormCapacity').value),
      availability: document.getElementById('empFormAvailability').value
    };

    let result;
    if (isEdit) {
      result = window.EmployeeManager.updateEmployee(originalId, payload);
    } else {
      result = window.EmployeeManager.addEmployee(payload);
    }

    if (!result.success) {
      alert('Validation Error:\n• ' + result.errors.join('\n• '));
      return;
    }

    document.getElementById('employeeModalBackdrop').classList.remove('active');
    this.showToast(isEdit ? 'Employee updated successfully!' : 'Employee added successfully!', 'success');
  },

  handleDeleteEmployee(id) {
    const employees = window.StorageManager.getEmployees();
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    if (confirm(`Are you sure you want to delete employee "${emp.name}" (${emp.id})?\nAny active tasks assigned to this employee will be moved back to Pending/Unassigned status.`)) {
      const res = window.EmployeeManager.deleteEmployee(id);
      if (res.success) {
        this.showToast(`Deleted ${emp.name}. (${res.unassignedCount} task(s) unassigned)`, 'info');
      }
    }
  },

  openEmployeeProfileModal(id) {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const metrics = window.AnalyticsEngine.getEmployeeWorkloadMetrics([emp], tasks)[0];

    document.getElementById('empProfileModalTitle').textContent = `Employee Profile: ${emp.name}`;
    const body = document.getElementById('empProfileModalContent');
    if (!body) return;

    let fillClass = 'fill-low';
    let badgeClass = 'badge-low';
    if (metrics.utilizationPercent > 100) { fillClass = 'fill-overload'; badgeClass = 'badge-overload'; }
    else if (metrics.utilizationPercent >= 80) { fillClass = 'fill-high'; badgeClass = 'badge-high'; }
    else if (metrics.utilizationPercent >= 50) { fillClass = 'fill-balanced'; badgeClass = 'badge-balanced'; }

    body.innerHTML = `
      <div style="display: flex; gap: 1.25rem; align-items: center; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light);">
        <img src="${emp.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`}" 
             alt="${emp.name}" 
             style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);" />
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-main);">${emp.name}</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${emp.role} • ${emp.department} • <strong>${emp.id}</strong></div>
          <div style="font-size: 0.8rem; color: var(--text-subtle);">${emp.email} • Status: <span class="badge ${emp.availability === 'Available' ? 'badge-low' : 'badge-overload'}">${emp.availability}</span></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; padding: 1rem; background-color: var(--bg-subtle); border-radius: var(--radius-md);">
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Assigned Effort</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">${metrics.assignedHours}h</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Max Capacity</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">${metrics.maxCapacity}h</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Workload Utilization</div>
          <div style="font-size: 1.4rem; font-weight: 800;" class="${metrics.utilizationPercent > 100 ? 'text-rose-600' : 'text-blue-600'}">
            ${metrics.utilizationPercent}%
          </div>
        </div>
      </div>

      <div class="workload-bar-wrap" style="margin-bottom: 1.25rem;">
        <div class="workload-bar-track" style="height: 10px;">
          <div class="workload-bar-fill ${fillClass}" style="width: ${Math.min(100, metrics.utilizationPercent)}%;"></div>
        </div>
        <div class="workload-bar-label">
          <span>Available Spare Hours: <strong>${metrics.availableHours}h</strong></span>
          <span class="badge ${badgeClass}">${metrics.status}</span>
        </div>
      </div>

      <div>
        <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Registered Skills</h4>
        <div class="skill-tag-group">
          ${(emp.skills || []).map(s => `<span class="skill-tag" style="font-size: 0.8rem; padding: 0.25rem 0.6rem;">${s}</span>`).join('')}
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">
          Assigned Tasks (${metrics.activeTasks.length} active, ${metrics.completedTasksCount} completed)
        </h4>
        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
          ${metrics.activeTasks.length === 0 ? `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No active tasks currently assigned.</div>
          ` : metrics.activeTasks.map(t => `
            <div style="padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: 600; font-size: 0.82rem; color: var(--text-main);">${t.title}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                  ${t.id} • ${t.effortHours}h • Due: ${t.deadline} • <span class="badge priority-${t.priority}">${t.priority}</span>
                </div>
              </div>
              <button class="btn btn-sm btn-secondary" onclick="AppController.closeModal('empProfileModalBackdrop'); AppController.openSmartAssignmentForTask('${t.id}')">
                Reassign
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('empProfileModalBackdrop').classList.add('active');
    this.refreshIcons();
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  },

  /* ==========================================================================
     TASK MANAGEMENT VIEW
     ========================================================================== */
  renderTasksView() {
    const tasks = window.StorageManager.getTasks();
    const employees = window.StorageManager.getEmployees();

    // Populate employee filter dropdown
    const empSelect = document.getElementById('taskEmployeeFilter');
    if (empSelect && empSelect.options.length <= 2) {
      employees.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.name;
        empSelect.appendChild(opt);
      });
    }

    const search = document.getElementById('taskSearchInput')?.value || '';
    const priority = document.getElementById('taskPriorityFilter')?.value || 'All';
    const status = document.getElementById('taskStatusFilter')?.value || 'All';
    const employeeId = document.getElementById('taskEmployeeFilter')?.value || 'All';
    const sortBy = document.getElementById('taskSortSelect')?.value || 'deadline_asc';

    const filtered = window.TaskManager.filterAndSort(tasks, {
      search, priority, status, employeeId, sortBy
    });

    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            No tasks found matching the criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(task => {
      const dlInfo = window.TaskManager.getDeadlineInfo(task.deadline);
      const assignee = task.assignedTo && empMap[task.assignedTo] ? empMap[task.assignedTo] : null;

      let dlBadgeClass = 'badge-balanced';
      if (dlInfo.urgency === 'overdue' && task.status !== 'Completed') dlBadgeClass = 'badge-overload';
      else if (dlInfo.urgency === 'urgent' && task.status !== 'Completed') dlBadgeClass = 'badge-high';

      const statusBadgeClass = `status-${task.status.replace(/\s+/g, '-')}`;

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.88rem;">${task.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
              <strong>${task.id}</strong> • Created ${task.createdDate || 'Recently'}
            </div>
          </td>
          <td>
            <span class="badge priority-${task.priority}">${task.priority}</span>
          </td>
          <td>
            <div style="font-weight: 600;">${task.effortHours} hrs</div>
          </td>
          <td>
            <div class="skill-tag-group" style="max-width: 180px;">
              ${(task.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              <span class="badge ${dlBadgeClass}" style="width: fit-content;">${dlInfo.text}</span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">${task.deadline}</span>
            </div>
          </td>
          <td>
            ${assignee ? `
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <img src="${assignee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${assignee.name}`}" 
                     alt="${assignee.name}" 
                     style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
                <span style="font-size: 0.84rem; font-weight: 500;">${assignee.name}</span>
              </div>
            ` : `
              <button class="btn btn-sm btn-primary" onclick="AppController.openSmartAssignmentForTask('${task.id}')" style="font-size: 0.72rem; padding: 0.25rem 0.55rem;">
                <i data-lucide="sparkles" style="width: 12px; height: 12px;"></i> Auto Match
              </button>
            `}
          </td>
          <td>
            <span class="badge ${statusBadgeClass}">${task.status}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            ${task.status !== 'Completed' ? `
              <button class="btn btn-secondary btn-icon-only" title="Mark Completed" onclick="AppController.handleMarkTaskComplete('${task.id}')" style="color: #10b981;">
                <i data-lucide="check" style="width: 16px; height: 16px;"></i>
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-icon-only" title="Smart Recommend / Reassign" onclick="AppController.openSmartAssignmentForTask('${task.id}')">
              <i data-lucide="sparkles" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn btn-secondary btn-icon-only" title="Edit Task" onclick="AppController.openEditTaskModal('${task.id}')">
              <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn btn-secondary btn-icon-only" title="Delete Task" onclick="AppController.handleDeleteTask('${task.id}')" style="color: #ef4444;">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddTaskModal() {
    document.getElementById('taskModalTitle').textContent = 'Create New Task';
    document.getElementById('taskFormIsEdit').value = 'false';
    document.getElementById('taskFormOriginalId').value = '';

    const tasks = window.StorageManager.getTasks();
    const nextNum = tasks.length + 201;
    document.getElementById('taskFormId').value = `TSK-${nextNum}`;
    document.getElementById('taskFormId').removeAttribute('readonly');

    document.getElementById('taskFormTitle').value = '';
    document.getElementById('taskFormDescription').value = '';
    document.getElementById('taskFormEffort').value = '12';
    document.getElementById('taskFormPriority').value = 'Medium';
    document.getElementById('taskFormSkills').value = '';

    // Set default deadline to 5 days from today
    const d = new Date();
    d.setDate(d.getDate() + 5);
    document.getElementById('taskFormDeadline').value = d.toISOString().split('T')[0];

    // Populate assignees
    this.populateTaskFormAssignees();
    document.getElementById('taskFormAssignedTo').value = '';
    document.getElementById('taskFormCapacityWarning').style.display = 'none';

    document.getElementById('taskModalBackdrop').classList.add('active');
  },

  openEditTaskModal(id) {
    const tasks = window.StorageManager.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('taskModalTitle').textContent = `Edit Task: ${task.title}`;
    document.getElementById('taskFormIsEdit').value = 'true';
    document.getElementById('taskFormOriginalId').value = task.id;

    document.getElementById('taskFormId').value = task.id;
    document.getElementById('taskFormId').setAttribute('readonly', 'true');
    document.getElementById('taskFormTitle').value = task.title;
    document.getElementById('taskFormDescription').value = task.description || '';
    document.getElementById('taskFormEffort').value = task.effortHours || 10;
    document.getElementById('taskFormPriority').value = task.priority || 'Medium';
    document.getElementById('taskFormSkills').value = (task.skills || []).join(', ');
    document.getElementById('taskFormDeadline').value = task.deadline || '';

    this.populateTaskFormAssignees();
    document.getElementById('taskFormAssignedTo').value = task.assignedTo || '';
    document.getElementById('taskFormCapacityWarning').style.display = 'none';

    document.getElementById('taskModalBackdrop').classList.add('active');
  },

  populateTaskFormAssignees() {
    const select = document.getElementById('taskFormAssignedTo');
    if (!select) return;
    const employees = window.StorageManager.getEmployees();
    select.innerHTML = '<option value="">-- Unassigned (Use Smart Allocation Later) --</option>';
    employees.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.name} (${e.department} • Cap: ${e.maxCapacity}h)`;
      select.appendChild(opt);
    });
  },

  handleSaveTask() {
    const isEdit = document.getElementById('taskFormIsEdit').value === 'true';
    const originalId = document.getElementById('taskFormOriginalId').value;

    const payload = {
      id: document.getElementById('taskFormId').value,
      title: document.getElementById('taskFormTitle').value,
      description: document.getElementById('taskFormDescription').value,
      effortHours: Number(document.getElementById('taskFormEffort').value),
      priority: document.getElementById('taskFormPriority').value,
      skills: document.getElementById('taskFormSkills').value.split(',').map(s => s.trim()).filter(Boolean),
      deadline: document.getElementById('taskFormDeadline').value,
      assignedTo: document.getElementById('taskFormAssignedTo').value || null,
      assignmentReason: 'Created/Edited in task form.'
    };

    let result;
    if (isEdit) {
      result = window.TaskManager.updateTask(originalId, payload);
    } else {
      result = window.TaskManager.addTask(payload);
    }

    if (!result.success) {
      alert('Validation Error:\n• ' + result.errors.join('\n• '));
      return;
    }

    document.getElementById('taskModalBackdrop').classList.remove('active');
    this.showToast(isEdit ? 'Task updated successfully!' : 'Task created successfully!', 'success');
  },

  handleDeleteTask(id) {
    if (confirm(`Are you sure you want to delete task ${id}? This action cannot be undone.`)) {
      window.TaskManager.deleteTask(id);
      this.showToast(`Task ${id} deleted.`, 'info');
    }
  },

  handleMarkTaskComplete(id) {
    window.TaskManager.setTaskStatus(id, 'Completed');
    this.showToast(`Task ${id} marked as Completed!`, 'success');
  },

  /* ==========================================================================
     SMART TASK ALLOCATION VIEW
     ========================================================================== */
  renderSmartAssignmentView() {
    const tasks = window.StorageManager.getTasks();
    const select = document.getElementById('saTaskSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose a Task to Evaluate --</option>';

    // Prioritize pending/unassigned tasks first
    const unassigned = tasks.filter(t => !t.assignedTo && t.status !== 'Completed');
    const inProgress = tasks.filter(t => t.assignedTo && t.status !== 'Completed');

    if (unassigned.length > 0) {
      const groupUnassigned = document.createElement('optgroup');
      groupUnassigned.label = 'Unassigned / Pending Tasks';
      unassigned.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `[${t.id}] ${t.title} (${t.effortHours}h, ${t.priority})`;
        groupUnassigned.appendChild(opt);
      });
      select.appendChild(groupUnassigned);
    }

    if (inProgress.length > 0) {
      const groupProgress = document.createElement('optgroup');
      groupProgress.label = 'Rebalance Active Assigned Tasks';
      inProgress.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `[${t.id}] ${t.title} (${t.effortHours}h, ${t.priority})`;
        groupProgress.appendChild(opt);
      });
      select.appendChild(groupProgress);
    }

    if (this.selectedTaskIdForAssignment) {
      select.value = this.selectedTaskIdForAssignment;
    } else if (unassigned.length > 0) {
      select.value = unassigned[0].id;
      this.selectedTaskIdForAssignment = unassigned[0].id;
    }

    this.renderSmartAssignmentDetails();
  },

  openSmartAssignmentForTask(taskId) {
    this.selectedTaskIdForAssignment = taskId;
    this.navigateTo('assignment');
  },

  renderSmartAssignmentDetails() {
    const taskId = document.getElementById('saTaskSelect')?.value;
    const taskDetailsBox = document.getElementById('saTaskDetails');
    const recommendationsBox = document.getElementById('saRecommendationsArea');
    if (!taskDetailsBox || !recommendationsBox) return;

    if (!taskId) {
      taskDetailsBox.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
          Please select a task from the dropdown above to view details and launch the evaluation algorithm.
        </div>
      `;
      recommendationsBox.innerHTML = '';
      return;
    }

    const tasks = window.StorageManager.getTasks();
    const employees = window.StorageManager.getEmployees();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });
    const currentAssignee = task.assignedTo && empMap[task.assignedTo] ? empMap[task.assignedTo] : null;

    taskDetailsBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span class="badge priority-${task.priority}">${task.priority} Priority</span>
            <span class="badge status-${task.status.replace(/\s+/g, '-')}">${task.status}</span>
            <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-subtle);">${task.id}</span>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main);">${task.title}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.35rem; max-width: 650px;">
            ${task.description || 'No detailed description provided.'}
          </p>
        </div>
        <div style="background-color: var(--bg-subtle); padding: 0.75rem 1.25rem; border-radius: var(--radius-md); text-align: right;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Estimated Effort</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-main);">${task.effortHours} hours</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Deadline: <strong>${task.deadline}</strong></div>
        </div>
      </div>

      <div style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-light);">
        <div>
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-right: 0.5rem;">Required Skills:</span>
          <div class="skill-tag-group" style="display: inline-flex;">
            ${(task.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
          </div>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          Current Assignee: ${currentAssignee ? `<strong>${currentAssignee.name}</strong> (${currentAssignee.department})` : '<em style="color: #ef4444;">Unassigned</em>'}
        </div>
      </div>
    `;

    // Automatically trigger evaluation
    this.runSmartAssignment();
  },

  runSmartAssignment() {
    const taskId = document.getElementById('saTaskSelect')?.value;
    if (!taskId) return;

    const tasks = window.StorageManager.getTasks();
    const employees = window.StorageManager.getEmployees();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const requireSkills = document.getElementById('saRequireAllSkillsToggle')?.checked || false;
    const evaluation = window.SmartAssignment.evaluateEmployeesForTask(task, employees, tasks, null, requireSkills);

    const container = document.getElementById('saRecommendationsArea');
    if (!container) return;

    if (evaluation.topRecommendations.length === 0) {
      container.innerHTML = `
        <div style="background-color: var(--bg-surface); border: 2px dashed var(--border-light); border-radius: var(--radius-xl); padding: 3rem; text-align: center;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
            <i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i>
          </div>
          <h4 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">No Eligible Candidates Found</h4>
          <p style="font-size: 0.88rem; color: var(--text-muted); max-width: 500px; margin: 0 auto 1.25rem auto;">
            None of the available employees met the strict criteria. This may be due to missing mandatory skills, lack of weekly capacity, or employee leave status.
          </p>
          <div style="display: flex; justify-content: center; gap: 0.75rem;">
            <button class="btn btn-secondary" onclick="document.getElementById('saRequireAllSkillsToggle').checked = false; AppController.runSmartAssignment();">
              Relax Skill Constraints
            </button>
            <button class="btn btn-primary" onclick="AppController.openEditTaskModal('${task.id}')">
              Adjust Task Hours / Deadline
            </button>
          </div>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main);">
          Top Recommended Candidates (${evaluation.totalEligible} evaluated)
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-muted);">
          Scoring Weights: <strong>40% Skills • 30% Capacity • 20% Deadline • 10% Active Tasks</strong>
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 1.25rem;">
        ${evaluation.topRecommendations.map((rec, index) => {
          const rankNum = index + 1;
          const isRank1 = (rankNum === 1);
          const emp = rec.employee;

          let scoreColor = '#3b82f6';
          if (rec.overallScore >= 80) scoreColor = '#10b981';
          else if (rec.overallScore < 50) scoreColor = '#f59e0b';

          return `
            <div class="recommendation-card ${isRank1 ? 'rank-1' : ''}">
              <div class="rank-pill">${isRank1 ? '★ Best Match' : `Rank #${rankNum}`}</div>
              
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <img src="${emp.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`}" 
                       alt="${emp.name}" 
                       style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-light);" />
                  <div>
                    <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">${emp.name}</h4>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${emp.role} • ${emp.department}</div>
                  </div>
                </div>

                <div class="score-circle" style="--score-pct: ${rec.overallScore};">
                  <div class="score-circle-inner" style="color: ${scoreColor};">
                    ${rec.overallScore}%
                  </div>
                </div>
              </div>

              <!-- Factor breakdown -->
              <div class="breakdown-row">
                <div class="breakdown-item">
                  <h6>Skill</h6>
                  <span style="color: ${rec.scores.skillMatch >= 80 ? '#10b981' : '#475569'};">${rec.scores.skillMatch}%</span>
                </div>
                <div class="breakdown-item">
                  <h6>Capacity</h6>
                  <span style="color: ${rec.willOverload ? '#ef4444' : '#10b981'};">${rec.scores.remainingCapacity}%</span>
                </div>
                <div class="breakdown-item">
                  <h6>Deadline</h6>
                  <span>${rec.scores.deadlineSuitability}%</span>
                </div>
                <div class="breakdown-item">
                  <h6>Tasks</h6>
                  <span>${rec.scores.activeTaskCount}%</span>
                </div>
              </div>

              <!-- Matched & Missing skills -->
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.35rem;">
                  Skill Alignment:
                </div>
                <div class="skill-tag-group">
                  ${rec.matchedSkills.map(s => `<span class="skill-tag matched">✓ ${s}</span>`).join('')}
                  ${rec.missingSkills.map(s => `<span class="skill-tag missing">✗ ${s}</span>`).join('')}
                </div>
              </div>

              <!-- Workload impact -->
              <div style="background-color: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.35rem;">
                  <span>Current: <strong>${rec.currentAssignedHours}h</strong> (${rec.currentUtilization}%)</span>
                  <span>Projected: <strong class="${rec.willOverload ? 'text-rose-600' : ''}">${rec.projectedHours}h</strong> (${rec.projectedUtilization}%)</span>
                </div>
                <div class="workload-bar-track" style="height: 6px;">
                  <div class="workload-bar-fill ${rec.willOverload ? 'fill-overload' : (rec.projectedUtilization > 80 ? 'fill-high' : 'fill-balanced')}" 
                       style="width: ${Math.min(100, rec.projectedUtilization)}%;"></div>
                </div>
                ${rec.willOverload ? `
                  <div style="font-size: 0.72rem; color: #dc2626; font-weight: 600; margin-top: 0.35rem;">
                    ⚠ Exceeds capacity by +${rec.overloadHours}h!
                  </div>
                ` : `
                  <div style="font-size: 0.72rem; color: #059669; font-weight: 600; margin-top: 0.35rem;">
                    ✓ Remains within capacity (${rec.remainingHoursAfter}h available reserve)
                  </div>
                `}
              </div>

              <!-- Rationale -->
              <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
                <strong>Recommendation Rationale:</strong> ${rec.primaryReason}
              </div>

              <!-- Action buttons -->
              <div style="margin-top: auto; display: flex; gap: 0.5rem; padding-top: 0.75rem;">
                <button class="btn ${isRank1 ? 'btn-primary' : 'btn-secondary'}" style="flex: 1;" onclick="AppController.openApprovalConfirmation('${task.id}', '${emp.id}', '${rec.overallScore}', '${encodeURIComponent(rec.primaryReason)}')">
                  <i data-lucide="check-check" style="width: 16px; height: 16px;"></i> Confirm Assignment
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.refreshIcons();
  },

  openApprovalConfirmation(taskId, employeeId, matchScore, encodedReason) {
    const tasks = window.StorageManager.getTasks();
    const employees = window.StorageManager.getEmployees();
    const task = tasks.find(t => t.id === taskId);
    const emp = employees.find(e => e.id === employeeId);
    if (!task || !emp) return;

    const reason = decodeURIComponent(encodedReason);
    const prevAssignee = task.assignedTo ? employees.find(e => e.id === task.assignedTo) : null;

    document.getElementById('approvalModalTaskId').value = taskId;
    document.getElementById('approvalModalEmpId').value = employeeId;
    document.getElementById('approvalModalTitle').textContent = `Manager Approval: Assign Task ${taskId}`;
    
    const body = document.getElementById('approvalModalBody');
    if (body) {
      body.innerHTML = `
        <div style="padding: 1rem; background-color: var(--bg-subtle); border-radius: var(--radius-md); margin-bottom: 1rem;">
          <h4 style="font-weight: 700; font-size: 1rem; color: var(--text-main); margin-bottom: 0.25rem;">${task.title}</h4>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Effort: <strong>${task.effortHours}h</strong> • Priority: <span class="badge priority-${task.priority}">${task.priority}</span> • Deadline: <strong>${task.deadline}</strong>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
          <div style="padding: 0.85rem; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Current Assignee</div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); margin-top: 0.25rem;">
              ${prevAssignee ? prevAssignee.name : 'None (Unassigned)'}
            </div>
          </div>
          <div style="padding: 0.85rem; border: 2px solid var(--primary); border-radius: var(--radius-md); background: var(--primary-light);">
            <div style="font-size: 0.72rem; color: var(--primary); text-transform: uppercase; font-weight: 700;">Proposed Candidate (${matchScore}% Match)</div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--primary-text); margin-top: 0.25rem;">
              ${emp.name}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Manager Decision Notes / Reason for Approval:</label>
          <textarea id="approvalDecisionReason" class="form-textarea" rows="3">${reason}</textarea>
          <span class="form-help">This reason will be recorded permanently in the assignment audit trail.</span>
        </div>
      `;
    }

    document.getElementById('approvalModalBackdrop').classList.add('active');
    this.refreshIcons();
  },

  handleConfirmApproval() {
    const taskId = document.getElementById('approvalModalTaskId').value;
    const employeeId = document.getElementById('approvalModalEmpId').value;
    const reason = document.getElementById('approvalDecisionReason').value || 'Approved by Manager based on Smart Assignment recommendation.';

    const tasks = window.StorageManager.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    window.TaskManager.updateTask(taskId, {
      assignedTo: employeeId,
      status: 'In Progress',
      assignmentReason: reason
    });

    document.getElementById('approvalModalBackdrop').classList.remove('active');
    this.showToast(`Task ${taskId} successfully assigned to ${employeeId}!`, 'success');

    // Return to tasks or dashboard
    this.navigateTo('tasks');
  },

  /* ==========================================================================
     WORKLOAD & IMBALANCE VIEW
     ========================================================================== */
  renderWorkloadView() {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    const imbalance = window.AnalyticsEngine.analyzeImbalance(employees, tasks);
    const metrics = window.AnalyticsEngine.getEmployeeWorkloadMetrics(employees, tasks);

    // Balance Score Banner
    const scoreElem = document.getElementById('imbalanceScoreValue');
    if (scoreElem) {
      scoreElem.textContent = `${imbalance.balanceScore} / 100`;
    }
    document.getElementById('imbalanceAvgUtil').textContent = `${imbalance.averageUtilization}%`;
    document.getElementById('imbalanceSpread').textContent = `${imbalance.spread}%`;
    document.getElementById('imbalanceStdDev').textContent = `±${imbalance.stdDev}%`;

    // Redistribution Suggestions Area
    const redistArea = document.getElementById('redistributionSuggestionsArea');
    if (redistArea) {
      if (imbalance.redistributionSuggestions.length === 0) {
        redistArea.innerHTML = `
          <div style="background-color: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 2rem; text-align: center; color: var(--text-muted);">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto;">
              <i data-lucide="check" style="width: 20px; height: 20px;"></i>
            </div>
            <div style="font-weight: 600; color: var(--text-main);">No Immediate Redistribution Needed</div>
            <div style="font-size: 0.8rem; margin-top: 0.2rem;">All employees are operating within reasonable workload parameters or there are no unallocated tasks.</div>
          </div>
        `;
      } else {
        redistArea.innerHTML = `
          <div style="margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem; color: var(--text-main);">
            Recommended Task Transfers (${imbalance.redistributionSuggestions.length} Opportunities)
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1rem;">
            ${imbalance.redistributionSuggestions.map(s => `
              <div style="background-color: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1.25rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span class="badge badge-high" style="font-size: 0.75rem;">${s.taskEffort} hrs Shift</span>
                  <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">Task: ${s.taskId}</span>
                </div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${s.taskTitle}</div>

                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background-color: var(--bg-subtle); border-radius: var(--radius-md); font-size: 0.8rem;">
                  <div>
                    <span style="color: var(--text-muted);">From:</span> <strong>${s.fromEmployee.name}</strong> 
                    <span style="color: #ef4444;">(${s.currentFromUtilization}% → ${s.projectedFromUtilization}%)</span>
                  </div>
                  <i data-lucide="arrow-right" style="width: 16px; height: 16px; color: var(--text-subtle);"></i>
                  <div>
                    <span style="color: var(--text-muted);">To:</span> <strong>${s.toEmployee.name}</strong> 
                    <span style="color: #10b981;">(${s.currentToUtilization}% → ${s.projectedToUtilization}%)</span>
                  </div>
                </div>

                <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4;">
                  ${s.reason}
                </div>

                <button class="btn btn-primary" onclick="AppController.openApprovalConfirmation('${s.taskId}', '${s.toEmployee.id}', '${s.skillMatchPct}', '${encodeURIComponent(s.reason)}')">
                  Apply Rebalance Transfer
                </button>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    // Workload Distribution Grid of all employees
    const grid = document.getElementById('workloadEmployeesGrid');
    if (grid) {
      grid.innerHTML = metrics.map(m => {
        let fillClass = 'fill-low';
        let badgeClass = 'badge-low';
        if (m.utilizationPercent > 100) { fillClass = 'fill-overload'; badgeClass = 'badge-overload'; }
        else if (m.utilizationPercent >= 80) { fillClass = 'fill-high'; badgeClass = 'badge-high'; }
        else if (m.utilizationPercent >= 50) { fillClass = 'fill-balanced'; badgeClass = 'badge-balanced'; }

        return `
          <div style="background-color: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1.15rem; display: flex; flex-direction: column; gap: 0.75rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <img src="${m.employee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.employee.name}`}" 
                     alt="${m.employee.name}" 
                     style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;" />
                <div>
                  <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-main);">${m.employee.name}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${m.employee.role} • ${m.employee.department}</div>
                </div>
              </div>
              <span class="badge ${badgeClass}">${m.status}</span>
            </div>

            <div class="workload-bar-wrap">
              <div class="workload-bar-track">
                <div class="workload-bar-fill ${fillClass}" style="width: ${Math.min(100, m.utilizationPercent)}%;"></div>
              </div>
              <div class="workload-bar-label">
                <span><strong>${m.assignedHours}h</strong> / ${m.maxCapacity}h allocated</span>
                <span style="font-weight: 700; color: var(--text-main);">${m.utilizationPercent}%</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-light); padding-top: 0.5rem;">
              <span>Active Tasks: <strong>${m.activeTasksCount}</strong></span>
              <span>Available Reserve: <strong>${m.availableHours}h</strong></span>
            </div>

            <button class="btn btn-secondary btn-sm" onclick="AppController.openEmployeeProfileModal('${m.employee.id}')">
              Inspect Workload & Tasks
            </button>
          </div>
        `;
      }).join('');
    }
  },

  /* ==========================================================================
     NOTIFICATIONS CENTER VIEW
     ========================================================================== */
  renderNotificationsView() {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    const alerts = window.NotificationCenter.getAlerts(employees, tasks);

    const activeFilter = document.querySelector('.notif-filter-btn.active')?.getAttribute('data-filter') || 'All';
    let filteredAlerts = alerts;
    if (activeFilter !== 'All') {
      if (activeFilter === 'Critical') {
        filteredAlerts = alerts.filter(a => a.priority === 'Critical');
      } else {
        filteredAlerts = alerts.filter(a => a.category === activeFilter);
      }
    }

    const container = document.getElementById('notificationsList');
    if (!container) return;

    if (filteredAlerts.length === 0) {
      container.innerHTML = `
        <div style="background-color: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 3rem; text-align: center; color: var(--text-muted);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem auto;">
            <i data-lucide="shield-check" style="width: 22px; height: 22px;"></i>
          </div>
          <div style="font-weight: 700; font-size: 1rem; color: var(--text-main);">No Active Alerts</div>
          <div style="font-size: 0.85rem; margin-top: 0.25rem;">All tasks are currently on schedule and workload constraints are healthy.</div>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    container.innerHTML = filteredAlerts.map(a => {
      let icon = 'alert-circle';
      if (a.category === 'Deadline') icon = 'clock';
      if (a.category === 'Workload') icon = 'trending-up';

      return `
        <div class="alert-item alert-${a.priority}">
          <div style="display: flex; gap: 0.85rem; flex: 1;">
            <div style="margin-top: 2px;">
              <i data-lucide="${icon}" style="width: 20px; height: 20px; color: ${a.priority === 'Critical' ? '#ef4444' : '#f59e0b'};"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="badge priority-${a.priority}">${a.priority}</span>
                <span class="badge badge-balanced">${a.category}</span>
                <span style="font-size: 0.75rem; color: var(--text-subtle);">${a.timestamp}</span>
              </div>
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-top: 0.35rem;">
                ${a.title}
              </h4>
              <p style="font-size: 0.84rem; color: var(--text-muted); margin-top: 0.2rem; line-height: 1.4;">
                ${a.message}
              </p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${a.actionType === 'rebalance_employee_tasks' ? `
              <button class="btn btn-secondary btn-sm" onclick="AppController.navigateTo('workload')">
                ${a.actionLabel}
              </button>
            ` : (a.actionType === 'smart_assign' ? `
              <button class="btn btn-primary btn-sm" onclick="AppController.openSmartAssignmentForTask('${a.relatedId}')">
                ${a.actionLabel}
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="AppController.openEditTaskModal('${a.relatedId}')">
                ${a.actionLabel}
              </button>
            `)}
          </div>
        </div>
      `;
    }).join('');

    this.refreshIcons();
  },

  setNotificationFilter(filter) {
    document.querySelectorAll('.notif-filter-btn').forEach(btn => {
      if (btn.getAttribute('data-filter') === filter) btn.classList.add('active', 'btn-primary');
      else btn.classList.remove('active', 'btn-primary');
    });
    this.renderNotificationsView();
  },

  /* ==========================================================================
     MANAGER APPROVALS & AUDIT LOG VIEW
     ========================================================================== */
  renderApprovalsView() {
    const logs = window.StorageManager.getAuditLogs();
    const employees = window.StorageManager.getEmployees();
    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    const tbody = document.getElementById('auditLogTableBody');
    if (!tbody) return;

    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            No allocation decisions or assignment records found in audit history.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const prevEmp = l.previousEmployeeId && empMap[l.previousEmployeeId] ? empMap[l.previousEmployeeId].name : 'None';
      const newEmp = l.newEmployeeId && empMap[l.newEmployeeId] ? empMap[l.newEmployeeId].name : (l.newEmployeeId || 'Unassigned');

      let actionBadge = '<span class="badge badge-balanced">Assigned</span>';
      if (l.action === 'Reassigned') actionBadge = '<span class="badge badge-high">Reassigned</span>';
      if (l.action === 'Deleted') actionBadge = '<span class="badge badge-overload">Deleted</span>';

      return `
        <tr>
          <td style="font-weight: 600; font-size: 0.8rem; color: var(--text-subtle);">${l.timestamp}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${l.taskTitle || l.taskId}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${l.taskId}</div>
          </td>
          <td>${actionBadge}</td>
          <td>
            <span style="color: var(--text-muted); font-size: 0.84rem;">${prevEmp}</span>
          </td>
          <td>
            <strong style="color: var(--text-main); font-size: 0.84rem;">${newEmp}</strong>
          </td>
          <td style="max-width: 280px; font-size: 0.8rem; color: var(--text-muted);">
            ${l.reason}
          </td>
          <td>
            <span class="badge" style="background: #f1f5f9; color: #475569;">${l.decidedBy}</span>
          </td>
        </tr>
      `;
    }).join('');
  },

  /* ==========================================================================
     REPORTS & ANALYTICS VIEW
     ========================================================================== */
  renderReportsView() {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    const imbalance = window.AnalyticsEngine.analyzeImbalance(employees, tasks);

    document.getElementById('repTotalHours').textContent = `${tasks.reduce((sum, t) => sum + (Number(t.effortHours) || 0), 0)}h`;
    document.getElementById('repAvgUtil').textContent = `${imbalance.averageUtilization}%`;
    document.getElementById('repOverloadedCount').textContent = imbalance.overloaded.length;
    document.getElementById('repOverdueCount').textContent = tasks.filter(t => t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date()).length;

    this.renderReportCharts();
  },

  renderReportCharts() {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    window.AnalyticsEngine.renderDepartmentChart('reportsDepartmentChart', employees, tasks, this.isDarkMode);
  },

  /* ==========================================================================
     CSV EXPORTS (PURE JAVASCRIPT, INSTANT LOCAL DOWNLOAD)
     ========================================================================== */
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast(`Exported ${filename}`, 'success');
  },

  exportEmployeeWorkloadCSV() {
    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    const metrics = window.AnalyticsEngine.getEmployeeWorkloadMetrics(employees, tasks);

    const headers = ['Employee ID', 'Full Name', 'Department', 'Role', 'Availability', 'Max Capacity (h)', 'Assigned Hours', 'Utilization (%)', 'Active Tasks', 'Status'];
    const rows = metrics.map(m => [
      `"${m.employee.id}"`,
      `"${m.employee.name}"`,
      `"${m.employee.department}"`,
      `"${m.employee.role}"`,
      `"${m.employee.availability}"`,
      m.maxCapacity,
      m.assignedHours,
      `${m.utilizationPercent}%`,
      m.activeTasksCount,
      `"${m.status}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(csv, `employee_workload_report_${new Date().toISOString().split('T')[0]}.csv`);
  },

  exportTasksCSV() {
    const tasks = window.StorageManager.getTasks();
    const employees = window.StorageManager.getEmployees();
    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    const headers = ['Task ID', 'Title', 'Priority', 'Effort Hours', 'Status', 'Deadline', 'Assigned Employee ID', 'Assigned Employee Name', 'Required Skills'];
    const rows = tasks.map(t => {
      const assignee = t.assignedTo && empMap[t.assignedTo] ? empMap[t.assignedTo].name : 'Unassigned';
      return [
        `"${t.id}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${t.priority}"`,
        t.effortHours,
        `"${t.status}"`,
        `"${t.deadline || ''}"`,
        `"${t.assignedTo || ''}"`,
        `"${assignee}"`,
        `"${(t.skills || []).join('; ')}"`
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(csv, `tasks_status_report_${new Date().toISOString().split('T')[0]}.csv`);
  },

  exportOverdueCSV() {
    const tasks = window.StorageManager.getTasks();
    const employees = window.StorageManager.getEmployees();
    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    const overdue = tasks.filter(t => t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date());
    const headers = ['Task ID', 'Title', 'Priority', 'Effort Hours', 'Deadline', 'Days Overdue', 'Assigned To'];
    const now = new Date();

    const rows = overdue.map(t => {
      const assignee = t.assignedTo && empMap[t.assignedTo] ? empMap[t.assignedTo].name : 'Unassigned';
      const daysOverdue = Math.max(1, Math.round((now - new Date(t.deadline)) / (24 * 60 * 60 * 1000)));
      return [
        `"${t.id}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${t.priority}"`,
        t.effortHours,
        `"${t.deadline}"`,
        daysOverdue,
        `"${assignee}"`
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(csv, `overdue_tasks_report_${new Date().toISOString().split('T')[0]}.csv`);
  },

  exportHistoryCSV() {
    const logs = window.StorageManager.getAuditLogs();
    const employees = window.StorageManager.getEmployees();
    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    const headers = ['Timestamp', 'Task ID', 'Task Title', 'Action', 'Previous Assignee', 'New Assignee', 'Decision Reason', 'Decided By'];
    const rows = logs.map(l => {
      const prev = l.previousEmployeeId && empMap[l.previousEmployeeId] ? empMap[l.previousEmployeeId].name : 'None';
      const next = l.newEmployeeId && empMap[l.newEmployeeId] ? empMap[l.newEmployeeId].name : (l.newEmployeeId || 'Unassigned');
      return [
        `"${l.timestamp}"`,
        `"${l.taskId}"`,
        `"${(l.taskTitle || '').replace(/"/g, '""')}"`,
        `"${l.action}"`,
        `"${prev}"`,
        `"${next}"`,
        `"${(l.reason || '').replace(/"/g, '""')}"`,
        `"${l.decidedBy || 'Manager'}"`
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(csv, `assignment_audit_history_${new Date().toISOString().split('T')[0]}.csv`);
  },

  /* ==========================================================================
     SETTINGS VIEW
     ========================================================================== */
  renderSettingsView() {
    const settings = window.StorageManager.getSettings();

    document.getElementById('settingsOrgName').value = settings.orgName || 'Acme Cloud Dynamics';
    document.getElementById('settingsDefaultCapacity').value = settings.defaultCapacityHours || 40;

    const weights = settings.scoringWeights || { skillMatch: 40, remainingCapacity: 30, deadlineSuitability: 20, activeTaskCount: 10 };
    document.getElementById('weightSkill').value = weights.skillMatch;
    document.getElementById('weightCapacity').value = weights.remainingCapacity;
    document.getElementById('weightDeadline').value = weights.deadlineSuitability;
    document.getElementById('weightTasks').value = weights.activeTaskCount;

    this.validateSettingsWeights();
  },

  validateSettingsWeights() {
    const skill = Number(document.getElementById('weightSkill').value) || 0;
    const cap = Number(document.getElementById('weightCapacity').value) || 0;
    const dl = Number(document.getElementById('weightDeadline').value) || 0;
    const tasks = Number(document.getElementById('weightTasks').value) || 0;

    const total = skill + cap + dl + tasks;
    const totalElem = document.getElementById('weightsTotalIndicator');
    if (!totalElem) return;

    totalElem.textContent = `Total: ${total}%`;
    if (total === 100) {
      totalElem.className = 'badge badge-low';
      totalElem.textContent = 'Total: 100% (Valid)';
    } else {
      totalElem.className = 'badge badge-overload';
      totalElem.textContent = `Total: ${total}% (Must equal 100%)`;
    }
    return total === 100;
  },

  handleSaveSettings() {
    if (!this.validateSettingsWeights()) {
      alert('Error: The assignment scoring weights must be non-negative and total exactly 100%.');
      return;
    }

    const settings = window.StorageManager.getSettings();
    settings.orgName = document.getElementById('settingsOrgName').value.trim();
    settings.defaultCapacityHours = Number(document.getElementById('settingsDefaultCapacity').value);
    settings.scoringWeights = {
      skillMatch: Number(document.getElementById('weightSkill').value),
      remainingCapacity: Number(document.getElementById('weightCapacity').value),
      deadlineSuitability: Number(document.getElementById('weightDeadline').value),
      activeTaskCount: Number(document.getElementById('weightTasks').value)
    };

    window.StorageManager.saveSettings(settings);
    this.showToast('Settings saved successfully!', 'success');
  }
};

window.AppController = AppController;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.AppController.init();
});

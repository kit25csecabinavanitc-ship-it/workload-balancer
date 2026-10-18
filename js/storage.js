/**
 * Workload Balancer — Storage Manager
 * Handles LocalStorage persistence, data integrity validation, export/import JSON, and demo reset.
 */

const StorageKeys = {
  EMPLOYEES: 'wb_employees_v1',
  TASKS: 'wb_tasks_v1',
  SETTINGS: 'wb_settings_v1',
  AUDIT_LOG: 'wb_audit_log_v1'
};

const StorageManager = {
  /**
   * Initializes local storage with demo data if it doesn't exist or is empty
   */
  init() {
    try {
      if (!localStorage.getItem(StorageKeys.EMPLOYEES)) {
        this.saveEmployees(window.InitialData.employees);
      }
      if (!localStorage.getItem(StorageKeys.TASKS)) {
        this.saveTasks(window.InitialData.tasks);
      }
      if (!localStorage.getItem(StorageKeys.SETTINGS)) {
        this.saveSettings(window.InitialData.settings);
      }
      if (!localStorage.getItem(StorageKeys.AUDIT_LOG)) {
        // Collect existing task histories
        const initialLogs = [];
        window.InitialData.tasks.forEach(task => {
          if (task.assignmentHistory && task.assignmentHistory.length > 0) {
            task.assignmentHistory.forEach(h => {
              initialLogs.push({
                taskId: task.id,
                taskTitle: task.title,
                previousEmployeeId: h.previousEmployeeId,
                newEmployeeId: h.newEmployeeId,
                timestamp: h.timestamp,
                reason: h.reason,
                decidedBy: h.decidedBy || 'Manager',
                action: h.previousEmployeeId ? 'Reassigned' : 'Assigned'
              });
            });
          }
        });
        this.saveAuditLogs(initialLogs);
      }
    } catch (e) {
      console.error('Failed to initialize local storage data:', e);
    }
  },

  getEmployees() {
    try {
      const data = localStorage.getItem(StorageKeys.EMPLOYEES);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('Error parsing employees from storage, falling back to default:', err);
      return window.InitialData ? window.InitialData.employees : [];
    }
  },

  saveEmployees(employees) {
    try {
      localStorage.setItem(StorageKeys.EMPLOYEES, JSON.stringify(employees));
    } catch (err) {
      console.error('Error saving employees to storage:', err);
    }
  },

  getTasks() {
    try {
      const data = localStorage.getItem(StorageKeys.TASKS);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('Error parsing tasks from storage, falling back to default:', err);
      return window.InitialData ? window.InitialData.tasks : [];
    }
  },

  saveTasks(tasks) {
    try {
      localStorage.setItem(StorageKeys.TASKS, JSON.stringify(tasks));
    } catch (err) {
      console.error('Error saving tasks to storage:', err);
    }
  },

  getSettings() {
    try {
      const data = localStorage.getItem(StorageKeys.SETTINGS);
      if (data) {
        return JSON.parse(data);
      }
      return window.InitialData ? window.InitialData.settings : {};
    } catch (err) {
      console.error('Error parsing settings from storage:', err);
      return window.InitialData ? window.InitialData.settings : {};
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(StorageKeys.SETTINGS, JSON.stringify(settings));
    } catch (err) {
      console.error('Error saving settings to storage:', err);
    }
  },

  getAuditLogs() {
    try {
      const data = localStorage.getItem(StorageKeys.AUDIT_LOG);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('Error parsing audit logs:', err);
      return [];
    }
  },

  saveAuditLogs(logs) {
    try {
      localStorage.setItem(StorageKeys.AUDIT_LOG, JSON.stringify(logs));
    } catch (err) {
      console.error('Error saving audit logs:', err);
    }
  },

  addAuditLog(entry) {
    const logs = this.getAuditLogs();
    const newLog = {
      id: 'LOG-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      taskId: entry.taskId,
      taskTitle: entry.taskTitle,
      previousEmployeeId: entry.previousEmployeeId || null,
      newEmployeeId: entry.newEmployeeId,
      reason: entry.reason || 'Manager assignment',
      decidedBy: entry.decidedBy || 'Manager',
      action: entry.action || (entry.previousEmployeeId ? 'Reassigned' : 'Assigned')
    };
    logs.unshift(newLog);
    this.saveAuditLogs(logs);
    return newLog;
  },

  /**
   * Resets all storage back to pristine demo data
   */
  resetToDemo() {
    localStorage.removeItem(StorageKeys.EMPLOYEES);
    localStorage.removeItem(StorageKeys.TASKS);
    localStorage.removeItem(StorageKeys.SETTINGS);
    localStorage.removeItem(StorageKeys.AUDIT_LOG);
    this.init();
  },

  /**
   * Exports entire state as downloadable JSON
   */
  exportAllAsJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      settings: this.getSettings(),
      employees: this.getEmployees(),
      tasks: this.getTasks(),
      auditLogs: this.getAuditLogs()
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workload-balancer-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Validates and imports JSON data
   */
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON structure: Root must be an object.');
      }
      if (!Array.isArray(data.employees)) {
        throw new Error('Validation failed: "employees" array is missing or invalid.');
      }
      if (!Array.isArray(data.tasks)) {
        throw new Error('Validation failed: "tasks" array is missing or invalid.');
      }

      // Check employee items
      for (const emp of data.employees) {
        if (!emp.id || !emp.name || !emp.email || typeof emp.maxCapacity !== 'number') {
          throw new Error(`Employee record invalid: ${JSON.stringify(emp).substring(0, 50)}...`);
        }
      }

      // Check task items
      for (const tsk of data.tasks) {
        if (!tsk.id || !tsk.title || typeof tsk.effortHours !== 'number') {
          throw new Error(`Task record invalid: ${JSON.stringify(tsk).substring(0, 50)}...`);
        }
      }

      this.saveEmployees(data.employees);
      this.saveTasks(data.tasks);
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      if (Array.isArray(data.auditLogs)) {
        this.saveAuditLogs(data.auditLogs);
      }

      return { success: true, message: `Successfully imported ${data.employees.length} employees and ${data.tasks.length} tasks.` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
};

window.StorageManager = StorageManager;

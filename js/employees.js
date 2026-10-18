/**
 * Workload Balancer — Employee Management Module
 * Provides CRUD operations, data validation, filtering, search, sorting, and profile inspections.
 */

const EmployeeManager = {
  /**
   * Validates an employee payload before saving or updating
   */
  validate(employee, isEdit = false, originalId = null) {
    const errors = [];
    const employees = window.StorageManager.getEmployees();

    // Check ID
    if (!employee.id || !employee.id.trim()) {
      errors.push("Employee ID is required (e.g., EMP-115).");
    } else {
      const trimmedId = employee.id.trim().toUpperCase();
      if (!isEdit || (isEdit && trimmedId !== originalId)) {
        const idExists = employees.some(e => e.id.toUpperCase() === trimmedId);
        if (idExists) {
          errors.push(`Employee ID "${trimmedId}" already exists. Duplicate IDs are not permitted.`);
        }
      }
    }

    // Check Name
    if (!employee.name || employee.name.trim().length < 2) {
      errors.push("Full Name must be at least 2 characters long.");
    }

    // Check Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!employee.email || !emailRegex.test(employee.email.trim())) {
      errors.push("Please provide a valid corporate email address.");
    }

    // Check Max Capacity
    const capacity = Number(employee.maxCapacity);
    if (isNaN(capacity) || capacity < 5 || capacity > 80) {
      errors.push("Weekly capacity must be between 5 and 80 hours.");
    }

    // Check Skills
    if (!Array.isArray(employee.skills) || employee.skills.length === 0) {
      errors.push("At least one professional skill must be specified.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Adds a new employee record
   */
  addEmployee(employeeData) {
    const validation = this.validate(employeeData, false);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const employees = window.StorageManager.getEmployees();
    const newEmp = {
      id: employeeData.id.trim().toUpperCase(),
      name: employeeData.name.trim(),
      email: employeeData.email.trim(),
      department: employeeData.department || 'Engineering',
      role: employeeData.role ? employeeData.role.trim() : 'Software Engineer',
      skills: employeeData.skills.map(s => s.trim()).filter(Boolean),
      maxCapacity: Number(employeeData.maxCapacity) || 40,
      availability: employeeData.availability || 'Available',
      avatar: employeeData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(employeeData.name)}`
    };

    employees.push(newEmp);
    window.StorageManager.saveEmployees(employees);

    // Notify app
    if (window.AppController && window.AppController.onDataChanged) {
      window.AppController.onDataChanged();
    }

    return { success: true, employee: newEmp };
  },

  /**
   * Updates an existing employee record
   */
  updateEmployee(id, updatedFields) {
    const employees = window.StorageManager.getEmployees();
    const index = employees.findIndex(e => e.id === id);
    if (index === -1) {
      return { success: false, errors: [`Employee with ID ${id} not found.`] };
    }

    const merged = { ...employees[index], ...updatedFields };
    const validation = this.validate(merged, true, id);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    employees[index] = {
      ...merged,
      id: merged.id.trim().toUpperCase(),
      name: merged.name.trim(),
      email: merged.email.trim(),
      maxCapacity: Number(merged.maxCapacity),
      skills: merged.skills.map(s => s.trim()).filter(Boolean)
    };

    window.StorageManager.saveEmployees(employees);

    if (window.AppController && window.AppController.onDataChanged) {
      window.AppController.onDataChanged();
    }

    return { success: true, employee: employees[index] };
  },

  /**
   * Deletes an employee and unassigns any of their active tasks
   */
  deleteEmployee(id) {
    let employees = window.StorageManager.getEmployees();
    const target = employees.find(e => e.id === id);
    if (!target) {
      return { success: false, message: 'Employee not found.' };
    }

    employees = employees.filter(e => e.id !== id);
    window.StorageManager.saveEmployees(employees);

    // Safely unassign tasks
    let tasks = window.StorageManager.getTasks();
    let unassignedCount = 0;
    tasks = tasks.map(task => {
      if (task.assignedTo === id) {
        unassignedCount++;
        const history = task.assignmentHistory || [];
        history.push({
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          previousEmployeeId: id,
          newEmployeeId: null,
          reason: `Unassigned because employee ${target.name} (${id}) was deleted.`,
          decidedBy: 'System'
        });
        return {
          ...task,
          assignedTo: null,
          status: 'Pending',
          assignmentHistory: history
        };
      }
      return task;
    });

    window.StorageManager.saveTasks(tasks);

    // Record in audit log
    window.StorageManager.addAuditLog({
      taskId: 'EMP-DELETE',
      taskTitle: `Deleted Employee: ${target.name}`,
      previousEmployeeId: id,
      newEmployeeId: null,
      reason: `Employee removed from organization. ${unassignedCount} task(s) unassigned.`,
      decidedBy: 'Manager',
      action: 'Deleted'
    });

    if (window.AppController && window.AppController.onDataChanged) {
      window.AppController.onDataChanged();
    }

    return { success: true, unassignedCount };
  },

  /**
   * Filters and sorts employees list
   */
  filterAndSort(employees, tasks, { search = '', department = 'All', skill = 'All', availability = 'All', sortBy = 'workload_desc' }) {
    const metrics = window.AnalyticsEngine ? window.AnalyticsEngine.getEmployeeWorkloadMetrics(employees, tasks) : [];
    const metricMap = {};
    metrics.forEach(m => { metricMap[m.employee.id] = m; });

    let filtered = employees.filter(emp => {
      // Search by name, ID, or role
      if (search) {
        const q = search.toLowerCase();
        const matchesQuery = emp.name.toLowerCase().includes(q) ||
                             emp.id.toLowerCase().includes(q) ||
                             (emp.role && emp.role.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Department filter
      if (department !== 'All' && emp.department !== department) {
        return false;
      }

      // Availability filter
      if (availability !== 'All' && emp.availability !== availability) {
        return false;
      }

      // Skill filter
      if (skill !== 'All') {
        const empSkills = (emp.skills || []).map(s => s.toLowerCase());
        if (!empSkills.includes(skill.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      const ma = metricMap[a.id] || { utilizationPercent: 0, activeTasksCount: 0 };
      const mb = metricMap[b.id] || { utilizationPercent: 0, activeTasksCount: 0 };

      switch (sortBy) {
        case 'workload_desc':
          return mb.utilizationPercent - ma.utilizationPercent;
        case 'workload_asc':
          return ma.utilizationPercent - mb.utilizationPercent;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'tasks_desc':
          return mb.activeTasksCount - ma.activeTasksCount;
        case 'tasks_asc':
          return ma.activeTasksCount - mb.activeTasksCount;
        default:
          return 0;
      }
    });

    return filtered;
  }
};

window.EmployeeManager = EmployeeManager;

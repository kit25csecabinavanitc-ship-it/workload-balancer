/**
 * Workload Balancer — Task Management Module
 * Handles Task CRUD, assignment history, capacity warning checks, and deadline calculations.
 */

const TaskManager = {
  /**
   * Validates task payload
   */
  validate(task, isEdit = false, originalId = null) {
    const errors = [];
    const tasks = window.StorageManager.getTasks();

    // Check ID
    if (!task.id || !task.id.trim()) {
      errors.push("Task ID is required (e.g., TSK-225).");
    } else {
      const trimmedId = task.id.trim().toUpperCase();
      if (!isEdit || (isEdit && trimmedId !== originalId)) {
        const idExists = tasks.some(t => t.id.toUpperCase() === trimmedId);
        if (idExists) {
          errors.push(`Task ID "${trimmedId}" already exists. Duplicate IDs are not allowed.`);
        }
      }
    }

    // Check Title
    if (!task.title || task.title.trim().length < 3) {
      errors.push("Task title must be at least 3 characters long.");
    }

    // Check Effort Hours
    const effort = Number(task.effortHours);
    if (isNaN(effort) || effort <= 0 || effort > 80) {
      errors.push("Estimated effort must be between 1 and 80 hours.");
    }

    // Check Deadline
    if (!task.deadline) {
      errors.push("A target deadline date is required.");
    }

    // Check Priority
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!validPriorities.includes(task.priority)) {
      errors.push("Priority must be Low, Medium, High, or Critical.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Checks whether assigning a task will exceed an employee's capacity
   */
  checkCapacityWarning(employeeId, effortHours, currentTaskId = null) {
    if (!employeeId) return { willOverload: false, excessHours: 0 };

    const employees = window.StorageManager.getEmployees();
    const tasks = window.StorageManager.getTasks();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return { willOverload: false, excessHours: 0 };

    const activeTasks = tasks.filter(t => 
      t.assignedTo === employeeId &&
      t.id !== currentTaskId &&
      (t.status === 'In Progress' || t.status === 'Assigned' || t.status === 'Pending')
    );

    const currentHours = activeTasks.reduce((sum, t) => sum + (Number(t.effortHours) || 0), 0);
    const maxCapacity = Number(emp.maxCapacity) || 40;
    const projected = currentHours + Number(effortHours);

    if (projected > maxCapacity) {
      return {
        willOverload: true,
        currentHours,
        maxCapacity,
        projected,
        excessHours: projected - maxCapacity,
        employeeName: emp.name
      };
    }

    return {
      willOverload: false,
      currentHours,
      maxCapacity,
      projected,
      remainingAfter: maxCapacity - projected,
      employeeName: emp.name
    };
  },

  /**
   * Adds a new task
   */
  addTask(taskData) {
    const validation = this.validate(taskData, false);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const tasks = window.StorageManager.getTasks();
    const history = [];

    let status = taskData.status || (taskData.assignedTo ? 'In Progress' : 'Pending');

    if (taskData.assignedTo) {
      history.push({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        previousEmployeeId: null,
        newEmployeeId: taskData.assignedTo,
        reason: taskData.assignmentReason || 'Initial task creation & assignment.',
        decidedBy: 'Manager'
      });

      // Add to global audit log
      window.StorageManager.addAuditLog({
        taskId: taskData.id.trim().toUpperCase(),
        taskTitle: taskData.title.trim(),
        previousEmployeeId: null,
        newEmployeeId: taskData.assignedTo,
        reason: taskData.assignmentReason || 'Initial task assignment.',
        decidedBy: 'Manager',
        action: 'Assigned'
      });
    }

    const newTask = {
      id: taskData.id.trim().toUpperCase(),
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      skills: Array.isArray(taskData.skills) ? taskData.skills.map(s => s.trim()).filter(Boolean) : [],
      priority: taskData.priority || 'Medium',
      effortHours: Number(taskData.effortHours),
      createdDate: taskData.createdDate || new Date().toISOString().split('T')[0],
      startDate: taskData.startDate || new Date().toISOString().split('T')[0],
      deadline: taskData.deadline,
      status: status,
      assignedTo: taskData.assignedTo || null,
      assignmentHistory: history
    };

    tasks.push(newTask);
    window.StorageManager.saveTasks(tasks);

    if (window.AppController && window.AppController.onDataChanged) {
      window.AppController.onDataChanged();
    }

    return { success: true, task: newTask };
  },

  /**
   * Updates an existing task
   */
  updateTask(id, updatedFields) {
    const tasks = window.StorageManager.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return { success: false, errors: [`Task ${id} not found.`] };
    }

    const currentTask = tasks[index];
    const merged = { ...currentTask, ...updatedFields };
    const validation = this.validate(merged, true, id);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // Check if assignee changed
    if (updatedFields.assignedTo !== undefined && updatedFields.assignedTo !== currentTask.assignedTo) {
      const history = currentTask.assignmentHistory || [];
      const reason = updatedFields.assignmentReason || 'Manager reassignment.';
      history.push({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        previousEmployeeId: currentTask.assignedTo,
        newEmployeeId: updatedFields.assignedTo,
        reason: reason,
        decidedBy: 'Manager'
      });
      merged.assignmentHistory = history;

      window.StorageManager.addAuditLog({
        taskId: id,
        taskTitle: merged.title,
        previousEmployeeId: currentTask.assignedTo,
        newEmployeeId: updatedFields.assignedTo,
        reason: reason,
        decidedBy: 'Manager',
        action: currentTask.assignedTo ? 'Reassigned' : 'Assigned'
      });

      if (updatedFields.assignedTo && merged.status === 'Pending') {
        merged.status = 'In Progress';
      } else if (!updatedFields.assignedTo && merged.status !== 'Completed') {
        merged.status = 'Pending';
      }
    }

    tasks[index] = {
      ...merged,
      id: merged.id.trim().toUpperCase(),
      title: merged.title.trim(),
      effortHours: Number(merged.effortHours),
      skills: Array.isArray(merged.skills) ? merged.skills.map(s => s.trim()).filter(Boolean) : []
    };

    window.StorageManager.saveTasks(tasks);

    if (window.AppController && window.AppController.onDataChanged) {
      window.AppController.onDataChanged();
    }

    return { success: true, task: tasks[index] };
  },

  /**
   * Deletes a task
   */
  deleteTask(id) {
    let tasks = window.StorageManager.getTasks();
    const target = tasks.find(t => t.id === id);
    if (!target) return { success: false };

    tasks = tasks.filter(t => t.id !== id);
    window.StorageManager.saveTasks(tasks);

    window.StorageManager.addAuditLog({
      taskId: id,
      taskTitle: target.title,
      previousEmployeeId: target.assignedTo,
      newEmployeeId: null,
      reason: 'Task deleted by manager.',
      decidedBy: 'Manager',
      action: 'Deleted'
    });

    if (window.AppController && window.AppController.onDataChanged) {
      window.AppController.onDataChanged();
    }

    return { success: true };
  },

  /**
   * Marks a task status directly (e.g. Completed, In Progress)
   */
  setTaskStatus(id, newStatus) {
    const tasks = window.StorageManager.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return { success: false };

    task.status = newStatus;
    window.StorageManager.saveTasks(tasks);

    if (window.AppController && window.AppController.onDataChanged) {
      window.AppController.onDataChanged();
    }

    return { success: true, task };
  },

  /**
   * Helper to format deadline state (e.g. "Overdue by 2d", "Due tomorrow", "Due in 5d")
   */
  getDeadlineInfo(deadline) {
    if (!deadline) return { text: 'No deadline', isOverdue: false, urgency: 'normal' };
    const now = new Date();
    // Normalize to date comparison
    const dlDate = new Date(deadline + 'T23:59:59');
    const diffMs = dlDate.getTime() - now.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (diffMs < 0) {
      const overdueDays = Math.max(1, Math.floor(Math.abs(diffMs) / oneDayMs));
      return {
        text: `Overdue by ${overdueDays}d`,
        isOverdue: true,
        days: -overdueDays,
        urgency: 'overdue'
      };
    } else {
      const days = Math.ceil(diffMs / oneDayMs);
      if (days === 0 || days === 1) {
        return { text: 'Due tomorrow', isOverdue: false, days: 1, urgency: 'urgent' };
      } else if (days <= 3) {
        return { text: `Due in ${days}d`, isOverdue: false, days, urgency: 'warning' };
      } else {
        return { text: `Due in ${days}d`, isOverdue: false, days, urgency: 'normal' };
      }
    }
  },

  /**
   * Filters and sorts tasks list
   */
  filterAndSort(tasks, { search = '', priority = 'All', status = 'All', employeeId = 'All', sortBy = 'deadline_asc' }) {
    const priorityWeights = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };

    let filtered = tasks.filter(task => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchesQuery = task.title.toLowerCase().includes(q) ||
                             task.id.toLowerCase().includes(q) ||
                             (task.description && task.description.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Priority
      if (priority !== 'All' && task.priority !== priority) return false;

      // Status
      if (status !== 'All') {
        if (status === 'Overdue') {
          const dl = this.getDeadlineInfo(task.deadline);
          if (!dl.isOverdue || task.status === 'Completed') return false;
        } else if (task.status !== status) {
          return false;
        }
      }

      // Employee
      if (employeeId !== 'All') {
        if (employeeId === 'Unassigned') {
          if (task.assignedTo) return false;
        } else if (task.assignedTo !== employeeId) {
          return false;
        }
      }

      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'deadline_asc':
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        case 'deadline_desc':
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(b.deadline) - new Date(a.deadline);
        case 'priority_desc':
          return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        case 'priority_asc':
          return (priorityWeights[a.priority] || 0) - (priorityWeights[b.priority] || 0);
        case 'effort_desc':
          return (Number(b.effortHours) || 0) - (Number(a.effortHours) || 0);
        case 'effort_asc':
          return (Number(a.effortHours) || 0) - (Number(b.effortHours) || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }
};

window.TaskManager = TaskManager;

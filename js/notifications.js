/**
 * Workload Balancer — Notification & Deadline Center
 * Monitors task deadlines, employee overload thresholds, unassigned tasks, and skill mismatches.
 */

const NotificationCenter = {
  /**
   * Generates all active alerts based on current system state
   */
  getAlerts(employees, tasks) {
    const alerts = [];
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    // 1. Check Employees exceeding workload capacity
    const metrics = window.AnalyticsEngine ? window.AnalyticsEngine.getEmployeeWorkloadMetrics(employees, tasks) : [];
    metrics.forEach(m => {
      if (m.utilizationPercent > 100) {
        alerts.push({
          id: `alert-overload-${m.employee.id}`,
          category: 'Workload',
          priority: 'Critical',
          title: `Capacity Exceeded: ${m.employee.name}`,
          message: `${m.employee.name} is assigned ${m.assignedHours}h across ${m.activeTasksCount} tasks (${m.utilizationPercent}% of ${m.maxCapacity}h capacity). Overloaded by +${m.overloadHours}h.`,
          timestamp: 'Live Alert',
          relatedId: m.employee.id,
          actionType: 'reassign_employee_tasks',
          actionLabel: 'Rebalance Workload'
        });
      } else if (m.utilizationPercent >= 90) {
        alerts.push({
          id: `alert-near-cap-${m.employee.id}`,
          category: 'Workload',
          priority: 'High',
          title: `Near Capacity: ${m.employee.name}`,
          message: `${m.employee.name} is at ${m.utilizationPercent}% capacity (${m.assignedHours}h / ${m.maxCapacity}h). Only ${m.availableHours}h remaining.`,
          timestamp: 'Live Alert',
          relatedId: m.employee.id,
          actionType: 'view_employee',
          actionLabel: 'View Employee'
        });
      }
    });

    // 2. Check Tasks: Overdue, Due Soon, Unassigned, Skill Mismatches
    tasks.forEach(task => {
      // Unassigned Tasks
      if (!task.assignedTo && task.status !== 'Completed') {
        alerts.push({
          id: `alert-unassigned-${task.id}`,
          category: 'Workload',
          priority: task.priority === 'Critical' ? 'Critical' : 'High',
          title: `Unassigned Task: ${task.title}`,
          message: `Task ${task.id} (${task.effortHours}h, priority ${task.priority}) has no assigned employee. Use Smart Assignment to find the best candidate.`,
          timestamp: task.createdDate || 'Recent',
          relatedId: task.id,
          actionType: 'smart_assign',
          actionLabel: 'Recommend Employee'
        });
      }

      // Deadline checks
      if (task.deadline && task.status !== 'Completed') {
        const deadlineDate = new Date(task.deadline);
        const diffMs = deadlineDate.getTime() - now.getTime();

        if (diffMs < 0) {
          // Overdue
          const overdueDays = Math.ceil(Math.abs(diffMs) / oneDayMs);
          const assigneeName = task.assignedTo && empMap[task.assignedTo] ? empMap[task.assignedTo].name : 'Unassigned';
          alerts.push({
            id: `alert-overdue-${task.id}`,
            category: 'Deadline',
            priority: 'Critical',
            title: `OVERDUE (${overdueDays}d ago): ${task.title}`,
            message: `Task ${task.id} deadline passed on ${task.deadline}. Assigned to: ${assigneeName}. Requires immediate management intervention.`,
            timestamp: `Overdue by ${overdueDays} day(s)`,
            relatedId: task.id,
            actionType: 'view_task',
            actionLabel: 'Inspect Task'
          });
        } else if (diffMs <= oneDayMs) {
          // Due in 24 hours
          const hoursRemaining = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
          const assigneeName = task.assignedTo && empMap[task.assignedTo] ? empMap[task.assignedTo].name : 'Unassigned';
          alerts.push({
            id: `alert-due-24h-${task.id}`,
            category: 'Deadline',
            priority: 'Critical',
            title: `Due in < 24 Hours: ${task.title}`,
            message: `Deadline is tomorrow (${task.deadline}, ~${hoursRemaining}h remaining). Assigned to ${assigneeName}.`,
            timestamp: `Due in ${hoursRemaining}h`,
            relatedId: task.id,
            actionType: 'view_task',
            actionLabel: 'Inspect Task'
          });
        } else if (diffMs <= threeDaysMs) {
          // Due in 3 days
          const daysRemaining = Math.ceil(diffMs / oneDayMs);
          const assigneeName = task.assignedTo && empMap[task.assignedTo] ? empMap[task.assignedTo].name : 'Unassigned';
          alerts.push({
            id: `alert-due-3d-${task.id}`,
            category: 'Deadline',
            priority: 'High',
            title: `Due in ${daysRemaining} Days: ${task.title}`,
            message: `Upcoming deadline on ${task.deadline}. Assigned to ${assigneeName} (${task.effortHours}h estimated effort).`,
            timestamp: `Due in ${daysRemaining}d`,
            relatedId: task.id,
            actionType: 'view_task',
            actionLabel: 'Inspect Task'
          });
        }
      }

      // Skill Mismatch Check on Assigned Tasks
      if (task.assignedTo && empMap[task.assignedTo] && task.skills && task.skills.length > 0 && task.status !== 'Completed') {
        const emp = empMap[task.assignedTo];
        const empSkills = (emp.skills || []).map(s => s.toLowerCase());
        const taskSkills = task.skills.map(s => s.toLowerCase());
        const matched = taskSkills.filter(s => empSkills.includes(s));
        const matchPct = Math.round((matched.length / taskSkills.length) * 100);

        if (matchPct < 50) {
          alerts.push({
            id: `alert-skill-mismatch-${task.id}`,
            category: 'Workload',
            priority: 'Medium',
            title: `Skill Gap Warning: ${task.title}`,
            message: `${emp.name} only matches ${matchPct}% of required skills (${matched.length}/${taskSkills.length}) for task ${task.id}. Consider reassigning to a specialist.`,
            timestamp: 'Skill Gap',
            relatedId: task.id,
            actionType: 'smart_assign',
            actionLabel: 'Find Better Match'
          });
        }
      }
    });

    // Sort alerts: Critical first, then High, then Medium
    const priorityWeights = { 'Critical': 3, 'High': 2, 'Medium': 1, 'Info': 0 };
    alerts.sort((a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]);

    return alerts;
  },

  /**
   * Returns count of high/critical alerts for badge
   */
  getUnresolvedCriticalCount(employees, tasks) {
    const alerts = this.getAlerts(employees, tasks);
    return alerts.filter(a => a.priority === 'Critical' || a.priority === 'High').length;
  }
};

window.NotificationCenter = NotificationCenter;

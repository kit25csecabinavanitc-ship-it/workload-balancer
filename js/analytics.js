/**
 * Workload Balancer — Analytics & Workload Imbalance Engine
 * 
 * IMBALANCE SCORING SPECIFICATION:
 * 1. Average Utilization (%): Sum(utilization) / N
 * 2. Utilization Spread: Max(utilization) - Min(utilization)
 * 3. Standard Deviation (Sigma): Math.sqrt(Sum((utilization - mean)^2) / N)
 * 
 * 4. Overall Workload Balance Score (0 - 100):
 *    A perfectly balanced team has uniform utilization (Sigma -> 0, Spread -> 0).
 *    Realistic enterprise threshold formula:
 *    BalanceScore = Math.round(100 - (Sigma * 1.6 + (MaxSpread * 0.35)))
 *    Clamped between 0 and 100.
 *    (Labelled as an estimate / heuristic metric).
 */

const AnalyticsEngine = {
  // Chart instances
  workloadChartInstance: null,
  taskStatusChartInstance: null,
  deptChartInstance: null,

  /**
   * Calculates comprehensive employee workload metrics
   */
  getEmployeeWorkloadMetrics(employees, tasks) {
    return employees.map(emp => {
      // Find active tasks
      const activeTasks = tasks.filter(t => 
        t.assignedTo === emp.id && 
        (t.status === 'In Progress' || t.status === 'Assigned' || t.status === 'Pending')
      );
      const completedTasks = tasks.filter(t => 
        t.assignedTo === emp.id && t.status === 'Completed'
      );

      const assignedHours = activeTasks.reduce((sum, t) => sum + (Number(t.effortHours) || 0), 0);
      const maxCapacity = Number(emp.maxCapacity) || 40;
      const utilizationPercent = maxCapacity > 0 ? Math.round((assignedHours / maxCapacity) * 100) : 0;
      const availableHours = Math.max(0, maxCapacity - assignedHours);
      const overloadHours = Math.max(0, assignedHours - maxCapacity);

      // Classification
      let status = 'Low';
      let statusColor = 'emerald';
      if (utilizationPercent > 100) {
        status = 'Overloaded';
        statusColor = 'rose';
      } else if (utilizationPercent >= 80) {
        status = 'High';
        statusColor = 'amber';
      } else if (utilizationPercent >= 50) {
        status = 'Balanced';
        statusColor = 'blue';
      }

      // Check upcoming deadlines
      const upcomingTasks = [...activeTasks].sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });

      return {
        employee: emp,
        assignedHours,
        maxCapacity,
        availableHours,
        overloadHours,
        utilizationPercent,
        activeTasksCount: activeTasks.length,
        completedTasksCount: completedTasks.length,
        status,
        statusColor,
        activeTasks,
        upcomingTasks
      };
    });
  },

  /**
   * Analyzes organizational imbalance and generates redistribution suggestions
   */
  analyzeImbalance(employees, tasks) {
    const metrics = this.getEmployeeWorkloadMetrics(employees, tasks);
    if (metrics.length === 0) {
      return {
        balanceScore: 100,
        averageUtilization: 0,
        minUtilization: 0,
        maxUtilization: 0,
        spread: 0,
        stdDev: 0,
        overloaded: [],
        underloaded: [],
        balanced: [],
        redistributionSuggestions: []
      };
    }

    const availableMetrics = metrics.filter(m => m.employee.availability === 'Available');
    const utilizations = (availableMetrics.length > 0 ? availableMetrics : metrics).map(m => m.utilizationPercent);
    const sum = utilizations.reduce((a, b) => a + b, 0);
    const mean = sum / utilizations.length;

    const squareDiffs = utilizations.map(u => Math.pow(u - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / utilizations.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    const minUtilization = Math.min(...utilizations);
    const maxUtilization = Math.max(...utilizations);
    const spread = maxUtilization - minUtilization;

    // Balance score formula
    let rawScore = 100 - (stdDev * 1.6 + spread * 0.35);
    const balanceScore = Math.max(10, Math.min(100, Math.round(rawScore)));

    const overloaded = metrics.filter(m => m.utilizationPercent > 100);
    const highWorkload = metrics.filter(m => m.utilizationPercent >= 80 && m.utilizationPercent <= 100);
    const underloaded = metrics.filter(m => m.utilizationPercent < 50 && m.employee.availability === 'Available');
    const balanced = metrics.filter(m => m.utilizationPercent >= 50 && m.utilizationPercent < 80);

    // Compute concrete redistribution suggestions
    // For each overloaded employee, find their active non-critical or moveable tasks
    // and match them with an underloaded employee who has the required skills and available capacity!
    const redistributionSuggestions = [];

    overloaded.forEach(overloadedMember => {
      // Find candidate tasks to offload
      const moveableTasks = overloadedMember.activeTasks.filter(t => t.status !== 'Completed');
      
      moveableTasks.forEach(task => {
        // Find best underloaded recipient
        const candidates = [];
        underloaded.forEach(receiver => {
          if (receiver.employee.id === overloadedMember.employee.id) return;

          // Check if receiver has capacity for this task
          const taskHours = Number(task.effortHours) || 0;
          if (receiver.availableHours >= taskHours) {
            // Check skill match
            const reqSkills = task.skills || [];
            const empSkills = (receiver.employee.skills || []).map(s => s.toLowerCase());
            let matches = 0;
            reqSkills.forEach(s => {
              if (empSkills.includes(s.toLowerCase())) matches++;
            });

            const skillMatchPct = reqSkills.length > 0 ? Math.round((matches / reqSkills.length) * 100) : 100;
            if (skillMatchPct >= 40) {
              candidates.push({
                receiver,
                skillMatchPct,
                newUtilization: Math.round(((receiver.assignedHours + taskHours) / receiver.maxCapacity) * 100)
              });
            }
          }
        });

        // Pick best candidate
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.skillMatchPct - a.skillMatchPct);
          const best = candidates[0];
          redistributionSuggestions.push({
            taskId: task.id,
            taskTitle: task.title,
            taskEffort: task.effortHours,
            fromEmployee: overloadedMember.employee,
            toEmployee: best.receiver.employee,
            currentFromUtilization: overloadedMember.utilizationPercent,
            projectedFromUtilization: Math.round(((overloadedMember.assignedHours - task.effortHours) / overloadedMember.maxCapacity) * 100),
            currentToUtilization: best.receiver.utilizationPercent,
            projectedToUtilization: best.newUtilization,
            skillMatchPct: best.skillMatchPct,
            reason: `Relieves ${overloadedMember.employee.name} (${overloadedMember.utilizationPercent}%) by moving ${task.effortHours}h to ${best.receiver.employee.name} (has ${best.receiver.availableHours}h spare capacity, ${best.skillMatchPct}% skill match).`
          });
        }
      });
    });

    return {
      balanceScore,
      averageUtilization: Math.round(mean),
      minUtilization,
      maxUtilization,
      spread,
      stdDev: Math.round(stdDev * 10) / 10,
      overloaded,
      highWorkload,
      underloaded,
      balanced,
      redistributionSuggestions: redistributionSuggestions.slice(0, 6)
    };
  },

  /**
   * Renders or refreshes Chart.js Employee Workload Bar Chart
   */
  renderWorkloadBarChart(canvasId, employees, tasks, isDarkMode = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const metrics = this.getEmployeeWorkloadMetrics(employees, tasks);
    // Sort by utilization descending
    metrics.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    const labels = metrics.map(m => m.employee.name.split(' ')[0]);
    const assignedHours = metrics.map(m => m.assignedHours);
    const maxCapacities = metrics.map(m => m.maxCapacity);
    const backgroundColors = metrics.map(m => {
      if (m.utilizationPercent > 100) return 'rgba(239, 68, 68, 0.85)'; // Red
      if (m.utilizationPercent >= 80) return 'rgba(245, 158, 11, 0.85)'; // Amber
      if (m.utilizationPercent >= 50) return 'rgba(59, 130, 246, 0.85)'; // Blue
      return 'rgba(16, 185, 129, 0.85)'; // Emerald
    });

    const textColor = isDarkMode ? '#cbd5e1' : '#475569';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    if (this.workloadChartInstance) {
      this.workloadChartInstance.destroy();
    }

    this.workloadChartInstance = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Assigned Hours',
            data: assignedHours,
            backgroundColor: backgroundColors,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Max Capacity (h)',
            data: maxCapacities,
            type: 'line',
            borderColor: isDarkMode ? '#94a3b8' : '#64748b',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            pointBackgroundColor: isDarkMode ? '#94a3b8' : '#64748b',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, boxWidth: 12, font: { family: 'Inter, sans-serif', size: 12 } }
          },
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const index = context.dataIndex;
                const m = metrics[index];
                return `Utilization: ${m.utilizationPercent}% (${m.status})`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Inter, sans-serif' } }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Inter, sans-serif' } }
          }
        }
      }
    });
  },

  /**
   * Renders or refreshes Chart.js Task Status Doughnut Chart
   */
  renderTaskStatusDoughnut(canvasId, tasks, isDarkMode = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    let pending = 0;
    let assigned = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    const now = new Date();

    tasks.forEach(t => {
      if (t.status === 'Completed') {
        completed++;
      } else {
        if (t.deadline && new Date(t.deadline) < now) {
          overdue++;
        }
        if (t.status === 'In Progress') inProgress++;
        else if (t.status === 'Assigned') assigned++;
        else pending++;
      }
    });

    const textColor = isDarkMode ? '#cbd5e1' : '#475569';

    if (this.taskStatusChartInstance) {
      this.taskStatusChartInstance.destroy();
    }

    this.taskStatusChartInstance = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['In Progress', 'Pending/Assigned', 'Completed', 'Overdue'],
        datasets: [{
          data: [inProgress, (pending + assigned), completed, overdue],
          backgroundColor: [
            '#3b82f6', // In Progress (Blue)
            '#a855f7', // Pending/Assigned (Purple)
            '#10b981', // Completed (Emerald)
            '#ef4444'  // Overdue (Red)
          ],
          borderWidth: 2,
          borderColor: isDarkMode ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, boxWidth: 12, font: { family: 'Inter, sans-serif', size: 12 } }
          }
        },
        cutout: '68%'
      }
    });
  },

  /**
   * Renders Department Workload Comparison
   */
  renderDepartmentChart(canvasId, employees, tasks, isDarkMode = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const deptMap = {};
    employees.forEach(e => {
      const d = e.department || 'Other';
      if (!deptMap[d]) {
        deptMap[d] = { totalAssigned: 0, totalCapacity: 0, count: 0 };
      }
      deptMap[d].totalCapacity += Number(e.maxCapacity) || 40;
      deptMap[d].count += 1;
    });

    const metrics = this.getEmployeeWorkloadMetrics(employees, tasks);
    metrics.forEach(m => {
      const d = m.employee.department || 'Other';
      if (deptMap[d]) {
        deptMap[d].totalAssigned += m.assignedHours;
      }
    });

    const labels = Object.keys(deptMap);
    const avgUtilizations = labels.map(d => {
      const data = deptMap[d];
      return data.totalCapacity > 0 ? Math.round((data.totalAssigned / data.totalCapacity) * 100) : 0;
    });

    const textColor = isDarkMode ? '#cbd5e1' : '#475569';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    if (this.deptChartInstance) {
      this.deptChartInstance.destroy();
    }

    this.deptChartInstance = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Dept Average Utilization (%)',
          data: avgUtilizations,
          backgroundColor: avgUtilizations.map(u => u > 85 ? '#f43f5e' : (u > 65 ? '#6366f1' : '#0ea5e9')),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 120,
            grid: { color: gridColor },
            ticks: { color: textColor, callback: val => `${val}%` }
          },
          y: {
            grid: { display: false },
            ticks: { color: textColor }
          }
        }
      }
    });
  }
};

window.AnalyticsEngine = AnalyticsEngine;

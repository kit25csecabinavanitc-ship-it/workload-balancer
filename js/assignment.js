/**
 * Workload Balancer — Smart Task Assignment Engine
 * 
 * ALGORITHM SPECIFICATION:
 * Calculates suitability of each employee for a given task using a weighted multi-factor model:
 * 
 * 1. Skill Match Score (Default Weight: 40%)
 *    Formula: (Matching Skills Count / Required Skills Count) * 100
 *    If task has no specific required skills, default to 100%.
 *    Captures technical qualification and domain alignment.
 * 
 * 2. Remaining Capacity Score (Default Weight: 30%)
 *    Formula:
 *    projectedHours = currentAssignedHours + taskEffortHours
 *    If projectedHours <= maxCapacity:
 *       remainingHours = maxCapacity - projectedHours
 *       score = (remainingHours / maxCapacity) * 100
 *    If projectedHours > maxCapacity:
 *       score = 0 (Flagged as Overload Risk with excess hours calculated)
 * 
 * 3. Deadline Suitability Score (Default Weight: 20%)
 *    Formula:
 *    Evaluates concurrent deadline clustering.
 *    Base = 100.
 *    For every active task deadline within +/- 2 days (48 hours) of the proposed deadline,
 *    deduct 25 points. Clamped between 10 and 100.
 * 
 * 4. Active Task Count Score (Default Weight: 10%)
 *    Formula: Math.max(0, 100 - (activeTaskCount * 20))
 *    Rewards lower mental fragmentation and minimized context-switching.
 * 
 * Final Match Score:
 *    (SkillScore * W_skill + CapacityScore * W_cap + DeadlineScore * W_dl + ActiveTaskScore * W_act) / 100
 */

const SmartAssignment = {
  /**
   * Evaluates all employees against a task and returns sorted recommendations.
   * 
   * @param {Object} task The task to assign
   * @param {Array} employees All employees
   * @param {Array} allTasks All tasks
   * @param {Object} customWeights Optional weight overrides
   * @param {Boolean} requireAllSkills If true, filters out any employee without 100% skill match
   * @returns {Object} { recommendations: Array, ineligible: Array, summary: Object }
   */
  evaluateEmployeesForTask(task, employees, allTasks, customWeights = null, requireAllSkills = false) {
    const settings = window.StorageManager.getSettings();
    const weights = customWeights || settings.scoringWeights || {
      skillMatch: 40,
      remainingCapacity: 30,
      deadlineSuitability: 20,
      activeTaskCount: 10
    };

    const taskSkills = Array.isArray(task.skills) ? task.skills.map(s => s.trim().toLowerCase()) : [];
    const taskHours = Number(task.effortHours) || 0;
    const taskDeadline = task.deadline ? new Date(task.deadline).getTime() : null;

    const evaluated = [];
    const ineligible = [];

    employees.forEach(employee => {
      // Rule 1: Exclude unavailable employees
      if (employee.availability && employee.availability !== 'Available') {
        ineligible.push({
          employee,
          reason: `Employee status is '${employee.availability}'. Only 'Available' team members can receive automated task allocations.`
        });
        return;
      }

      // Calculate Employee's Current Active Tasks and Assigned Hours
      const activeTasks = allTasks.filter(t => 
        t.assignedTo === employee.id &&
        t.id !== task.id && // exclude the current task if re-evaluating
        (t.status === 'In Progress' || t.status === 'Assigned' || t.status === 'Pending')
      );

      const currentAssignedHours = activeTasks.reduce((sum, t) => sum + (Number(t.effortHours) || 0), 0);
      const maxCapacity = Number(employee.maxCapacity) || 40;
      const currentUtilization = Math.round((currentAssignedHours / maxCapacity) * 100);

      // --- Factor 1: Skill Match (0 - 100) ---
      const empSkills = Array.isArray(employee.skills) ? employee.skills.map(s => s.trim().toLowerCase()) : [];
      let matchedSkills = [];
      let missingSkills = [];

      if (taskSkills.length === 0) {
        matchedSkills = [...employee.skills];
      } else {
        task.skills.forEach(skill => {
          const sLower = skill.trim().toLowerCase();
          if (empSkills.includes(sLower)) {
            matchedSkills.push(skill);
          } else {
            missingSkills.push(skill);
          }
        });
      }

      const skillMatchPercent = taskSkills.length === 0
        ? 100
        : Math.round((matchedSkills.length / taskSkills.length) * 100);

      // Mandatory skill enforcement option
      if (requireAllSkills && taskSkills.length > 0 && skillMatchPercent < 100) {
        ineligible.push({
          employee,
          reason: `Missing mandatory skill requirements: ${missingSkills.join(', ')}.`
        });
        return;
      }

      // --- Factor 2: Remaining Capacity (0 - 100) ---
      const projectedHours = currentAssignedHours + taskHours;
      const projectedUtilization = Math.round((projectedHours / maxCapacity) * 100);
      let capacityScore = 0;
      let willOverload = false;
      let overloadHours = 0;

      if (projectedHours <= maxCapacity) {
        const remainingCapacityHours = maxCapacity - projectedHours;
        capacityScore = Math.round((remainingCapacityHours / maxCapacity) * 100);
      } else {
        willOverload = true;
        overloadHours = projectedHours - maxCapacity;
        capacityScore = 0; // Zero score for over-capacity
      }

      // --- Factor 3: Deadline Suitability (0 - 100) ---
      let deadlineConflicts = [];
      let deadlineScore = 100;

      if (taskDeadline) {
        const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
        activeTasks.forEach(t => {
          if (t.deadline) {
            const tDate = new Date(t.deadline).getTime();
            const diff = Math.abs(tDate - taskDeadline);
            if (diff <= twoDaysMs) {
              deadlineConflicts.push({
                taskId: t.id,
                title: t.title,
                deadline: t.deadline
              });
            }
          }
        });

        // Deduct 25 points per conflicting deadline within 48h
        deadlineScore = Math.max(10, 100 - (deadlineConflicts.length * 25));
      }

      // --- Factor 4: Active Task Count (0 - 100) ---
      const activeCount = activeTasks.length;
      const activeTaskScore = Math.max(0, 100 - (activeCount * 20));

      // --- Composite Weighted Score (0 - 100) ---
      const compositeScore = Math.round(
        (skillMatchPercent * (weights.skillMatch / 100)) +
        (capacityScore * (weights.remainingCapacity / 100)) +
        (deadlineScore * (weights.deadlineSuitability / 100)) +
        (activeTaskScore * (weights.activeTaskCount / 100))
      );

      // Build structured reason and advice
      let primaryReason = '';
      if (skillMatchPercent === 100 && !willOverload) {
        primaryReason = `Strong ${skillMatchPercent}% skill match with ${maxCapacity - projectedHours}h spare capacity.`;
      } else if (willOverload) {
        primaryReason = `High skill suitability (${skillMatchPercent}%), but task exceeds weekly capacity by +${overloadHours}h.`;
      } else if (skillMatchPercent >= 60) {
        primaryReason = `Moderate skill alignment (${skillMatchPercent}%) and comfortable capacity reserve (${maxCapacity - projectedHours}h remaining).`;
      } else {
        primaryReason = `Low skill match (${skillMatchPercent}%), but has ample available hours (${maxCapacity - currentAssignedHours}h).`;
      }

      evaluated.push({
        employee,
        overallScore: Math.max(0, Math.min(100, compositeScore)),
        scores: {
          skillMatch: skillMatchPercent,
          remainingCapacity: capacityScore,
          deadlineSuitability: deadlineScore,
          activeTaskCount: activeTaskScore
        },
        matchedSkills,
        missingSkills,
        currentAssignedHours,
        maxCapacity,
        currentUtilization,
        projectedHours,
        projectedUtilization,
        remainingHoursAfter: Math.max(0, maxCapacity - projectedHours),
        willOverload,
        overloadHours,
        activeTasksCount: activeCount,
        deadlineConflicts,
        primaryReason
      });
    });

    // Sort by overallScore descending, then by remaining hours descending
    evaluated.sort((a, b) => {
      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore;
      }
      return b.remainingHoursAfter - a.remainingHoursAfter;
    });

    const topThree = evaluated.slice(0, 3);

    return {
      topRecommendations: topThree,
      allEvaluated: evaluated,
      ineligible,
      totalEligible: evaluated.length,
      hasViableCandidates: evaluated.some(e => !e.willOverload && e.scores.skillMatch > 0)
    };
  }
};

window.SmartAssignment = SmartAssignment;

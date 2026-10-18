# Workload Balancer — Smart Employee Task Allocation

An enterprise-grade, frontend-only task allocation and workload balancing system that helps engineering leads, product managers, and operations directors distribute tasks fairly and meet deadlines without employee burnout.

---

## 1. Project Overview

In fast-paced modern organizations, task distribution often falls onto a small group of senior employees, resulting in burnout, missed deadlines, and bottlenecks, while other qualified personnel remain underutilized.

**Workload Balancer** provides an automated decision-support engine. When assigning new or backlog tasks, it analyzes candidate skills, current workload capacity, upcoming deadlines, and context-switching overhead to recommend the optimal employee. It detects workload imbalances across departments and suggests actionable redistribution transfers—all while preserving manager authority through an approval and audit trail.

---

## 2. Key Features

- **Executive KPI Dashboard:** Real-time metrics for total employees, active tasks, tasks in progress, completed, pending, overdue, staff at capacity, and an Algorithmic Workload Balance Index (0–100).
- **Interactive Chart.js Visualizations:** Employee workload vs. maximum weekly capacity bar chart, task status doughnut chart, and departmental utilization comparison.
- **Employee Management (CRUD):** Add, edit, delete, and inspect team members. Validates duplicate employee IDs, corporate email formats, weekly capacity limits, and skill sets.
- **Task Management (CRUD):** Create and track tasks with priority levels (Low, Medium, High, Critical), estimated effort hours, target deadlines, days-remaining badges, and capacity overload warnings.
- **Smart Task Allocation Engine:**
  - Evaluates candidates using a 4-factor scoring model:
    - **Skill Match (40%):** Technical qualification and required competence alignment.
    - **Remaining Capacity (30%):** Avoids exceeding weekly capacity.
    - **Deadline Suitability (20%):** Detects clustering deadlines within 48 hours.
    - **Active Task Count (10%):** Mitigates context-switching cognitive penalty.
  - Returns top 3 candidate recommendations with rank badges, score rings, matched vs. missing skills, and detailed recommendation rationales.
- **Workload Imbalance Detection & Redistribution:**
  - Computes team average utilization, max-min spread, and standard deviation ($\sigma$).
  - Proactively recommends concrete task transfers from overloaded personnel (>100%) to underutilized teammates with matching skills and available capacity.
- **Deadline & Surveillance Notification Center:**
  - Live alerts for overdue tasks, tasks due within 24 hours, tasks due within 3 days, overloaded staff, unassigned tasks, and skill gap mismatches.
- **Manager Approval & Permanent Audit Trail:**
  - Requires manager approval before any assignment or reassignment takes effect.
  - Logs previous assignee, new assignee, timestamp, manager notes, and action type into LocalStorage.
- **Reports & Pure JavaScript CSV Exports:**
  - Instant client-side download of CSV spreadsheets for Employee Workloads, Task Statuses, Overdue Reports, and Audit Trails.
- **Settings & Backup:**
  - Adjustable scoring weights with 100% total validation.
  - JSON full state export and import with schema validation.
  - One-click sample demo data restore.
- **Light & Dark Theme Toggle:** Persistent theme switching with accessible contrast.

---

## 3. Technology Stack

- **HTML5:** Semantic document structure, accessible forms, modal dialogs.
- **CSS3:** Custom responsive layout, CSS variables, dark mode elevation, transitions, and progress bar animations.
- **Vanilla JavaScript (ES6+):** Pure browser application logic, state management, recommendation heuristics, and validation.
- **LocalStorage API:** Persistent client-side storage for employees, tasks, audit history, and configuration.
- **Chart.js (v4.4.7):** Responsive bar and doughnut visualizations.
- **Lucide Icons:** Clean UI iconography.

*No backend server or external build tools required. The application executes completely in modern web browsers.*

---

## 4. Project Folder Structure

```
workload-balancer/
├── index.html              # Main application shell with 9 operational views & modals
├── css/
│   └── style.css           # Design system, themes (Light/Dark), cards, and components
├── js/
│   ├── data.js             # Initial sample demo dataset (12 employees, 19 tasks)
│   ├── storage.js          # LocalStorage CRUD, JSON export/import & audit logging
│   ├── assignment.js       # 4-factor smart task assignment scoring algorithm
│   ├── analytics.js        # Workload imbalance detection, balance score & Chart.js
│   ├── notifications.js    # Surveillance center for overdue tasks & overload alerts
│   ├── employees.js        # Employee CRUD, input validation, search & filtering
│   ├── tasks.js            # Task CRUD, capacity warning checks & deadline math
│   └── app.js              # Central controller, navigation, modals, and CSV downloads
└── README.md               # Architecture documentation and execution guide
```

---

## 5. How the Algorithms Work

### A. Smart Task Assignment Scoring Formula

For each available employee and target task:

$$\text{Final Score} = \frac{(S \times W_s) + (C \times W_c) + (D \times W_d) + (T \times W_t)}{100}$$

Where default weights are $W_s = 40, W_c = 30, W_d = 20, W_t = 10$:

1. **Skill Match Score ($S$):**
   $$S = \frac{\text{Count of Matched Required Skills}}{\text{Total Required Skills in Task}} \times 100$$
   *(If task requires 0 specific skills, $S = 100$)*

2. **Remaining Capacity Score ($C$):**
   $$\text{Projected Hours} = \text{Current Assigned Hours} + \text{Task Effort Hours}$$
   - If $\text{Projected Hours} \le \text{Max Capacity}$:
     $$C = \frac{\text{Max Capacity} - \text{Projected Hours}}{\text{Max Capacity}} \times 100$$
   - If $\text{Projected Hours} > \text{Max Capacity}$:
     $C = 0$ *(Flagged as Overload Risk with excess hours)*

3. **Deadline Suitability Score ($D$):**
   $$D = \max(10, 100 - (\text{Conflicting Active Tasks within } \pm 48\text{h} \times 25))$$

4. **Active Task Count Score ($T$):**
   $$T = \max(0, 100 - (\text{Active Task Count} \times 20))$$

---

### B. Workload Imbalance Detection

1. **Employee Utilization ($U_i$):**
   $$U_i = \left(\frac{\text{Assigned Hours}_i}{\text{Max Capacity}_i}\right) \times 100$$

2. **Standard Deviation ($\sigma$):**
   $$\sigma = \sqrt{\frac{1}{N} \sum_{i=1}^N (U_i - \bar{U})^2}$$

3. **Utilization Spread:**
   $$\text{Spread} = \max(U) - \min(U)$$

4. **Overall Workload Balance Score ($0 - 100$):**
   $$\text{Balance Score} = \max\left(10, \min\left(100, \text{round}(100 - (\sigma \times 1.6 + \text{Spread} \times 0.35))\right)\right)$$
   *(Documented as an estimated heuristic fairness indicator).*

---

## 6. How to Run in Visual Studio Code

1. **Open Folder:** Launch VS Code, click **File > Open Folder...**, and select the `workload-balancer` project directory.
2. **Install Live Server Extension:**
   - In VS Code, open the Extensions tab (`Ctrl+Shift+X` or `Cmd+Shift+X`).
   - Search for **Live Server** (by Ritwick Dey) and click **Install**.
3. **Launch the Application:**
   - Right-click `index.html` in the file explorer.
   - Select **"Open with Live Server"** (or click **"Go Live"** in the bottom status bar).
   - Your default browser will open at `http://127.0.0.1:5500/index.html`.
4. **Direct Browser Execution:**
   - Alternatively, double-click `index.html` in your file explorer to open it directly in Google Chrome, Microsoft Edge, Firefox, or Safari.

---

## 7. How to Clear or Reset Demo Data

- Navigate to the **Settings** page via the sidebar.
- Click the red **"Reset Demo Records"** button and confirm the dialog.
- Alternatively, open your browser Developer Tools (`F12`), switch to the **Console** tab, and run:
  ```javascript
  StorageManager.resetToDemo();
  location.reload();
  ```

---

## 8. Current Limitations of a Frontend-Only Implementation

- **Storage Boundary:** Data is persisted in browser `localStorage`. Records do not sync automatically across multiple separate browsers or physical computers unless exported and imported via the JSON backup tool.
- **CDN Dependency:** Loading Chart.js and Lucide Icons requires active internet access when first loading the page.
- **Single-Manager Session:** Does not implement multi-user role-based authentication (RBAC); all users interact with the management role.

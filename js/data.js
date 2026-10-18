/**
 * Workload Balancer — Smart Employee Task Allocation
 * Initial Sample Demo Data & Default Configuration
 */

const InitialData = {
  settings: {
    orgName: "Acme Cloud Dynamics",
    defaultCapacityHours: 40,
    thresholds: {
      low: 50,      // 0 - 49%
      balanced: 80, // 50 - 79%
      high: 100     // 80 - 100%, >100% is Overloaded
    },
    scoringWeights: {
      skillMatch: 40,
      remainingCapacity: 30,
      deadlineSuitability: 20,
      activeTaskCount: 10
    },
    theme: "light",
    isDemoData: true
  },

  employees: [
    {
      id: "EMP-101",
      name: "Marcus Vance",
      email: "marcus.vance@acmecloud.com",
      department: "Engineering",
      role: "Senior Full-Stack Engineer",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker", "API Design"],
      maxCapacity: 40,
      availability: "Available", // Available, On Leave, Busy
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-102",
      name: "Sarah Jenkins",
      email: "sarah.jenkins@acmecloud.com",
      department: "Engineering",
      role: "Lead Frontend Architect",
      skills: ["React", "TypeScript", "CSS3", "UI/UX", "Next.js", "Performance"],
      maxCapacity: 40,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-103",
      name: "David Chen",
      email: "david.chen@acmecloud.com",
      department: "Engineering",
      role: "Backend Systems Developer",
      skills: ["Python", "Node.js", "PostgreSQL", "Redis", "API Design", "Microservices"],
      maxCapacity: 40,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-104",
      name: "Elena Rostova",
      email: "elena.rostova@acmecloud.com",
      department: "Engineering",
      role: "DevOps & Cloud Engineer",
      skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Security"],
      maxCapacity: 35,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-105",
      name: "Amara Patel",
      email: "amara.patel@acmecloud.com",
      department: "Design",
      role: "Senior UI/UX Designer",
      skills: ["UI/UX", "Figma", "Design Systems", "Wireframing", "CSS3", "User Research"],
      maxCapacity: 35,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-106",
      name: "Carlos Mendez",
      email: "carlos.mendez@acmecloud.com",
      department: "Design",
      role: "Product Designer",
      skills: ["UI/UX", "Figma", "User Research", "Prototyping", "Design Systems"],
      maxCapacity: 35,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-107",
      name: "Sophia Wang",
      email: "sophia.wang@acmecloud.com",
      department: "Quality Assurance",
      role: "Senior QA Automation Engineer",
      skills: ["Test Automation", "Cypress", "Jest", "API Testing", "Python", "CI/CD"],
      maxCapacity: 40,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-108",
      name: "Liam O'Connor",
      email: "liam.oconnor@acmecloud.com",
      department: "Quality Assurance",
      role: "Security & Manual QA Specialist",
      skills: ["Manual Testing", "Security Testing", "API Testing", "Jira", "Compliance"],
      maxCapacity: 35,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-109",
      name: "Maya Lin",
      email: "maya.lin@acmecloud.com",
      department: "Product Management",
      role: "Technical Product Manager",
      skills: ["Agile", "Product Roadmap", "User Stories", "Data Analysis", "API Design"],
      maxCapacity: 40,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-110",
      name: "Tariq Al-Mansoor",
      email: "tariq.mansoor@acmecloud.com",
      department: "Engineering",
      role: "Data & ETL Engineer",
      skills: ["Python", "PostgreSQL", "Redis", "Data Analysis", "Docker", "ETL"],
      maxCapacity: 40,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-111",
      name: "Rachel Green",
      email: "rachel.green@acmecloud.com",
      department: "Marketing",
      role: "Growth & Product Marketing Lead",
      skills: ["SEO", "Content Strategy", "Copywriting", "Data Analysis", "Agile"],
      maxCapacity: 30,
      availability: "On Leave",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80"
    },
    {
      id: "EMP-112",
      name: "James Wilson",
      email: "james.wilson@acmecloud.com",
      department: "Engineering",
      role: "Junior Software Engineer",
      skills: ["React", "JavaScript", "HTML5", "CSS3", "Git", "Jest"],
      maxCapacity: 40,
      availability: "Available",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80"
    }
  ],

  tasks: [
    {
      id: "TSK-201",
      title: "Resolve Redis Session Cache Invalidation",
      description: "Fix race condition during distributed Redis session eviction that leads to sporadic 401 unauthenticated errors for enterprise SSO users.",
      skills: ["Redis", "Node.js", "API Design"],
      priority: "Critical",
      effortHours: 16,
      createdDate: "2026-10-10",
      startDate: "2026-10-11",
      deadline: "2026-10-16", // OVERDUE relative to 2026-10-18
      status: "In Progress",
      assignedTo: "EMP-101", // Marcus Vance (Contributes to Marcus being Overloaded)
      assignmentHistory: [
        {
          timestamp: "2026-10-11 09:30",
          previousEmployeeId: null,
          newEmployeeId: "EMP-101",
          reason: "Initial assignment based on distributed cache expertise.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-202",
      title: "OAuth 2.0 Token Expiry & Refresh Bug",
      description: "Implement automated silent token rotation before JWT expiry to prevent session drops during active user workflows.",
      skills: ["Node.js", "PostgreSQL", "Security"],
      priority: "High",
      effortHours: 14,
      createdDate: "2026-10-12",
      startDate: "2026-10-14",
      deadline: "2026-10-19", // Due within 24 hours
      status: "In Progress",
      assignedTo: "EMP-101", // Marcus Vance
      assignmentHistory: [
        {
          timestamp: "2026-10-14 10:15",
          previousEmployeeId: null,
          newEmployeeId: "EMP-101",
          reason: "Assigned for high-priority auth pipeline maintenance.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-203",
      title: "PostgreSQL Connection Pool Leak Investigation",
      description: "Profile database connection lifecycle under high concurrent load; patch orphan client leaks in transaction rollback handler.",
      skills: ["PostgreSQL", "Node.js", "Docker"],
      priority: "High",
      effortHours: 14,
      createdDate: "2026-10-13",
      startDate: "2026-10-15",
      deadline: "2026-10-21",
      status: "In Progress",
      assignedTo: "EMP-101", // Marcus Vance -> Total 16 + 14 + 14 = 44h on a 40h capacity (110% Overloaded!)
      assignmentHistory: [
        {
          timestamp: "2026-10-15 14:00",
          previousEmployeeId: null,
          newEmployeeId: "EMP-101",
          reason: "Urgent bug fix assigned directly to senior developer.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-204",
      title: "Design System Dark Theme Elevation Tokens",
      description: "Audit existing Tailwind semantic tokens and establish hierarchical shadow and border contrast for dark mode parity.",
      skills: ["UI/UX", "Figma", "Design Systems", "CSS3"],
      priority: "Medium",
      effortHours: 18,
      createdDate: "2026-10-14",
      startDate: "2026-10-15",
      deadline: "2026-10-20", // Due in 2 days
      status: "In Progress",
      assignedTo: "EMP-105", // Amara Patel (Design) - 18h
      assignmentHistory: [
        {
          timestamp: "2026-10-15 11:20",
          previousEmployeeId: null,
          newEmployeeId: "EMP-105",
          reason: "Assigned to lead design systems specialist.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-205",
      title: "Checkout Flow Usability & Accessibility Audit",
      description: "Run WCAG 2.1 AA accessibility checks and user testing interviews on the upgraded three-step payment modal.",
      skills: ["UI/UX", "User Research", "Wireframing"],
      priority: "Low",
      effortHours: 10,
      createdDate: "2026-10-15",
      startDate: "2026-10-16",
      deadline: "2026-10-24",
      status: "In Progress",
      assignedTo: "EMP-105", // Amara Patel -> 18 + 10 = 28h (80% utilization)
      assignmentHistory: [
        {
          timestamp: "2026-10-16 09:00",
          previousEmployeeId: null,
          newEmployeeId: "EMP-105",
          reason: "Assigned for accessibility UX compliance.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-206",
      title: "Interactive Analytics Dashboard Chart Polish",
      description: "Optimize Chart.js canvas rendering, smooth animations, and zero-flicker dataset switching for the executive view.",
      skills: ["React", "TypeScript", "Performance", "CSS3"],
      priority: "Medium",
      effortHours: 20,
      createdDate: "2026-10-12",
      startDate: "2026-10-13",
      deadline: "2026-10-20", // Due in 2 days
      status: "In Progress",
      assignedTo: "EMP-102", // Sarah Jenkins - 20h
      assignmentHistory: [
        {
          timestamp: "2026-10-13 13:00",
          previousEmployeeId: null,
          newEmployeeId: "EMP-102",
          reason: "Frontend architecture specialty.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-207",
      title: "Core Web Vitals LCP & CLS Optimization",
      description: "Preload critical hero fonts, defer non-essential analytical scripts, and stabilize responsive aspect-ratios.",
      skills: ["Performance", "React", "Next.js"],
      priority: "Medium",
      effortHours: 14,
      createdDate: "2026-10-14",
      startDate: "2026-10-15",
      deadline: "2026-10-23",
      status: "In Progress",
      assignedTo: "EMP-102", // Sarah Jenkins -> 20 + 14 = 34h (85% utilization)
      assignmentHistory: [
        {
          timestamp: "2026-10-15 15:30",
          previousEmployeeId: null,
          newEmployeeId: "EMP-102",
          reason: "Performance engineering task.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-208",
      title: "REST API Microservice Rate Limiter",
      description: "Implement distributed sliding-window rate limiter using Redis sorted sets for public webhook consumption.",
      skills: ["Python", "Redis", "API Design", "Microservices"],
      priority: "High",
      effortHours: 22,
      createdDate: "2026-10-11",
      startDate: "2026-10-12",
      deadline: "2026-10-22",
      status: "In Progress",
      assignedTo: "EMP-103", // David Chen -> 22h (55% utilization)
      assignmentHistory: [
        {
          timestamp: "2026-10-12 11:00",
          previousEmployeeId: null,
          newEmployeeId: "EMP-103",
          reason: "Backend microservice core feature.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-209",
      title: "Kubernetes Cluster Node Pool Auto-scaler Tuning",
      description: "Configure horizontal pod autoscaling metrics and target utilization thresholds for seasonal traffic spikes.",
      skills: ["Kubernetes", "AWS", "Terraform", "Docker"],
      priority: "Medium",
      effortHours: 20,
      createdDate: "2026-10-13",
      startDate: "2026-10-14",
      deadline: "2026-10-24",
      status: "In Progress",
      assignedTo: "EMP-104", // Elena Rostova -> 20h (57% utilization)
      assignmentHistory: [
        {
          timestamp: "2026-10-14 10:00",
          previousEmployeeId: null,
          newEmployeeId: "EMP-104",
          reason: "DevOps infrastructure optimization.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-210",
      title: "Automate E2E Regression Suite for Billing",
      description: "Build robust Cypress test specifications for multi-currency invoicing, credit card chargebacks, and refund triggers.",
      skills: ["Test Automation", "Cypress", "API Testing"],
      priority: "High",
      effortHours: 26,
      createdDate: "2026-10-10",
      startDate: "2026-10-12",
      deadline: "2026-10-21",
      status: "In Progress",
      assignedTo: "EMP-107", // Sophia Wang -> 26h (65% utilization)
      assignmentHistory: [
        {
          timestamp: "2026-10-12 14:00",
          previousEmployeeId: null,
          newEmployeeId: "EMP-107",
          reason: "QA automated testing priority.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-211",
      title: "Penetration Testing & Header Security Audit",
      description: "Audit CSP headers, XSS prevention, CORS origins, and OWASP Top 10 vulnerabilities across customer facing endpoints.",
      skills: ["Security Testing", "Manual Testing", "Compliance"],
      priority: "Medium",
      effortHours: 10,
      createdDate: "2026-10-15",
      startDate: "2026-10-16",
      deadline: "2026-10-26",
      status: "In Progress",
      assignedTo: "EMP-108", // Liam O'Connor -> 10h (28% utilization, spare capacity)
      assignmentHistory: [
        {
          timestamp: "2026-10-16 11:30",
          previousEmployeeId: null,
          newEmployeeId: "EMP-108",
          reason: "Security inspection assigned.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-212",
      title: "Q4 Feature Roadmap & User Story Refinement",
      description: "Break down executive milestones into sprint epics, acceptance criteria, and estimation worksheets with tech leads.",
      skills: ["Agile", "Product Roadmap", "User Stories"],
      priority: "Medium",
      effortHours: 25,
      createdDate: "2026-10-12",
      startDate: "2026-10-13",
      deadline: "2026-10-23",
      status: "In Progress",
      assignedTo: "EMP-109", // Maya Lin -> 25h (62% utilization)
      assignmentHistory: [
        {
          timestamp: "2026-10-13 09:30",
          previousEmployeeId: null,
          newEmployeeId: "EMP-109",
          reason: "Quarterly product roadmap planning.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-213",
      title: "High-Volume Real-Time Clickstream ETL Pipeline",
      description: "Architect Python data ingestion pipeline streaming click events into normalized PostgreSQL warehouse tables.",
      skills: ["Python", "PostgreSQL", "ETL", "Data Analysis"],
      priority: "High",
      effortHours: 38,
      createdDate: "2026-10-09",
      startDate: "2026-10-10",
      deadline: "2026-10-22",
      status: "In Progress",
      assignedTo: "EMP-110", // Tariq Al-Mansoor -> 38h (95% utilization, high workload)
      assignmentHistory: [
        {
          timestamp: "2026-10-10 10:00",
          previousEmployeeId: null,
          newEmployeeId: "EMP-110",
          reason: "Data pipeline infrastructure project.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-214",
      title: "Button Component Library Unit Test Coverage",
      description: "Write comprehensive unit tests for icon buttons, state transitions, and keyboard focus traps using Jest.",
      skills: ["React", "JavaScript", "Jest"],
      priority: "Low",
      effortHours: 8,
      createdDate: "2026-10-16",
      startDate: "2026-10-17",
      deadline: "2026-10-25",
      status: "In Progress",
      assignedTo: "EMP-112", // James Wilson -> 8h (20% utilization, high availability!)
      assignmentHistory: [
        {
          timestamp: "2026-10-17 09:00",
          previousEmployeeId: null,
          newEmployeeId: "EMP-112",
          reason: "Foundational component testing assigned to junior engineer.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-215",
      title: "Design Mobile Navigation Drawer & Gestures",
      description: "Prototype bottom sheet sliding gestures and navigation hierarchy for small screen viewports in Figma.",
      skills: ["UI/UX", "Figma", "Prototyping"],
      priority: "Medium",
      effortHours: 14,
      createdDate: "2026-10-14",
      startDate: "2026-10-15",
      deadline: "2026-10-25",
      status: "In Progress",
      assignedTo: "EMP-106", // Carlos Mendez -> 14h (40% utilization, spare capacity)
      assignmentHistory: [
        {
          timestamp: "2026-10-15 13:45",
          previousEmployeeId: null,
          newEmployeeId: "EMP-106",
          reason: "Mobile UX prototyping assigned.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-216",
      title: "Migrate Auth Middleware to v2 Token Standards",
      description: "Upgraded legacy session check middleware to asynchronous bearer token verification with zero downtime.",
      skills: ["Node.js", "TypeScript", "API Design"],
      priority: "High",
      effortHours: 16,
      createdDate: "2026-10-01",
      startDate: "2026-10-02",
      deadline: "2026-10-08",
      status: "Completed",
      assignedTo: "EMP-103", // David Chen
      assignmentHistory: [
        {
          timestamp: "2026-10-02 09:00",
          previousEmployeeId: null,
          newEmployeeId: "EMP-103",
          reason: "Sprint 14 deliverable.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-217",
      title: "Setup Sentry Distributed Error Monitoring",
      description: "Integrated Sentry release tracking and source maps generation into the GitHub Actions CI pipeline.",
      skills: ["CI/CD", "AWS", "Docker"],
      priority: "Medium",
      effortHours: 12,
      createdDate: "2026-10-03",
      startDate: "2026-10-04",
      deadline: "2026-10-10",
      status: "Completed",
      assignedTo: "EMP-104", // Elena Rostova
      assignmentHistory: [
        {
          timestamp: "2026-10-04 10:30",
          previousEmployeeId: null,
          newEmployeeId: "EMP-104",
          reason: "Observability stack rollout.",
          decidedBy: "Manager"
        }
      ]
    },
    {
      id: "TSK-218",
      title: "Implement Real-Time WebSocket Notification Dispatcher",
      description: "Create an event-driven worker to push notifications to active browser clients with fallback polling.",
      skills: ["Node.js", "Redis", "TypeScript", "API Design"],
      priority: "High",
      effortHours: 16,
      createdDate: "2026-10-17",
      startDate: null,
      deadline: "2026-10-27",
      status: "Pending", // Unassigned! Perfect for Smart Task Allocation demo
      assignedTo: null,
      assignmentHistory: []
    },
    {
      id: "TSK-219",
      title: "User Onboarding Experience Revamp & Empty States",
      description: "Design and implement intuitive empty states, guided tooltips, and interactive walkthroughs for first-time account signups.",
      skills: ["UI/UX", "React", "CSS3", "Design Systems"],
      priority: "Medium",
      effortHours: 12,
      createdDate: "2026-10-17",
      startDate: null,
      deadline: "2026-10-28",
      status: "Pending", // Unassigned!
      assignedTo: null,
      assignmentHistory: []
    }
  ]
};

// Expose globally
window.InitialData = InitialData;

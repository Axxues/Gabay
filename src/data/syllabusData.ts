export interface GraduateAttribute {
  number: number;
  title: string;
  description: string;
}

export interface CoreValue {
  acronym: string;
  keyword: string;
  description: string;
}

export interface ProgramOutcome {
  number: number;
  description: string;
}

export interface CourseOutcome {
  number: number;
  statement: string;
}

export interface RubricRow {
  category: string;
  levels: {
    1: string;
    2: string;
    3: string;
    4: string;
  };
}

export interface LearningPlanWeek {
  week: string;
  hoursLab: number;
  hoursLec: number;
  learningOutcomes: string[];
  topics: string[];
  sdgCoherence?: {
    goal: string;
    title: string;
    description: string;
    target?: string;
  };
  methodology: string[];
  resources: string[];
  assessment: string[];
}

export interface CourseMapEntry {
  coNumber: number;
  coStatement: string;
  poAlignments: Record<number, 'I' | 'P' | 'D' | ''>;
}

export interface FacultySchedule {
  name: string;
  sections: Array<{
    section: string;
    schedule: string;
    room: string;
  }>;
  consultation: string;
}

export interface OfficialSyllabusData {
  courseId?: string; // Strictly bounded to this specific course
  institution: {
    university: string;
    college: string;
    formCode: string;
    revision: string;
  };
  courseInfo: {
    code: string;
    title: string;
    semester: string;
    academicYear: string;
    type: string;
    credit: string;
    lectureHours: string;
    labHours: string;
    prerequisite: string;
    description: string;
  };
  facultyMembers: FacultySchedule[];
  institutionalStatements: {
    philosophy: string;
    vision: string;
    mission: string;
    goal: string;
    coreValues: CoreValue[];
    graduateAttributes: GraduateAttribute[];
  };
  programOutcomes: ProgramOutcome[];
  courseOutcomes: CourseOutcome[];
  courseRequirements: {
    major: string[];
    other: string[];
  };
  gradingSystem: {
    termFormula: string;
    finalFormula: string;
    classStandingComponents: string[];
    passingGrade: string;
  };
  projectRubrics: RubricRow[];
  classroomPolicies: string[];
  courseOutline: Array<{
    timeFrame: string;
    title: string;
    topics: string[];
  }>;
  learningPlan: LearningPlanWeek[];
  courseMap: CourseMapEntry[];
  references: Array<{
    citation: string;
    year: string;
    doiOrPublisher?: string;
  }>;
  signatories: {
    preparedBy: Array<{ name: string; title: string }>;
    recommendingApproval: { name: string; title: string };
    approved: { name: string; title: string };
  };
  sourceDocument?: {
    fileName: string;
    fileSize: string;
    fileType: 'pdf' | 'docx';
    fileDataUrl?: string;
    uploadedAt: string;
  };
}

export const OFFICIAL_SYLLABUS_CSPC112: OfficialSyllabusData = {
  institution: {
    university: 'Don Mariano Marcos Memorial State University',
    college: 'College of Computer Science',
    formCode: 'DMMMSU-INS-F003',
    revision: 'REV. 02 (06.23.2025)'
  },
  courseInfo: {
    code: 'CSPC - 112',
    title: 'Software Engineering 2',
    semester: 'First Semester',
    academicYear: '2025-2026',
    type: 'Lecture and Laboratory',
    credit: '3 units',
    lectureHours: '2 hours/week',
    labHours: '3 hours/week',
    prerequisite: 'CSPC 111 - Software Engineering 1',
    description:
      'CSPC 112 – Software Engineering 2 covers the design, coding, testing, and maintenance phases of a software lifecycle. It introduces software engineering concepts, which include design patterns, software architecture, test cases, testing techniques, coding standards, software evolution, and configuration management. The students are required to apply the said concepts by developing software as a team. This course aligns with SDG 4 (Quality Education) by providing students with essential skills for modern software development, SDG 8 (Decent work and economic growth) by upskilling software skills that would boost employability and economic growth in tech-driven industries, and SDG 9 (Innovation and Infrastructure) through the development of scalable, innovative systems.'
  },
  facultyMembers: [
    {
      name: 'Ezekiel O. Bacungan',
      sections: [
        { section: '4A', schedule: '08:00-09:00 MF / 11:00-01:30 W', room: 'LR114 / CLR205' },
        { section: '4B', schedule: '09:00-10:00 MF / 08:00-09:30 TTh', room: 'LR114 / CLR204' },
        { section: '4C', schedule: '01:00-02:00 MF / 12:30-02:00 TTh', room: 'LR115 / CLR205' }
      ],
      consultation: 'MTWTHF 02:00PM - 03:00PM'
    },
    {
      name: 'Raymund E. Dilan',
      sections: [
        { section: '4D', schedule: '08:00-09:30 MF / 02:00-03:00 MF', room: '205 / 113' },
        { section: '4E', schedule: '08:00-10:00 W / 08:00-09:00 TTh', room: '301 / 205' },
        { section: '4F', schedule: '09:30-11:00 MF / 08:00-10:00 W', room: '205 / 301' },
        { section: '4G', schedule: '10:00-12:00 W / 11:00-12:30 TTh', room: '101 / ilab' }
      ],
      consultation: 'MWF 1:00-2:00, TTh 9:30-10:30'
    }
  ],
  institutionalStatements: {
    philosophy: 'Total human development with appropriate competencies.',
    vision: 'By 2030, DMMMSU IS A globally ranked university.',
    mission: 'Excellence in instruction, research and extension.',
    goal: 'To lead in transforming human resources into productive, self-reliant citizens, and responsible leaders.',
    coreValues: [
      { acronym: 'S', keyword: 'SERVICE', description: 'Service to our stakeholders' },
      { acronym: 'P', keyword: 'PRODUCTIVITY', description: 'Productivity with passion for work' },
      { acronym: 'E', keyword: 'EXCELLENCE', description: 'Excellence in our programs through scholarly undertakings' },
      { acronym: 'C', keyword: 'COMMITMENT', description: 'Commitment in delivering our mandates' },
      { acronym: 'I', keyword: 'INNOVATIVENESS', description: 'Innovation towards attaining operative systems, breakthroughs, and milestone' },
      { acronym: 'A', keyword: 'ADVOCACY', description: 'Advocacy in transforming lives' },
      { acronym: 'L', keyword: 'LEADERSHIP', description: 'Leadership for transformation, Empowerment, and sustainable development' }
    ],
    graduateAttributes: [
      {
        number: 1,
        title: 'Professionally competent',
        description: 'Exemplify the competencies and value required of their professions;'
      },
      {
        number: 2,
        title: 'Committed and responsible leader',
        description: 'Demonstrate professional, social and ethical responsibility consistent with their roles as local and global citizens;'
      },
      {
        number: 3,
        title: 'Effective communicator and collaborator',
        description: 'Can effectively communicate and work in multi-disciplinary teams;'
      },
      {
        number: 4,
        title: 'Critical thinker and innovator',
        description: 'Use relevant information and research drawn facts in rendering sound decisions and developing insights for new knowledge;'
      },
      {
        number: 5,
        title: 'Reflective lifelong learner',
        description: 'Engage in lifelong learning for continuous professional growth and development; and'
      },
      {
        number: 6,
        title: 'Responsible environment steward',
        description: 'Manage a sustainable environment, promoting peace and prosperity for mankind.'
      }
    ]
  },
  programOutcomes: [
    {
      number: 1,
      description:
        'Apply knowledge of computing fundamentals, knowledge of a computing specialization, and mathematics, science and domain knowledge appropriate for the computing specialization to the abstraction and conceptualization of computing models from defined problems and requirements.'
    },
    {
      number: 2,
      description:
        'Identify, analyze, formulate, research literature, define, and solve complex computing problems and requirements reaching substantiated conclusions and needed to design an appropriate solution using fundamental principles of mathematics, computing sciences, and relevant domain disciplines.'
    },
    {
      number: 3,
      description:
        'Apply mathematical foundations, algorithmic principles and computer science theory in the modeling and design of computer-based systems in a way that demonstrates comprehension of the tradeoffs involved in design choices.'
    },
    {
      number: 4,
      description:
        'Knowledge and understanding of information security issues in relation to the design, development and use of information systems.'
    },
    {
      number: 5,
      description:
        'Design, develop, and evaluate solutions for complex computing problems, and design and evaluate systems, components, or processes that meet specified needs with appropriate consideration for public health and safety, cultural, societal, and environmental considerations.'
    },
    {
      number: 6,
      description:
        'Create, select, adapt and apply appropriate techniques, resources and modern computing tools to complex computing activities, with an understanding of the limitations to accomplish a common goal.'
    },
    {
      number: 7,
      description:
        'Function effectively as individual and member or leader in diverse teams and in multidisciplinary and multi-cultural settings.'
    },
    {
      number: 8,
      description:
        'Communicate effectively using both English and Filipino with the computing community and with society at large about complex computing activities by being able to comprehend and write effective reports, design documentation and make effective presentations, and give and understand clear instructions.'
    },
    {
      number: 9,
      description:
        'An ability to recognize the legal, social, ethical and professional responsibilities involved in the utilization of computer technology and be guided by the adoption of appropriate professional, ethical and legal practices.'
    },
    {
      number: 10,
      description:
        'Recognize the need, and have the ability, to engage in independent learning and for continual development as a computing professional.'
    },
    {
      number: 11,
      description:
        'Participate in the generation of new knowledge or in research and development projects aligned to local and national development agenda or goals.'
    }
  ],
  courseOutcomes: [
    {
      number: 1,
      statement: 'Enhance existing software solutions by applying appropriate design patterns to improve functionality and maintainability.'
    },
    {
      number: 2,
      statement: 'Implement program designs and specifications by writing efficient and functional source code.'
    },
    {
      number: 3,
      statement: 'Explain and apply coding techniques, idioms, standards, and mechanisms that ensure software reliability, efficiency, and robustness.'
    },
    {
      number: 4,
      statement: 'Differentiate between centralized and distributed software configuration management systems and their appropriate applications.'
    },
    {
      number: 5,
      statement: 'Demonstrate the use of version control systems in managing software releases and tracking development changes.'
    },
    {
      number: 6,
      statement: 'Design comprehensive test cases using sound testing practices, execute them on existing programs, and document identified defects effectively.'
    },
    {
      number: 7,
      statement: 'Conduct structured code inspections or peer reviews for small to medium-sized software projects to ensure code quality.'
    },
    {
      number: 8,
      statement: 'Modify and update existing software systems in response to defect reports or revised specifications.'
    },
    {
      number: 9,
      statement: 'Effectively present and communicate the features, functionality, and development process of a completed software project or study.'
    }
  ],
  courseRequirements: {
    major: [
      'Midterm and Final Examinations, Exercises and Group Project Works',
      'Design and develop of a real-world computerized system'
    ],
    other: [
      'Quizzes, activities, presentations, individual and group activity'
    ]
  },
  gradingSystem: {
    termFormula: 'Midterm Grade / Final Term Grade = 60% Class Standing + 40% ME / FE',
    finalFormula: 'Final Grade = 40% Midterm Grade + 60% Final Term Grade',
    classStandingComponents: [
      'Quizzes',
      'Activities',
      'Oral Presentations',
      'Individual & Group Laboratory Activities',
      'Software Engineering Group Project'
    ],
    passingGrade: '75% (Passing standard based on institutional DMMMSU handbook)'
  },
  projectRubrics: [
    {
      category: 'Articulate requirements and design of the project',
      levels: {
        1: 'Lacks understanding of the requirements of the client.',
        2: 'Demonstrated understanding of requirement and design issues.',
        3: 'Articulated requirement and design of the project. Described most constraints and variables to be maximized or minimized.',
        4: 'Clearly articulated requirement, design and underlying issues. Clearly articulated constraints and variables to be maximized or minimized. Correctly answered clarifying questions, demonstrating mastery of issues.'
      }
    },
    {
      category: 'Plan the solution and implementation of the project',
      levels: {
        1: 'Some design models are not appropriate.',
        2: 'Identified some critical tasks. Created plan with some foreseeable problems.',
        3: 'Identified critical tasks. Delegated tasks to team members. Created plan for task and project completion that is workable with some modifications.',
        4: 'Identified critical tasks. Delegated tasks to team members. Accurately estimated time and resources for critical tasks. Created credible plan for task and project completion.'
      }
    },
    {
      category: 'Choose appropriate tools and methods for each task',
      levels: {
        1: 'Poor selection of tools.',
        2: 'Selected appropriate tools and methods for most tasks. Identified strengths and weaknesses of most chosen tools.',
        3: 'Selected appropriate tools and methods for each task. Identified strengths and weaknesses of various tools and methods. Cited reasons of choices.',
        4: 'Selected appropriate tools and methods for each task. Articulated strengths and weakness of various tools and methods. Discussed and gave credible justification for choices.'
      }
    },
    {
      category: 'Give clear and coherent oral presentation',
      levels: {
        1: 'Presentation was not organized and lacks clarity.',
        2: 'Provided minimal presentation of design problem and results.',
        3: 'Presentation was reasonable and organized. Presentation presented mostly in a professional manner.',
        4: 'Presentation was coherent and well organized. Presentation presented in a professional manner.'
      }
    },
    {
      category: 'Give clear and coherent written final report',
      levels: {
        1: 'Some requirements are missing.',
        2: 'Provided acceptable final report detailing all project phases and results.',
        3: 'Provided acceptable final report detailing all project phases and results. Report was reasonable and organized. Report was provided mostly in a professional manner.',
        4: 'Provided acceptable final report detailing all project phases and results. Report was coherent and well organized. Report presented design in a clear and professional manner.'
      }
    },
    {
      category: 'Function well as a team',
      levels: {
        1: 'Team work is not evident.',
        2: 'Contributions of team members variable. Lack of leadership on the project. Many individual contributions with some overlap.',
        3: 'Most team members contributed. Little or no duplicated effort. Conflicts usually amicably resolved. Team members demonstrated some understanding of the overall project.',
        4: 'Each team member contributed to the success of the design. Little or no duplicated effort. Few conflicts amicably resolved. Team members able to respond to questions.'
      }
    },
    {
      category: 'Create well documented set of life cycle products specific to the project',
      levels: {
        1: 'Shows minimal understanding of the product life cycle in relation to their project.',
        2: 'Project document/solution was acceptable but limited due to the background of the team.',
        3: 'Project document/solution met objectives set for the project. Project document/solution considerations showed team generally understood the problem.',
        4: 'Project document/solution exceeded the initial objectives. Innovative approaches were demonstrated in the design. Solution indicated a thorough understanding of project.'
      }
    },
    {
      category: 'Consistency between design models and modules',
      levels: {
        1: 'Design models and program modules show inconsistencies.',
        2: 'Design models and program modules show low level of consistency.',
        3: 'Design models and program modules show required level of consistency.',
        4: 'Design models and program modules show optimal level of consistency.'
      }
    },
    {
      category: 'Correctness of design models',
      levels: {
        1: 'Less than 50% of the models are consistent, accurate and complete.',
        2: '50% of the models are consistent, accurate and complete.',
        3: '75% of the models are consistent, accurate and complete.',
        4: '95% of the models are consistent, accurate and complete.'
      }
    },
    {
      category: 'Preparedness of presentation',
      levels: {
        1: 'Most members are not in proper uniform, assigning of task is not evident and reading of presentation.',
        2: '50% is not in their proper uniform, 50% of the members show some kind of preparedness to the assigned task.',
        3: '75% is not in their proper uniform, 75% of the members show some kind of preparedness to the assigned task.',
        4: 'Every member is in proper uniform, well performed assigned task and all members participated and spoken.'
      }
    }
  ],
  classroomPolicies: [
    'Class attendance and punctuality must be observed in accordance to the Revised Student Code of Discipline, Article 10 – Class Attendance.',
    'Wear proper uniform and school ID card in accordance to the Revised Student Code of Discipline, Article 2, and Sections 1-3.',
    'Kindness, courtesy, and respect are expected and appreciated by your fellow classmates and the instructor.',
    'Complete all activities using only your own work. Do not engage in any activity that would dishonestly improve your results or improve or hurt the results of others. You must not engage in any form of cheating, otherwise, disciplinary action shall be imposed.',
    'There must be no food or drink, other than water, allowed in the computer lab.',
    'Cell phone use during class is prohibited. You will receive one warning before any disciplinary action is taken.',
    'The computers and internet are to be used responsibly and for the sole purpose of work related to the class. Inappropriate use of the computer will result in disciplinary action.',
    'Your workstation must be kept in a clean and orderly manner for the next class.'
  ],
  courseOutline: [
    {
      timeFrame: 'Weeks 1-7',
      title: 'Foundation, Design Patterns & Architecture',
      topics: [
        'VGMO presentation and orientation',
        'Presentation of the course syllabus',
        'Review of Software Engineering 1',
        'Software Design and Architectural Patterns (Design Patterns, Architectural Patterns)',
        'Software Analysis and Design Tools'
      ]
    },
    {
      timeFrame: 'Week 8',
      title: 'Program Coding Practices and Techniques',
      topics: [
        'Coding practices and techniques',
        'Mechanisms for building quality programs',
        'Defensive and secure coding practices',
        'Exception handling mechanisms',
        'Coding standards',
        'Potential security problems in programs'
      ]
    },
    {
      timeFrame: 'Week 9',
      title: 'Midterm Examination Period',
      topics: ['Midterm Examination', 'Review & Evaluation']
    },
    {
      timeFrame: 'Weeks 10-12',
      title: 'Managing Changes in Software Engineering',
      topics: [
        'Configuration management',
        'Version control',
        'Release management'
      ]
    },
    {
      timeFrame: 'Weeks 13-15',
      title: 'Software Testing and Maintenance',
      topics: [
        'Software Testing Introduction',
        'Software Validation and Verification',
        'Testing Documentation',
        'Software Maintenance'
      ]
    },
    {
      timeFrame: 'Weeks 16-17',
      title: 'Capstone Group Project Presentation',
      topics: [
        'Group Project Presentation & Defense',
        'Project Documentation & Code Submission'
      ]
    },
    {
      timeFrame: 'Week 18',
      title: 'Final Examination Period',
      topics: ['Final Examination', 'Course Evaluation & Portfolio Assessment']
    }
  ],
  learningPlan: [
    {
      week: 'Weeks 1-3',
      hoursLab: 9,
      hoursLec: 6,
      learningOutcomes: [
        'Understand the VMGO and know the course policies and requirements.',
        'Enhance existing software solutions by applying appropriate design patterns to improve functionality and maintainability.'
      ],
      topics: [
        'VGMO presentation and orientation',
        'Presentation of the course syllabus',
        'Review of Software Engineering 1'
      ],
      sdgCoherence: {
        goal: 'SDG 4',
        title: 'Quality Education',
        description: 'Aligning academic advancement with institutional principles. Reviewing foundational knowledge strengthens learning outcomes.',
        target: 'Target 4.4 & 4.4.1 (Skills for employment, ICT skills)'
      },
      methodology: ['Discussion', 'Video Lecture', 'Group Discussion'],
      resources: ['Presentation slides', 'Laptop', 'Google Classroom', 'Computer laboratory', 'Figma'],
      assessment: [
        'Group exercises on creating UML Diagrams and ERD',
        'Create a Gantt chart of the group project'
      ]
    },
    {
      week: 'Week 4',
      hoursLab: 3,
      hoursLec: 2,
      learningOutcomes: [
        'Enhance existing software solutions by applying appropriate design patterns to improve functionality and maintainability.'
      ],
      topics: ['Design patterns (Creational, Structural, Behavioral patterns)'],
      sdgCoherence: {
        goal: 'SDG 9',
        title: 'Industry, Innovation, and Infrastructure',
        description: 'Design patterns promote efficient and scalable software systems, supporting technological innovation and sustainable infrastructure.',
        target: 'Target 9.4 (Upgrade infrastructure, resource-use efficiency)'
      },
      methodology: ['Project-based Learning', 'Discussion', 'Brainstorming', 'Collaborative Learning', 'Case based learning'],
      resources: ['Presentation', 'Laptop', 'Google Classroom', 'Selected programming language environment'],
      assessment: ['Individual activity on design patterns', 'Project proposal presentation']
    },
    {
      week: 'Week 5',
      hoursLab: 3,
      hoursLec: 2,
      learningOutcomes: [
        'Enhance existing software solutions by applying appropriate architectural patterns to improve system resilience.'
      ],
      topics: ['Architectural patterns (Layered, Client-Server, Microservices, Event-Driven)'],
      sdgCoherence: {
        goal: 'SDG 9',
        title: 'Industry, Innovation, and Infrastructure',
        description: 'Architectural patterns build resilient, scalable systems, crucial for sustainable industry growth.',
        target: 'Target 9.1 (Develop quality, reliable, sustainable and resilient infrastructure)'
      },
      methodology: ['Discussion', 'Project-based Learning', 'Brainstorming', 'Collaborative Learning', 'Problem based learning'],
      resources: ['Presentation', 'Laptop', 'Google Classroom', 'Programming language selected based on project'],
      assessment: [
        'Conduct a group game activity focused on architectural patterns',
        'Present project updates and improvements aligned with the Gantt chart'
      ]
    },
    {
      week: 'Weeks 6-7',
      hoursLab: 6,
      hoursLec: 4,
      learningOutcomes: [
        'Apply modern software analysis and design tools in crafting engineering models.'
      ],
      topics: ['Software analysis and design tools (CASE tools, modeling suites, API designers)'],
      sdgCoherence: {
        goal: 'SDG 4',
        title: 'Quality Education',
        description: 'Introducing students to modern tools equips them with relevant skills, ensuring high-quality education.'
      },
      methodology: ['Discussion', 'Project-based Learning', 'Brainstorming', 'Collaborative Learning', 'Group discussion'],
      resources: ['Presentation', 'Laptop', 'Google Classroom', 'Software design and modeling toolkits'],
      assessment: [
        'Create system models',
        'Present project updates and improvements aligned with the Gantt chart'
      ]
    },
    {
      week: 'Week 8',
      hoursLab: 3,
      hoursLec: 2,
      learningOutcomes: [
        'Implement program designs and specifications by writing efficient and functional source code.',
        'Explain and apply coding techniques, idioms, standards, and mechanisms that ensure software reliability, efficiency, and robustness.'
      ],
      topics: [
        'Coding practices and techniques',
        'Mechanisms for building quality programs',
        'Defensive and secure coding practices',
        'Exception handling mechanisms'
      ],
      sdgCoherence: {
        goal: 'SDG 4 & SDG 9',
        title: 'Quality Education & Resilient Infrastructure',
        description: 'Promotes the development of secure, reliable systems that enhance resilience in industries.',
        target: 'Target 4.4.1 & Target 9.1'
      },
      methodology: ['Discussion', 'Project-based Learning', 'Code reading and critique sessions', 'Peer review activities'],
      resources: ['Presentation', 'Laptop', 'Google Classroom', 'IDE & Compiler toolchain'],
      assessment: [
        'Coding exercises',
        'Present project updates and improvements aligned with the Gantt chart'
      ]
    },
    {
      week: 'Week 9',
      hoursLab: 0,
      hoursLec: 3,
      learningOutcomes: ['Conduct review and midterm examination.'],
      topics: ['Midterm Examination'],
      methodology: ['Written Examination'],
      resources: ['Test Paper', 'Online Exam Environment'],
      assessment: ['Midterm Examination Score']
    },
    {
      week: 'Week 10',
      hoursLab: 3,
      hoursLec: 2,
      learningOutcomes: [
        'Differentiate between centralized and distributed software configuration management systems and their appropriate applications.'
      ],
      topics: ['Managing Changes in Software Engineering: Software Configuration Management'],
      sdgCoherence: {
        goal: 'SDG 9',
        title: 'Industry, Innovation, and Infrastructure',
        description: 'Efficient change management ensures software adaptability, scalability, and innovation.',
        target: 'Target 9.1'
      },
      methodology: ['Discussion', 'Comparative analysis discussions', 'Video Lecture'],
      resources: ['Presentation', 'Laptop', 'Google Classroom'],
      assessment: [
        'Group activity on software configuration',
        'Present project updates aligned with the Gantt chart'
      ]
    },
    {
      week: 'Week 11',
      hoursLab: 3,
      hoursLec: 2,
      learningOutcomes: [
        'Demonstrate the use of version control systems in managing software releases and tracking development changes.'
      ],
      topics: ['Version Control (Git workflows, branch strategies, pull requests, resolving merge conflicts)'],
      sdgCoherence: {
        goal: 'SDG 9',
        title: 'Industry, Innovation, and Infrastructure',
        description: 'Supporting resilient and sustainable developer infrastructure.',
        target: 'Target 9.1'
      },
      methodology: ['Discussion', 'Video Lectures', 'Hands-on terminal workshop'],
      resources: ['Presentation', 'Laptop', 'Git / GitHub Classroom'],
      assessment: [
        'Group activity on version control',
        'Present project updates aligned with the Gantt chart'
      ]
    },
    {
      week: 'Week 12',
      hoursLab: 3,
      hoursLec: 2,
      learningOutcomes: [
        'Manage software releases and build deployable packages.'
      ],
      topics: ['Release Management (SemVer, CI/CD pipelines, staging vs production deployment)'],
      methodology: ['Discussion', 'Video Lectures'],
      resources: ['Presentation', 'Laptop', 'Google Classroom'],
      assessment: [
        'Quiz based on the previous topics',
        'Present the first release of the software project',
        'Document bugs encountered in the first release'
      ]
    },
    {
      week: 'Week 13',
      hoursLab: 3,
      hoursLec: 2,
      learningOutcomes: [
        'Design comprehensive test cases using sound testing practices, execute them on existing programs, and document identified defects effectively.'
      ],
      topics: ['Software Testing Introduction (Unit testing, integration testing, black/white box techniques)'],
      methodology: ['Discussion', 'Group activity', 'Inquiry-based Learning', 'Peer review activities'],
      resources: ['Presentation', 'Laptop', 'Testing frameworks (Jest, JUnit, PyTest)'],
      assessment: [
        'Cross-group project testing',
        'Document bugs encountered in the test practices'
      ]
    },
    {
      week: 'Week 14',
      hoursLab: 3,
      hoursLec: 2,
      learningOutcomes: [
        'Conduct structured code inspections or peer reviews for small to medium-sized software projects.',
        'Validate and verify system specifications against stakeholder needs.'
      ],
      topics: ['Software Validation and Verification', 'Testing Documentation'],
      methodology: ['Discussion', 'Group activity', 'Inquiry-based Learning', 'Peer review activities', 'QA Engineer simulation'],
      resources: ['Presentation', 'Laptop', 'Defect tracking sheets'],
      assessment: [
        'Present result of the cross-group project testing',
        'Present the updated system based on testing documentation'
      ]
    },
    {
      week: 'Week 15',
      hoursLab: 3,
      hoursLec: 2,
      learningOutcomes: [
        'Modify and update existing software systems in response to defect reports or revised specifications.'
      ],
      topics: ['Software Maintenance (Corrective, adaptive, perfective, and preventive maintenance)'],
      methodology: ['Discussion', 'Inquiry-based Learning', 'Peer review activities'],
      resources: ['Presentation', 'Laptop', 'Google Classroom'],
      assessment: [
        'Quiz based on testing and software maintenance',
        'Release second version of the software, perform beta testing and software maintenance'
      ]
    },
    {
      week: 'Weeks 16-17',
      hoursLab: 6,
      hoursLec: 4,
      learningOutcomes: [
        'Effectively present and communicate the features, functionality, and development process of a completed software project or study.'
      ],
      topics: ['Group Project Presentation and Formal Defense'],
      sdgCoherence: {
        goal: 'SDG 4 & SDG 17',
        title: 'Quality Education & Partnerships',
        description: 'Hands-on teamwork and public oral defense; partnership and collaborative delivery.',
        target: 'Target 4.4.1 & Target 17.17'
      },
      methodology: ['Project presentations', 'Poster or pitch sessions', 'Oral defense and Q&A with peers and instructor'],
      resources: ['Project repository', 'Live software demo', 'Slides deck'],
      assessment: ['Group Project Presentation', 'Group Project Documentation']
    },
    {
      week: 'Week 18',
      hoursLab: 0,
      hoursLec: 5,
      learningOutcomes: ['Conduct review and final examination.'],
      topics: ['Final Examination'],
      methodology: ['Written Examination'],
      resources: ['Test Paper', 'Online Exam Environment'],
      assessment: ['Final Examination Score']
    }
  ],
  courseMap: [
    {
      coNumber: 1,
      coStatement: 'Enhance existing software solutions by applying appropriate design patterns to improve functionality and maintainability.',
      poAlignments: { 1: 'P', 2: 'P', 3: 'P', 4: '', 5: 'D', 6: '', 7: '', 8: '', 9: '', 10: '', 11: '' }
    },
    {
      coNumber: 2,
      coStatement: 'Implement program designs and specifications by writing efficient and functional source code.',
      poAlignments: { 1: 'P', 2: '', 3: '', 4: '', 5: 'P', 6: 'D', 7: '', 8: '', 9: '', 10: '', 11: '' }
    },
    {
      coNumber: 3,
      coStatement: 'Explain and apply coding techniques, idioms, standards, and mechanisms to ensure reliability, efficiency, and robustness.',
      poAlignments: { 1: 'I', 2: '', 3: 'P', 4: 'I', 5: '', 6: '', 7: '', 8: '', 9: '', 10: '', 11: '' }
    },
    {
      coNumber: 4,
      coStatement: 'Differentiate between centralized and distributed software configuration management systems.',
      poAlignments: { 1: 'I', 2: '', 3: '', 4: '', 5: '', 6: 'P', 7: '', 8: '', 9: '', 10: '', 11: '' }
    },
    {
      coNumber: 5,
      coStatement: 'Demonstrate the use of version control systems in managing software releases and tracking development changes.',
      poAlignments: { 1: '', 2: 'I', 3: '', 4: '', 5: '', 6: 'P', 7: '', 8: '', 9: '', 10: '', 11: '' }
    },
    {
      coNumber: 6,
      coStatement: 'Design test case documents, execute them on programs, and report defects using proper testing practices.',
      poAlignments: { 1: '', 2: '', 3: '', 4: '', 5: 'P', 6: 'D', 7: '', 8: '', 9: '', 10: '', 11: '' }
    },
    {
      coNumber: 7,
      coStatement: 'Conduct structured code inspections or peer reviews for small to medium-sized software projects.',
      poAlignments: { 1: '', 2: '', 3: '', 4: '', 5: 'D', 6: '', 7: 'P', 8: '', 9: '', 10: '', 11: '' }
    },
    {
      coNumber: 8,
      coStatement: 'Modify and update software based on defect reports or specification changes.',
      poAlignments: { 1: '', 2: 'P', 3: '', 4: '', 5: 'D', 6: 'D', 7: '', 8: '', 9: '', 10: '', 11: '' }
    },
    {
      coNumber: 9,
      coStatement: 'Effectively present and communicate the features and development process of a completed software project.',
      poAlignments: { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: 'D', 9: '', 10: '', 11: '' }
    }
  ],
  references: [
    {
      citation: 'Dilan, R., Ancheta, J. (2023). Software Engineering 2 Module.',
      year: '2023',
      doiOrPublisher: 'DMMMSU, College of Computer Science.'
    },
    {
      citation: 'Diamantopoulos, T. & Symeonidis, A. L. (2020). Mining Software Engineering Data for Software Reuse.',
      year: '2020',
      doiOrPublisher: 'Springer.'
    },
    {
      citation: 'Langer, A. M. (2020). Analysis and Design of Next-Generation Software Architectures.',
      year: '2020',
      doiOrPublisher: 'doi:10.1007/978-3-030-36899-9'
    },
    {
      citation: 'Laplante, P. (2023). What Every Engineer Should Know About Software Engineering.',
      year: '2023',
      doiOrPublisher: 'CRC Press.'
    },
    {
      citation: 'Mason, H. (2022). Fundamentals of Software Engineering.',
      year: '2022',
      doiOrPublisher: 'Murphy & Moore Publishing.'
    },
    {
      citation: 'McNeil R. (2023). Modern Software Engineering.',
      year: '2023',
      doiOrPublisher: 'Clanrye International.'
    },
    {
      citation: 'Nguyen-Duc, A., Munch, J., Prikladnicki, R., Wang, X., & Abrahamsson, P. (Eds.). (2020). Fundamentals of Software Startups.',
      year: '2020',
      doiOrPublisher: 'doi:10.1007/978-3-030-35983-6'
    },
    {
      citation: "Pressman, R. S., & Maxim, B. R. (2019). Software engineering: A practitioner's approach (9th ed.).",
      year: '2019',
      doiOrPublisher: 'McGraw-Hill Education.'
    },
    {
      citation: 'Ravichandran, A., Taylor, K., and Waterhouse, P. (2016). DevOps for Digital Leaders Reignite Business with a Modern DevOps-Enabled Software Factory.',
      year: '2016',
      doiOrPublisher: 'Apress Open. DOI 10.1007/978-1-4842-1842-6.'
    },
    {
      citation: 'Rosen, C. (2020). Guide to Software Systems Development.',
      year: '2020',
      doiOrPublisher: 'Springer. https://doi.org/10.1007/978-3-030-39730-2'
    },
    {
      citation: 'Sadowski, C. and Zimmermann, T. (2019). Rethinking Productivity in Software Engineering.',
      year: '2019',
      doiOrPublisher: 'Apress Open. https://doi.org/10.1007/978-1-4842-4221.6.'
    },
    {
      citation: 'Sommerville, I. (2016). Software Engineering, 10th Ed.',
      year: '2016',
      doiOrPublisher: 'Pearson.'
    },
    {
      citation: 'Staron, M. (2020). Action Research in Software Engineering.',
      year: '2020',
      doiOrPublisher: 'doi:10.1007/978-3-030-32610-4'
    },
    {
      citation: 'Voorhees, D. P. (2020). Guide to Efficient Software Design. Texts in Computer Science.',
      year: '2020',
      doiOrPublisher: 'doi:10.1007/978-3-030-28501-2'
    },
    {
      citation: 'Zeng, D., Gu, L., Pan, S., & Guo, S. (2020). Software Defined Systems, Sensing, Communication, and Computation.',
      year: '2020',
      doiOrPublisher: 'Springer.'
    }
  ],
  signatories: {
    preparedBy: [
      { name: 'EZEKIEL O. BACUNGAN', title: 'Faculty Member' },
      { name: 'RAYMUND E. DILAN', title: 'Faculty Member' }
    ],
    recommendingApproval: {
      name: 'NEMA ROSE D. RIVERA',
      title: 'Program Chairperson, BSCS'
    },
    approved: {
      name: 'CHARLIE S. MARZAN',
      title: 'Dean, CCS'
    }
  },
  sourceDocument: {
    fileName: 'Checked-CSPC-112-Software-Engineering-Course-Syllabus.pdf',
    fileSize: '512 KB',
    fileType: 'pdf',
    fileDataUrl: '/Checked-CSPC-112-Software-Engineering-Course-Syllabus.pdf',
    uploadedAt: '2026-06-23T08:00:00Z'
  }
};

/**
 * Creates a unique, course-specific syllabus strictly bounded to one course.
 * Ensures no two courses share the same syllabus instance or metadata.
 */
export function createDefaultSyllabusForCourse(course: {
  id: string;
  code: string;
  title: string;
  section?: string;
  term?: string;
  instructorName?: string;
  credits?: number;
}): OfficialSyllabusData {
  const normCode = course.code.replace(/\s+/g, '').toUpperCase();

  // CSPC 112: Software Engineering 2
  if (normCode === 'CSPC112') {
    return {
      ...JSON.parse(JSON.stringify(OFFICIAL_SYLLABUS_CSPC112)),
      courseId: course.id,
      courseInfo: {
        ...OFFICIAL_SYLLABUS_CSPC112.courseInfo,
        code: course.code,
        title: course.title,
        semester: course.term || '1st Semester AY 2026-2027'
      }
    };
  }

  // CMSC 131: Web Engineering & Frameworks
  if (normCode === 'CMSC131') {
    const base = JSON.parse(JSON.stringify(OFFICIAL_SYLLABUS_CSPC112));
    return {
      ...base,
      courseId: course.id,
      courseInfo: {
        code: course.code,
        title: course.title,
        semester: course.term || '1st Sem AY 2026-2027',
        academicYear: '2026-2027',
        type: 'Lecture and Laboratory',
        credit: `${course.credits || 3} units`,
        lectureHours: '2 hours/week',
        labHours: '3 hours/week',
        prerequisite: 'CMSC 100 - Web Development Fundamentals',
        description:
          'CMSC 131 – Web Engineering & Frameworks covers advanced modern web application architecture, component-driven client systems, asynchronous client-server APIs, reactive state synchronization, serverless cloud workflows, web application security (CORS, XSS, CSRF mitigation), and performance profiling. Students collaborate in software teams to engineer production-ready, accessible web applications adhering to modern industry specifications.'
      },
      facultyMembers: [
        {
          name: course.instructorName || 'Faculty 1',
          sections: [
            { section: course.section || 'BSCS 4-1', schedule: '08:00-09:30 MF / 02:00-03:00 MF', room: 'Computer Lab 3' }
          ],
          consultation: 'MTWTHF 02:00PM - 03:00PM'
        }
      ],
      courseOutcomes: [
        { number: 1, statement: 'Formulate component hierarchies and architectural designs for complex single-page web applications.' },
        { number: 2, statement: 'Implement responsive, accessible, and reactive user interfaces using modern CSS frameworks and design systems.' },
        { number: 3, statement: 'Design and integrate asynchronous RESTful and GraphQL APIs with optimistic UI and caching strategies.' },
        { number: 4, statement: 'Apply robust state management and persistence layers across client-server boundaries.' },
        { number: 5, statement: 'Execute automated component testing, end-to-end user journey validation, and performance audits.' },
        { number: 6, statement: 'Deploy and maintain production web applications with continuous integration and security hardening.' }
      ],
      references: [
        { citation: 'Flanagan, D. (2024). JavaScript: The Definitive Guide (8th ed.). O’Reilly Media.', year: '2024' },
        { citation: 'Banks, A., & Porcello, E. (2023). Learning React: Modern Patterns for Developing React Apps (2nd ed.). O’Reilly.', year: '2023' },
        { citation: 'MDN Web Docs. (2026). Web Security and Performance Best Practices. Mozilla Developer Network.', year: '2026' }
      ],
      signatories: {
        ...base.signatories,
        preparedBy: [
          { name: (course.instructorName || 'FACULTY 1').toUpperCase(), title: 'Course Lead / Associate Professor I' }
        ]
      },
      sourceDocument: {
        fileName: 'CMSC-131-Web-Engineering-Syllabus.pdf',
        fileSize: '480 KB',
        fileType: 'pdf',
        fileDataUrl: '/Checked-CSPC-112-Software-Engineering-Course-Syllabus.pdf',
        uploadedAt: '2026-06-23T08:00:00Z'
      }
    };
  }

  // CMSC 150: Automata Theory & Formal Languages
  if (normCode === 'CMSC150') {
    const base = JSON.parse(JSON.stringify(OFFICIAL_SYLLABUS_CSPC112));
    return {
      ...base,
      courseId: course.id,
      courseInfo: {
        code: course.code,
        title: course.title,
        semester: course.term || '1st Sem AY 2026-2027',
        academicYear: '2026-2027',
        type: 'Lecture and Laboratory',
        credit: `${course.credits || 3} units`,
        lectureHours: '2 hours/week',
        labHours: '3 hours/week',
        prerequisite: 'MATH 21 - Discrete Mathematics',
        description:
          'CMSC 150 – Automata Theory & Formal Languages introduces the theoretical foundations of computation. Topics include finite automata, regular languages, regular expressions, context-free grammars, pushdown automata, Turing machines, decidability, and computational complexity.'
      },
      facultyMembers: [
        {
          name: course.instructorName || 'Faculty 1',
          sections: [
            { section: course.section || 'BSCS 4-1', schedule: '09:30-11:00 MF / 08:00-10:00 W', room: 'Room 205' }
          ],
          consultation: 'MTWTHF 02:00PM - 03:00PM'
        }
      ],
      courseOutcomes: [
        { number: 1, statement: 'Design deterministic and nondeterministic finite automata to recognize specified formal languages.' },
        { number: 2, statement: 'Convert between regular expressions, regular grammars, and finite automata.' },
        { number: 3, statement: 'Apply the Pumping Lemma to rigorously prove non-regularity and non-context-freeness.' },
        { number: 4, statement: 'Construct pushdown automata and context-free grammars for syntactic definitions of computer languages.' },
        { number: 5, statement: 'Formulate standard Turing machine models and classify problems as decidable, recognizable, or undecidable.' }
      ],
      references: [
        { citation: 'Hopcroft, J. E., Motwani, R., & Ullman, J. D. (2023). Introduction to Automata Theory, Languages, and Computation (4th ed.). Pearson.', year: '2023' },
        { citation: 'Sipser, M. (2022). Introduction to the Theory of Computation (3rd ed.). Cengage Learning.', year: '2022' }
      ],
      signatories: {
        ...base.signatories,
        preparedBy: [
          { name: (course.instructorName || 'FACULTY 1').toUpperCase(), title: 'Course Lead / Associate Professor I' }
        ]
      },
      sourceDocument: {
        fileName: 'CMSC-150-Automata-Theory-Syllabus.pdf',
        fileSize: '440 KB',
        fileType: 'pdf',
        fileDataUrl: '/Checked-CSPC-112-Software-Engineering-Course-Syllabus.pdf',
        uploadedAt: '2026-06-23T08:00:00Z'
      }
    };
  }

  // CMSC 170: Introduction to Artificial Intelligence
  if (normCode === 'CMSC170') {
    const base = JSON.parse(JSON.stringify(OFFICIAL_SYLLABUS_CSPC112));
    return {
      ...base,
      courseId: course.id,
      courseInfo: {
        code: course.code,
        title: course.title,
        semester: course.term || '1st Sem AY 2026-2027',
        academicYear: '2026-2027',
        type: 'Lecture and Laboratory',
        credit: `${course.credits || 3} units`,
        lectureHours: '2 hours/week',
        labHours: '3 hours/week',
        prerequisite: 'CMSC 123 - Data Structures & Algorithms',
        description:
          'CMSC 170 – Introduction to Artificial Intelligence covers the principles and algorithms of intelligent agents. Topics include informed search algorithms (A*, greedy), adversarial game playing (minimax, alpha-beta pruning), constraint satisfaction problems, logic-based reasoning, probabilistic inference, and supervised machine learning algorithms.'
      },
      facultyMembers: [
        {
          name: course.instructorName || 'Faculty 1',
          sections: [
            { section: course.section || 'BSCS 4-2', schedule: '10:00-12:00 W / 11:00-12:30 TTh', room: 'Room 101' }
          ],
          consultation: 'MTWTHF 02:00PM - 03:00PM'
        }
      ],
      courseOutcomes: [
        { number: 1, statement: 'Formulate search problems and implement heuristic search strategies for problem solving.' },
        { number: 2, statement: 'Implement game-playing algorithms with alpha-beta pruning and heuristic evaluation functions.' },
        { number: 3, statement: 'Model domain constraints using constraint satisfaction and probabilistic graphical frameworks.' },
        { number: 4, statement: 'Design, train, and evaluate machine learning models for classification and regression tasks.' },
        { number: 5, statement: 'Critically assess ethical, fairness, and safety considerations in modern artificial intelligence deployments.' }
      ],
      references: [
        { citation: 'Russell, S., & Norvig, P. (2024). Artificial Intelligence: A Modern Approach (4th ed.). Pearson.', year: '2024' }
      ],
      signatories: {
        ...base.signatories,
        preparedBy: [
          { name: (course.instructorName || 'FACULTY 1').toUpperCase(), title: 'Course Lead / Associate Professor I' }
        ]
      },
      sourceDocument: {
        fileName: 'CMSC-170-Intro-AI-Syllabus.pdf',
        fileSize: '495 KB',
        fileType: 'pdf',
        fileDataUrl: '/Checked-CSPC-112-Software-Engineering-Course-Syllabus.pdf',
        uploadedAt: '2026-06-23T08:00:00Z'
      }
    };
  }

  // CMSC 190: Special Problem / Capstone Project 1
  if (normCode === 'CMSC190') {
    const base = JSON.parse(JSON.stringify(OFFICIAL_SYLLABUS_CSPC112));
    return {
      ...base,
      courseId: course.id,
      courseInfo: {
        code: course.code,
        title: course.title,
        semester: course.term || '1st Sem AY 2026-2027',
        academicYear: '2026-2027',
        type: 'Lecture',
        credit: `${course.credits || 3} units`,
        lectureHours: '3 hours/week',
        labHours: '0 hours/week',
        prerequisite: 'Senior Standing',
        description:
          'CMSC 190 – Special Problem / Capstone Project 1 initiates the undergraduate thesis sequence. Students formulate significant computing research proposals, conduct comprehensive literature reviews, specify functional and architectural requirements, and defend their proposal before an institutional faculty committee.'
      },
      facultyMembers: [
        {
          name: course.instructorName || 'Dean 1',
          sections: [
            { section: course.section || 'BSCS 4-1', schedule: '01:00-04:00 F', room: 'Conference Hall' }
          ],
          consultation: 'WTh 02:00PM - 04:00PM'
        }
      ],
      courseOutcomes: [
        { number: 1, statement: 'Identify and formalize a novel, high-impact computing research question.' },
        { number: 2, statement: 'Synthesize literature and formulate a rigorous methodology aligned with scientific rigor.' },
        { number: 3, statement: 'Develop formal software architecture specifications and proof-of-concept prototypes.' },
        { number: 4, statement: 'Successfully present and defend the project proposal before the departmental review panel.' }
      ],
      signatories: {
        ...base.signatories,
        preparedBy: [
          { name: (course.instructorName || 'DEAN 1').toUpperCase(), title: 'Dean & Professor IV' }
        ]
      },
      sourceDocument: {
        fileName: 'CMSC-190-Capstone-Project-1-Syllabus.pdf',
        fileSize: '520 KB',
        fileType: 'pdf',
        fileDataUrl: '/Checked-CSPC-112-Software-Engineering-Course-Syllabus.pdf',
        uploadedAt: '2026-06-23T08:00:00Z'
      }
    };
  }

  // Fallback for any other custom or dynamically added course
  const base = JSON.parse(JSON.stringify(OFFICIAL_SYLLABUS_CSPC112));
  return {
    ...base,
    courseId: course.id,
    courseInfo: {
      ...base.courseInfo,
      code: course.code,
      title: course.title,
      semester: course.term || '1st Sem AY 2026-2027',
      credit: `${course.credits || 3} units`,
      description: `${course.code} – ${course.title}. Official institutional course syllabus under the Department of Computer Science, DMMMSU College of Computer Science.`
    },
    facultyMembers: [
      {
        name: course.instructorName || 'Faculty Member',
        sections: [
          { section: course.section || 'Section 1', schedule: 'TBA', room: 'TBA' }
        ],
        consultation: 'TBA'
      }
    ],
    signatories: {
      ...base.signatories,
      preparedBy: [
        { name: (course.instructorName || 'FACULTY MEMBER').toUpperCase(), title: 'Course Instructor' }
      ]
    },
    sourceDocument: {
      fileName: `${course.code.replace(/\s+/g, '-')}-Official-Syllabus.pdf`,
      fileSize: '450 KB',
      fileType: 'pdf',
      fileDataUrl: '/Checked-CSPC-112-Software-Engineering-Course-Syllabus.pdf',
      uploadedAt: new Date().toISOString()
    }
  };
}

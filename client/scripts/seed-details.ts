import crypto from "crypto";

const BASE_URL = "https://gabay.zyberlab.com";
const ADMIN_EMAIL = "jayveegenetareyes@gmail.com";
const ADMIN_PASS = "qwerty12345";

async function seedData() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1. Get CSPC 112 course
  const coursesRes = await fetch(`${BASE_URL}/items/courses?filter[code][_eq]=CSPC 112`, { headers });
  const coursesJson = await coursesRes.json();
  const cspc112 = coursesJson?.data?.[0];
  if (!cspc112) {
    console.error("CSPC 112 course not found");
    return;
  }
  const courseId = cspc112.id;
  console.log("Found CSPC 112 ID:", courseId);

  // 2. Modules
  const modulesCheck = await fetch(`${BASE_URL}/items/course_modules?filter[course_id][_eq]=${courseId}`, { headers });
  const modulesJson = await modulesCheck.json();
  if (!modulesJson?.data || modulesJson.data.length === 0) {
    const sampleModules = [
      {
        id: crypto.randomUUID(),
        course_id: courseId,
        title: "Module 1: Introduction to Agile Architecture",
        order: 1,
        items: [
          { id: "item-1", title: "Overview of Agile & Scrum", type: "page", completed: true },
          { id: "item-2", title: "Git Branching Best Practices", type: "file", completed: false }
        ]
      },
      {
        id: crypto.randomUUID(),
        course_id: courseId,
        title: "Module 2: Headless ERP & API Decoupling",
        order: 2,
        items: [
          { id: "item-3", title: "REST vs SDK Clients", type: "page", completed: false },
          { id: "item-4", title: "Authentication Flow with Likha ERP", type: "assignment", completed: false }
        ]
      }
    ];
    for (const m of sampleModules) {
      await fetch(`${BASE_URL}/items/course_modules`, { method: "POST", headers, body: JSON.stringify(m) });
      console.log("✓ Seeded module:", m.title);
    }
  }

  // 3. Assessments
  const assessCheck = await fetch(`${BASE_URL}/items/assessments?filter[course_id][_eq]=${courseId}`, { headers });
  const assessJson = await assessCheck.json();
  if (!assessJson?.data || assessJson.data.length === 0) {
    const sampleAssessments = [
      {
        id: crypto.randomUUID(),
        course_id: courseId,
        title: "Quiz 1: Agile Methodologies and Scrum",
        type: "quiz",
        term: "midterm",
        total_points: 50,
        published: true,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString()
      },
      {
        id: crypto.randomUUID(),
        course_id: courseId,
        title: "Activity 1: Decoupled Architecture Implementation",
        type: "activity",
        term: "midterm",
        total_points: 100,
        published: true,
        due_date: new Date(Date.now() + 10 * 86400000).toISOString()
      }
    ];
    for (const a of sampleAssessments) {
      await fetch(`${BASE_URL}/items/assessments`, { method: "POST", headers, body: JSON.stringify(a) });
      console.log("✓ Seeded assessment:", a.title);
    }
  }

  // 4. Calendar Events
  const calCheck = await fetch(`${BASE_URL}/items/calendar_events?limit=5`, { headers });
  const calJson = await calCheck.json();
  if (!calJson?.data || calJson.data.length === 0) {
    const sampleEvents = [
      {
        id: crypto.randomUUID(),
        course_id: courseId,
        title: "CSPC 112 Sprint 1 Review",
        date: new Date().toISOString().split("T")[0],
        start_time: "13:00",
        end_time: "14:30",
        description: "Review of Sprint 1 backlog and system architecture demonstration.",
        type: "course"
      },
      {
        id: crypto.randomUUID(),
        title: "University Midterm Examination Week",
        date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        start_time: "08:00",
        end_time: "17:00",
        description: "Official institutional midterm examination period.",
        type: "academic"
      }
    ];
    for (const e of sampleEvents) {
      await fetch(`${BASE_URL}/items/calendar_events`, { method: "POST", headers, body: JSON.stringify(e) });
      console.log("✓ Seeded calendar event:", e.title);
    }
  }

  console.log("✓ Data seeding completed successfully.");
}

seedData().catch(console.error);

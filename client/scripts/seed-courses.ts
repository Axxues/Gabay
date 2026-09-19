import crypto from "crypto";

const BASE_URL = "https://gabay.zyberlab.com";
const ADMIN_EMAIL = "jayveegenetareyes@gmail.com";
const ADMIN_PASS = "qwerty12345";

async function seedCourses() {
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

  const coursesCheckRes = await fetch(`${BASE_URL}/items/courses?limit=5`, { headers });
  const coursesData = await coursesCheckRes.json();
  const existingCourses = coursesData?.data || [];

  if (existingCourses.length === 0) {
    const sampleCourses = [
      {
        id: crypto.randomUUID(),
        code: "CSPC 112",
        title: "Software Engineering 2",
        section: "BSIT 3-A",
        term: "1st Semester 2026-2027",
        credits: 3,
        published: true,
        syllabus: {
          courseDescription: "Advanced principles and methodologies in software engineering, architectural design, agile development, automated testing, and CI/CD deployment pipelines.",
          courseOutcomes: [
            "Design and implement scalable web applications adhering to modern software architectural patterns.",
            "Utilize decoupled headless backend services with enterprise authentication.",
            "Demonstrate automated testing, CI/CD pipeline integration, and version control collaboration."
          ],
          gradingCriteria: [
            { category: "Quizzes & Activities", weight: 30 },
            { category: "Major Exams (Prelim/Midterm/Finals)", weight: 40 },
            { category: "Capstone / Term Project", weight: 30 }
          ]
        },
        sections: [
          { name: "BSIT 3-A", schedule: "Mon/Wed 1:00 PM - 2:30 PM", room: "Lab 4" },
          { name: "BSIT 3-B", schedule: "Tue/Thu 1:00 PM - 2:30 PM", room: "Lab 4" }
        ]
      },
      {
        id: crypto.randomUUID(),
        code: "CMSC 131",
        title: "Data Mining and Warehousing",
        section: "BSCS 3-A",
        term: "1st Semester 2026-2027",
        credits: 3,
        published: true,
        syllabus: {
          courseDescription: "Foundational and applied techniques in data warehousing, ETL pipelines, association rule mining, classification, clustering, and predictive modeling.",
          courseOutcomes: [
            "Construct multidimensional data models and star/snowflake schemas.",
            "Apply machine learning algorithms for knowledge discovery in databases."
          ],
          gradingCriteria: [
            { category: "Laboratory Hands-on", weight: 40 },
            { category: "Exams", weight: 40 },
            { category: "Class Standing", weight: 20 }
          ]
        },
        sections: [
          { name: "BSCS 3-A", schedule: "Mon/Wed 9:00 AM - 10:30 AM", room: "Lab 2" }
        ]
      }
    ];

    for (const c of sampleCourses) {
      const seedRes = await fetch(`${BASE_URL}/items/courses`, {
        method: "POST",
        headers,
        body: JSON.stringify(c),
      });
      if (seedRes.ok) {
        const seeded = await seedRes.json();
        console.log(`✓ Seeded course: ${c.code} (${c.title}) - ID: ${seeded?.data?.id}`);
      } else {
        console.warn(`! Failed seeding course ${c.code}: ${await seedRes.text()}`);
      }
    }
  } else {
    console.log(`Courses already populated (${existingCourses.length} found).`);
  }
}

seedCourses().catch(console.error);

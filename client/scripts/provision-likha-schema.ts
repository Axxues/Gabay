const BASE_URL = "https://gabay.zyberlab.com";
const ADMIN_EMAIL = "jayveegenetareyes@gmail.com";
const ADMIN_PASS = "qwerty12345";

interface FieldDef {
  field: string;
  type: string;
  schema?: {
    is_nullable?: boolean;
    default_value?: unknown;
    is_primary_key?: boolean;
  };
}

interface CollectionDef {
  collection: string;
  fields: FieldDef[];
}

const USER_FIELDS: FieldDef[] = [
  { field: "student_id", type: "string", schema: { is_nullable: true } },
  { field: "department", type: "string", schema: { is_nullable: true, default_value: "College of Information Technology" } },
  { field: "title", type: "string", schema: { is_nullable: true, default_value: "Student" } },
  { field: "user_role", type: "string", schema: { is_nullable: true, default_value: "student" } },
  { field: "banner", type: "string", schema: { is_nullable: true } },
  { field: "student_type", type: "string", schema: { is_nullable: true, default_value: "regular" } }
];

const COLLECTIONS: CollectionDef[] = [
  {
    collection: "courses",
    fields: [
      { field: "code", type: "string", schema: { is_nullable: false } },
      { field: "title", type: "string", schema: { is_nullable: false } },
      { field: "section", type: "string", schema: { is_nullable: true } },
      { field: "term", type: "string", schema: { is_nullable: true } },
      { field: "instructor_id", type: "uuid", schema: { is_nullable: true } },
      { field: "credits", type: "integer", schema: { is_nullable: true, default_value: 3 } },
      { field: "published", type: "boolean", schema: { is_nullable: true, default_value: true } },
      { field: "syllabus", type: "json", schema: { is_nullable: true } },
      { field: "sections", type: "json", schema: { is_nullable: true } }
    ]
  },
  {
    collection: "course_modules",
    fields: [
      { field: "course_id", type: "uuid", schema: { is_nullable: false } },
      { field: "title", type: "string", schema: { is_nullable: false } },
      { field: "order", type: "integer", schema: { is_nullable: true, default_value: 0 } },
      { field: "items", type: "json", schema: { is_nullable: true } }
    ]
  },
  {
    collection: "course_enrollments",
    fields: [
      { field: "course_id", type: "uuid", schema: { is_nullable: false } },
      { field: "user_id", type: "uuid", schema: { is_nullable: false } },
      { field: "role", type: "string", schema: { is_nullable: true, default_value: "student" } },
      { field: "status", type: "string", schema: { is_nullable: true, default_value: "enrolled" } },
      { field: "enrolled_at", type: "timestamp", schema: { is_nullable: true } }
    ]
  },
  {
    collection: "assessments",
    fields: [
      { field: "course_id", type: "uuid", schema: { is_nullable: false } },
      { field: "title", type: "string", schema: { is_nullable: false } },
      { field: "type", type: "string", schema: { is_nullable: true, default_value: "activity" } },
      { field: "term", type: "string", schema: { is_nullable: true, default_value: "midterm" } },
      { field: "total_points", type: "integer", schema: { is_nullable: true, default_value: 100 } },
      { field: "due_date", type: "timestamp", schema: { is_nullable: true } },
      { field: "published", type: "boolean", schema: { is_nullable: true, default_value: true } },
      { field: "config", type: "json", schema: { is_nullable: true } },
      { field: "questions", type: "json", schema: { is_nullable: true } }
    ]
  },
  {
    collection: "submissions",
    fields: [
      { field: "assessment_id", type: "uuid", schema: { is_nullable: false } },
      { field: "student_id", type: "uuid", schema: { is_nullable: false } },
      { field: "course_id", type: "uuid", schema: { is_nullable: true } },
      { field: "score", type: "float", schema: { is_nullable: true } },
      { field: "status", type: "string", schema: { is_nullable: true, default_value: "submitted" } },
      { field: "answers", type: "json", schema: { is_nullable: true } },
      { field: "feedback", type: "text", schema: { is_nullable: true } },
      { field: "submitted_at", type: "timestamp", schema: { is_nullable: true } },
      { field: "graded_at", type: "timestamp", schema: { is_nullable: true } }
    ]
  },
  {
    collection: "grades",
    fields: [
      { field: "course_id", type: "uuid", schema: { is_nullable: false } },
      { field: "student_id", type: "uuid", schema: { is_nullable: false } },
      { field: "prelim", type: "float", schema: { is_nullable: true } },
      { field: "midterm", type: "float", schema: { is_nullable: true } },
      { field: "finals", type: "float", schema: { is_nullable: true } },
      { field: "overall", type: "float", schema: { is_nullable: true } },
      { field: "remarks", type: "string", schema: { is_nullable: true, default_value: "Passed" } },
      { field: "breakdown", type: "json", schema: { is_nullable: true } }
    ]
  },
  {
    collection: "course_grading_configs",
    fields: [
      { field: "course_id", type: "uuid", schema: { is_nullable: false } },
      { field: "prelim_columns", type: "json", schema: { is_nullable: true } },
      { field: "midterm_columns", type: "json", schema: { is_nullable: true } },
      { field: "final_columns", type: "json", schema: { is_nullable: true } },
      { field: "weights", type: "json", schema: { is_nullable: true } }
    ]
  },
  {
    collection: "calendar_events",
    fields: [
      { field: "course_id", type: "uuid", schema: { is_nullable: true } },
      { field: "title", type: "string", schema: { is_nullable: false } },
      { field: "date", type: "date", schema: { is_nullable: false } },
      { field: "start_time", type: "string", schema: { is_nullable: true } },
      { field: "end_time", type: "string", schema: { is_nullable: true } },
      { field: "description", type: "text", schema: { is_nullable: true } },
      { field: "type", type: "string", schema: { is_nullable: true, default_value: "academic" } }
    ]
  },
  {
    collection: "announcements",
    fields: [
      { field: "course_id", type: "uuid", schema: { is_nullable: true } },
      { field: "title", type: "string", schema: { is_nullable: false } },
      { field: "content", type: "text", schema: { is_nullable: false } },
      { field: "author_id", type: "uuid", schema: { is_nullable: true } },
      { field: "created_at", type: "timestamp", schema: { is_nullable: true } },
      { field: "replies", type: "json", schema: { is_nullable: true } }
    ]
  },
  {
    collection: "messages",
    fields: [
      { field: "sender_id", type: "uuid", schema: { is_nullable: false } },
      { field: "recipient_id", type: "uuid", schema: { is_nullable: false } },
      { field: "subject", type: "string", schema: { is_nullable: false } },
      { field: "body", type: "text", schema: { is_nullable: false } },
      { field: "read", type: "boolean", schema: { is_nullable: true, default_value: false } },
      { field: "created_at", type: "timestamp", schema: { is_nullable: true } }
    ]
  },
  {
    collection: "activity_logs",
    fields: [
      { field: "user_id", type: "uuid", schema: { is_nullable: false } },
      { field: "action", type: "string", schema: { is_nullable: false } },
      { field: "details", type: "json", schema: { is_nullable: true } },
      { field: "timestamp", type: "timestamp", schema: { is_nullable: true } }
    ]
  }
];

async function main() {
  console.log("==> Authenticating with Likha ERP at:", BASE_URL);
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token;
  console.log("==> Successfully authenticated! Token acquired.");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1. Check existing collections
  const colRes = await fetch(`${BASE_URL}/collections`, { headers });
  const colJson = await colRes.json();
  const existingCols: string[] = colJson?.data?.map((c: any) => c.collection) || [];
  console.log("==> Existing collections:", existingCols.join(", "));

  // 2. Provision custom fields on directus_users
  console.log("==> Provisioning custom fields on directus_users...");
  const userFieldsRes = await fetch(`${BASE_URL}/fields/directus_users`, { headers });
  const userFieldsJson = await userFieldsRes.json();
  const existingUserFields: string[] = userFieldsJson?.data?.map((f: any) => f.field) || [];

  for (const f of USER_FIELDS) {
    if (existingUserFields.includes(f.field)) {
      console.log(`    - directus_users.${f.field} already exists. Skipping.`);
      continue;
    }
    const createRes = await fetch(`${BASE_URL}/fields/directus_users`, {
      method: "POST",
      headers,
      body: JSON.stringify(f),
    });
    if (createRes.ok) {
      console.log(`    ✓ Created directus_users.${f.field}`);
    } else {
      console.warn(`    ! Failed creating directus_users.${f.field}: ${await createRes.text()}`);
    }
  }

  // 3. Provision LMS collections & fields
  for (const def of COLLECTIONS) {
    console.log(`==> Processing collection: ${def.collection}...`);
    if (!existingCols.includes(def.collection)) {
      console.log(`    Creating collection ${def.collection}...`);
      const createColRes = await fetch(`${BASE_URL}/collections`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          collection: def.collection,
          fields: [
            {
              field: "id",
              type: "uuid",
              schema: {
                is_primary_key: true,
              },
            },
          ],
          schema: {},
        }),
      });

      if (!createColRes.ok) {
        console.warn(`    ! Could not create collection ${def.collection}: ${await createColRes.text()}`);
        continue;
      }
      console.log(`    ✓ Created collection ${def.collection}`);
    } else {
      console.log(`    Collection ${def.collection} already exists.`);
    }

    // Provision fields for this collection
    const fieldsRes = await fetch(`${BASE_URL}/fields/${def.collection}`, { headers });
    const fieldsJson = await fieldsRes.json();
    const existingColFields: string[] = fieldsJson?.data?.map((f: any) => f.field) || [];

    for (const f of def.fields) {
      if (existingColFields.includes(f.field)) {
        console.log(`      - ${def.collection}.${f.field} already exists. Skipping.`);
        continue;
      }
      const createFRes = await fetch(`${BASE_URL}/fields/${def.collection}`, {
        method: "POST",
        headers,
        body: JSON.stringify(f),
      });
      if (createFRes.ok) {
        console.log(`      ✓ Created field ${def.collection}.${f.field}`);
      } else {
        console.warn(`      ! Failed creating ${def.collection}.${f.field}: ${await createFRes.text()}`);
      }
    }
  }

  // 4. Seed initial course records if empty
  console.log("==> Checking courses collection for initial seed data...");
  const coursesCheckRes = await fetch(`${BASE_URL}/items/courses?limit=5`, { headers });
  const coursesData = await coursesCheckRes.json();
  const existingCourses = coursesData?.data || [];

  if (existingCourses.length === 0) {
    console.log("==> Seeding initial courses CSPC 112 and CMSC 131...");
    const sampleCourses = [
      {
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
        console.log(`    ✓ Seeded course: ${c.code} (${c.title}) - ID: ${seeded?.data?.id}`);
      } else {
        console.warn(`    ! Failed seeding course ${c.code}: ${await seedRes.text()}`);
      }
    }
  } else {
    console.log(`==> Courses already populated (${existingCourses.length} found). Skipping course seed.`);
  }

  // 5. Seed initial campus announcement if empty
  console.log("==> Checking announcements collection for initial seed data...");
  const announceCheckRes = await fetch(`${BASE_URL}/items/announcements?limit=5`, { headers });
  const announceData = await announceCheckRes.json();
  if (!announceData?.data || announceData.data.length === 0) {
    console.log("==> Seeding initial campus announcement...");
    await fetch(`${BASE_URL}/items/announcements`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Welcome to Gabay Learning Management System",
        content: "Welcome to the new academic term! Access your enrolled courses, syllabus outlines, learning modules, assessments, and gradebook directly through Gabay.",
        created_at: new Date().toISOString()
      }),
    });
    console.log("    ✓ Seeded welcome announcement.");
  }

  console.log("\n==========================================");
  console.log("✓ Likha ERP Backend Provisioning Completed!");
  console.log("==========================================");
}

main().catch((err) => {
  console.error("Provisioning error:", err);
  process.exit(1);
});

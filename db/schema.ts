import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const schools = sqliteTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city"),
  board: text("board"),
  settingsJson: text("settings_json").notNull().default("{}"),
  ...timestamps,
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("Active"),
  profileJson: text("profile_json").notNull().default("{}"),
  ...timestamps,
}, table => [uniqueIndex("users_school_email_uq").on(table.schoolId, table.email)]);

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  academicYear: text("academic_year").notNull(),
  grade: text("grade").notNull(),
  section: text("section").notNull(),
  subject: text("subject").notNull(),
  teacherId: text("teacher_id").references(() => users.id),
  ...timestamps,
}, table => [index("classes_school_idx").on(table.schoolId)]);

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  classId: text("class_id").references(() => classes.id),
  name: text("name").notNull(),
  rollNumber: text("roll_number"),
  status: text("status").notNull().default("Active"),
  ...timestamps,
}, table => [index("students_class_idx").on(table.classId)]);

export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  classId: text("class_id").references(() => classes.id),
  title: text("title").notNull(),
  activityType: text("activity_type").notNull(),
  subject: text("subject").notNull(),
  maxMarks: integer("max_marks").notNull(),
  assessmentDate: text("assessment_date").notNull(),
  stage: text("stage").notNull(),
  version: integer("version").notNull().default(1),
  answerKey: text("answer_key"),
  rubric: text("rubric"),
  quality: integer("quality").notNull().default(0),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, table => [index("assessments_school_date_idx").on(table.schoolId, table.assessmentDate)]);

export const uploadedFiles = sqliteTable("uploaded_files", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").references(() => assessments.id),
  r2Key: text("r2_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  purpose: text("purpose").notNull(),
  processingStatus: text("processing_status").notNull(),
  ocrText: text("ocr_text"),
  ...timestamps,
}, table => [index("uploaded_files_assessment_idx").on(table.assessmentId)]);

export const gradeResults = sqliteTable("grade_results", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id),
  fileId: text("file_id").notNull().references(() => uploadedFiles.id),
  studentId: text("student_id").references(() => students.id),
  studentName: text("student_name").notNull(),
  questionPaperFileId: text("question_paper_file_id"),
  score: integer("score").notNull(),
  maxMarks: integer("max_marks").notNull(),
  confidence: integer("confidence"),
  feedback: text("feedback"),
  gapsJson: text("gaps_json").notNull(),
  teacherStatus: text("teacher_status").notNull().default("Draft"),
  gradingVersion: integer("grading_version").notNull().default(1),
  ...timestamps,
}, table => [
  uniqueIndex("grade_results_assessment_file_version_uq").on(table.assessmentId, table.fileId, table.gradingVersion),
  index("grade_results_student_idx").on(table.studentId),
]);

export const interventions = sqliteTable("interventions", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id),
  concept: text("concept").notNull(),
  format: text("format").notNull(),
  duration: text("duration").notNull(),
  status: text("status").notNull(),
  followupDate: text("followup_date"),
  planJson: text("plan_json").notNull().default("{}"),
  ...timestamps,
});

export const resources = sqliteTable("resources", {
  id: text("id").primaryKey(),
  interventionId: text("intervention_id").references(() => interventions.id),
  title: text("title").notNull(),
  resourceType: text("resource_type").notNull(),
  status: text("status").notNull(),
  contentJson: text("content_json").notNull(),
  ...timestamps,
});

export const followupEvidence = sqliteTable("followup_evidence", {
  id: text("id").primaryKey(),
  interventionId: text("intervention_id").notNull().references(() => interventions.id),
  evidenceType: text("evidence_type").notNull(),
  studentsCompleted: integer("students_completed").notNull(),
  averageMastery: integer("average_mastery"),
  outcome: text("outcome").notNull(),
  notes: text("notes"),
  recordedAt: text("recorded_at").notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  detailJson: text("detail_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
}, table => [index("audit_events_school_created_idx").on(table.schoolId, table.createdAt)]);

// The current client is an offline-capable workspace. This authoritative
// snapshot makes every existing workflow durable while normalized tables
// support incremental server-side features and reporting.
export const workspaceSnapshots = sqliteTable("workspace_snapshots", {
  workspaceId: text("workspace_id").primaryKey(),
  stateJson: text("state_json").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

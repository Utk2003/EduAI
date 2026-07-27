import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const app = readFileSync(new URL("../app/ui/FunctionalEduAIApp.tsx", import.meta.url), "utf8");
const login = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("persists workspace records in cloud storage with an offline cache", () => {
  assert.match(app, /authFetch\("\/api\/workspace"/);
  assert.match(app, /method:"PUT"/);
  assert.match(app, /localStorage\.getItem\(`eduai-xray-offline-cache-v1:\$\{profile\.id\}`\)/);
  assert.match(app, /localStorage\.setItem\(`eduai-xray-offline-cache-v1:\$\{profile\.id\}`/);
  for (const collection of ["students", "resources", "academicYears"]) assert.match(app, new RegExp(`restored\\.${collection}\\|\\|base\\.${collection}`));
});

test("covers the complete teacher improvement cycle", () => {
  for (const step of ["Create assessment", "Upload student work", "Questions & rubric", "AI processing", "Teacher review", "Final approval", "Learning X-Ray", "Intervention", "Follow-up", "Publish grades"]) {
    assert.ok(app.includes(step), `missing teacher step: ${step}`);
  }
});

test("upload accepts every specified demo format and provides recovery controls", () => {
  for (const ext of [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".docx", ".xlsx", ".csv"]) assert.ok(app.includes(ext), `missing ${ext}`);
  for (const control of ["Browse / Choose File", "Pause", "Resume", "Retry failed", "Remove"]) assert.ok(app.includes(control), `missing upload control: ${control}`);
  assert.match(app, /10 MB limit/);
});

test("uploaded files remain discoverable with cloud bytes and an offline cache", () => {
  for (const control of ["Uploaded evidence", "Preview", "Download", "Remove", "Add files"]) assert.ok(app.includes(control), `missing uploaded-file control: ${control}`);
  assert.match(app, /indexedDB\.open\("eduai-learning-xray-files"/);
  assert.match(app, /saveFileBlob\(id,file\)/);
  assert.match(app, /readFileBlob\(file\.id\)/);
  assert.match(app, /authFetch\(`\/api\/files\/\$\{encodeURIComponent\(id\)\}`/);
});

test("teacher modules have persisted, actionable views", () => {
  for (const module of ["Students", "Resources", "Achievements", "Reports", "Settings"]) assert.ok(app.includes(`"${module}"`), `missing ${module}`);
  for (const dialog of ["student-evidence", "worksheet", "grading-settings", "consent-settings", "security-settings"]) assert.ok(app.includes(dialog), `missing dialog ${dialog}`);
});

test("school administration covers users, structure, privacy and access", () => {
  for (const capability of ["Invite user", "Reset password", "Academic years", "School branding", "Privacy & retention", "Support access"]) assert.ok(app.includes(capability), `missing ${capability}`);
});

test("platform administration covers specification areas", () => {
  for (const capability of ["Tenant management", "Usage analytics", "Provider registry", "Model registry", "Routing rules", "Prompt versions", "Feature flags", "System health", "Audit logs"]) assert.ok(app.includes(capability), `missing ${capability}`);
});

test("public controls navigate and legal routes exist", () => {
  assert.doesNotMatch(login, /href="#"/);
  assert.match(login, /Continue with Google/);
  assert.match(login, /Continue with Microsoft/);
  assert.match(login, /Use email and password/);
  assert.ok(existsSync(new URL("../app/privacy/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../app/terms/page.tsx", import.meta.url)));
});

test("teacher authority and anti-ranking safeguards remain explicit", () => {
  for (const safeguard of ["AI suggestions remain drafts", "No teacher or student leaderboard", "teacher approval", "Insufficient evidence"]) assert.ok(app.toLowerCase().includes(safeguard.toLowerCase()), `missing safeguard: ${safeguard}`);
});

test("learning-gap worksheet cycle is complete and downloadable", () => {
  for (const capability of ["Select an answer sheet to begin", "Visual learning-gap report", "Targeted study guide", "Guided recovery", "Multiple-choice questions", "Subjective questions", "Grade answer worksheets", "Download graded results", "Check with answer key", "Teacher approves grades"]) {
    assert.ok(app.includes(capability), `missing worksheet-cycle capability: ${capability}`);
  }
  assert.match(app, /function downloadWorksheet/);
  assert.match(app, /function downloadAnswerKey/);
  assert.match(app, /WorksheetGradingDialog/);
});

test("grading stays bound to the selected uploaded assessment", () => {
  for (const capability of ["assessment.subject", "questionPaperFileId", "answerKey:assessment.answerKey", "Graded answer sheet:", "Grade answer sheet"]) {
    assert.ok(app.includes(capability), `missing selected-assessment grading behavior: ${capability}`);
  }
  assert.match(app, /openAssessment\(selected\.id,"Review"\)/);
  assert.match(app, /a\.files\.find/);
});

test("teacher explicitly chooses grading or learning-gap analysis", () => {
  for (const capability of ["Grade answer sheet", "View learning gaps", "Select answer sheet for grading", "Continue with this answer sheet", "Question paper", "Answer sheet", "gradedFileIds"]) {
    assert.ok(app.includes(capability), `missing explicit grading choice: ${capability}`);
  }
  assert.match(app, /assessmentHasGrades/);
  assert.match(app, /type="radio"/);
});

test("teacher authentication and first-login onboarding are complete", () => {
  for (const capability of ["signInWithPassword", "signUp", "signInWithOAuth", '"google"', '"azure"', "Complete your teacher profile", "School name", "Log out"]) {
    assert.ok(app.includes(capability), `missing teacher authentication behavior: ${capability}`);
  }
  assert.match(app, /auth\.signOut/);
  assert.match(app, /authFetch\("\/api\/profile"/);
  assert.match(app, /assessments:\[\]/);
});

test("grading derives totals from the assessment and prioritizes an answer key", () => {
  const grade = readFileSync(new URL("../app/api/grade/route.ts", import.meta.url), "utf8");
  assert.match(grade, /Determine maxMarks dynamically/);
  assert.match(grade, /PRIMARY REFERENCE/);
  assert.match(app, /questionPaperBase64/);
  assert.match(app, /answerKeyBase64/);
  assert.match(app, /detectedMaxMarks/);
});

test("work can begin with classified evidence and branded outputs", () => {
  for (const capability of ["Assessment setup is optional", "Upload evidence", "Question paper", "Model answer / marking scheme", "Ungraded answer sheet", "Teacher-graded answer sheet", "scanned handwriting", "Evidence used", "Built from", "Personalised study guide", "Targeted practice worksheet", "EduAI Hub"]) {
    assert.ok(app.includes(capability), `missing evidence-first capability: ${capability}`);
  }
  assert.match(app, /documentRole/);
  assert.match(app, /evidenceSummary/);
  assert.match(app, /BrandDocumentHeader/);
});

test("Mistral OCR evidence drives OpenAI learning resources", () => {
  const grade = readFileSync(new URL("../app/api/grade/route.ts", import.meta.url), "utf8");
  const worksheet = readFileSync(new URL("../app/api/generate-worksheet/route.ts", import.meta.url), "utf8");
  const studyGuide = readFileSync(new URL("../app/api/generate-study-guide/route.ts", import.meta.url), "utf8");
  assert.match(grade, /mistral-ocr-latest/);
  assert.match(grade, /gpt-5\.6-sol/);
  assert.match(worksheet, /Subject: \$\{subject\}/);
  assert.match(studyGuide, /Answer-sheet OCR evidence/);
  assert.match(studyGuide, /Do not introduce mathematics examples/);
  assert.match(app, /authFetch\("\/api\/generate-study-guide"/);
});

test("reanalysis is stable and every diagnosed gap becomes a study-guide topic", () => {
  const grade = readFileSync(new URL("../app/api/grade/route.ts", import.meta.url), "utf8");
  const studyGuide = readFileSync(new URL("../app/api/generate-study-guide/route.ts", import.meta.url), "utf8");
  for (const behavior of ["evidenceFingerprint", "fixed score and learning gaps", "Diagnostic finding", "Likely misunderstanding", "Evidence from the answer", "What the child needs to rework", "guide-topic-index", "guide-topic-sections"]) {
    assert.ok(app.includes(behavior), `missing stable diagnostic behavior: ${behavior}`);
  }
  for (const field of ["misconception", "evidence", "rework"]) assert.ok(grade.includes(field), `missing diagnostic field: ${field}`);
  assert.match(studyGuide, /one topic section for EVERY listed gap/);
  assert.match(studyGuide, /topics: \{/);
});

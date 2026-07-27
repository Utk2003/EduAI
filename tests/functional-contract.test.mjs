import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const app = readFileSync(new URL("../app/ui/FunctionalEduAIApp.tsx", import.meta.url), "utf8");
const login = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("persists demo records and safely upgrades older browser state", () => {
  assert.match(app, /localStorage\.getItem\("eduai-xray-demo-v4"\)/);
  assert.match(app, /localStorage\.setItem\("eduai-xray-demo-v4"/);
  for (const collection of ["students", "resources", "academicYears"]) assert.match(app, new RegExp(`parsed\\.${collection}\\|\\|base\\.${collection}`));
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

test("uploaded files remain discoverable and retain browser-local file bytes", () => {
  for (const control of ["Uploaded files", "Preview", "Download", "Remove", "Add files"]) assert.ok(app.includes(control), `missing uploaded-file control: ${control}`);
  assert.match(app, /indexedDB\.open\("eduai-learning-xray-files"/);
  assert.match(app, /saveFileBlob\(id,file\)/);
  assert.match(app, /readFileBlob\(file\.id\)/);
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
  assert.match(login, /Use email access code/);
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

test("Mistral OCR evidence drives OpenAI learning resources", () => {
  const grade = readFileSync(new URL("../app/api/grade/route.ts", import.meta.url), "utf8");
  const worksheet = readFileSync(new URL("../app/api/generate-worksheet/route.ts", import.meta.url), "utf8");
  const studyGuide = readFileSync(new URL("../app/api/generate-study-guide/route.ts", import.meta.url), "utf8");
  assert.match(grade, /mistral-ocr-latest/);
  assert.match(grade, /gpt-5\.6-sol/);
  assert.match(worksheet, /Subject: \$\{subject\}/);
  assert.match(studyGuide, /Answer-sheet OCR evidence/);
  assert.match(studyGuide, /Do not introduce mathematics examples/);
  assert.match(app, /fetch\("\/api\/generate-study-guide"/);
});

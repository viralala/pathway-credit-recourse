/** Scores the raw test applicants from ml/export_parity.py with the app's model and compares with Python. */
import fs from "node:fs";
import path from "node:path";
import { PARITY_TOLERANCE, auditRecourse, compareParity, type ParityFile } from "../lib/parity";

const file = path.resolve(__dirname, "../data/parity_test.json");
if (!fs.existsSync(file)) {
  console.error("data/parity_test.json not found. Run `python ml/export_parity.py` first (needs data/cs-training.csv).");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, "utf8")) as ParityFile;
const r = compareParity(data);
console.log(`rows compared            ${r.rows.toLocaleString("en-US")}`);
console.log(`max probability diff     ${r.maxProbabilityDiff.toExponential(3)}  (tolerance ${PARITY_TOLERANCE})`);
console.log(`mean probability diff    ${r.meanProbabilityDiff.toExponential(3)}`);
console.log(`probability mismatches   ${r.probabilityMismatches}`);
console.log(`decision mismatches      ${r.decisionMismatches}`);
console.log(`approved / rejected      ${r.approved.toLocaleString("en-US")} / ${r.rejected.toLocaleString("en-US")}`);
console.log(`cut-off matches          ${r.cutoffMatches}`);
for (const b of r.boundary)
  console.log(`  p = ${String(b.probability).padEnd(20)} python ${b.pythonApproved ? "approve" : "reject "}  app ${b.appApproved ? "approve" : "reject "}`);
console.log(`boundary mismatches      ${r.boundaryMismatches}`);
console.log(r.pass ? "PARITY PASS" : "PARITY FAIL");

// Every recourse result for the applicants Python rejects, re-checked against the model itself.
const audit = auditRecourse(data);
console.log(`\nrejected applicants      ${audit.rejected.toLocaleString("en-US")}`);
console.log(`plans returned           ${audit.plans.toLocaleString("en-US")}`);
console.log(`  approved by the model  ${audit.plansApprovedByModel.toLocaleString("en-US")}`);
console.log(`no feasible plan         ${audit.infeasible.toLocaleString("en-US")}`);
console.log(`invalid plans            ${audit.invalid}`);
for (const p of audit.problems) console.log(`  row ${p.id}: ${p.problem}`);
const recourseOk = audit.invalid === 0 && audit.plans === audit.plansApprovedByModel;
console.log(recourseOk ? "RECOURSE PASS" : "RECOURSE FAIL");
process.exit(r.pass && recourseOk ? 0 : 1);

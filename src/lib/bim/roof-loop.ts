/**
 * Roof verifier bot.
 * Evidence first (bible + section views + field walkthroughs), then geometry.
 * Do not stamp a screenshot. Do not delete must-fail rows to go green.
 */
import { ROOF_MUST, ROOF_SECTION_EVIDENCE, ROOF_SEQUENCE, ROOF_WALKTHROUGHS } from "./roof-canon";
import { verifyRoof, type RoofRow } from "./roof-verify";
import type { BoxSpec, BuildingProgram } from "./types";

export type RoofEvidence = {
  id: string;
  title: string;
  src?: string;
  url?: string;
  shows: string;
};

export type RoofLoopReport = {
  phase: "evidence" | "geometry" | "repair";
  evidence: RoofEvidence[];
  walkthroughs: { url: string; title: string; takeaway: string }[];
  bible: string[];
  rows: RoofRow[];
  green: boolean;
  repairs: string[];
};

const BIBLE = [
  "m-P09-rafter-stick — commons to ridge, birdsmouth at plate",
  "m-P09-roof-sheathing — 7/16 OSB, 8d 6/12, stagger joints",
  "m-P09-roof-felt — 3-ft felt, 2-in top / 4-in side. Ice is Logan P09, not Fontana",
  "m-P11-asphalt-shingles-finish — starter ≥½ in past fascia, four nails, courses to ridge",
];

function ofKind(boxes: BoxSpec[], kind: string) {
  return boxes.filter((b) => b.kind === kind);
}

function repairsFor(p: BuildingProgram, boxes: BoxSpec[], rows: RoofRow[]): string[] {
  const out: string[] = [];
  if (p.roof !== "gable") return out;
  for (const r of rows) {
    if (r.mustFail || r.gate !== "fail") continue;
    if (r.id === "COM-ROOF-SLOPE") out.push("Pitch every shingle-course with |rx| ≥ 0.18. No stair boxes.");
    if (r.id === "COM-ROOF-APEX") out.push("Last field course must meet the ridge cap (extend s1 to slope length).");
    if (r.id === "COM-ROOF-DRIP-EAVE") out.push("L-drip at both eaves: deck flange + fascia kick.");
    if (r.id === "COM-ROOF-DRIP-RAKE") out.push("Rake drip OVER felt on both gables.");
    if (r.id === "COM-ROOF-ICE-FELT") out.push("Ice at eave, then felt up-slope. Logan ice is P09.");
    if (r.id === "COM-ROOF-STARTER") out.push("Starter at both eaves, overhang ¼–¾ in past drip.");
    if (r.id === "COM-ROOF-VENT-CAP") out.push("Ridge vent then ridge cap last.");
    if (r.id === "COM-ROOF-EAVE-WOOD") out.push("Sub-fascia on rafter tails, fascia face, gutter on fascia.");
    if (r.id === "COM-ROOF-RAFTER-DECK") out.push("Commons + OSB deck before dry-in.");
    if (r.id === "COM-ROOF-SEQUENCE") out.push(`File missing kinds: ${ROOF_SEQUENCE.filter((s) => ofKind(boxes, s.kind).length === 0).map((s) => s.kind).join(", ")}`);
  }
  return out;
}

/** Run BEFORE trusting geometry. Evidence is the contract. */
export function runRoofLoop(p: BuildingProgram, boxes: BoxSpec[]): RoofLoopReport {
  const evidence: RoofEvidence[] = ROOF_SECTION_EVIDENCE.map((e) => ({
    id: e.id,
    title: e.title,
    src: e.src,
    url: e.url,
    shows: e.shows,
  }));
  const rows = verifyRoof(p, boxes);
  const live = rows.filter((r) => !r.mustFail);
  const green = live.every((r) => r.gate !== "fail");
  const repairList = repairsFor(p, boxes, rows);
  return {
    phase: green ? "geometry" : "repair",
    evidence,
    walkthroughs: ROOF_WALKTHROUGHS.map((w) => ({ url: w.url, title: w.title, takeaway: w.takeaway })),
    bible: BIBLE,
    rows,
    green,
    repairs: repairList,
  };
}

export const ROOF_LOOP_PROMPT = `You are the roof committee bot. You do not invent layers. You do not stamp a live camera.

0. EVIDENCE FIRST (skip none)
   - Bible: m-P09-rafter-stick, m-P09-roof-sheathing, m-P09-roof-felt, m-P11-asphalt-shingles-finish
   - Section views in /roof-section/ (anatomy cutaway, eave soffit/fascia, drip, ridge)
   - Field: Essential Craftsman Ep.77 (drip → starter → field); iCreatables (eave drip → paper → rake drip → starter → courses → ridge cap LAST)
   - IRC R905.2.8.5: eave drip UNDER underlayment; rake drip OVER
   - Logan ice is P09 / city sheet. Do not copy a Utah ice pack onto Fontana.

1. CANON SEQUENCE (kinds must exist)
   rafter → roof-deck → drip-edge (eave L) → ice-barrier → felt → rake-drip → starter → shingle-course (pitched, to apex) → ridge-vent → ridge-cap → sub-fascia + fascia + gutter

2. GEOMETRY
   - |rx| of shingle-course ≥ ${ROOF_MUST.minPitchRad} rad (not stair boxes)
   - last course meets ridge (shingle top ≥ ridgeY − 0.12 m)
   - both eaves: L-drip + sub-fascia (FLAT edge) + fascia + gutter
   - both rakes: drip over felt
   - starter both eaves, ice then felt up-slope
   - ridge vent under ridge cap
   - COM-MUSTFAIL-FLATROOF stays fail

3. REPAIR
   If committee is red: add the missing kind / pitch the plane / extend the last course.
   Do not delete the must-fail row. Max two repair passes, then emit the report with the section images.

4. OUTPUT
   Stamp + rows + section evidence. Live camera is not a shop-drawing stamp.
`;

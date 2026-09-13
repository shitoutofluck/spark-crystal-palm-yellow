import { ROOF_MUST, ROOF_SEQUENCE } from "./roof-canon";
import type { BoxSpec, BuildingProgram } from "./types";

export type RoofGate = "pass" | "warn" | "fail";

export type RoofRow = {
  id: string;
  title: string;
  citation: string;
  gate: RoofGate;
  detail: string;
  mustFail?: boolean;
};

function ofKind(boxes: BoxSpec[], kind: string) {
  return boxes.filter((b) => b.kind === kind);
}

/** Committee for the pitched roof. Run after geometry exists. */
export function verifyRoof(p: BuildingProgram, boxes: BoxSpec[]): RoofRow[] {
  if (p.roof !== "gable") {
    return [
      {
        id: "COM-ROOF-SCOPE",
        title: "Pitched shingle canon applies to gable",
        citation: "bible m-P11-asphalt-shingles-finish",
        gate: "pass",
        detail: `${p.roof} — shingle loop skipped`,
      },
    ];
  }

  const shingles = ofKind(boxes, "shingle-course");
  const pitched = shingles.filter((b) => Math.abs(b.rx) >= ROOF_MUST.minPitchRad);
  const ridgeY = Math.max(0, ...ofKind(boxes, "ridge").map((b) => b.y + b.h / 2));
  const shingleTop = Math.max(
    0,
    ...shingles.map((b) => b.y + Math.abs(Math.sin(b.rx)) * (b.d / 2) + b.h / 2),
  );
  const drip = ofKind(boxes, "drip-edge");
  const rake = ofKind(boxes, "rake-drip");
  const ice = ofKind(boxes, "ice-barrier");
  const felt = ofKind(boxes, "felt");
  const starter = ofKind(boxes, "starter");
  const cap = ofKind(boxes, "ridge-cap");
  const vent = ofKind(boxes, "ridge-vent");
  const sub = ofKind(boxes, "sub-fascia");
  const rafters = ofKind(boxes, "rafter");
  const deck = ofKind(boxes, "roof-deck");
  const seqMissing = ROOF_SEQUENCE.filter((s) => ofKind(boxes, s.kind).length === 0).map((s) => s.kind);

  return [
    {
      id: "COM-ROOF-SLOPE",
      title: "Shingle courses lie on the pitch, not stair boxes",
      citation: "Section evidence /roof-section/anatomy.jpg · bible m-P11 courses up the slope",
      gate: pitched.length >= ROOF_MUST.minCoursesPerSlope * 2 ? "pass" : "fail",
      detail: `${pitched.length}/${shingles.length} courses with |rx|≥${ROOF_MUST.minPitchRad} rad`,
    },
    {
      id: "COM-ROOF-APEX",
      title: "Field shingles reach the ridge cap",
      citation: "iCreatables: ridge cap LAST after courses meet · Owens Corning ridge",
      gate: cap.length > 0 && shingleTop >= ridgeY - 0.12 ? "pass" : "fail",
      detail: `shingle top ${shingleTop.toFixed(2)} m · ridge ${ridgeY.toFixed(2)} m · caps ${cap.length}`,
    },
    {
      id: "COM-ROOF-DRIP-EAVE",
      title: "Eave drip edge both eaves (L-metal under underlayment)",
      citation: "IRC R905.2.8.5 · ARMA · EC Ep.77 first metal on every pitch",
      gate: drip.length >= 4 ? "pass" : "fail",
      detail: `${drip.length} drip pieces (need L flange × 2 eaves)`,
    },
    {
      id: "COM-ROOF-DRIP-RAKE",
      title: "Rake drip over underlayment at both gables",
      citation: "IRC R905.2.8.5 — underlayment under drip at rakes, over drip at eaves",
      gate: rake.length >= 4 ? "pass" : "fail",
      detail: `${rake.length} rake-drip strips`,
    },
    {
      id: "COM-ROOF-ICE-FELT",
      title: "Ice at eave then felt up the slope",
      citation: "bible m-P09-roof-felt · CMHC Fig 100 eave protection is P09, not Fontana ice",
      gate: ice.length >= 2 && felt.length >= 2 ? "pass" : "fail",
      detail: `${ice.length} ice · ${felt.length} felt`,
    },
    {
      id: "COM-ROOF-STARTER",
      title: "Starter course at both eaves",
      citation: "bible m-P11 starter ≥½ in past fascia · EC Ep.77 adhesive at the drip",
      gate: starter.length >= 2 ? "pass" : "fail",
      detail: `${starter.length} starter runs`,
    },
    {
      id: "COM-ROOF-VENT-CAP",
      title: "Ridge vent under ridge cap",
      citation: "Owens Corning anatomy — vent then hip/ridge shingles",
      gate: vent.length > 0 && cap.length > 0 ? "pass" : "fail",
      detail: `${vent.length} vent · ${cap.length} cap`,
    },
    {
      id: "COM-ROOF-EAVE-WOOD",
      title: "Sub-fascia + fascia at the flat eave",
      citation: "/roof-section/eave-drip.jpg — fascia takes gutter, drip kicks past it",
      gate: sub.length >= 2 ? "pass" : "fail",
      detail: `${sub.length} sub-fascia`,
    },
    {
      id: "COM-ROOF-RAFTER-DECK",
      title: "Commons and deck before dry-in",
      citation: "bible m-P09-rafter-stick + m-P09-roof-sheathing",
      gate: rafters.length >= 8 && deck.length >= 2 ? "pass" : "fail",
      detail: `${rafters.length} rafters · ${deck.length} deck planes`,
    },
    {
      id: "COM-ROOF-SEQUENCE",
      title: "Canon sequence present (no skipped layer)",
      citation: ROOF_SEQUENCE.map((s) => s.kind).join(" → "),
      gate: seqMissing.length === 0 ? "pass" : "fail",
      detail: seqMissing.length ? `missing ${seqMissing.join(", ")}` : "all 11 layers filed",
    },
    {
      id: "COM-MUSTFAIL-FLATROOF",
      title: "Must-fail: gable shingles as unpitched eave slabs",
      citation: "Negative control — stair-step boxes are not a roof plane",
      gate: "fail",
      detail: "Hypothetical axis-aligned shingle slabs — checker stays red on purpose",
      mustFail: true,
    },
  ];
}

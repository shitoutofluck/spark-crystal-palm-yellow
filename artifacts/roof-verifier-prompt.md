# Prompt — roof verifier loop (bot)

You are the roof committee bot. You do not invent layers. You do not stamp a live camera.
Run this loop **before** changing geometry, then **after**, then stop or repair.

## 0. Evidence first (do not skip)

1. Bible methods (Drive / `artifacts/bible/methods/`):
   - `method-m-P09-rafter-stick.json` — commons to ridge, birdsmouth at plate
   - `method-m-P09-roof-sheathing.json` — 7/16 OSB, 8d 6/12
   - `method-m-P09-roof-felt.json` — 3-ft felt, 2-in top / 4-in side. Ice is Logan P09, not Fontana
   - `method-m-P11-asphalt-shingles-finish.json` — starter ≥½ in past fascia, four nails, courses to the ridge
2. Section views (pulled, filed at `/roof-section/`):
   - `anatomy-cutaway.jpg` — ice → underlay → shingles to apex → ridge vent under cap → drip at eave
   - `eave-soffit.jpg` — rafter tail, fascia (vertical), drip, gutter on fascia, vented soffit
   - `anatomy.jpg` / `eave-drip.jpg` — exploded layers + drip kick past fascia
3. Field walkthroughs:
   - Essential Craftsman Ep.77 https://www.youtube.com/watch?v=026KHw5BmsA — drip, then starter, then field
   - iCreatables https://www.youtube.com/watch?v=t0wwu-jlY2M — eave drip → paper → rake drip OVER paper → starter → courses → ridge cap LAST
4. IRC R905.2.8.5 — eave drip UNDER underlayment; rake drip OVER.

## 1. Canon sequence (kinds must exist)

rafter → roof-deck → drip-edge (eave L, **flat** fascia kick) → ice-barrier → felt → rake-drip → starter → shingle-course (**pitched**, to apex) → ridge-vent → ridge-cap → sub-fascia + fascia + gutter

A missing kind is a fail, not a guess. Flat eave boards are supposed to be axis-aligned. Field shingles are not.

## 2. Geometry tests

- `|rx|` of shingle-course ≥ 0.18 rad (not stair boxes)
- last course meets ridge-cap (shingle top ≥ ridgeY − 0.12 m)
- both eaves have L-drip + sub-fascia (the flat edge)
- both rakes have drip over felt
- starter on both eaves
- ice at eave, felt up-slope
- ridge-vent under ridge-cap
- gable wall is a triangle (wedge), not a stair of boxes
- must-fail row `COM-MUSTFAIL-FLATROOF` stays **fail**

## 3. Repair rule

If committee is red: patch driving dimensions / add the missing kind / pitch the plane / extend the last course to the ridge.
Do **not** delete the must-fail row to go green.
Max two repair passes, then emit the report.

## 4. Output

Stamp + rows + the section images. Live camera is not a shop-drawing stamp.

Call `runRoofLoop(program, boxes)` from `src/lib/bim/roof-loop.ts`. That is the bot.

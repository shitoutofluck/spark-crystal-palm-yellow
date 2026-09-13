/** Roof assembly canon — pulled BEFORE geometry is trusted.
 * Sources: construction bible P09/P11, IRC R905.2.8.5, ARMA drip-edge, Essential Craftsman Ep.77, iCreatables shed roof.
 * Section evidence lives at /roof-section/*.jpg
 */

export const ROOF_SECTION_EVIDENCE = [
  {
    id: "anatomy-cutaway",
    src: "/roof-section/anatomy-cutaway.jpg",
    title: "Cutaway: ice → underlayment → shingles → ridge vent/cap",
    shows: "OSB deck, ice & water at eave, synthetic underlay, architectural shingles up the slope, ridge vent under cap, drip at eave",
    url: "https://www.nearbyhunt.com/articles/roof-components-explained",
  },
  {
    id: "eave-soffit",
    src: "/roof-section/eave-soffit.jpg",
    title: "Eave section: soffit / fascia / drip / gutter",
    shows: "Rafter tail → sub-fascia/fascia (vertical) → drip edge → gutter on fascia; vented soffit; shingles on deck",
    url: "https://northernlightsexteriors.com/blog/soffit-and-fascia-diagram/",
  },
  {
    id: "anatomy",
    src: "/roof-section/anatomy.jpg",
    title: "Roof anatomy (exploded)",
    shows: "Deck → ice & water → underlayment → starter → field shingles → drip edge → ridge vent → ridge cap",
    url: "https://www.feazelinc.com/blog/p.220311000/your-residential-roof-is-made-up-of-many-different-components/",
  },
  {
    id: "eave-drip",
    src: "/roof-section/eave-drip.jpg",
    title: "Eave: shingles / drip / fascia / gutter",
    shows: "Drip kicks past fascia; gutter hangs on fascia; shingles overhang drip ¼–¾ in",
    url: "https://jdhremodeling.com/learning-center/drip-edge-explained/",
  },
] as const;

export const ROOF_SEQUENCE = [
  { step: 1, kind: "rafter", cite: "bible m-P09-rafter-stick — commons to ridge, birdsmouth at plate" },
  { step: 2, kind: "roof-deck", cite: "bible m-P09-roof-sheathing — 7/16 OSB, 8d 6/12" },
  { step: 3, kind: "drip-edge", cite: "IRC R905.2.8.5 + ARMA: eave drip UNDER underlayment; rake OVER" },
  { step: 4, kind: "ice-barrier", cite: "bible m-P09-roof-felt / Logan ice — eave membrane, not Fontana snow pack" },
  { step: 5, kind: "felt", cite: "bible m-P09-roof-felt — 3-ft rolls, 2-in top / 4-in side lap (FM 5-426)" },
  { step: 6, kind: "rake-drip", cite: "IRC R905.2.8.5 rake drip OVER underlayment" },
  { step: 7, kind: "starter", cite: "bible m-P11 + EC Ep.77 — starter at drip, ¼–¾ in overhang, nails 12 in" },
  { step: 8, kind: "shingle-course", cite: "bible m-P11 — courses to the ridge, 5-in exposure, four nails" },
  { step: 9, kind: "ridge-vent", cite: "Owens Corning anatomy — exhaust at apex under cap" },
  { step: 10, kind: "ridge-cap", cite: "bible m-P11 / iCreatables — cap last, after field courses meet" },
  { step: 11, kind: "sub-fascia", cite: "eave section — 2×8 nailer on rafter tails, fascia face, gutter" },
] as const;

export const ROOF_WALKTHROUGHS = [
  {
    url: "https://www.youtube.com/watch?v=026KHw5BmsA",
    title: "Installing Asphalt Shingles Ep.77",
    channel: "Essential Craftsman",
    takeaway: "Every pitch starts drip edge, then starter, then field. Starter gives adhesive at the drip and a clean edge into the gutter.",
  },
  {
    url: "https://www.youtube.com/watch?v=t0wwu-jlY2M",
    title: "Install Asphalt Shingles On Shed Roof",
    channel: "iCreatables",
    takeaway: "Eave drip → building paper → rake drip OVER paper → chalk 12 in → starter ⅜ in overhang → courses offset 6 in → ridge cap last.",
  },
] as const;

export const ROOF_MUST = {
  minCoursesPerSlope: 8,
  minPitchRad: 0.18,
  starterOverhangM: 0.006,
  dripBelowSheathingM: 0.006,
  iceUpSlopeM: 0.6,
} as const;

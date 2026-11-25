/** Software GL cannot run the full PBR/post stack. Real GPUs get PBR + IBL + AO.
 *  Transfer override: ?gpu=full  or  localStorage layerworks.gpu=full
 */
export let liteGpu = true;

export type GpuReport = {
  lite: boolean;
  forced: boolean;
  renderer: string;
  vendor: string;
  maxAniso: number;
  floatTex: boolean;
  drawBuffers: boolean;
  compileOk: boolean | null;
  compileMs: number | null;
  err: string | null;
};

export const gpuReport: GpuReport = {
  lite: true,
  forced: false,
  renderer: "unknown",
  vendor: "",
  maxAniso: 1,
  floatTex: false,
  drawBuffers: false,
  compileOk: null,
  compileMs: null,
  err: null,
};

export function wantFullGpu(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("gpu") === "lite" || q.get("gpu") === "0") return false;
    if (q.get("gpu") === "full" || q.get("gpu") === "1") return true;
    return window.localStorage.getItem("layerworks.gpu") === "full";
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();
export function onGpuMode(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLiteGpu(v: boolean) {
  if (liteGpu === v) return;
  liteGpu = v;
  gpuReport.lite = v;
  for (const fn of listeners) fn();
}

export function detectLiteGpu(gl: { getContext: () => WebGLRenderingContext | WebGL2RenderingContext | null }) {
  if (wantFullGpu()) {
    gpuReport.forced = true;
    return false;
  }
  const ctx = gl.getContext();
  if (!ctx) return true;
  const ext = ctx.getExtension("WEBGL_debug_renderer_info");
  const name = ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
  const vendor = ext ? String(ctx.getParameter(ext.UNMASKED_VENDOR_WEBGL)) : "";
  gpuReport.renderer = name || "hidden";
  gpuReport.vendor = vendor;
  const aniso = ctx.getExtension("EXT_texture_filter_anisotropic");
  gpuReport.maxAniso = aniso ? Number(ctx.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) || 1 : 1;
  gpuReport.floatTex = Boolean(ctx.getExtension("OES_texture_float") || ctx.getExtension("EXT_color_buffer_float"));
  gpuReport.drawBuffers = Boolean(ctx.getExtension("WEBGL_draw_buffers") || "drawBuffers" in ctx);
  return /swiftshader|llvmpipe|softpipe|basic render|subzero/i.test(name);
}

if (typeof window !== "undefined") {
  const forced = wantFullGpu();
  liteGpu = !forced;
  gpuReport.lite = liteGpu;
  gpuReport.forced = forced;
}

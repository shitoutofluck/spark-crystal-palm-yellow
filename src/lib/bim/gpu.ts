/** Software GL (SwiftShader etc.) cannot run the post/PBR stack. */
export let liteGpu = true;

export function setLiteGpu(v: boolean) {
  liteGpu = v;
}

export function detectLiteGpu(gl: { getContext: () => WebGLRenderingContext | WebGL2RenderingContext | null }) {
  const ctx = gl.getContext();
  if (!ctx) return true;
  const ext = ctx.getExtension("WEBGL_debug_renderer_info");
  const name = ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
  return /swiftshader|llvmpipe|softpipe|basic render|subzero/i.test(name);
}

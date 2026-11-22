"use client";

import { useEffect, useRef } from "react";

/**
 * Full-bleed animated colour field (WebGL fragment shader, no library): slow bands of
 * burgundy, signal orange and violet drifting over near-black. Pauses off-screen and
 * renders a single still frame under prefers-reduced-motion.
 */
const FRAG = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
void main(){
  vec2 uv = gl_FragCoord.xy / r;
  vec2 p = vec2(uv.x * r.x / r.y, uv.y);
  p += (m - .5) * .08;
  float a = fbm(p * 1.25 + vec2(t * .030, -t * .018));
  float b = fbm(p * 2.10 - vec2(t * .022, t * .030) + a * 1.4);
  float c = fbm(p * 1.60 + vec2(7.3, 2.1) + vec2(-t * .015, t * .020) + b);
  vec3 col = vec3(.027, .016, .018);
  col += vec3(.50, .05, .13) * smoothstep(.25, .80, a) * .95;          // burgundy body
  col += vec3(1.0, .36, .12) * pow(smoothstep(.45, .92, b), 2.0) * .85; // orange ribbons
  col += vec3(.45, .26, 1.0) * pow(smoothstep(.50, 1.0, c), 1.8) * .55; // violet depth
  col += vec3(1.0, .72, .35) * pow(smoothstep(.72, 1.0, b * a * 1.9), 3.0) * .5; // gold highlights
  float v = smoothstep(1.25, .25, length((uv - vec2(.5, .45)) * vec2(1.25, 1.0)));
  col *= mix(.25, 1.0, v);
  col += (h(gl_FragCoord.xy + t) - .5) * .025; // dither against banding
  gl_FragColor = vec4(col, 1.0);
}`;
const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }";

export function Aurora({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });
    if (!canvas || !gl) return;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, "r");
    const uT = gl.getUniformLocation(prog, "t");
    const uM = gl.getUniformLocation(prog, "m");

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let raf = 0;
    let visible = true;
    const resize = () => {
      // Half resolution: the field is soft by nature and this keeps it cheap on laptops and phones.
      const dpr = Math.min(window.devicePixelRatio, 1.5) * 0.5;
      canvas.width = Math.max(2, Math.floor(canvas.clientWidth * dpr));
      canvas.height = Math.max(2, Math.floor(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const draw = (now: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, still ? 12 : now / 1000);
      gl.uniform2f(uM, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!still && visible) raf = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });
    resize();
    io.observe(canvas);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return <canvas ref={ref} aria-hidden className={className} />;
}

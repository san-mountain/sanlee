import * as THREE from "three";
import { NEO_POST_GLSL } from "./neoPost";

// 빌딩 외벽: 월드 좌표로 창문 격자를 그려서, 인스턴스 크기가 달라도 창문 크기가 일정하다
export function towerMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: {
      ...THREE.UniformsLib.fog,
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      varying vec3 vN;
      void main() {
        vec4 wp = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        vWorld = wp.xyz;
        vN = normal;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: NEO_POST_GLSL + /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vN;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 col = vec3(0.028, 0.032, 0.045);
        if (abs(vN.y) < 0.5) {
          float u = abs(vN.x) > 0.5 ? vWorld.z : vWorld.x;
          vec2 g = vec2(u / 1.3, vWorld.y / 1.9);
          vec2 cell = floor(g);
          vec2 f = fract(g);
          float win = step(0.25, f.x) * step(f.x, 0.75) * step(0.35, f.y) * step(f.y, 0.72);
          float side = abs(vN.x) > 0.5 ? sign(vN.x) * 13.0 : sign(vN.z) * 29.0;
          float h = h21(cell + side + floor(vWorld.xz / 37.0) * 3.7);
          float lit = step(0.88, h);
          // 아주 가끔 꺼졌다 켜지는 창
          lit *= step(0.04, fract(h * 91.0 + uTime * 0.02 * step(0.97, h)));
          vec3 warm = vec3(1.0, 0.72, 0.42);
          vec3 cold = vec3(0.55, 0.85, 1.0);
          vec3 sick = vec3(0.6, 1.0, 0.75);
          float k = h21(cell * 1.7 + 4.0);
          vec3 wc = k < 0.55 ? cold : (k < 0.85 ? warm : sick);
          col += win * (lit * wc * 0.55 + 0.012);
          // 층마다 얇은 띠
          col += step(0.97, fract(vWorld.y / 9.6)) * vec3(0.03, 0.035, 0.05);
          // 아래쪽은 습기로 더 어둡게
          col *= mix(0.55, 1.0, smoothstep(0.0, 12.0, vWorld.y));
        } else {
          col = vec3(0.02, 0.022, 0.03);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
        gl_FragColor.rgb = neoPost(gl_FragColor.rgb);
      }
    `,
  });
}

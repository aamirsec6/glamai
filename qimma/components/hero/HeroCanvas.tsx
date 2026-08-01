"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { AGENTS } from "@/lib/content";
import { useIsMobile } from "@/lib/hooks";

/* ------------------------------------------------------------------ */
/* Fresnel-rim shader for the growth nucleus: dark glass core with a  */
/* teal rim that breathes. view-space fresnel = pow(1 - N·V, p).      */
/* ------------------------------------------------------------------ */
const NUCLEUS_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const NUCLEUS_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fresnel = pow(1.0 - clamp(dot(vNormal, vView), 0.0, 1.0), 2.4);
    float pulse = 0.65 + 0.4 * sin(uTime * 1.1);
    vec3 base = vec3(0.015, 0.03, 0.035);
    vec3 col = base + uColor * fresnel * 1.45 * pulse;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function GrowthNucleus() {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const wire = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#2dd6c8") },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mat.current) mat.current.uniforms.uTime.value = t;

    // Clear idle motion — large enough to read through bloom.
    if (group.current) {
      group.current.position.set(
        Math.sin(t * 0.55) * 0.55,
        Math.sin(t * 0.72) * 0.42 + Math.cos(t * 0.35) * 0.12,
        Math.cos(t * 0.45) * 0.28,
      );
      const breathe = 1 + 0.1 * Math.sin(t * 1.1);
      group.current.scale.setScalar(breathe);
    }

    if (core.current) {
      core.current.rotation.y = t * 0.35;
      core.current.rotation.x = Math.sin(t * 0.4) * 0.35;
      core.current.rotation.z = Math.cos(t * 0.25) * 0.15;
    }
    if (wire.current) {
      wire.current.rotation.y = t * -0.28;
      wire.current.rotation.x = Math.sin(t * 0.3) * 0.4;
    }
    if (glow.current) {
      const g = 1.15 + 0.18 * Math.sin(t * 1.1);
      glow.current.scale.setScalar(g);
      const m = glow.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.12 + 0.08 * Math.sin(t * 1.1);
    }
  });

  return (
    <group ref={group}>
      <mesh ref={glow}>
        <sphereGeometry args={[1.55, 32, 32]} />
        <meshBasicMaterial
          color="#2dd6c8"
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={core}>
        <icosahedronGeometry args={[1.05, 5]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={NUCLEUS_VERT}
          fragmentShader={NUCLEUS_FRAG}
        />
      </mesh>
      {/* structural wire shell, slightly larger, very faint */}
      <mesh ref={wire}>
        <icosahedronGeometry args={[1.32, 1]} />
        <meshBasicMaterial
          color="#2dd6c8"
          wireframe
          transparent
          opacity={0.14}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Agent nodes on inclined elliptical orbits, each tethered to the    */
/* nucleus by a curved filament whose opacity pulses on idle.         */
/* ------------------------------------------------------------------ */
type OrbitSpec = {
  radius: number;
  incline: number;
  phase: number;
  speed: number;
  color: string;
  size: number;
};

function AgentNode({ spec }: { spec: OrbitSpec }) {
  const group = useRef<THREE.Group>(null);
  const lineRef = useRef<any>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const positions = useMemo(
    () => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * spec.speed + spec.phase;
    const x = Math.cos(t) * spec.radius;
    const z = Math.sin(t) * spec.radius * 0.82;
    const y = Math.sin(t + spec.phase) * spec.radius * Math.sin(spec.incline);
    if (group.current) group.current.position.set(x, y, z);

    // filament: quadratic bezier nucleus → mid bow → node
    if (lineRef.current) {
      positions[0].set(0, 0, 0);
      positions[2].set(x, y, z);
      positions[1].set(x * 0.5, y * 0.5 + 0.35, z * 0.5);
      const curve = new THREE.QuadraticBezierCurve3(
        positions[0],
        positions[1],
        positions[2],
      );
      lineRef.current.geometry.setPositions(
        curve.getPoints(16).flatMap((p) => [p.x, p.y, p.z]),
      );
      const mat = lineRef.current.material;
      mat.opacity = 0.14 + 0.1 * Math.sin(clock.elapsedTime * 1.4 + spec.phase);
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity =
        1.6 + 0.7 * Math.sin(clock.elapsedTime * 1.4 + spec.phase);
    }
  });

  return (
    <>
      <Line
        ref={lineRef}
        points={[
          [0, 0, 0],
          [0, 0.1, 0],
          [0, 0.2, 0],
        ]}
        color={spec.color}
        lineWidth={1}
        transparent
        opacity={0.2}
      />
      <group ref={group}>
        <mesh>
          <sphereGeometry args={[spec.size, 20, 20]} />
          <meshStandardMaterial
            ref={matRef}
            color="#0a1416"
            emissive={spec.color}
            emissiveIntensity={1.8}
            roughness={0.3}
          />
        </mesh>
        {/* faint halo ring around each agent */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[spec.size * 1.7, spec.size * 1.85, 32]} />
          <meshBasicMaterial
            color={spec.color}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
}

function AgentsOrbit({ count }: { count: number }) {
  const specs = useMemo<OrbitSpec[]>(
    () =>
      AGENTS.slice(0, count).map((a, i) => ({
        radius: 2.2 + (i % 3) * 0.75,
        incline: 0.25 + (i % 3) * 0.28,
        phase: (i / count) * Math.PI * 2,
        speed: 0.14 + (i % 2) * 0.05,
        color: a.hue,
        size: 0.09 + (i % 3) * 0.02,
      })),
    [count],
  );
  return (
    <group>
      {specs.map((s, i) => (
        <AgentNode key={i} spec={s} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Instanced shards: abstracted map pins (cones), review stars        */
/* (octahedra), ranking bars (boxes) drifting in a wide torus band.   */
/* ------------------------------------------------------------------ */
function ShardField({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2 + Math.random() * 0.6,
        radius: 3.4 + Math.random() * 2.6,
        y: (Math.random() - 0.5) * 3,
        scale: 0.035 + Math.random() * 0.055,
        spin: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.04,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    seeds.forEach((s, i) => {
      const a = s.angle + t * s.speed;
      dummy.position.set(
        Math.cos(a) * s.radius,
        s.y + Math.sin(t * 0.4 + s.spin) * 0.25,
        Math.sin(a) * s.radius * 0.8,
      );
      dummy.rotation.set(s.spin + t * 0.15, s.spin, 0);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#0e1a1c"
        emissive="#2dd6c8"
        emissiveIntensity={0.5}
        roughness={0.4}
        transparent
        opacity={0.55}
      />
    </instancedMesh>
  );
}

/* Star-dust points on a large sphere shell for depth. */
function ParticleField({ count }: { count: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);
  const ref = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.008;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#5eead4"
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  );
}

/* Camera rig: slow dolly-settle on load + pointer parallax lerp. */
function CameraRig() {
  const { camera, pointer } = useThree();
  const settled = useRef(0);
  useFrame((_, delta) => {
    settled.current = Math.min(settled.current + delta * 0.5, 1);
    const ease = 1 - Math.pow(1 - settled.current, 3);
    const baseZ = 9.5 - 2.3 * ease; // 9.5 → 7.2 settle-in
    camera.position.x += (pointer.x * 0.7 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 0.45 + 0.15 - camera.position.y) * 0.04;
    camera.position.z += (baseZ - camera.position.z) * 0.06;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({ mobile }: { mobile: boolean }) {
  return (
    <>
      <color attach="background" args={["#07080a"]} />
      <fog attach="fog" args={["#07080a", 9, 18]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 3]} intensity={0.7} color="#bffcf4" />
      <pointLight position={[0, 0, 0]} intensity={2.2} color="#2dd6c8" distance={7} />
      <GrowthNucleus />
      <AgentsOrbit count={mobile ? 4 : 6} />
      <ShardField count={mobile ? 20 : 48} />
      <ParticleField count={mobile ? 250 : 800} />
      <CameraRig />
      {!mobile && (
        <EffectComposer>
          <Bloom
            intensity={0.55}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.8}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </>
  );
}

/* CSS orb used while the WebGL canvas hydrates (and as a last-resort fallback). */
export function HeroStatic() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 60% 45% at 62% 45%, rgba(45,214,200,0.16), transparent 65%), radial-gradient(ellipse 35% 30% at 62% 45%, rgba(127,240,211,0.1), transparent 70%), var(--bg)",
      }}
    >
      <div
        className="hero-orb-float absolute left-[62%] top-[45%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(45,214,200,0.4), rgba(45,214,200,0.08) 55%, transparent 72%)",
          boxShadow: "0 0 140px 40px rgba(45,214,200,0.16)",
        }}
      />
    </div>
  );
}

export default function HeroCanvas() {
  const mobile = useIsMobile();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  // Pause the render loop entirely once the hero scrolls out of view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Always mount WebGL — decorative idle motion is the hero product shot.
  // (Scroll/Lenis still honor prefers-reduced-motion elsewhere.)
  return (
    <div ref={wrapRef} className="absolute inset-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.4, 9.5], fov: 42 }}
        dpr={[1, mobile ? 1.5 : 2]}
        frameloop={inView ? "always" : "never"}
        gl={{ antialias: !mobile, powerPreference: "high-performance" }}
      >
        <Scene mobile={mobile} />
      </Canvas>
    </div>
  );
}

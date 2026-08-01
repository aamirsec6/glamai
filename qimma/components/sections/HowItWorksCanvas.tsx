"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AGENTS } from "@/lib/content";
import { useIsMobile } from "@/lib/hooks";

export type ProgressRef = MutableRefObject<number>;

/* Stage windows across scroll progress p ∈ [0,1] */
const stageLocal = (p: number, start: number, end: number) =>
  THREE.MathUtils.clamp((p - start) / (end - start), 0, 1);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function Nucleus() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.1;
  });
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial
          color="#0c1a1c"
          emissive="#2dd6c8"
          emissiveIntensity={0.28}
          roughness={0.25}
          metalness={0.5}
          flatShading
        />
      </mesh>
      {/* wire shell echoes the hero nucleus for visual continuity */}
      <mesh scale={1.35}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshBasicMaterial color="#2dd6c8" wireframe transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

/* Stage 1 — Connect: two channel anchors link to the nucleus. */
function ConnectStage({ progress }: { progress: ProgressRef }) {
  const anchors = useMemo(
    () => [new THREE.Vector3(-2.1, 0.7, 0.2), new THREE.Vector3(2.1, -0.3, 0.4)],
    [],
  );
  const lineRefs = useRef<(THREE.Line | null)[]>([]);
  const geoms = useMemo(
    () =>
      anchors.map((a) => {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          a.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, 0.6, 0)),
          a,
        );
        return new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
      }),
    [anchors],
  );

  useFrame(() => {
    const t = easeOut(stageLocal(progress.current, 0, 0.25));
    // draw-in: reveal vertices progressively via drawRange
    geoms.forEach((g, i) => {
      g.setDrawRange(0, Math.floor(33 * t));
      const line = lineRefs.current[i];
      if (line) (line.material as THREE.LineBasicMaterial).opacity = 0.25 + t * 0.5;
    });
  });

  return (
    <group>
      {anchors.map((a, i) => (
        <group key={i}>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <primitive
            object={
              new THREE.Line(
                geoms[i],
                new THREE.LineBasicMaterial({
                  color: "#2dd6c8",
                  transparent: true,
                  opacity: 0.3,
                }),
              )
            }
            ref={(el: THREE.Line) => {
              lineRefs.current[i] = el;
            }}
          />
          <mesh position={a}>
            {i === 0 ? (
              <torusGeometry args={[0.17, 0.05, 12, 32]} />
            ) : (
              <capsuleGeometry args={[0.11, 0.16, 6, 12]} />
            )}
            <meshStandardMaterial
              color="#0a1416"
              emissive={i === 0 ? "#7ff0d3" : "#4cc9f0"}
              emissiveIntensity={1.5}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Stage 2 — Activate: agents light up in sequence around the core. */
function ActivateStage({ progress }: { progress: ProgressRef }) {
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const nodes = useMemo(
    () =>
      AGENTS.map((a, i) => {
        const angle = (i / AGENTS.length) * Math.PI * 2;
        return {
          pos: new THREE.Vector3(
            Math.cos(angle) * 1.9,
            Math.sin(angle * 2) * 0.5,
            Math.sin(angle) * 1.6,
          ),
          color: a.hue,
        };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = stageLocal(progress.current, 0.22, 0.5);
    mats.current.forEach((m, i) => {
      if (!m) return;
      const lit = stageLocal(t, i / AGENTS.length, (i + 1) / AGENTS.length);
      m.emissiveIntensity =
        lit * (2 + 0.6 * Math.sin(clock.elapsedTime * 2 + i));
      m.opacity = 0.08 + lit * 0.92;
    });
  });

  return (
    <group>
      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            ref={(el) => {
              mats.current[i] = el;
            }}
            color="#0a1416"
            emissive={n.color}
            emissiveIntensity={0}
            transparent
            opacity={0.08}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

/* Stage 3 — Measure: metric rings sweep open around the nucleus. */
function MeasureStage({ progress }: { progress: ProgressRef }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const specs = useMemo(
    () => [
      { r: 1.15, tilt: 0.4, color: "#2dd6c8" },
      { r: 1.45, tilt: -0.25, color: "#7ff0d3" },
      { r: 1.75, tilt: 0.12, color: "#4cc9f0" },
    ],
    [],
  );

  useFrame(() => {
    const t = easeOut(stageLocal(progress.current, 0.48, 0.75));
    rings.current.forEach((mesh, i) => {
      if (!mesh) return;
      const local = stageLocal(t, i * 0.18, i * 0.18 + 0.64);
      mesh.scale.setScalar(Math.max(local, 0.001));
      (mesh.material as THREE.MeshBasicMaterial).opacity = local * 0.55;
    });
  });

  return (
    <group>
      {specs.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            rings.current[i] = el;
          }}
          rotation={[Math.PI / 2 + s.tilt, 0, i]}
        >
          {/* 300° arc, not a full ring — reads as a gauge */}
          <torusGeometry args={[s.r, 0.015, 8, 64, Math.PI * 1.66]} />
          <meshBasicMaterial color={s.color} transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

/* Stage 4 — Grow: ranking bars climb, map pins rise. */
function GrowStage({ progress }: { progress: ProgressRef }) {
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const pins = useRef<(THREE.Group | null)[]>([]);
  const barHeights = useMemo(() => [0.5, 0.85, 1.25, 1.7], []);

  useFrame(() => {
    const t = easeOut(stageLocal(progress.current, 0.72, 1));
    bars.current.forEach((b, i) => {
      if (!b) return;
      const local = stageLocal(t, i * 0.12, i * 0.12 + 0.6);
      const h = barHeights[i] * local;
      b.scale.y = Math.max(h, 0.001);
      b.position.y = -1.4 + h / 2;
      (b.material as THREE.MeshStandardMaterial).opacity = local;
    });
    pins.current.forEach((p, i) => {
      if (!p) return;
      const local = stageLocal(t, 0.3 + i * 0.15, 0.75 + i * 0.15);
      p.position.y = -1 + local * (1.7 + i * 0.35);
      p.scale.setScalar(local * 0.9);
    });
  });

  return (
    <group>
      <group position={[1.45, 0, 0.4]}>
        {barHeights.map((_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              bars.current[i] = el;
            }}
            position={[i * 0.34, -1.4, 0]}
          >
            <boxGeometry args={[0.2, 1, 0.2]} />
            <meshStandardMaterial
              color="#0e1a1c"
              emissive="#2dd6c8"
              emissiveIntensity={0.9}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
      </group>
      {[0, 1].map((i) => (
        <group
          key={i}
          position={[-1.9 + i * 0.6, -1, i * 0.5 - 0.2]}
          ref={(el) => {
            pins.current[i] = el;
          }}
        >
          {/* abstracted map pin: inverted cone + sphere head */}
          <mesh rotation={[Math.PI, 0, 0]} position={[0, 0.12, 0]}>
            <coneGeometry args={[0.14, 0.42, 12]} />
            <meshStandardMaterial
              color="#0e1a1c"
              emissive="#7ff0d3"
              emissiveIntensity={1.2}
            />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <sphereGeometry args={[0.11, 14, 14]} />
            <meshStandardMaterial
              color="#0e1a1c"
              emissive="#7ff0d3"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Camera: dolly in + slight orbit, driven by progress — no free spin. */
function StoryCamera({ progress }: { progress: ProgressRef }) {
  useFrame(({ camera }) => {
    const p = progress.current;
    const angle = -0.22 + p * 0.5;
    const dist = 8.3 - p * 1.5;
    const tx = Math.sin(angle) * dist;
    const tz = Math.cos(angle) * dist;
    const ty = 0.45 + p * 0.3;
    camera.position.x += (tx - camera.position.x) * 0.08;
    camera.position.y += (ty - camera.position.y) * 0.08;
    camera.position.z += (tz - camera.position.z) * 0.08;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HowItWorksCanvas({
  progress,
  active,
}: {
  progress: ProgressRef;
  active: boolean;
}) {
  const mobile = useIsMobile();
  return (
    <Canvas
      camera={{ position: [0, 0.6, 8.5], fov: 40 }}
      dpr={[1, mobile ? 1.5 : 2]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: !mobile, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#07080a"]} />
      <fog attach="fog" args={["#07080a", 10, 20]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 4]} intensity={0.6} color="#bffcf4" />
      <pointLight position={[0, 0, 0]} intensity={1.6} color="#2dd6c8" distance={6} />
      <Nucleus />
      <ConnectStage progress={progress} />
      <ActivateStage progress={progress} />
      <MeasureStage progress={progress} />
      <GrowStage progress={progress} />
      <StoryCamera progress={progress} />
    </Canvas>
  );
}

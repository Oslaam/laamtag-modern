"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { KeyboardControls, Environment, Sky, ContactShadows, useKeyboardControls } from "@react-three/drei";
import Ecctrl from "ecctrl";
import { Suspense, useState, useRef } from "react";
import * as THREE from "three";

// 1. IMPORT YOUR ENEMY COMPONENT HERE
import Enemy from "./ThuggerGrandEnemy";

// Updated Bullet Component with IDENTIFIER
function Bullet({ position, velocity }: { position: any, velocity: any }) {
    const rigidBody = useRef<any>(null);

    useFrame(() => {
        if (rigidBody.current) {
            rigidBody.current.setLinvel(velocity, true);
        }
    });

    return (
        <RigidBody
            ref={rigidBody}
            position={position}
            gravityScale={0}
            name="bullet"
        >
            <mesh>
                <sphereGeometry args={[0.12]} />
                {/* Fixed: Removed shadowBlur. Used emissive for that "glow" look */}
                <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={5} />
            </mesh>
        </RigidBody>
    );
}

export default function Arena() {
    const [bullets, setBullets] = useState<{ id: number; pos: any; vel: any }[]>([]);

    const keyboardMap = [
        { name: "forward", keys: ["ArrowUp", "KeyW"] },
        { name: "backward", keys: ["ArrowDown", "KeyS"] },
        { name: "left", keys: ["ArrowLeft", "KeyA"] },
        { name: "right", keys: ["ArrowRight", "KeyD"] },
        { name: "jump", keys: ["Space"] },
        { name: "run", keys: ["Shift"] },
        { name: "action1", keys: ["KeyF"] },
    ];

    const handlePointerDown = (e: any) => {
        const id = Date.now();
        // Temporary: Firing straight forward (-Z) 
        const vel = new THREE.Vector3(0, 0, -40);
        setBullets(prev => [...prev, { id, pos: [0, 1.2, 0], vel }]);

        setTimeout(() => {
            setBullets(prev => prev.filter(b => b.id !== id));
        }, 2000);
    };

    return (
        <div className="h-screen w-full bg-slate-900" onPointerDown={handlePointerDown}>
            <KeyboardControls map={keyboardMap}>
                <Canvas shadows camera={{ position: [0, 5, 10], fov: 45 }}>
                    <Suspense fallback={null}>
                        <Sky sunPosition={[100, 20, 100]} />
                        <ambientLight intensity={0.7} />
                        <Environment preset="night" />

                        <Physics debug>
                            <Ecctrl capsuleRadius={0.3} capsuleHalfHeight={0.3}>
                                <mesh castShadow>
                                    <capsuleGeometry args={[0.3, 0.7, 4, 8]} />
                                    <meshStandardMaterial color="#eab308" />
                                </mesh>
                            </Ecctrl>

                            {/* 2. PLACE ENEMIES HERE */}
                            <Enemy position={[5, 1, -5]} />
                            <Enemy position={[-5, 1, -10]} />
                            <Enemy position={[0, 1, -15]} />

                            {/* Render Active Bullets */}
                            {bullets.map((b) => (
                                <Bullet key={b.id} position={b.pos} velocity={b.vel} />
                            ))}

                            {/* Ground */}
                            <RigidBody type="fixed">
                                <mesh receiveShadow position={[0, -0.5, 0]}>
                                    <boxGeometry args={[100, 1, 100]} />
                                    <meshStandardMaterial color="#0f172a" />
                                </mesh>
                                <gridHelper args={[100, 50, "#1e293b", "#334155"]} position={[0, 0.01, 0]} />
                            </RigidBody>
                        </Physics>

                        <ContactShadows opacity={0.4} scale={20} blur={2} far={4.5} />
                    </Suspense>
                </Canvas>
            </KeyboardControls>

            {/* Simple Crosshair */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-white/50 text-2xl font-thin">
                +
            </div>
        </div>
    );
}
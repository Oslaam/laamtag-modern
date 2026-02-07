"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { KeyboardControls, Environment, Sky, ContactShadows, Html } from "@react-three/drei";
import Ecctrl, { EcctrlJoystick } from "ecctrl";
import { Suspense, useState, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";

import Enemy from "./ThuggerGrandEnemy";
import Bullet from "./ThuggerGrandBullet";
import CharacterModel from "./ThuggerGrandCharacterModel";
import Weapon from "./ThuggerGrandWeapon";

// 1. Floating Health Bar
function HealthBar({ health, maxHealth }: { health: number; maxHealth: number }) {
    const percentage = Math.max(0, (health / maxHealth) * 100);
    return (
        <Html distanceFactor={10} position={[0, 1.5, 0]} center>
            <div className="w-16 h-2 bg-black/60 border border-white/20 rounded-full p-[1px] backdrop-blur-sm">
                <div
                    className="h-full bg-gradient-to-r from-red-600 to-orange-400 transition-all duration-300 rounded-full"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </Html>
    );
}

// 2. Muzzle Flash Component
function MuzzleFlash({ active }: { active: boolean }) {
    const flashRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (flashRef.current && active) {
            const vector = new THREE.Vector3(0.25, -0.2, -0.6);
            vector.unproject(state.camera);
            flashRef.current.position.copy(vector);
            flashRef.current.lookAt(state.camera.position);
        }
    });
    if (!active) return null;
    return (
        <mesh ref={flashRef}>
            <pointLight distance={3} intensity={8} color="#eab308" />
            <planeGeometry args={[0.5, 0.5]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
    );
}

export default function Arena() {
    const { publicKey } = useWallet();

    // Player Reference for Enemies to track
    const playerRef = useRef<THREE.Group>(null);

    // Game State
    const [level, setLevel] = useState(1);
    const [bullets, setBullets] = useState<{ id: number; pos: [number, number, number]; vel: THREE.Vector3 }[]>([]);
    const [shake, setShake] = useState(0);
    const [showHitMarker, setShowHitMarker] = useState(false);
    const [muzzleActive, setMuzzleActive] = useState(false);

    // Currency Feed (For visual feedback)
    const [lastDrop, setLastDrop] = useState<{ asset: string, amount: string } | null>(null);

    // Enemy Logic: Health scales by Level
    const baseHealth = 50;
    const maxHP = baseHealth + (level * 25);
    const [enemies, setEnemies] = useState([
        { id: 1, pos: [5, 1, -12] as [number, number, number], hp: baseHealth + (level * 25) },
        { id: 2, pos: [-8, 1, -20] as [number, number, number], hp: baseHealth + (level * 25) }
    ]);

    // SERVER-SIDE Reward Logic
    const generateLoot = useCallback(async () => {
        if (publicKey) {
            try {
                // Request reward determination from server
                const res = await axios.post('/api/games/thugger/reward', {
                    walletAddress: publicKey.toBase58(),
                    level
                });

                // Update UI with what the SERVER said we won
                if (res.data.success) {
                    setLastDrop(res.data.reward);
                    console.log(`Synced reward to database`);
                    setTimeout(() => setLastDrop(null), 2000);
                }
            } catch (error) {
                console.error("Failed to sync reward:", error);
            }
        }
    }, [publicKey, level]);

    const handleShoot = useCallback((state: any) => {
        const { camera } = state;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const spawn = camera.position.clone().add(dir.clone().multiplyScalar(1.2));

        setShake(0.1);
        setMuzzleActive(true);
        setTimeout(() => { setShake(0); setMuzzleActive(false); }, 60);

        const id = Date.now();
        // Spawns a physical bullet
        setBullets(prev => [...prev, { id, pos: [spawn.x, spawn.y, spawn.z], vel: dir.multiplyScalar(90) }]);

        // Cleanup bullet after 1s (performance)
        setTimeout(() => setBullets(p => p.filter(b => b.id !== id)), 1000);
    }, []);

    const handleEnemyHit = (targetId: number) => {
        setShowHitMarker(true);
        setTimeout(() => setShowHitMarker(false), 80);

        setEnemies(prev => {
            const updated = prev.map(en => en.id === targetId ? { ...en, hp: en.hp - 25 } : en)
                .filter(en => en.hp > 0);

            // If an enemy died in this filter
            if (updated.length < prev.length) {
                generateLoot();
            }

            // Level Progression
            if (updated.length === 0) {
                setTimeout(() => {
                    setLevel(l => l + 1);
                    setEnemies([
                        { id: Date.now(), pos: [Math.random() * 15 - 7, 1, -15], hp: baseHealth + ((level + 1) * 25) },
                        { id: Date.now() + 1, pos: [Math.random() * 15 - 7, 1, -25], hp: baseHealth + ((level + 1) * 25) }
                    ]);
                }, 1200);
            }
            return updated;
        });
    };

    return (
        <div className="fixed inset-0 w-screen h-screen bg-black touch-none select-none overflow-hidden">
            <KeyboardControls map={[{ name: "jump", keys: ["Space"] }]}>
                <EcctrlJoystick
                    joystickBaseProps={{
                        style: { left: '60px', bottom: '60px', opacity: 0.5 }
                    } as any}
                    joystickStickProps={{
                        style: { background: '#eab308' }
                    } as any}
                />

                <Canvas shadows camera={{ fov: 45 }} onPointerDown={(e) => handleShoot(e)}>
                    <Suspense fallback={null}>
                        <Weapon />
                        <MuzzleFlash active={muzzleActive} />
                        <Sky sunPosition={[100, 20, 100]} />
                        <Environment preset="night" />
                        <ambientLight intensity={0.4} />

                        <Physics gravity={[0, -9.81, 0]}>

                            {/* PLAYER */}
                            <Ecctrl
                                capsuleRadius={0.3}
                                camInitDis={-0.01}
                                animated={true}
                            >
                                <group ref={playerRef}>
                                    {/* Replaced yellow capsule with the 3D Model */}
                                    <Suspense fallback={<mesh><capsuleGeometry args={[0.3, 0.7]} /><meshStandardMaterial color="#eab308" /></mesh>}>
                                        <CharacterModel />
                                    </Suspense>
                                </group>
                            </Ecctrl>

                            {/* ENEMIES */}
                            {enemies.map(en => (
                                <RigidBody
                                    key={en.id}
                                    position={en.pos}
                                    colliders="cuboid"
                                    onIntersectionEnter={(e) => {
                                        // Detects physical bullet hitting enemy body
                                        if (e.other.rigidBodyObject?.name === "bullet") {
                                            handleEnemyHit(en.id);
                                        }
                                    }}
                                >
                                    {/* Pass playerRef so they can look at/follow player */}
                                    <Enemy position={[0, 0, 0]} playerRef={playerRef} />
                                    <HealthBar health={en.hp} maxHealth={maxHP} />
                                </RigidBody>
                            ))}

                            {/* PHYSICAL BULLETS */}
                            {bullets.map(b => (
                                <Bullet key={b.id} position={b.pos} velocity={b.vel} />
                            ))}

                            <RigidBody type="fixed" name="floor">
                                <mesh receiveShadow position={[0, -0.5, 0]}>
                                    <boxGeometry args={[200, 1, 200]} />
                                    <meshStandardMaterial color="#020617" />
                                </mesh>
                            </RigidBody>
                        </Physics>
                    </Suspense>
                </Canvas>
            </KeyboardControls>

            {/* LOOT POPUP */}
            {lastDrop && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 animate-bounce pointer-events-none">
                    <div className="bg-[#eab308] text-black px-4 py-1 rounded-full font-black text-sm shadow-[0_0_20px_#eab308]">
                        +{lastDrop.amount} {lastDrop.asset}
                    </div>
                </div>
            )}

            {/* LEVEL & HUD */}
            <div className="absolute top-8 left-8 pointer-events-none">
                <h1 className="text-[#eab308] text-4xl font-black italic tracking-tighter leading-none">THUGGER</h1>
                <div className="flex items-center gap-3">
                    <span className="bg-[#eab308] text-black px-2 py-0.5 text-xs font-bold">LVL {level}</span>
                    <span className="text-white/40 text-[10px] font-mono tracking-widest">HOSTILES: {enemies.length}</span>
                </div>
            </div>

            {/* CROSSHAIR */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className={`w-1 h-1 rounded-full transition-all duration-75 ${showHitMarker ? 'bg-red-500 scale-[4] shadow-[0_0_15px_red]' : 'bg-[#eab308] scale-100 shadow-[0_0_5px_#eab308]'}`} />
            </div>

            <button onPointerDown={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))} className="absolute bottom-16 right-16 w-20 h-20 border-2 border-[#eab308]/30 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md active:scale-90 transition-transform z-50">
                <span className="text-[#eab308] font-black uppercase text-xs tracking-tighter">Jump</span>
            </button>
        </div>
    );
}
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { Sky, Environment, KeyboardControls, Loader } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import Ecctrl, { EcctrlJoystick } from 'ecctrl';
import * as THREE from 'three';
import { useWallet } from '@solana/wallet-adapter-react';

import Weapon from './ThuggerGrandWeapon';
import CharacterModel from './ThuggerGrandCharacterModel';
import Enemy from './ThuggerGrandEnemy';
import Bullet from './ThuggerGrandBullet';

import styles from '../styles/ThuggerGrand.module.css';

// 1. ARENA COMPONENT (The Game World)
function ArenaComponent({ onExit, level, enemies, playerRef, walletAddress }: any) {
    const [bullets, setBullets] = useState<any[]>([]);

    const handleShoot = () => {
        if (!playerRef.current) return;
        const vector = new THREE.Vector3(0, 0, -1);
        vector.applyQuaternion(playerRef.current.quaternion);

        const newBullet = {
            id: Date.now(),
            pos: [
                playerRef.current.position.x,
                playerRef.current.position.y + 1.5,
                playerRef.current.position.z
            ],
            vel: vector.multiplyScalar(20)
        };
        setBullets((prev) => [...prev, newBullet]);
        setTimeout(() => {
            setBullets((prev) => prev.filter(b => b.id !== newBullet.id));
        }, 2000);
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-black z-[10000]">
            <KeyboardControls map={[{ name: "jump", keys: ["Space"] }]}>
                {/* Fixed: Added height: '100vh' and set a better camera position */}
                <Canvas
                    shadows
                    camera={{ position: [0, 5, 10], fov: 45 }}
                    onPointerDown={() => handleShoot()}
                    style={{ height: '100vh', width: '100vw' }}
                >
                    <Suspense fallback={null}>
                        <Sky sunPosition={[100, 20, 100]} />

                        {/* Improved Lighting */}
                        <ambientLight intensity={1.5} />
                        <directionalLight position={[10, 10, 5]} intensity={2} castShadow />
                        <Environment preset="city" />

                        <Physics gravity={[0, -9.81, 0]}>
                            {/* Start the player slightly above the floor */}
                            <Ecctrl capsuleRadius={0.3} position={[0, 2, 0]}>
                                <group ref={playerRef}>
                                    <CharacterModel />
                                </group>
                            </Ecctrl>

                            {enemies?.map((en: any) => (
                                <Enemy
                                    key={en.id}
                                    position={en.pos}
                                    playerRef={playerRef}
                                    walletAddress={walletAddress}
                                    level={level}
                                />
                            ))}

                            {bullets.map((b) => (
                                <Bullet key={b.id} position={b.pos} velocity={b.vel} />
                            ))}

                            <RigidBody type="fixed">
                                <mesh receiveShadow position={[0, -0.5, 0]}>
                                    <boxGeometry args={[500, 1, 500]} />
                                    <meshStandardMaterial color="#222" />
                                </mesh>
                            </RigidBody>
                        </Physics>
                        <Weapon />
                    </Suspense>
                </Canvas>

                {/* UI Overlay */}
                <div className="absolute top-5 left-5 text-white font-bold bg-black/50 p-4 rounded z-[10001]">
                    LVL: {level} | HOSTILES: {enemies.length}
                </div>

                <button onClick={onExit} className="absolute top-5 right-5 bg-red-600 text-white p-4 rounded-full font-bold z-[10001] hover:bg-red-500">
                    EXIT ARENA
                </button>
            </KeyboardControls>
        </div>
    );
}

// 2. MAIN HUB COMPONENT
export default function ThuggerGrand() {
    const [gameStarted, setGameStarted] = useState(false);
    const [hasDiedOnce, setHasDiedOnce] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // FIXED: playerRef is now at the top level, correctly following React rules
    const playerRef = useRef(null);

    // Replace this with your actual user's wallet address from your Auth/Wallet context
    const { publicKey } = useWallet();
    const walletAddress = publicKey ? publicKey.toBase58() : null;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleEnterArena = async () => {
        const cost = hasDiedOnce ? 5 : 10;
        setLoading(true);

        try {
            const response = await fetch('/api/games/thugger/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress, amount: cost })
            });

            const result = await response.json();

            if (result.success) {
                setGameStarted(true);
            } else {
                alert(result.message || "Insufficient TAG Balance!");
            }
        } catch (error) {
            console.error("Deduction error:", error);
            alert("Connection error. Could not deduct TAG.");
        } finally {
            setLoading(false);
        }
    };

    if (!isMounted) return null;

    return (
        <div className={styles.container}>
            {!gameStarted ? (
                <div className={styles.startOverlay}>
                    <h1 className={styles.mainTitle}>
                        THUGGER<span>GRAND</span>
                    </h1>
                    <div className="flex flex-col gap-4 items-center">
                        <p className="text-yellow-500 font-black animate-pulse">
                            {loading ? "VERIFYING TAG..." : `ENTRY FEE: ${hasDiedOnce ? '5 TAG' : '10 TAG'}`}
                        </p>
                        <button
                            onClick={handleEnterArena}
                            disabled={loading}
                            className={styles.engageButton}
                        >
                            {loading ? "PROCESSING..." : (hasDiedOnce ? "RESTART ARENA" : "ENTER ARENA")}
                        </button>
                        <button onClick={() => window.history.back()} className={styles.abortButton}>
                            ← Back to Terminal
                        </button>
                    </div>
                </div>
            ) : (
                <ArenaComponent
                    onExit={() => setGameStarted(false)}
                    level={1}
                    enemies={[{ id: 1, pos: [5, 2, 5] }]}
                    playerRef={playerRef}
                    walletAddress={walletAddress}
                />
            )}
            <Loader />
        </div>
    );
}
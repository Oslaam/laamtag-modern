"use client";
import { useState, useRef } from "react";
import { RigidBody, CuboidCollider, RapierRigidBody } from "@react-three/rapier";
import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 1. Updated Interface to match the props passed in ThuggerGrand.tsx
interface EnemyProps {
    position: [number, number, number];
    playerRef: React.RefObject<THREE.Group>;
    walletAddress: string; 
    level: number;         
}

export default function Enemy({ position, playerRef, walletAddress, level }: EnemyProps) {
    const [health, setHealth] = useState(100);
    const [isDead, setIsDead] = useState(false);
    const rigidBody = useRef<RapierRigidBody>(null);
    const enemyRef = useRef<THREE.Group>(null);

    // AI LOGIC: CHASE PLAYER
    useFrame(() => {
        if (!playerRef.current || !rigidBody.current || isDead) return;

        const playerPos = playerRef.current.getWorldPosition(new THREE.Vector3());
        const enemyPos = rigidBody.current.translation();

        const direction = new THREE.Vector3(playerPos.x - enemyPos.x, 0, playerPos.z - enemyPos.z);

        if (direction.length() < 15) {
            direction.normalize().multiplyScalar(3);
            rigidBody.current.setLinvel({ x: direction.x, y: -1, z: direction.z }, true);

            enemyRef.current?.lookAt(playerPos.x, enemyPos.y, playerPos.z);
        }
    });

    // 2. Function to reward the user when an enemy dies
    const handleDeathReward = async () => {
        try {
            // You can create this API route next to handle SKR or LAAM rewards
            await fetch('/api/games/thugger/reward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress,
                    amount: 10 * level, // Example: 10 points per level
                    type: "SKR"
                })
            });
        } catch (error) {
            console.error("Failed to process reward", error);
        }
    };

    const handleHit = (event: any) => {
        if (event.other.rigidBodyObject?.name === "bullet") {
            setHealth((prev) => {
                const newHealth = prev - 25;
                if (newHealth <= 0) {
                    setIsDead(true);
                    handleDeathReward(); // Trigger reward on death
                }
                return newHealth;
            });
        }
    };

    if (isDead) return null;

    return (
        <group position={position}>
            <Billboard position={[0, 1.5, 0]}>
                <mesh>
                    <planeGeometry args={[1, 0.1]} />
                    <meshBasicMaterial color="black" />
                </mesh>
                <mesh position={[-(1 - health / 100) / 2, 0, 0.01]}>
                    <planeGeometry args={[health / 100, 0.1]} />
                    <meshBasicMaterial color={health > 30 ? "#22c55e" : "#ef4444"} />
                </mesh>
            </Billboard>

            <RigidBody
                ref={rigidBody}
                colliders={false}
                type="dynamic"
                lockRotations
                onCollisionEnter={handleHit}
                name="enemy"
            >
                <CuboidCollider args={[0.4, 0.8, 0.4]} />
                <group ref={enemyRef}>
                    <mesh castShadow>
                        <boxGeometry args={[0.8, 1.6, 0.8]} />
                        <meshStandardMaterial color="#ef4444" />
                    </mesh>
                </group>
            </RigidBody>
        </group>
    );
}
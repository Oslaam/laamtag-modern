"use client";
import { useState, useRef } from "react";
import { RigidBody, CuboidCollider, RapierRigidBody } from "@react-three/rapier";
import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// We receive the playerRef so the enemy knows who to chase
export default function Enemy({ position, playerRef }: { position: [number, number, number], playerRef: React.RefObject<THREE.Group> }) {
    const [health, setHealth] = useState(100);
    const [isDead, setIsDead] = useState(false);
    const rigidBody = useRef<RapierRigidBody>(null);
    const enemyRef = useRef<THREE.Group>(null);

    // AI LOGIC: CHASE PLAYER
    useFrame(() => {
        if (!playerRef.current || !rigidBody.current || isDead) return;

        // 1. Get positions
        const playerPos = playerRef.current.getWorldPosition(new THREE.Vector3());
        const enemyPos = rigidBody.current.translation();

        // 2. Calculate direction vector (Player - Enemy)
        const direction = new THREE.Vector3(playerPos.x - enemyPos.x, 0, playerPos.z - enemyPos.z);

        // 3. Normalize (make length 1) and multiply by speed
        if (direction.length() < 15) { // Only chase if close enough
            direction.normalize().multiplyScalar(3); // Speed = 3
            rigidBody.current.setLinvel({ x: direction.x, y: -1, z: direction.z }, true);

            // Optional: Make enemy look at player (Visual only)
            enemyRef.current?.lookAt(playerPos.x, enemyPos.y, playerPos.z);
        }
    });

    const handleHit = (event: any) => {
        if (event.other.rigidBodyObject?.name === "bullet") {
            setHealth((prev) => {
                const newHealth = prev - 25;
                if (newHealth <= 0) setIsDead(true);
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
                lockRotations // Keep enemy upright
                onCollisionEnter={handleHit}
                name="enemy" // Tag for collisions
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
"use client";
import { useState, useRef } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Billboard, Text } from "@react-three/drei";

export default function Enemy({ position }: { position: [number, number, number] }) {
    const [health, setHealth] = useState(100);
    const [isDead, setIsDead] = useState(false);
    const rigidBody = useRef<any>(null);

    // Logic to handle being hit
    const handleHit = (event: any) => {
        // Check if the thing hitting us is a bullet (based on name or user data)
        if (event.other.rigidBodyObject?.name === "bullet") {
            setHealth((prev) => {
                const newHealth = prev - 25;
                if (newHealth <= 0) setIsDead(true);
                return newHealth;
            });
        }
    };

    if (isDead) return null; // Remove from scene if dead

    return (
        <group position={position}>
            {/* 1. HEALTH BAR (Billboard) */}
            <Billboard position={[0, 1.5, 0]}>
                {/* Background of health bar */}
                <mesh>
                    <planeGeometry args={[1, 0.1]} />
                    <meshBasicMaterial color="black" />
                </mesh>
                {/* Actual Health (Scales based on percentage) */}
                <mesh position={[-(1 - health / 100) / 2, 0, 0.01]}>
                    <planeGeometry args={[health / 100, 0.1]} />
                    <meshBasicMaterial color={health > 30 ? "#22c55e" : "#ef4444"} />
                </mesh>
            </Billboard>

            {/* 2. ENEMY BODY */}
            <RigidBody
                ref={rigidBody}
                colliders={false}
                type="dynamic"
                onCollisionEnter={handleHit}
            >
                <CuboidCollider args={[0.4, 0.8, 0.4]} />
                <mesh castShadow>
                    <boxGeometry args={[0.8, 1.6, 0.8]} />
                    <meshStandardMaterial color="#ef4444" />
                </mesh>
            </RigidBody>
        </group>
    );
}
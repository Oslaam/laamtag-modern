"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function Weapon() {
    const group = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!group.current) return;

        group.current.position.copy(state.camera.position);
        group.current.quaternion.copy(state.camera.quaternion);

        const time = state.clock.getElapsedTime();
        group.current.position.add(
            new THREE.Vector3(
                Math.sin(time * 2) * 0.005,
                Math.cos(time * 4) * 0.005,
                0
            ).applyQuaternion(state.camera.quaternion)
        );

        group.current.translateX(0.35);
        group.current.translateY(-0.3);
        group.current.translateZ(-0.5);
    });

    return (
        <group ref={group}>
            {/* Simple Box Gun Placeholder */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.1, 0.2, 0.4]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[0, -0.15, 0.1]}>
                <boxGeometry args={[0.08, 0.2, 0.08]} />
                <meshStandardMaterial color="#222" />
            </mesh>
        </group>
    );
}
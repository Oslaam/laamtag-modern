"use client";
import { useRef } from "react";
import * as THREE from "three";

export default function CharacterModel() {
    const group = useRef<THREE.Group>(null);

    return (
        <group ref={group} position={[0, -0.8, 0]}>
            <mesh castShadow>
                <capsuleGeometry args={[0.3, 0.7]} />
                <meshStandardMaterial color="#eab308" />
            </mesh>
            {/* "Eyes" to show direction */}
            <mesh position={[0, 0.4, -0.2]}>
                <boxGeometry args={[0.4, 0.1, 0.1]} />
                <meshStandardMaterial color="black" />
            </mesh>
        </group>
    );
}
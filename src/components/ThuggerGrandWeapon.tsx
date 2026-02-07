"use client";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function Weapon() {
    const group = useRef<THREE.Group>(null);

    // Using a public pistol model as a placeholder
    const { nodes, materials } = useGLTF("https://vazxmixjsiawhamofrcw.supabase.co/storage/v1/object/public/models/pistol/model.gltf") as any;

    useFrame((state) => {
        if (!group.current) return;

        // 1. POSITIONING: Make the gun follow the camera
        // We place it slightly to the right and down
        const targetPos = new THREE.Vector3(0.3, -0.25, -0.5);
        group.current.position.copy(state.camera.position);
        group.current.quaternion.copy(state.camera.quaternion);

        // 2. SWAY: Make the gun move slightly based on mouse/movement
        const time = state.clock.getElapsedTime();
        group.current.position.add(
            new THREE.Vector3(
                Math.sin(time * 2) * 0.005,
                Math.cos(time * 4) * 0.005,
                0
            ).applyQuaternion(state.camera.quaternion)
        );

        // Offset the gun so it's visible in the corner
        group.current.translateX(0.35);
        group.current.translateY(-0.3);
        group.current.translateZ(-0.5);
    });

    return (
        <group ref={group} dispose={null}>
            <primitive
                object={nodes.Scene}
                scale={0.6}
                rotation={[0, Math.PI, 0]}
            />
        </group>
    );
}
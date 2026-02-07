"use client";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useRef } from "react";
// @ts-ignore
import { useCharacterState } from "ecctrl";
import * as THREE from "three";

export default function CharacterModel() {
    const group = useRef<THREE.Group>(null);

    // Using a standard GLTF loader
    const { nodes, materials, animations } = useGLTF("https://vazxmixjsiawhamofrcw.supabase.co/storage/v1/object/public/models/target-stand/model.gltf") as any;
    const { actions } = useAnimations(animations, group);

    // Get movement state (idle, run, jump, etc.)
    const curState = useCharacterState((state: any) => state.curState);

    useEffect(() => {
        // Logic to select animation based on movement
        let animName = "Idle";
        if (curState === "run" || curState === "walk") animName = "Run";
        if (curState === "jump") animName = "Jump";

        // Check if the action exists in your GLB file before playing
        const action = actions[animName] || actions["Idle"];

        if (action) {
            action.reset().fadeIn(0.2).play();
            return () => {
                action.fadeOut(0.2);
            };
        }
    }, [curState, actions]);

    return (
        <group ref={group} dispose={null} scale={0.5} position={[0, -0.8, 0]}>
            <primitive object={nodes.Scene} />
        </group>
    );
}
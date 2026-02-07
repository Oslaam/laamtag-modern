import { useRef, useEffect } from "react";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

export default function Bullet({ position, velocity }: { position: [number, number, number], velocity: THREE.Vector3 }) {
    const rb = useRef<RapierRigidBody>(null);

    useEffect(() => {
        // Apply initial velocity once when spawned
        rb.current?.setLinvel(velocity, true);
    }, [velocity]);

    return (
        <RigidBody
            ref={rb}
            position={position}
            gravityScale={0} // Bullets fly straight
            sensor // Sensor = detects hits but passes through (doesn't push enemy back)
            name="bullet"
        >
            <mesh>
                <sphereGeometry args={[0.1]} />
                <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={2} />
            </mesh>
        </RigidBody>
    );
}
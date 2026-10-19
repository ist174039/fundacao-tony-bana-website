"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export function Phone(props) {
  const group = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, Math.sin(t / 2) / 10, 0.05)
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, Math.sin(t) / 10, 0.05)
  })

  return (
    <group ref={group} {...props} dispose={null}>
      {/* Phone body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 2, 0.1]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Phone screen */}
      <mesh position={[0, 0, 0.051]}>
        <planeGeometry args={[0.9, 1.8]} />
        <meshBasicMaterial color="#0050b3" />
      </mesh>

      {/* App content on screen */}
      <mesh position={[0, 0.5, 0.052]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshBasicMaterial color="#0070f3" />
      </mesh>

      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshBasicMaterial color="#1890ff" />
      </mesh>

      <mesh position={[0, -0.5, 0.052]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshBasicMaterial color="#40a9ff" />
      </mesh>
    </group>
  )
}

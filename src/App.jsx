import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Suspense } from 'react';
import Walker from './components/Walker.jsx';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 4], fov: 50 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          <Walker position={[0, 0, 0]} scale={1} />

          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.5}
            scale={5}
            blur={2}
          />

          <Environment preset="sunset" />

          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={10}
            target={[0, 1, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
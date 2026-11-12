import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Official Summit Brand Palette for Early Learning Toys
const TOY_BLOCK_COLORS = [
  0xe85d26, // Tangerine Orange
  0x50153f, // Summit Plum
  0x2d82c6, // Sky Blue
  0xfab319, // Marigold Yellow
  0x2e7d32, // Playful Forest Green
  0xec4899, // Bright Coral Rose
  0xf97316, // Amber Honey
];

export const ThreeBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 32;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Warm Studio Lighting for Tactile Wooden Blocks
    const ambientLight = new THREE.AmbientLight(0xfff6ea, 1.5);
    scene.add(ambientLight);

    // Key light (warm golden daylight)
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    keyLight.position.set(18, 26, 22);
    scene.add(keyLight);

    // Fill light (sky blue bounce light)
    const fillLight = new THREE.DirectionalLight(0x2d82c6, 1.6);
    fillLight.position.set(-22, -18, 12);
    scene.add(fillLight);

    // Rim light (tangerine backlight)
    const rimLight = new THREE.PointLight(0xe85d26, 2.2, 50);
    rimLight.position.set(0, 10, -8);
    scene.add(rimLight);

    // 3. Geometries for Classic Childhood Wooden Toy Blocks
    const cubeGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const cylinderGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.7, 24);
    const prismGeo = new THREE.CylinderGeometry(1.1, 1.1, 1.5, 3); // Triangular roof block
    const pyramidGeo = new THREE.ConeGeometry(1.15, 1.7, 4); // Square pyramid block
    const ringGeo = new THREE.TorusGeometry(1.05, 0.42, 16, 28); // Stacking ring toy
    const sphereGeo = new THREE.SphereGeometry(0.95, 24, 24); // Wooden bead
    const archedBlockGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.8, 16, 1, false, 0, Math.PI); // Bridge arch

    const geometries = [
      cubeGeo,
      cylinderGeo,
      prismGeo,
      pyramidGeo,
      ringGeo,
      sphereGeo,
      archedBlockGeo,
    ];

    // 4. Create Floating Toy Block Objects
    const blockGroup = new THREE.Group();
    scene.add(blockGroup);

    const blockCount = 42;
    const blocks = [];

    for (let i = 0; i < blockCount; i++) {
      const geo = geometries[i % geometries.length];
      const color = TOY_BLOCK_COLORS[i % TOY_BLOCK_COLORS.length];

      // Smooth tactile wooden toy material
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.38,
        metalness: 0.08,
        clearcoat: 0.35,
        clearcoatRoughness: 0.25,
        transparent: true,
        opacity: 0.88,
      });

      const mesh = new THREE.Mesh(geo, mat);

      // Random position across wide depth volume
      mesh.position.set(
        (Math.random() - 0.5) * 58,
        (Math.random() - 0.5) * 38,
        (Math.random() - 0.5) * 22
      );

      // Initial random orientation
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      const baseScale = Math.random() * 0.9 + 0.65;
      mesh.scale.set(baseScale, baseScale, baseScale);

      // Baseline resting drift & tumbling rates
      const baseVx = (Math.random() - 0.5) * 0.012;
      const baseVy = (Math.random() - 0.5) * 0.012;
      const baseVz = (Math.random() - 0.5) * 0.005;
      const baseRotSpeedX = (Math.random() - 0.5) * 0.016;
      const baseRotSpeedY = (Math.random() - 0.5) * 0.016;
      const baseRotSpeedZ = (Math.random() - 0.5) * 0.012;

      // Dynamic physical state for deflection impulse and damping
      mesh.userData = {
        baseScale,
        baseVx,
        baseVy,
        baseVz,
        vx: baseVx,
        vy: baseVy,
        vz: baseVz,
        baseRotSpeedX,
        baseRotSpeedY,
        baseRotSpeedZ,
        rotSpeedX: baseRotSpeedX,
        rotSpeedY: baseRotSpeedY,
        rotSpeedZ: baseRotSpeedZ,
        bobSpeed: Math.random() * 0.025 + 0.01,
        bobPhase: Math.random() * Math.PI * 2,
      };

      blockGroup.add(mesh);
      blocks.push(mesh);
    }

    // 5. Ambient Golden Learning Dust Particles
    const dustCount = 100;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 75;
      dustPositions[i + 1] = (Math.random() - 0.5) * 50;
      dustPositions[i + 2] = (Math.random() - 0.5) * 30;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xfab319,
      size: 0.32,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // 6. Interactive Cursor Parallax Tracking & Click Deflection
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 4.5;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 4.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Raycaster for click deflection
    const raycaster = new THREE.Raycaster();
    const mouseCoord = new THREE.Vector2();

    const handlePointerDown = (e) => {
      // Do not deflect if user is interacting with login card, form inputs, buttons, or links
      if (
        e.target &&
        e.target.closest &&
        (e.target.closest('.MuiCard-root') ||
          e.target.closest('button') ||
          e.target.closest('input') ||
          e.target.closest('a'))
      ) {
        return;
      }

      // Convert mouse position to normalized device coordinates (-1 to +1)
      mouseCoord.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseCoord.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouseCoord, camera);

      // 1. Raycast direct hits
      const intersects = raycaster.intersectObjects(blocks, false);

      let impactPoint = null;
      let directHitMesh = null;

      if (intersects.length > 0) {
        impactPoint = intersects[0].point;
        directHitMesh = intersects[0].object;
      } else {
        // Intersect virtual plane at z = 0 for ambient wave deflection
        const virtualPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const planeHit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(virtualPlane, planeHit)) {
          impactPoint = planeHit;
        }
      }

      if (impactPoint) {
        const blastRadius = 22;

        blocks.forEach((b) => {
          const worldPos = new THREE.Vector3();
          b.getWorldPosition(worldPos);

          const isDirect = b === directHitMesh;
          const dx = worldPos.x - impactPoint.x;
          const dy = worldPos.y - impactPoint.y;
          const dz = worldPos.z - impactPoint.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (isDirect || dist < blastRadius) {
            // Stronger impulse for direct hits and nearby blocks
            const falloff = isDirect ? 1.0 : Math.pow(1 - dist / blastRadius, 1.4);
            const impulseMag = (isDirect ? 0.42 : 0.28) * falloff;

            const safeDist = Math.max(dist, 0.1);
            const dirX = isDirect ? (dx / safeDist || (Math.random() - 0.5)) : dx / safeDist;
            const dirY = isDirect ? (dy / safeDist || (Math.random() - 0.5)) : dy / safeDist;

            // Deflection impulse velocity
            b.userData.vx += dirX * impulseMag + (Math.random() - 0.5) * 0.05;
            b.userData.vy += dirY * impulseMag + (Math.random() - 0.5) * 0.05;
            b.userData.vz += -0.22 * falloff - Math.random() * 0.1; // Knock deeper into 3D space

            // Explosive tumble spin on impact
            const spinStrength = (isDirect ? 0.14 : 0.09) * falloff;
            b.userData.rotSpeedX += (Math.random() - 0.5) * spinStrength;
            b.userData.rotSpeedY += (Math.random() - 0.5) * spinStrength;
            b.userData.rotSpeedZ += (Math.random() - 0.5) * spinStrength;

            // Tactile warm highlight glow that gradually dissolves
            if (b.material && b.material.emissive) {
              b.material.emissive.setHex(0xfffae5);
              b.material.emissiveIntensity = isDirect ? 0.85 : 0.5 * falloff;
            }
          }
        });
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);

    // 7. Animation Loop
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera parallax with inertia
      currentMouseX += (targetMouseX - currentMouseX) * 0.045;
      currentMouseY += (targetMouseY - currentMouseY) * 0.045;

      camera.position.x = currentMouseX;
      camera.position.y = -currentMouseY;
      camera.lookAt(0, 0, 0);

      // Slow global rotation of the toy block constellation
      blockGroup.rotation.y = elapsedTime * 0.025;
      blockGroup.rotation.x = Math.sin(elapsedTime * 0.015) * 0.06;

      // Animate individual tumbling blocks
      blocks.forEach((b) => {
        // Translation drift
        b.position.x += b.userData.vx;
        b.position.y += b.userData.vy;
        b.position.z += b.userData.vz;

        // Tumbling on all 3 axes
        b.rotation.x += b.userData.rotSpeedX;
        b.rotation.y += b.userData.rotSpeedY;
        b.rotation.z += b.userData.rotSpeedZ;

        // Subtle vertical floating bob
        b.position.y += Math.sin(elapsedTime * 1.5 + b.userData.bobPhase) * 0.005;

        // Damping: smoothly relax deflection velocities back to base floating drift
        b.userData.vx += (b.userData.baseVx - b.userData.vx) * 0.035;
        b.userData.vy += (b.userData.baseVy - b.userData.vy) * 0.035;
        b.userData.vz += (b.userData.baseVz - b.userData.vz) * 0.035;

        b.userData.rotSpeedX += (b.userData.baseRotSpeedX - b.userData.rotSpeedX) * 0.035;
        b.userData.rotSpeedY += (b.userData.baseRotSpeedY - b.userData.rotSpeedY) * 0.035;
        b.userData.rotSpeedZ += (b.userData.baseRotSpeedZ - b.userData.rotSpeedZ) * 0.035;

        // Dissolve tactile emissive glow
        if (b.material && b.material.emissiveIntensity > 0.01) {
          b.material.emissiveIntensity *= 0.93;
        } else if (b.material && b.material.emissiveIntensity > 0) {
          b.material.emissiveIntensity = 0;
        }

        // Elastic soft boundary bounce to keep blocks in the visible playground
        if (b.position.x > 34) {
          b.position.x = 34;
          b.userData.vx = -Math.abs(b.userData.vx) * 0.75;
        } else if (b.position.x < -34) {
          b.position.x = -34;
          b.userData.vx = Math.abs(b.userData.vx) * 0.75;
        }

        if (b.position.y > 24) {
          b.position.y = 24;
          b.userData.vy = -Math.abs(b.userData.vy) * 0.75;
        } else if (b.position.y < -24) {
          b.position.y = -24;
          b.userData.vy = Math.abs(b.userData.vy) * 0.75;
        }

        if (b.position.z < -22) {
          b.position.z = -22;
          b.userData.vz = Math.abs(b.userData.vz) * 0.75;
        } else if (b.position.z > 14) {
          b.position.z = 14;
          b.userData.vz = -Math.abs(b.userData.vz) * 0.75;
        }
      });

      // Slowly rotate dust particles
      dustParticles.rotation.y = elapsedTime * 0.018;

      renderer.render(scene, camera);
    };
    animate();

    // 8. Responsive Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. Cleanup Memory
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);

      blocks.forEach((b) => {
        if (Array.isArray(b.material)) {
          b.material.forEach((m) => m.dispose());
        } else {
          b.material.dispose();
        }
      });

      geometries.forEach((g) => g.dispose());
      dustGeo.dispose();
      dustMat.dispose();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
};

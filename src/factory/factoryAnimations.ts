import type { FactoryAnimParts } from "./types";

/**
 * Animate all factory machines for one frame.
 * Call this every frame from the animation loop.
 */
export function animateFactory(time: number, animParts: FactoryAnimParts): void {
  // Guillotine blade - slow up/down cycle
  if (animParts.bladeRef) {
    animParts.bladeRef.position.y = 1.95 + Math.sin(time * 0.8) * 0.4;
  }

  // Frustrum press ram - slow press cycle
  if (animParts.ramRef) {
    animParts.ramRef.position.y = 2.35 + Math.sin(time * 0.5) * 0.3;
  }

  // Welding arc flicker
  if (animParts.glowRef) {
    const flicker = 0.5 + Math.random() * 0.5;
    (animParts.glowRef.material as any).opacity = flicker * 0.8;
    animParts.glowRef.scale.setScalar(0.8 + Math.random() * 0.4);
  }

  if (animParts.arcLightRef) {
    animParts.arcLightRef.intensity = 2 + Math.random() * 2;
  }

  // Spark particles
  for (const spark of animParts.sparkParticles) {
    const ud = spark.userData;
    ud.life -= 0.02;
    if (ud.life <= 0) {
      ud.life = 1.0;
      spark.position.set(ud.baseX, 1.28, ud.baseZ);
      ud.vx = (Math.random() - 0.5) * 0.06;
      ud.vy = Math.random() * 0.08 + 0.02;
      ud.vz = (Math.random() - 0.5) * 0.06;
    }
    spark.position.x += ud.vx;
    spark.position.y += ud.vy;
    spark.position.z += ud.vz;
    ud.vy -= 0.002; // gravity
    (spark.material as any).opacity = ud.life;
    spark.scale.setScalar(ud.life);
  }
}

/**
 * Trigger a single machine operation animation.
 * Returns a promise that resolves after the animation cycle.
 */
export function triggerMachineAnimation(
  machineId: string,
  animParts: FactoryAnimParts,
  durationMs = 3000
): Promise<void> {
  return new Promise((resolve) => {
    // For now, the machines have continuous animations.
    // This just waits for one "cycle" to represent an operation.
    setTimeout(resolve, durationMs);
  });
}

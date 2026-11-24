import React, { useEffect, useRef } from "react";

const palette = ["#6047eb", "#8060ee", "#a270ef", "#57aee9", "#d56bc9", "#fff"];

function sampleWordmark(width, height, limit) {
  const source = document.createElement("canvas");
  source.width = Math.ceil(width);
  source.height = Math.ceil(height);
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) return [];

  const fontSize = Math.min(190, width * 0.29, height * 0.42);
  sourceContext.fillStyle = "#fff";
  sourceContext.textAlign = "center";
  sourceContext.textBaseline = "middle";
  sourceContext.font = `800 ${fontSize}px "Cabinet Grotesk", sans-serif`;
  sourceContext.fillText("NEXUS", width / 2, height / 2);

  const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
  const spacing = Math.max(3, Math.round(fontSize / 15));
  const points = [];

  for (let y = 0; y < source.height; y += spacing) {
    for (let x = 0; x < source.width; x += spacing) {
      if (pixels[(y * source.width + x) * 4 + 3] > 100) points.push({ x, y });
    }
  }

  if (points.length <= limit) return points;
  const stride = Math.ceil(points.length / limit);
  return points.filter((_, index) => index % stride === 0);
}

function drawWaveGrid(context, width, height, time, pointer) {
  context.lineWidth = 0.7;
  context.strokeStyle = "rgba(112, 101, 218, 0.18)";

  const warp = (x, y) => {
    const drift = Math.sin(x * 0.009 + time * 0.58 + y * 0.003) * 3.2
      + Math.cos(y * 0.014 - time * 0.44 + x * 0.002) * 2.1;
    if (!pointer.active) return drift;
    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const influence = Math.exp(-(distance * distance) / 18000);
    return drift + Math.sin(distance * 0.055 - time * 2.2) * influence * 13;
  };

  for (let row = 0; row <= 13; row += 1) {
    const baseY = (height * row) / 13;
    context.beginPath();
    for (let column = 0; column <= 34; column += 1) {
      const x = (width * column) / 34;
      const y = baseY + warp(x, baseY);
      if (column === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  for (let column = 0; column <= 17; column += 1) {
    const baseX = (width * column) / 17;
    context.beginPath();
    for (let row = 0; row <= 26; row += 1) {
      const y = (height * row) / 26;
      const x = baseX + warp(baseX, y) * 0.72;
      if (row === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
}

function drawParticles(context, particles, elapsed, pointer, motionEnabled, width, height) {
  const formation = motionEnabled ? Math.min(1, Math.max(0, (elapsed - 0.18) / 2.8)) : 1;
  const opacity = motionEnabled ? Math.min(1, elapsed / 1.65) : 1;

  const aura = context.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.48);
  aura.addColorStop(0, "rgba(126, 91, 255, 0.16)");
  aura.addColorStop(0.48, "rgba(114, 190, 255, 0.07)");
  aura.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = aura;
  context.fillRect(0, 0, width, height);

  if (motionEnabled) {
    particles.forEach((particle) => {
      const driftX = Math.sin(elapsed * 0.58 + particle.phase) * 1.4;
      const driftY = Math.cos(elapsed * 0.51 + particle.phase) * 1.2;
      const dx = particle.targetX + driftX - particle.x;
      const dy = particle.targetY + driftY - particle.y;
      const spring = 0.018 + formation * 0.022;

      particle.velocityX = (particle.velocityX + dx * spring) * 0.83;
      particle.velocityY = (particle.velocityY + dy * spring) * 0.83;

      if (pointer.active) {
        const fromPointerX = particle.x - pointer.x;
        const fromPointerY = particle.y - pointer.y;
        const distance = Math.sqrt(fromPointerX * fromPointerX + fromPointerY * fromPointerY);
        const radius = 116;
        if (distance > 0 && distance < radius) {
          const force = (1 - distance / radius) * 2.7;
          particle.velocityX += (fromPointerX / distance) * force;
          particle.velocityY += (fromPointerY / distance) * force;
        }
      }

      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
    });
  } else {
    particles.forEach((particle) => {
      particle.x = particle.targetX;
      particle.y = particle.targetY;
    });
  }

  context.lineWidth = 0.95;
  context.globalCompositeOperation = "source-over";
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
      const next = particles[nextIndex];
      const dx = particle.x - next.x;
      const dy = particle.y - next.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 30) {
        context.globalAlpha = (1 - distance / 30) * 0.4 * opacity;
        context.strokeStyle = particle.color;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(next.x, next.y);
        context.stroke();
      }
    }
  }

  particles.forEach((particle) => {
    context.globalAlpha = 0.94 * opacity;
    context.fillStyle = particle.color;
    context.shadowBlur = 11;
    context.shadowColor = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.color === "#ffffff" ? 1.8 : 2, 0, Math.PI * 2);
    context.fill();
  });
  context.shadowBlur = 0;
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
}

export default function ConnectedMotionCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !host || !context) return undefined;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0, y: 0, active: false };
    let particles = [];
    let width = 0;
    let height = 0;
    let frameId = 0;
    let startTime;
    let disposed = false;
    let resizeObserver;

    const paint = (time, animate) => {
      context.clearRect(0, 0, width, height);
      drawWaveGrid(context, width, height, animate ? time : 0, animate ? pointer : { active: false });
      drawParticles(context, particles, time, pointer, animate, width, height);
    };

    const tick = (timestamp) => {
      if (disposed || document.hidden) return;
      if (startTime === undefined) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      paint(elapsed, true);
      frameId = window.requestAnimationFrame(tick);
    };

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) return;

      width = bounds.width;
      height = bounds.height;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 600 ? 1 : 1.35);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const limit = width < 600 ? 76 : width < 1000 ? 124 : 176;
      particles = sampleWordmark(width, height, limit).map((target, index) => ({
        targetX: target.x,
        targetY: target.y,
        x: Math.random() * width,
        y: Math.random() * height,
        velocityX: 0,
        velocityY: 0,
        phase: Math.random() * Math.PI * 2,
        color: palette[index % palette.length]
      }));

      window.cancelAnimationFrame(frameId);
      startTime = undefined;
      if (motionPreference.matches) paint(0, false);
      else frameId = window.requestAnimationFrame(tick);
    };

    const onPointerMove = (event) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active = true;
    };

    const clearPointer = () => {
      pointer.active = false;
    };

    const onMotionPreferenceChange = () => resize();
    const onVisibilityChange = () => {
      if (document.hidden) window.cancelAnimationFrame(frameId);
      else if (!motionPreference.matches) frameId = window.requestAnimationFrame(tick);
    };

    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", clearPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (motionPreference.addEventListener) motionPreference.addEventListener("change", onMotionPreferenceChange);
    else motionPreference.addListener(onMotionPreferenceChange);

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    resize();
    document.fonts?.ready.then(() => {
      if (!disposed) resize();
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", clearPointer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (motionPreference.removeEventListener) motionPreference.removeEventListener("change", onMotionPreferenceChange);
      else motionPreference.removeListener(onMotionPreferenceChange);
    };
  }, []);

  return <canvas className="connected-motion-canvas" ref={canvasRef} aria-hidden="true" />;
}

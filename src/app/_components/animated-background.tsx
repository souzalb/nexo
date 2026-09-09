'use client';

import { useEffect, useRef } from 'react';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // --- Node network ("nexo" = connection) ---
    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseAlpha: number;
      pulsePhase: number;
      pulseSpeed: number;
    }

    const CONNECTION_DIST = 180;
    const MOUSE_RADIUS = 250;
    const NODE_COUNT = Math.min(
      Math.floor((window.innerWidth * window.innerHeight) / 12000),
      120,
    );

    const nodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        baseAlpha: Math.random() * 0.5 + 0.2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    // Data stream particles — small bright dots that travel along connections
    interface DataPacket {
      fromNode: number;
      toNode: number;
      progress: number;
      speed: number;
      alive: boolean;
    }

    let dataPackets: DataPacket[] = [];
    let packetTimer = 0;

    // Hex grid pattern for tech feel
    function drawHexGrid(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      time: number,
    ) {
      const size = 40;
      const h = size * Math.sqrt(3);
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      // Slow continuous drift
      const driftX = Math.sin(time * 0.003) * 30 + time * 0.08;
      const driftY = Math.cos(time * 0.002) * 20 + time * 0.05;

      ctx.save();

      // Slight overall rotation that oscillates
      const globalRotation = Math.sin(time * 0.001) * 0.02;
      ctx.translate(width / 2, height / 2);
      ctx.rotate(globalRotation);
      ctx.translate(-width / 2, -height / 2);

      const extraMargin = 3; // extra cells to cover rotation edges
      for (
        let row = -extraMargin;
        row < height / (h * 0.5) + extraMargin;
        row++
      ) {
        for (
          let col = -extraMargin;
          col < width / (size * 3) + extraMargin;
          col++
        ) {
          // Apply drift offset
          const baseX = col * size * 3 + (row % 2 === 0 ? 0 : size * 1.5);
          const baseY = row * h * 0.5;
          const x = ((baseX + driftX) % (width + size * 6)) - size * 3;
          const y = ((baseY + driftY) % (height + h * 3)) - h * 1.5;

          const dx = x - mouseX;
          const dy = y - mouseY;
          const distMouse = Math.sqrt(dx * dx + dy * dy);
          const mouseInfluence = Math.max(0, 1 - distMouse / 300);

          // Wave ripple effect propagating outward from center
          const distCenter = Math.sqrt(
            (x - width / 2) ** 2 + (y - height / 2) ** 2,
          );
          const ripple = Math.sin(distCenter * 0.015 - time * 0.03) * 0.5 + 0.5;

          // Individual hex pulse
          const pulse =
            Math.sin(time * 0.02 + col * 0.5 + row * 0.3) * 0.5 + 0.5;

          const alpha =
            0.02 + mouseInfluence * 0.12 + ripple * 0.03 + pulse * 0.015;

          // Scale varies with pulse and mouse
          const scale = 0.35 + pulse * 0.1 + mouseInfluence * 0.2;

          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const hx = x + size * scale * Math.cos(angle);
            const hy = y + size * scale * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();

          // Color shifts based on ripple
          const r = Math.floor(30 + ripple * 26);
          const g = Math.floor(150 + ripple * 61);
          const b = Math.floor(220 + ripple * 28);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.lineWidth = 0.4 + mouseInfluence * 1.2;
          ctx.stroke();

          // Fill for mouse-highlighted hexagons
          if (mouseInfluence > 0.3) {
            ctx.fillStyle = `rgba(34, 211, 238, ${mouseInfluence * 0.05})`;
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    function updateNodes(width: number, height: number) {
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      nodes.forEach((node) => {
        // Mouse interaction: gentle push away
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        const distMouse = Math.sqrt(dx * dx + dy * dy);
        if (distMouse < MOUSE_RADIUS && distMouse > 0) {
          const force = (1 - distMouse / MOUSE_RADIUS) * 0.5;
          node.vx += (dx / distMouse) * force;
          node.vy += (dy / distMouse) * force;
        }

        // Damping
        node.vx *= 0.99;
        node.vy *= 0.99;

        // Clamp velocity
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > 1.5) {
          node.vx = (node.vx / speed) * 1.5;
          node.vy = (node.vy / speed) * 1.5;
        }

        node.x += node.vx;
        node.y += node.vy;
        node.pulsePhase += node.pulseSpeed;

        // Bounce off edges
        if (node.x < 0) {
          node.x = 0;
          node.vx *= -1;
        }
        if (node.x > width) {
          node.x = width;
          node.vx *= -1;
        }
        if (node.y < 0) {
          node.y = 0;
          node.vy *= -1;
        }
        if (node.y > height) {
          node.y = height;
          node.vy *= -1;
        }
      });
    }

    function drawConnections(ctx: CanvasRenderingContext2D, time: number) {
      const connections: [number, number][] = [];

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.4;

            // Check mouse proximity for highlight
            const midX = (nodes[i].x + nodes[j].x) / 2;
            const midY = (nodes[i].y + nodes[j].y) / 2;
            const mouseDx = midX - mouseRef.current.x;
            const mouseDy = midY - mouseRef.current.y;
            const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
            const mouseBoost = Math.max(0, 1 - mouseDist / MOUSE_RADIUS) * 0.5;

            // Gradient line — cyan to indigo
            const gradient = ctx.createLinearGradient(
              nodes[i].x,
              nodes[i].y,
              nodes[j].x,
              nodes[j].y,
            );
            gradient.addColorStop(
              0,
              `rgba(34, 211, 238, ${alpha + mouseBoost})`,
            );
            gradient.addColorStop(
              1,
              `rgba(129, 140, 248, ${alpha + mouseBoost})`,
            );

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.6 + mouseBoost * 1.5;
            ctx.stroke();

            connections.push([i, j]);
          }
        }
      }

      return connections;
    }

    function drawNodes(ctx: CanvasRenderingContext2D, time: number) {
      nodes.forEach((node) => {
        const pulse = Math.sin(node.pulsePhase) * 0.3 + 0.7;
        const mouseDx = node.x - mouseRef.current.x;
        const mouseDy = node.y - mouseRef.current.y;
        const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        const mouseBoost = Math.max(0, 1 - mouseDist / MOUSE_RADIUS);

        const alpha = node.baseAlpha * pulse + mouseBoost * 0.5;
        const radius = node.radius + mouseBoost * 2;

        // Glow
        if (mouseBoost > 0.1) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 4, 0, Math.PI * 2);
          const glowGrad = ctx.createRadialGradient(
            node.x,
            node.y,
            0,
            node.x,
            node.y,
            radius * 4,
          );
          glowGrad.addColorStop(0, `rgba(34, 211, 238, ${mouseBoost * 0.15})`);
          glowGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 242, 254, ${alpha})`;
        ctx.fill();
      });
    }

    function updateDataPackets(connections: [number, number][]) {
      packetTimer++;

      // Spawn new data packets along random connections
      if (
        packetTimer % 8 === 0 &&
        connections.length > 0 &&
        dataPackets.length < 30
      ) {
        const connIdx = Math.floor(Math.random() * connections.length);
        const [from, to] = connections[connIdx];
        dataPackets.push({
          fromNode: from,
          toNode: to,
          progress: 0,
          speed: Math.random() * 0.02 + 0.01,
          alive: true,
        });
      }

      // Update existing packets
      dataPackets.forEach((packet) => {
        packet.progress += packet.speed;
        if (packet.progress >= 1) {
          packet.alive = false;
        }
      });

      dataPackets = dataPackets.filter((p) => p.alive);
    }

    function drawDataPackets(ctx: CanvasRenderingContext2D) {
      dataPackets.forEach((packet) => {
        const from = nodes[packet.fromNode];
        const to = nodes[packet.toNode];
        const x = from.x + (to.x - from.x) * packet.progress;
        const y = from.y + (to.y - from.y) * packet.progress;

        // Bright cyan dot traveling along the connection
        const glowSize = 6;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        gradient.addColorStop(0, 'rgba(34, 211, 238, 0.9)');
        gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
        gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');

        ctx.beginPath();
        ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
      });
    }

    // Scanning line effect
    function drawScanLine(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      time: number,
    ) {
      const period = 600; // frames for one cycle
      const progress = (time % period) / period;
      const y = progress * (height + 100) - 50;

      const gradient = ctx.createLinearGradient(0, y - 40, 0, y + 40);
      gradient.addColorStop(0, 'rgba(34, 211, 238, 0)');
      gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.03)');
      gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, y - 40, width, 80);
    }

    let time = 0;

    function animate() {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background hex grid
      drawHexGrid(ctx, canvas.width, canvas.height, time);

      // Scan line
      drawScanLine(ctx, canvas.width, canvas.height, time);

      // Update & draw network
      updateNodes(canvas.width, canvas.height);
      const connections = drawConnections(ctx, time);
      drawNodes(ctx, time);

      // Data packets flowing through connections
      updateDataPackets(connections);
      drawDataPackets(ctx);

      time++;
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{
        background:
          'linear-gradient(145deg, #020617 0%, #0f172a 25%, #0c1222 50%, #091428 75%, #020617 100%)',
      }}
    />
  );
}

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";

const props = withDefaults(
  defineProps<{
    /** Data points (0-100 percentage values). */
    data: number[];
    /** Chart width in px. */
    width?: number;
    /** Chart height in px. */
    height?: number;
    /** Line color (auto-selected from latest value if omitted). */
    color?: string;
    /** Whether to fill area under the line. */
    fill?: boolean;
  }>(),
  { width: 200, height: 40, fill: true },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationFrame: number | null = null;

function getColor(value: number): string {
  if (props.color) return props.color;
  if (value < 60) return "#67c23a";
  if (value < 85) return "#e6a23c";
  return "#f56c6c";
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas || props.data.length === 0) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = props.width;
  const h = props.height;
  canvas.width = w * window.devicePixelRatio;
  canvas.height = h * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  ctx.clearRect(0, 0, w, h);

  const data = props.data;
  const step = w / Math.max(data.length - 1, 1);
  const latest = data[data.length - 1] ?? 0;
  const color = getColor(latest);

  if (props.fill) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    data.forEach((v, i) => {
      ctx.lineTo(i * step, h - (v / 100) * h);
    });
    ctx.lineTo((data.length - 1) * step, h);
    ctx.closePath();
    ctx.fillStyle = color + "20";
    ctx.fill();
  }

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step;
    const y = h - (v / 100) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

watch(
  () => props.data,
  () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(draw);
  },
  { deep: true },
);

onMounted(draw);
onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    :style="{ width: `${width}px`, height: `${height}px` }"
    class="metric-chart"
  />
</template>

<style scoped>
.metric-chart {
  display: block;
  width: 100%;
}
</style>

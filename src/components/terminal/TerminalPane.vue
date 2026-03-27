<script setup lang="ts">
import { ref, onMounted, watch, toRef } from "vue";
import { useTerminal } from "@/composables/useTerminal";

const props = defineProps<{
  sessionId: string;
}>();

const containerRef = ref<HTMLElement>();
const sessionIdRef = toRef(props, "sessionId");
const { mount, fit, dispose } = useTerminal(sessionIdRef);

onMounted(() => {
  if (containerRef.value) {
    mount(containerRef.value);
  }
});

watch(
  () => props.sessionId,
  () => {
    // Session changed — re-fit the terminal
    fit();
  },
);

defineExpose({ fit, dispose });
</script>

<template>
  <div
    ref="containerRef"
    class="w-full h-full bg-[#0d1117] overflow-hidden"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const fontSize = ref(14);
const fontFamily = ref("JetBrains Mono");
const cursorStyle = ref("bar");
const cursorBlink = ref(true);
const scrollbackLines = ref(10000);
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-base font-medium text-gray-200">{{ t("settings.terminal") }}</h3>

    <!-- Font -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="text-sm text-gray-400 mb-2 block">Font Family</label>
        <el-input v-model="fontFamily" />
      </div>
      <div>
        <label class="text-sm text-gray-400 mb-2 block">Font Size</label>
        <el-input-number v-model="fontSize" :min="8" :max="32" />
      </div>
    </div>

    <!-- Cursor -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="text-sm text-gray-400 mb-2 block">Cursor Style</label>
        <el-select v-model="cursorStyle" class="w-full">
          <el-option label="Bar" value="bar" />
          <el-option label="Block" value="block" />
          <el-option label="Underline" value="underline" />
        </el-select>
      </div>
      <div>
        <label class="text-sm text-gray-400 mb-2 block">Cursor Blink</label>
        <el-switch v-model="cursorBlink" />
      </div>
    </div>

    <!-- Scrollback -->
    <div>
      <label class="text-sm text-gray-400 mb-2 block">Scrollback Lines</label>
      <el-input-number v-model="scrollbackLines" :min="1000" :max="100000" :step="1000" />
    </div>
  </div>
</template>

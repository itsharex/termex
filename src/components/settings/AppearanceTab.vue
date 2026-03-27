<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();

const theme = ref("dark");
const language = ref(locale.value);

function onLanguageChange(val: string) {
  locale.value = val;
}
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-base font-medium text-gray-200">{{ t("settings.appearance") }}</h3>

    <!-- Theme -->
    <div>
      <label class="text-sm text-gray-400 mb-2 block">Theme</label>
      <el-radio-group v-model="theme">
        <el-radio-button value="dark">Dark</el-radio-button>
        <el-radio-button value="light">Light</el-radio-button>
        <el-radio-button value="system">System</el-radio-button>
      </el-radio-group>
    </div>

    <!-- Language -->
    <div>
      <label class="text-sm text-gray-400 mb-2 block">Language</label>
      <el-select v-model="language" class="w-48" @change="onLanguageChange">
        <el-option label="简体中文" value="zh-CN" />
        <el-option label="English" value="en-US" />
      </el-select>
    </div>
  </div>
</template>

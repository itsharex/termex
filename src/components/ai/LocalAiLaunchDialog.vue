<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { tauriInvoke } from "@/utils/tauri";
import { Loading } from "@element-plus/icons-vue";

interface DownloadedModel {
  id: string;
  path: string;
  size: number;
  sha256?: string;
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "launched"): void;
}>();

const models = ref<DownloadedModel[]>([]);
const selectedModelId = ref<string>("");
const loading = ref(false);
const launching = ref(false);

async function loadModels() {
  loading.value = true;
  try {
    const data = await tauriInvoke<DownloadedModel[]>("local_ai_list_downloaded");
    models.value = data;
    if (data.length > 0 && !selectedModelId.value) {
      selectedModelId.value = data[0].id;
    }
  } catch (err) {
    ElMessage.error(`Failed to load models: ${err}`);
  } finally {
    loading.value = false;
  }
}

async function handleLaunch() {
  if (!selectedModelId.value) {
    ElMessage.warning("Please select a model");
    return;
  }

  const model = models.value.find((m) => m.id === selectedModelId.value);
  if (!model) {
    ElMessage.error("Model not found");
    return;
  }

  launching.value = true;
  try {
    await tauriInvoke("local_ai_start_engine", { model_path: model.path });
    ElMessage.success(`Started model: ${model.id}`);
    emit("update:visible", false);
    emit("launched");
  } catch (err) {
    ElMessage.error(`Failed to start engine: ${err}`);
  } finally {
    launching.value = false;
  }
}

function handleClose() {
  emit("update:visible", false);
}

onMounted(() => {
  if (props.visible) {
    loadModels();
  }
});
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="Start Local AI Model"
    width="400px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <div v-if="loading" class="text-center py-6">
      <el-icon class="is-loading" :size="24">
        <Loading />
      </el-icon>
      <div class="text-xs mt-2" style="color: var(--tm-text-muted)">
        Loading available models...
      </div>
    </div>

    <div v-else-if="models.length === 0" class="text-center py-6">
      <div class="text-sm mb-2">No local models downloaded yet</div>
      <div class="text-xs" style="color: var(--tm-text-muted)">
        Please download a model in the Local AI Models settings first
      </div>
    </div>

    <div v-else class="space-y-3">
      <div class="text-xs font-medium" style="color: var(--tm-text-secondary)">
        Select a model to start:
      </div>

      <el-radio-group v-model="selectedModelId" class="w-full">
        <div v-for="model in models" :key="model.id" class="py-2">
          <el-radio :label="model.id" class="w-full">
            <div class="flex flex-col gap-0.5 ml-1">
              <span class="text-xs font-medium">{{ model.id }}</span>
              <span class="text-[10px]" style="color: var(--tm-text-muted)">
                {{ (model.size / (1024 * 1024 * 1024)).toFixed(1) }} GB
              </span>
            </div>
          </el-radio>
        </div>
      </el-radio-group>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="handleClose">Cancel</el-button>
        <el-button
          type="primary"
          :loading="launching"
          :disabled="!selectedModelId || models.length === 0"
          @click="handleLaunch"
        >
          Start
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

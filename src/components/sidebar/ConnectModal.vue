<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useServerStore } from "@/stores/serverStore";
import { useSessionStore } from "@/stores/sessionStore";
import type { ServerInput } from "@/types/server";

const { t } = useI18n();
const serverStore = useServerStore();
const sessionStore = useSessionStore();

const props = defineProps<{
  visible: boolean;
  editId?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", val: boolean): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val),
});

const loading = ref(false);

const form = reactive<ServerInput>({
  name: "",
  host: "",
  port: 22,
  username: "root",
  authType: "password",
  password: "",
  keyPath: "",
  passphrase: "",
  groupId: null,
  startupCmd: "",
  tags: [],
});

const title = computed(() =>
  props.editId ? t("connection.name") : t("sidebar.newConnection"),
);

// Reset form when dialog opens
watch(
  () => props.visible,
  (val) => {
    if (val && !props.editId) {
      resetForm();
    }
    if (val && props.editId) {
      loadServer(props.editId);
    }
  },
);

function resetForm() {
  form.name = "";
  form.host = "";
  form.port = 22;
  form.username = "root";
  form.authType = "password";
  form.password = "";
  form.keyPath = "";
  form.passphrase = "";
  form.groupId = null;
  form.startupCmd = "";
  form.tags = [];
}

function loadServer(id: string) {
  const server = serverStore.servers.find((s) => s.id === id);
  if (!server) return;
  form.name = server.name;
  form.host = server.host;
  form.port = server.port;
  form.username = server.username;
  form.authType = server.authType;
  form.password = "";
  form.keyPath = server.keyPath ?? "";
  form.passphrase = "";
  form.groupId = server.groupId;
  form.startupCmd = server.startupCmd ?? "";
  form.tags = [...server.tags];
}

async function handleSave() {
  if (!form.host || !form.username) return;

  loading.value = true;
  try {
    // Auto-fill name if empty
    const input: ServerInput = {
      ...form,
      name: form.name || `${form.username}@${form.host}`,
    };

    if (props.editId) {
      await serverStore.updateServer(props.editId, input);
    } else {
      await serverStore.createServer(input);
    }
    dialogVisible.value = false;
  } finally {
    loading.value = false;
  }
}

async function handleSaveAndConnect() {
  if (!form.host || !form.username) return;

  loading.value = true;
  try {
    const input: ServerInput = {
      ...form,
      name: form.name || `${form.username}@${form.host}`,
    };

    let server;
    if (props.editId) {
      server = await serverStore.updateServer(props.editId, input);
    } else {
      server = await serverStore.createServer(input);
    }
    dialogVisible.value = false;
    sessionStore.connect(server.id, server.name, 80, 24);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="480px"
    :close-on-click-modal="false"
    destroy-on-close
    class="connect-dialog"
  >
    <el-form label-position="top" size="default">
      <el-form-item :label="t('connection.name')">
        <el-input
          v-model="form.name"
          :placeholder="`${form.username || 'user'}@${form.host || 'hostname'}`"
        />
      </el-form-item>

      <div class="flex gap-3">
        <el-form-item :label="t('connection.host')" class="flex-1" required>
          <el-input v-model="form.host" placeholder="192.168.1.1" />
        </el-form-item>
        <el-form-item :label="t('connection.port')" class="w-24">
          <el-input-number v-model="form.port" :min="1" :max="65535" controls-position="right" />
        </el-form-item>
      </div>

      <el-form-item :label="t('connection.username')" required>
        <el-input v-model="form.username" placeholder="root" />
      </el-form-item>

      <el-form-item :label="t('connection.authType')">
        <el-radio-group v-model="form.authType">
          <el-radio-button value="password">{{ t("connection.password") }}</el-radio-button>
          <el-radio-button value="key">{{ t("connection.privateKey") }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="form.authType === 'password'" :label="t('connection.password')">
        <el-input v-model="form.password" type="password" show-password />
      </el-form-item>

      <template v-if="form.authType === 'key'">
        <el-form-item :label="t('connection.privateKey')">
          <el-input v-model="form.keyPath" placeholder="~/.ssh/id_rsa" />
        </el-form-item>
        <el-form-item label="Passphrase">
          <el-input v-model="form.passphrase" type="password" show-password />
        </el-form-item>
      </template>

      <el-form-item :label="t('connection.group')">
        <el-select v-model="form.groupId" clearable class="w-full">
          <el-option
            v-for="group in serverStore.groups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="dialogVisible = false">
          {{ t("connection.cancel") }}
        </el-button>
        <el-button type="default" :loading="loading" @click="handleSave">
          {{ t("connection.save") }}
        </el-button>
        <el-button type="primary" :loading="loading" @click="handleSaveAndConnect">
          {{ t("connection.connect") }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
:deep(.connect-dialog .el-dialog) {
  --el-dialog-bg-color: #1a1a2e;
  --el-dialog-border-radius: 8px;
}
</style>

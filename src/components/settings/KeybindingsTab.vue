<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessageBox } from "element-plus";
import { RefreshRight } from "@element-plus/icons-vue";
import { useSettingsStore } from "@/stores/settingsStore";
import type { KeybindingAction, Keybinding } from "@/types/keybindings";
import {
  KEYBINDING_ACTIONS,
  DEFAULT_KEYBINDINGS,
  formatKeybinding,
  keybindingEquals,
  isReserved,
} from "@/types/keybindings";

const { t } = useI18n();
const settingsStore = useSettingsStore();

// ── Recording state ──
const recordingAction = ref<KeybindingAction | "goToTab" | null>(null);
const conflictMessage = ref("");

/** Non-goToTab actions for the main list. */
const mainActions = computed(() =>
  KEYBINDING_ACTIONS.filter((a) => !a.startsWith("goToTab")),
);

/** Display text for a keybinding. */
function displayBinding(action: KeybindingAction): string {
  return formatKeybinding(settingsStore.keybindings[action]);
}

/** Display text for goToTab — shows modifier prefix + "1~9" suffix. */
const goToTabDisplay = computed(() => {
  const b = settingsStore.keybindings.goToTab1;
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const parts: string[] = [];
  if (b.ctrl && isMac) parts.push("⌃");
  if (b.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (b.shift) parts.push(isMac ? "⇧" : "Shift");
  if (b.alt) parts.push(isMac ? "⌥" : "Alt");
  parts.push("1~9");
  return parts.join(isMac ? " " : "+");
});

/** Whether goToTab modifiers differ from default. */
const isGoToTabModified = computed(() => {
  const b = settingsStore.keybindings.goToTab1;
  const d = DEFAULT_KEYBINDINGS.goToTab1;
  return b.mod !== d.mod || b.shift !== d.shift || b.alt !== d.alt || (b.ctrl ?? false) !== (d.ctrl ?? false);
});

/** Whether a binding differs from its default. */
function isModified(action: KeybindingAction): boolean {
  return !keybindingEquals(
    settingsStore.keybindings[action],
    DEFAULT_KEYBINDINGS[action],
  );
}

// ── Global listeners for recording ──

/** Tracks which modifiers are currently held during goToTab recording. */
const goToTabModifiers = ref({ mod: false, ctrl: false, shift: false, alt: false });
/** Display text for modifiers being pressed during goToTab recording. */
const goToTabLiveDisplay = computed(() => {
  const m = goToTabModifiers.value;
  if (!m.mod && !m.ctrl && !m.shift && !m.alt) return "";
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const parts: string[] = [];
  if (m.ctrl && isMac) parts.push("⌃");
  if (m.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (m.shift) parts.push(isMac ? "⇧" : "Shift");
  if (m.alt) parts.push(isMac ? "⌥" : "Alt");
  return parts.join(isMac ? " " : "+");
});

function onGlobalKeydown(e: KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (e.key === "Escape") {
    stopRecording();
    return;
  }

  const action = recordingAction.value!;
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const mod = isMac ? e.metaKey : e.ctrlKey;

  // goToTab: capture modifier-only combos (Cmd, Alt, Ctrl, Shift, etc.)
  if (action === "goToTab") {
    goToTabModifiers.value = {
      mod,
      ctrl: isMac ? e.ctrlKey : false,
      shift: e.shiftKey,
      alt: e.altKey,
    };
    return;
  }

  // Regular actions: ignore lone modifier presses
  if (["Control", "Meta", "Alt", "Shift"].includes(e.key)) return;

  if (!mod) {
    conflictMessage.value = t("keybindings.requireModifier");
    return;
  }

  const binding: Keybinding = {
    mod: true,
    shift: e.shiftKey,
    alt: e.altKey,
    key: e.key,
  };

  if (isReserved(binding)) {
    conflictMessage.value = t("keybindings.reserved");
    return;
  }

  const conflict = settingsStore.isKeybindingConflict(action as KeybindingAction, binding);
  if (conflict) {
    const conflictLabel = t(`keybindings.${conflict}`);
    conflictMessage.value = t("keybindings.conflict", { action: conflictLabel });
    return;
  }

  settingsStore.updateKeybinding(action as KeybindingAction, binding);
  stopRecording();
}

/** goToTab: commit when a modifier key is released. Uses a short debounce
 *  so that releasing one modifier of a combo (e.g., Cmd then Alt) doesn't
 *  commit prematurely — only commits once all keys settle. */
let goToTabCommitTimer: ReturnType<typeof setTimeout> | null = null;

function onGlobalKeyup(e: KeyboardEvent) {
  if (recordingAction.value !== "goToTab") return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  // Only act on modifier key releases
  if (!["Control", "Meta", "Alt", "Shift"].includes(e.key)) return;

  // Debounce: wait 150ms after last keyup to allow releasing multi-key combos
  if (goToTabCommitTimer) clearTimeout(goToTabCommitTimer);
  goToTabCommitTimer = setTimeout(() => {
    commitGoToTab();
  }, 150);
}

function commitGoToTab() {
  const m = goToTabModifiers.value;
  if (!m.mod && !m.ctrl && !m.shift && !m.alt) return;

  for (let i = 1; i <= 9; i++) {
    const goAction = `goToTab${i}` as KeybindingAction;
    const goBinding: Keybinding = { ...m, key: String(i) };
    const conflict = settingsStore.isKeybindingConflict(goAction, goBinding);
    if (conflict && !conflict.startsWith("goToTab")) {
      const conflictLabel = t(`keybindings.${conflict}`);
      conflictMessage.value = t("keybindings.conflict", { action: conflictLabel });
      goToTabModifiers.value = { mod: false, ctrl: false, shift: false, alt: false };
      return;
    }
  }

  for (let i = 1; i <= 9; i++) {
    settingsStore.updateKeybinding(`goToTab${i}` as KeybindingAction, {
      mod: m.mod,
      ctrl: m.ctrl || undefined,
      shift: m.shift,
      alt: m.alt,
      key: String(i),
    });
  }
  goToTabModifiers.value = { mod: false, ctrl: false, shift: false, alt: false };
  stopRecording();
}

function onGlobalMousedown(e: MouseEvent) {
  // If clicking inside a recording badge, ignore
  const target = e.target as HTMLElement;
  if (target?.closest(".kbd-recording")) return;
  stopRecording();
}

function startRecording(action: KeybindingAction | "goToTab") {
  removeGlobalListeners();
  recordingAction.value = action;
  conflictMessage.value = "";
  goToTabModifiers.value = { mod: false, ctrl: false, shift: false, alt: false };
  // Use capture phase so we intercept before useShortcuts
  window.addEventListener("keydown", onGlobalKeydown, true);
  window.addEventListener("keyup", onGlobalKeyup, true);
  window.addEventListener("mousedown", onGlobalMousedown, true);
}

function stopRecording() {
  if (goToTabCommitTimer) { clearTimeout(goToTabCommitTimer); goToTabCommitTimer = null; }
  recordingAction.value = null;
  conflictMessage.value = "";
  goToTabModifiers.value = { mod: false, ctrl: false, shift: false, alt: false };
  removeGlobalListeners();
}

function removeGlobalListeners() {
  window.removeEventListener("keydown", onGlobalKeydown, true);
  window.removeEventListener("keyup", onGlobalKeyup, true);
  window.removeEventListener("mousedown", onGlobalMousedown, true);
}

onUnmounted(removeGlobalListeners);

// ── Reset actions ──

function resetOne(action: KeybindingAction) {
  settingsStore.resetKeybinding(action);
}

function resetGoToTab() {
  for (let i = 1; i <= 9; i++) {
    settingsStore.resetKeybinding(`goToTab${i}` as KeybindingAction);
  }
}

async function resetAll() {
  try {
    await ElMessageBox.confirm(t("keybindings.resetAllConfirm"), {
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      type: "warning",
    });
    settingsStore.resetAllKeybindings();
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium" style="color: var(--tm-text-primary)">
        {{ t("settings.keybindings") }}
      </h3>
      <button
        class="text-xs px-2 py-1 rounded transition-colors hover:bg-white/10"
        style="color: var(--tm-text-secondary); border: 1px solid var(--tm-border)"
        @click="resetAll"
      >
        {{ t("keybindings.resetAll") }}
      </button>
    </div>

    <div class="space-y-0.5">
      <!-- Regular actions -->
      <div
        v-for="action in mainActions"
        :key="action"
        class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5"
      >
        <span class="text-xs" style="color: var(--tm-text-secondary)">
          {{ t(`keybindings.${action}`) }}
        </span>

        <div class="flex items-center gap-1.5">
          <span
            v-if="recordingAction === action"
            class="kbd-recording"
          >
            {{ t("keybindings.recording") }}
          </span>
          <button
            v-else
            class="kbd-btn"
            @click="startRecording(action)"
          >
            {{ displayBinding(action) }}
          </button>

          <button
            v-if="isModified(action) && recordingAction !== action"
            class="reset-btn"
            :title="t('keybindings.resetOne')"
            @click="resetOne(action)"
          >
            <el-icon :size="12"><RefreshRight /></el-icon>
          </button>
          <div v-else class="w-5" />
        </div>
      </div>

      <!-- Go to Tab N -->
      <div class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5">
        <span class="text-xs" style="color: var(--tm-text-secondary)">
          {{ t("keybindings.goToTab") }}
        </span>

        <div class="flex items-center gap-1.5">
          <span
            v-if="recordingAction === 'goToTab'"
            class="kbd-recording"
          >
            <template v-if="goToTabLiveDisplay">
              {{ goToTabLiveDisplay }}
            </template>
            <template v-else>
              {{ t("keybindings.recording") }}
            </template>
            <span class="kbd-fixed-suffix">1~9</span>
          </span>
          <button
            v-else
            class="kbd-btn"
            @click="startRecording('goToTab')"
          >
            {{ goToTabDisplay }}
          </button>

          <button
            v-if="isGoToTabModified && recordingAction !== 'goToTab'"
            class="reset-btn"
            :title="t('keybindings.resetOne')"
            @click="resetGoToTab"
          >
            <el-icon :size="12"><RefreshRight /></el-icon>
          </button>
          <div v-else class="w-5" />
        </div>
      </div>
    </div>

    <!-- Conflict / error message -->
    <div
      v-if="conflictMessage"
      class="text-xs px-2 py-1.5 rounded"
      style="color: #ef4444; background: rgba(239, 68, 68, 0.1)"
    >
      {{ conflictMessage }}
    </div>
  </div>
</template>

<style scoped>
.kbd-btn {
  font-size: 11px;
  font-family: monospace;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--tm-border);
  background: var(--tm-bg-base);
  color: var(--tm-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  min-width: 60px;
  text-align: center;
}

.kbd-btn:hover {
  border-color: var(--tm-input-border);
  color: var(--tm-text-primary);
}

.kbd-recording {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #6366f1;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  min-width: 60px;
  text-align: center;
  animation: pulse-border 1.5s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: #6366f1; }
  50% { border-color: #818cf8; }
}

.reset-btn {
  padding: 2px;
  border-radius: 3px;
  border: none;
  background: transparent;
  color: var(--tm-text-muted);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
}

.reset-btn:hover {
  color: var(--tm-text-primary);
  background: var(--tm-bg-hover);
}

.kbd-fixed-suffix {
  display: inline-block;
  margin-left: 4px;
  padding: 0 4px;
  font-size: 10px;
  font-family: monospace;
  border-radius: 3px;
  background: var(--tm-bg-base);
  color: var(--tm-text-muted);
  border: 1px solid var(--tm-border);
}
</style>

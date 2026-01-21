<template>
  <div class="battle-log">
    <div class="log-header">
      <h3>Battle Log</h3>
      <button class="btn-clear" @click="clearLogs">Clear</button>
    </div>
    <div class="log-content" ref="logContainer">
      <div v-for="(log, idx) in logs" :key="idx" class="log-entry">
        {{ log }}
      </div>
      <div v-if="logs.length === 0" class="log-empty">
        No actions yet.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUpdated } from 'vue'

const props = defineProps<{
  logs: string[]
}>()

const logContainer = ref<HTMLElement | null>(null)

function clearLogs() {
  // We can't clear the store from here directly without emitting
  // But for now, we'll just show what's in the store
}

// Auto-scroll is actually handled by unshift (newest at top) 
// but we'll keep the container scrollable
</script>

<style scoped>
.battle-log {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.log-header {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.log-header h3 {
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
  color: var(--text-secondary);
}

.btn-clear {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.7rem;
  cursor: pointer;
  opacity: 0.6;
}

.btn-clear:hover {
  opacity: 1;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-entry {
  font-size: 0.75rem;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  color: var(--text-primary);
  line-height: 1.4;
  animation: slideIn 0.3s ease-out;
}

.log-entry:first-child {
  background: rgba(102, 126, 234, 0.15);
  border-left: 3px solid #667eea;
}

.log-empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
  padding-top: 20px;
  opacity: 0.5;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Custom Scrollbar */
.log-content::-webkit-scrollbar {
  width: 4px;
}
.log-content::-webkit-scrollbar-track {
  background: transparent;
}
.log-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
</style>

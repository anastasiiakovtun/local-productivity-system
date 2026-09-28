import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useVaultStore = defineStore('vault', () => {
  const vaultPath = ref(null);
  const initialized = ref(false);
  const error = ref(null);

  async function init() {
    try {
      const prefs = await window.app.getPreferences();
      if (prefs.status === 'success' && prefs.data?.vaultPath) {
        vaultPath.value = prefs.data.vaultPath;
        initialized.value = true;
        return;
      }
      // No saved vault — prompt selection
      const result = await window.vault.select();
      if (result.status === 'selected') {
        vaultPath.value = result.path;
        await window.app.setPreferences({ vaultPath: result.path });
        initialized.value = true;
      } else {
        error.value = result.status === 'cancelled' ? 'cancelled' : 'selection-failed';
      }
    } catch {
      error.value = 'unexpected-error';
    }
  }

  return { vaultPath, initialized, error, init };
});

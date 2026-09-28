import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useHomeStore = defineStore('home', () => {
  const resumeTask = ref(null);
  const projects = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const [resumeResult, projectsResult] = await Promise.all([
        window.app.getHomeResume(),
        window.app.listProjects(),
      ]);
      if (resumeResult.status !== 'success' || projectsResult.status !== 'success') {
        error.value = 'Could not load Home.';
        return;
      }
      resumeTask.value = resumeResult.data ?? null;
      projects.value = projectsResult.data ?? [];
    } catch {
      error.value = 'Could not load Home.';
    } finally {
      loading.value = false;
    }
  }

  async function setProjectCover(projectLabel, color) {
    const result = await window.app.setProjectCover(projectLabel, color);
    if (result.status === 'success') await load();
    return result;
  }

  return { resumeTask, projects, loading, error, load, setProjectCover };
});

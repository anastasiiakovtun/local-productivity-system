<script setup>
import { onMounted, ref } from 'vue';
import { PhClockCounterClockwise, PhPlay, PhPlus } from '@phosphor-icons/vue';
import IconContainer from '../components/IconContainer.vue';
import ProjectCover from '../components/ProjectCover.vue';
import { useHomeStore } from '../stores/home.js';
import { useTaskStore } from '../stores/tasks.js';
import { PROJECT_COVER_COLORS } from '../shared/app-schema.js';

const emit = defineEmits(['resume', 'go-today', 'task-created']);
const homeStore = useHomeStore();
const taskStore = useTaskStore();
const quickTitle = ref('');
const quickProject = ref('');
const captureError = ref(null);
const paletteProject = ref(null);

onMounted(() => homeStore.load());

async function quickCapture() {
  const title = quickTitle.value.trim();
  if (!title) return;
  captureError.value = null;
  const result = await taskStore.createTask({
    title,
    projectLabel: quickProject.value.trim() || null,
  });
  if (result.status !== 'success') {
    captureError.value = result.reason ?? 'Could not create task.';
    return;
  }
  quickTitle.value = '';
  quickProject.value = '';
  await homeStore.load();
  emit('task-created');
}

async function chooseColor(projectLabel, color) {
  const result = await homeStore.setProjectCover(projectLabel, color);
  if (result.status === 'success') paletteProject.value = null;
}
</script>

<template>
  <div class="view home-view">
    <h2>Home</h2>
    <p v-if="homeStore.error" role="alert" class="error">{{ homeStore.error }}</p>

    <div class="home-grid">
      <section v-if="homeStore.resumeTask" class="home-resume-card">
        <div class="home-resume-header">
          <p class="eyebrow">Continue where you left off</p>
          <button
            type="button"
            class="btn-primary home-resume-action"
            :aria-label="`Resume ${homeStore.resumeTask.title}`"
            @click="emit('resume', homeStore.resumeTask)"
          >
            <PhPlay :size="17" weight="fill" aria-hidden="true" />
            <span>Resume</span>
          </button>
        </div>
        <div class="home-task-heading">
          <ProjectCover
            :project-label="homeStore.resumeTask.project_label"
            :color="homeStore.resumeTask.color"
            :size="36"
          />
          <div>
            <p v-if="homeStore.resumeTask.project_label" class="task-project">{{ homeStore.resumeTask.project_label }}</p>
            <h3>{{ homeStore.resumeTask.title }}</h3>
          </div>
        </div>
        <div class="home-checkpoint">
          <div>
            <span>Previous outcome</span>
            <p>{{ homeStore.resumeTask.outcome }}</p>
          </div>
          <div v-if="homeStore.resumeTask.next_action">
            <span>Next action</span>
            <p>{{ homeStore.resumeTask.next_action }}</p>
          </div>
        </div>
      </section>

      <section v-else class="home-empty-card">
        <p class="eyebrow">Nothing to resume</p>
        <div class="empty-state">
          <IconContainer><PhClockCounterClockwise :size="24" aria-hidden="true" /></IconContainer>
          <div>
            <h3>No active task</h3>
            <p>Start a task from Today or capture a new one.</p>
          </div>
        </div>
        <button type="button" class="btn-primary" aria-label="Go to Today" @click="emit('go-today')">Go to Today</button>
      </section>

      <section class="home-capture-card">
        <p class="eyebrow">Quick capture</p>
        <form @submit.prevent="quickCapture">
          <input v-model="quickTitle" type="text" aria-label="Quick task title" placeholder="What needs doing?" />
          <input v-model="quickProject" type="text" aria-label="Quick project label" placeholder="Project (optional)" />
          <button type="submit" class="btn-secondary" :disabled="!quickTitle.trim()">
            <PhPlus :size="16" aria-hidden="true" />
            <span>Quick capture</span>
          </button>
        </form>
        <p v-if="captureError" role="alert" class="error">{{ captureError }}</p>
      </section>
    </div>

    <section v-if="homeStore.projects.length" class="home-projects">
      <p class="eyebrow">Projects</p>
      <div class="home-project-list">
        <div v-for="project in homeStore.projects" :key="project.label" class="home-project-row">
          <button
            type="button"
            class="project-cover-button"
            :aria-label="`Change cover for ${project.label}`"
            @click="paletteProject = paletteProject === project.label ? null : project.label"
          >
            <ProjectCover :project-label="project.label" :color="project.color" :size="36" />
          </button>
          <span>{{ project.label }}</span>
          <div v-if="paletteProject === project.label" class="project-palette" :aria-label="`Cover colors for ${project.label}`">
            <button
              v-for="color in PROJECT_COVER_COLORS"
              :key="color"
              type="button"
              class="project-color-option"
              :data-color="color"
              :style="{ backgroundColor: color }"
              :aria-label="`Use ${color} for ${project.label}`"
              @click="chooseColor(project.label, color)"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

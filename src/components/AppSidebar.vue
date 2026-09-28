<script setup>
import {
  PhActivity,
  PhCalendarBlank,
  PhCalendarDots,
  PhCheckCircle,
  PhClockCounterClockwise,
  PhHouse,
  PhSidebarSimple,
  PhTrash,
  PhTray,
} from '@phosphor-icons/vue';
import ProjectCover from './ProjectCover.vue';

const props = defineProps({
  activeView: { type: String, required: true },
  collapsed: { type: Boolean, default: false },
  projects: { type: Array, default: () => [] },
});

const emit = defineEmits(['navigate', 'toggle-collapse', 'select-project']);

const navigation = [
  { view: 'home',     label: 'Home',     icon: PhHouse, isHome: true },
  { view: 'inbox',    label: 'Inbox',    icon: PhTray },
  { view: 'today',    label: 'Today',    icon: PhCalendarBlank },
  { view: 'upcoming', label: 'Upcoming', icon: PhCalendarDots },
];

const secondaryNavigation = [
  { view: 'completed', label: 'Completed', icon: PhCheckCircle },
  { view: 'sessions',  label: 'Sessions',  icon: PhClockCounterClockwise },
  { view: 'activity',  label: 'Activity',  icon: PhActivity },
  { view: 'trash',     label: 'Trash',     icon: PhTrash },
];
</script>

<template>
  <nav
    class="sidebar"
    :class="collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'"
    aria-label="Main navigation"
  >
    <div class="sidebar-logo" :aria-label="collapsed ? 'Obsidian Focus' : undefined">
      <span v-if="collapsed" aria-hidden="true">OF</span>
      <span v-else>Obsidian Focus</span>
    </div>

    <ul class="nav-list" role="list">
      <li v-for="item in navigation" :key="item.view">
        <button
          type="button"
          class="nav-item"
          :aria-label="item.label"
          :aria-current="activeView === item.view ? 'page' : undefined"
          :title="collapsed ? item.label : undefined"
          @click="emit('navigate', item.view)"
        >
          <component
            :is="item.icon"
            :weight="activeView === item.view ? 'fill' : 'regular'"
            :size="18"
            aria-hidden="true"
          />
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </button>
      </li>
    </ul>

    <div class="sidebar-divider" role="separator" aria-hidden="true" />

    <ul class="nav-list" role="list">
      <li v-for="item in secondaryNavigation" :key="item.view">
        <button
          type="button"
          class="nav-item"
          :aria-label="item.label"
          :aria-current="activeView === item.view ? 'page' : undefined"
          :title="collapsed ? item.label : undefined"
          @click="emit('navigate', item.view)"
        >
          <component
            :is="item.icon"
            :weight="activeView === item.view ? 'fill' : 'regular'"
            :size="18"
            aria-hidden="true"
          />
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </button>
      </li>
    </ul>

    <div v-if="projects.length" class="sidebar-projects" aria-label="Projects">
      <p v-if="!collapsed" class="sidebar-section-label">Projects</p>
      <button
        v-for="project in projects"
        :key="project.label"
        type="button"
        class="project-nav-item"
        :data-project="project.label"
        :aria-label="`Project ${project.label}`"
        :title="collapsed ? project.label : undefined"
        @click="emit('select-project', project.label)"
      >
        <ProjectCover :project-label="project.label" :color="project.color" :size="20" />
        <span v-if="!collapsed" class="nav-label">{{ project.label }}</span>
      </button>
    </div>

    <button
      type="button"
      class="sidebar-toggle"
      :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      @click="emit('toggle-collapse')"
    >
      <PhSidebarSimple :size="18" aria-hidden="true" />
      <span v-if="!collapsed" class="nav-label">Collapse</span>
    </button>
  </nav>
</template>

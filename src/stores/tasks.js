import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTaskStore = defineStore('tasks', () => {
  const inbox = ref([]);
  const today = ref([]);
  const completed = ref([]);

  async function fetchInbox() {
    const r = await window.app.listTasks('inbox');
    if (r.status === 'success') inbox.value = r.data;
  }

  async function fetchToday() {
    const r = await window.app.listTasks('today');
    if (r.status === 'success') today.value = r.data;
  }

  async function fetchCompleted() {
    const r = await window.app.listTasks('completed');
    if (r.status === 'success') completed.value = r.data;
  }

  async function createTask(fields) {
    const r = await window.app.createTask(fields);
    if (r.status === 'success') await fetchInbox();
    return r;
  }

  async function completeTask(id) {
    const r = await window.app.completeTask(id);
    if (r.status === 'success') {
      await fetchInbox();
      await fetchToday();
    }
    return r;
  }

  async function reopenTask(id) {
    const r = await window.app.reopenTask(id);
    if (r.status === 'success') {
      await fetchCompleted();
      await fetchInbox();
    }
    return r;
  }

  async function deleteTask(id) {
    const r = await window.app.deleteTask(id);
    if (r.status === 'success') {
      await fetchInbox();
      await fetchToday();
    }
    return r;
  }

  async function editTask(id, changes) {
    const r = await window.app.editTask(id, changes);
    if (r.status === 'success') await fetchInbox();
    return r;
  }

  return {
    inbox, today, completed,
    fetchInbox, fetchToday, fetchCompleted,
    createTask, editTask, completeTask, reopenTask, deleteTask,
  };
});

import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onMilestoneWrite } from './calendar/sync';

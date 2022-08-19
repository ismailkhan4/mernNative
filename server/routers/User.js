import express from 'express';
import {
  addTask,
  login,
  logout,
  register,
  removeTask,
  updateTask,
  verify,
} from '../controllers/User.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.route('/register').post(register);
router.route('/verify').post(isAuthenticated, verify);
router.route('/login').post(login);
router.route('/logout').get(logout);

router.route('/newTask').post(isAuthenticated, addTask);
router
  .route('/task/:taskId')
  .get(isAuthenticated, updateTask)
  .delete(isAuthenticated, removeTask);

export default router;

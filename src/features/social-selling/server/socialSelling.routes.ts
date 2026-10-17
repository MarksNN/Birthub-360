import { Router } from 'express';
import { socialSellingController } from './SocialSellingController.js';

const router = Router();

router.post('/approach/generate', socialSellingController.generateApproach);

export const socialSellingRoutes = router;

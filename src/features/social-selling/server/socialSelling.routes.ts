import { Router } from 'express';
import { SocialSellingController } from './SocialSellingController.js';

const router = Router();

router.post('/approach/generate', SocialSellingController.generateApproach);

export const socialSellingRoutes = router;

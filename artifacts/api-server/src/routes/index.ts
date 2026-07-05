import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import walletRouter from "./wallet";
import tasksRouter from "./tasks";
import submissionsRouter from "./submissions";
import withdrawalsRouter from "./withdrawals";
import scoringRouter from "./scoring";
import dailyDuesRouter from "./daily_dues";
import docsRouter from "./docs";
import updatesRouter from "./updates";
import bannersRouter from "./banners";
import notificationsRouter from "./notifications";
import settingsRouter from "./settings";
import adminRouter from "./admin";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(walletRouter);
router.use(tasksRouter);
router.use(submissionsRouter);
router.use(withdrawalsRouter);
router.use(scoringRouter);
router.use(dailyDuesRouter);
router.use(docsRouter);
router.use(updatesRouter);
router.use(bannersRouter);
router.use(notificationsRouter);
router.use(settingsRouter);
router.use(adminRouter);

export default router;

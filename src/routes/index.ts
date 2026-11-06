import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { productsRouter } from "./products.routes.js";
import { categoriesRouter } from "./categories.routes.js";
import { subcategoriesRouter } from "./subcategories.routes.js";
import { sectionsRouter } from "./sections.routes.js";
import { ordersRouter } from "./orders.routes.js";
import { offersRouter } from "./offers.routes.js";
import { bannersRouter } from "./banners.routes.js";
import { invoicesRouter } from "./invoices.routes.js";
import { profileRouter } from "./profile.routes.js";
import { ageRangesRouter } from "./ageRanges.routes.js";
import { keepAliveRouter } from "./keepAlive.routes.js";

export const apiRouter = Router();

apiRouter.use("/admin/auth", authRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/subcategories", subcategoriesRouter);
apiRouter.use("/sections", sectionsRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/offers", offersRouter);
apiRouter.use("/banners", bannersRouter);
apiRouter.use("/invoices", invoicesRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/age-ranges", ageRangesRouter);
apiRouter.use("/keep-alive", keepAliveRouter);


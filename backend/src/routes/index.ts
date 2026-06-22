import { Router } from "express";
import productsRouter from "./products";
import stockMovementsRouter from "./stockMovements";
import exchangeRatesRouter from "./exchangeRates";
import settingsRouter from "./settings";
import barcodeLookupRouter from "./barcodeLookup";

const router = Router();

router.use("/products", productsRouter);
router.use("/stock-movements", stockMovementsRouter);
router.use("/exchange-rates", exchangeRatesRouter);
router.use("/settings", settingsRouter);
router.use("/products/lookup", barcodeLookupRouter);

export default router;

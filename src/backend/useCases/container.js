// Imports all engines and repos so that they can be called  by the frontendthrough a 'useCases' import

//logging
import "../../polyfills";
import { runMigration } from "../data/local/db";
import { withLogging } from "../Logging/withLogging";
import { logger } from "../Logging/Logger";

// Repositories
import KPISnapshotRepo from "../Repositories/KPISnapshotRepo";
import ProductRepository from "../Repositories/ProductRepo";
import RecipeRepository from "../Repositories/RecipeRepo";
import SaleRepository from "../Repositories/SaleRepo";
import StockRepository from "../Repositories/StockRepo";
import SupplierPriceRepository from "../Repositories/SupplierPriceRepository";
import SupplierRepository from "../Repositories/SupplierRepository";

//Engines
import KPICalculator from "../engines/KPICalculator";
import RecipeEngine from "../engines/RecipeEngine";
import RestockEngine from "../engines/RestockEngine";

//Use cases
import { createGetDashboardKpiUseCase } from "./dashboardKPIs";
import { createRecordSaleUseCase } from "./recordSale";
import { createGenerateRestockPlanUseCase } from "./generateRestockPlan";
import { createPreviewSaleDeductionUseCase } from "./previewSalleableProduct";
import { createCreateProductUseCase } from "./createProduct";
import { createCreateSupplierUseCase } from "./createSupplier";
import { createSetRecipeComponentsUseCase } from "./setRecipeComponents";
import {
  createReceiveStockUseCase,
  createSetOpeningStockUseCase,
} from "./stock";
import { createSetSupplierPriceUseCase } from "./setSupplierPrice";
import { createGetSellableProductsUseCase } from "./getSellableProducts";
import { createGetSupplierPricesUseCase } from "./getSupplierPrices";
import { createSaveSupplierPriceUseCase } from "./saveSupplierPrice";
import { createUpdateProductUseCase } from "./updateProduct";
import { createGetDashboardSummaryUseCase } from "./getDashboardSummary";

// create the repos once then the get used everywhere else
const recipeRepository = new RecipeRepository();
const stockRepository = new StockRepository();
const saleRepository = new SaleRepository();
const productRepository = new ProductRepository();
const kpiSnapshotRepository = new KPISnapshotRepo();
const supplierPriceRepository = new SupplierPriceRepository();
const supplierRepository = new SupplierRepository();

const recipeEngine = new RecipeEngine(recipeRepository, stockRepository);
const restockEngine = new RestockEngine(
  kpiSnapshotRepository,
  supplierPriceRepository,
);
const kpiCalculator = new KPICalculator(
  saleRepository,
  stockRepository,
  kpiSnapshotRepository,
);

// Use cases that other use cases are built from
const createSupplier = createCreateSupplierUseCase({ supplierRepository });
const setSupplierPrice = createSetSupplierPriceUseCase({
  supplierPriceRepository,
});
const generateRestockPlan = createGenerateRestockPlanUseCase({
  kpiCalculator,
  restockEngine,
  kpiSnapshotRepository,
  supplierPriceRepository,
  productRepository,
  stockRepository,
});

const rawUseCases = {
  recordSale: createRecordSaleUseCase({
    recipeEngine,
    saleRepository,
    productRepository,
  }),
  getDashboardKpis: createGetDashboardKpiUseCase({
    kpiCalculator,
    productRepository,
  }),
  generateRestockPlan: createGenerateRestockPlanUseCase({
    restockEngine,
    kpiSnapshotRepository,
    supplierPriceRepository,
    productRepository,
    stockRepository,
  }),
  previewSaleDeductions: createPreviewSaleDeductionUseCase({
    recipeEngine,
    productRepository,
  }),
  createProduct: createCreateProductUseCase({ productRepository }),
  createSupplier: createCreateSupplierUseCase({ supplierRepository }),
  setRecipeComponents: createSetRecipeComponentsUseCase({
    recipeRepository,
    productRepository,
  }),
  receiveStock: createReceiveStockUseCase({ stockRepository }),
  setOpeningStock: createSetOpeningStockUseCase({ stockRepository }),
  setSupplierPrice: createSetSupplierPriceUseCase({
    supplierPriceRepository,
  }),
  updateProduct: createUpdateProductUseCase({
    productRepository,
    stockRepository,
  }),
  getDashboardSummary: createGetDashboardSummaryUseCase({
    kpiCalculator,
    productRepository,
    stockRepository,
    saleRepository,
    supplierPriceRepository,
    generateRestockPlan,
  }),
  getSellableProducts: createGetSellableProductsUseCase({
    productRepository,
    stockRepository,
    recipeRepository,
  }),
  previewSaleDeductions: createPreviewSaleDeductionUseCase({
    recipeEngine,
    productRepository,
  }),
  saveSupplierPrice: createSaveSupplierPriceUseCase({
    supplierRepository,
    createSupplier,
    setSupplierPrice,
  }),
};

// The tables must exist before the first use case touches the database.
const databaseReady = runMigration().then(
  () => logger.info("database", "migration finished"),
  (err) => {
    logger.error("database", "migration failed", {
      error: err?.message,
      stack: String(err?.stack ?? "")
        .split("\n")
        .slice(0, 8)
        .join(" | "),
    });
    throw err;
  },
);
const whenDatabaseReady = (useCase) => async (input) => {
  await databaseReady;
  return useCase(input);
};

// every use case gets logged through here
/** @type {Record<string, (input?: any) => Promise<any>>} */
export const useCases = Object.fromEntries(
  Object.entries(rawUseCases).map(([name, fn]) => [
    name,
    withLogging(name, whenDatabaseReady(fn)),
  ]),
);

// the old name, still used by existing imports
export const useCase = useCases;

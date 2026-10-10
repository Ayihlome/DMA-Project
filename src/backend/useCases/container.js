// Imports all engines and repos so that they can be called  by the frontendthrough a 'useCases' import

//logging
import { withLogging } from "./Logging/withLogging";

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
};

// every use case gets logged through here
export const useCase = Object.fromEntries(
  Object.entries(rawUseCases).map(([name, fn]) => [
    name,
    withLogging(name, fn),
  ]),
);

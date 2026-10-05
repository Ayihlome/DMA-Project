// Imports all engines and repos so that they can be called  by the frontendthrough a 'useCases' import

// Repositories
import KPISnapshotRepo from "./Repositories/KPISnapshotRepo";
import ProductRepository from "./Repositories/ProductRepo";
import RecipeRepository from "./Repositories/RecipeRepo";
import SaleRepository from "./Repositories/SaleRepo";
import StockRepository from "./Repositories/StockRepo";
import SupplierPriceRepository from "./Repositories/SupplierPriceRepository";

//Engines
import KPICalculator from "./engines/KPICalculator";
import RecipeEngine from "./engines/RecipeEngine";
import RestockEngine from "./engines/RestockEngine";

//Use cases
import { createGetDashboardKpiUseCase } from "./useCases/DashboardKPIs";
import { createRecordSaleUseCase } from "./useCases/recordSale";
import { createGenerateRestockPlanUseCase } from "./useCases/generateRestockPlan";
import { createPreviewSaleDeductionUseCase } from "./useCases/previewSalleableProduct";

// create the repos once then the get used everywhere else
const recipeRepository = new RecipeRepository();
const stockRepository = new StockRepository();
const saleRepository = new SaleRepository();
const productRepository = new ProductRepository();
const kpiSnapshotRepository = new KPISnapshotRepo();
const supplierPriceRepository = new SupplierPriceRepository();

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

export const useCases = {
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
};

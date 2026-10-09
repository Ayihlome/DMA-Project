import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Analytics } from "../core";

type ReportInput = Analytics & { store: string; owner: string };

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export async function shareInventoryReport(input: ReportInput) {
  const categoryRows = input.categories
    .map(
      (category) =>
        `<tr><td>${escapeHtml(category.name)}</td><td>${category.level}%</td></tr>`,
    )
    .join("");
  const movementRows = input.weeks
    .map(
      (week, index) =>
        `<tr><td>${escapeHtml(week)}</td><td>${input.sold[index]}</td><td>${input.restocked[index]}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;color:#2D3748;padding:32px}h1{color:#2E4BD8;margin-bottom:4px}
h2{margin-top:28px}p{color:#586377}.summary{display:flex;gap:12px}.tile{border:1px solid #E2E8F0;
border-radius:10px;padding:12px;flex:1}.value{font-size:24px;font-weight:700}table{width:100%;
border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #E2E8F0;padding:9px}th{color:#586377}
</style></head><body>
<h1>StockEvo inventory report</h1>
<p>${escapeHtml(input.store)} · prepared for ${escapeHtml(input.owner)} · ${new Date().toLocaleDateString("en-ZA")}</p>
<div class="summary">
<div class="tile"><div>Total items</div><div class="value">${input.total}</div></div>
<div class="tile"><div>Healthy</div><div class="value">${input.healthy}</div></div>
<div class="tile"><div>Low</div><div class="value">${input.low}</div></div>
<div class="tile"><div>Critical</div><div class="value">${input.critical}</div></div>
</div>
<h2>Category levels</h2><table><thead><tr><th>Category</th><th>Target level</th></tr></thead><tbody>${categoryRows}</tbody></table>
<h2>Stock movement · last 12 weeks</h2><table><thead><tr><th>Week</th><th>Units sold</th><th>Units restocked</th></tr></thead><tbody>${movementRows}</tbody></table>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(uri, {
    UTI: ".pdf",
    mimeType: "application/pdf",
    dialogTitle: "Share StockEvo inventory report",
  });
}

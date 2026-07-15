import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inputPath = "C:/Users/gabri/Downloads/askfinance_demo_18_mois.csv";
const outputDir = "C:/Users/gabri/Desktop/askfinance-ai/outputs/askfinance_translation_20260716";
const csvOutputPath = `${outputDir}/askfinance_demo_18_months_english.csv`;
const xlsxOutputPath = `${outputDir}/askfinance_demo_18_months_english.xlsx`;
const previewPath = `${outputDir}/preview.png`;

const sourceText = (await fs.readFile(inputPath, "utf8")).replace(/^\uFEFF/, "");
const sourceRows = sourceText
  .split(/\r?\n/)
  .filter((line) => line.length > 0)
  .map((line) => line.split(";"));

const widths = [...new Set(sourceRows.map((row) => row.length))];
if (widths.length !== 1 || widths[0] !== 13) {
  throw new Error(`Unexpected CSV shape: ${JSON.stringify(widths)}`);
}

const headerMap = {
  "Date de comptabilisation": "Posting Date",
  "Libelle simplifie": "Simplified Description",
  "Libelle operation": "Transaction Description",
  Reference: "Reference",
  "Informations complementaires": "Additional Information",
  "Type operation": "Transaction Type",
  Categorie: "Category",
  "Sous categorie": "Subcategory",
  Debit: "Debit",
  Credit: "Credit",
  "Date operation": "Transaction Date",
  "Date de valeur": "Value Date",
  "Pointage operation": "Reconciliation Flag",
};

const entityMap = {
  "ASSURANCE SERENITE": "SERENITY INSURANCE",
  "ATELIER HORIZON DEMO": "HORIZON WORKSHOP DEMO",
  "BISTROT CENTRAL": "CENTRAL BISTRO",
  "CADEAUX DE NOEL DEMO": "CHRISTMAS GIFTS DEMO",
  "CAFE REPUBLIQUE": "REPUBLIC CAFE",
  "COTISATIONS BANCAIRES": "BANK FEES",
  "DIRECTION GENERALE FINANCES": "GENERAL DIRECTORATE OF FINANCE",
  "ENERGIE CLAIRE": "CLEAR ENERGY",
  "FIBRE NOVA": "NOVA FIBER",
  "HOTEL RIVIERA DEMO": "RIVIERA HOTEL DEMO",
  "MISSION FREELANCE DEMO": "FREELANCE ASSIGNMENT DEMO",
  "PHARMACIE CENTRALE": "CENTRAL PHARMACY",
  "REMBOURSEMENT GROUPE DEMO": "GROUP REFUND DEMO",
  "REMISE COTISATIONS": "FEE REBATE",
  "RESIDENCE DES LILAS": "LILAC RESIDENCE",
};

const operationTypeMap = {
  "Carte bancaire": "Card Payment",
  "Frais bancaires": "Bank Fees",
  Prelevement: "Direct Debit",
  Virement: "Bank Transfer",
  "Virement recu": "Incoming Bank Transfer",
};

const categoryMap = {
  Alimentation: "Food",
  "Banque et assurances": "Banking & Insurance",
  "Impots et taxes": "Taxes & Duties",
  "Logement et immobilier": "Housing & Real Estate",
  "Loisirs et vacances": "Leisure & Travel",
  "Salaire et revenus": "Salary & Income",
  "Sante et bien-etre": "Health & Wellness",
  "Shopping et services": "Shopping & Services",
  "Telephonie et internet": "Phone & Internet",
  Transport: "Transportation",
  Virements: "Transfers",
};

const subcategoryMap = {
  "Assurance habitation": "Home Insurance",
  Cadeaux: "Gifts",
  "Electricite, gaz et eau": "Electricity, Gas & Water",
  Electronique: "Electronics",
  "Frais bancaires": "Bank Fees",
  Hotels: "Hotels",
  Internet: "Internet",
  "Loyer et charges": "Rent & Service Charges",
  Musique: "Music",
  Pharmacie: "Pharmacy",
  Remboursement: "Refund",
  "Remboursement entre proches": "Reimbursement Between Friends & Family",
  "Restaurants et cafes": "Restaurants & Cafes",
  "Revenus complementaires": "Additional Income",
  Salaire: "Salary",
  "Services numeriques": "Digital Services",
  "Shopping et services - autre": "Shopping & Services - Other",
  Sport: "Sports & Fitness",
  Supermarche: "Supermarket",
  "Taxi et VTC": "Taxi & Ride-Hailing",
  "Telephone mobile": "Mobile Phone",
  "Transports en commun": "Public Transportation",
  Video: "Video Streaming",
  Voyages: "Travel",
};

function replaceEntities(text) {
  let translated = text;
  for (const [french, english] of Object.entries(entityMap).sort((a, b) => b[0].length - a[0].length)) {
    translated = translated.replaceAll(french, english);
  }
  return translated;
}

function translateDescription(text) {
  let translated = replaceEntities(text);
  const exactMap = {
    "COTISATION BOUQUET DEMO": "DEMO PACKAGE FEE",
    "REMISE SERVICES BOUQUET DEMO": "DEMO PACKAGE SERVICES REBATE",
    "VIR REMBOURSEMENT IMPOT DEMO": "TRANSFER TAX REFUND DEMO",
  };
  if (exactMap[translated]) return exactMap[translated];

  translated = translated
    .replaceAll("ATELIER HORIZON", "HORIZON WORKSHOP")
    .replace(/^PRLV SEPA /, "SEPA DIRECT DEBIT ")
    .replace(/^VIR SEPA /, "SEPA TRANSFER ")
    .replace(/^VIR /, "TRANSFER ")
    .replace(/^CB /, "CARD ")
    .replaceAll(" FACT ", " PURCHASE ")
    .replaceAll(" SALAIRE ", " SALARY ")
    .replaceAll(" LOYER ", " RENT ")
    .replaceAll(" ORDINATEUR ", " COMPUTER ")
    .replaceAll(" DOUBLE ", " DUPLICATE ");
  return translated;
}

function translateAdditionalInfo(text) {
  if (text === "") return "";
  const exactMap = {
    "ABONNEMENT DEMO": "DEMO SUBSCRIPTION",
    "DOUBLON VOLONTAIRE POUR DEMONSTRATION": "INTENTIONAL DUPLICATE FOR DEMONSTRATION",
    "FACTURE MENSUELLE ENERGIE DEMO": "DEMO MONTHLY ENERGY BILL",
    "LOYER ET CHARGES DONNEES FICTIVES": "RENT AND SERVICE CHARGES - FICTIONAL DATA",
    "NOUVEAU TARIF ENERGIE DEMO": "NEW DEMO ENERGY RATE",
    "OPERATION EXCEPTIONNELLE DEMO": "EXCEPTIONAL DEMO TRANSACTION",
    "PARTAGE DE DEPENSES FICTIF": "FICTIONAL EXPENSE SHARING",
  };
  if (exactMap[text]) return exactMap[text];
  return text
    .replace(/^MISSION TRIMESTRIELLE /, "QUARTERLY ASSIGNMENT ")
    .replace(/^SALAIRE NET (20\d{2}-\d{2}) DONNEES FICTIVES$/, "NET SALARY $1 - FICTIONAL DATA");
}

const translatedRows = sourceRows.map((row, rowIndex) => {
  if (rowIndex === 0) return row.map((value) => headerMap[value] ?? value);
  const translated = [...row];
  translated[1] = entityMap[translated[1]] ?? translated[1];
  translated[2] = translateDescription(translated[2]);
  translated[4] = translateAdditionalInfo(translated[4]);
  translated[5] = operationTypeMap[translated[5]] ?? translated[5];
  translated[6] = categoryMap[translated[6]] ?? translated[6];
  translated[7] = subcategoryMap[translated[7]] ?? translated[7];
  return translated;
});

for (let r = 1; r < sourceRows.length; r++) {
  if (!(sourceRows[r][5] in operationTypeMap)) throw new Error(`Unknown transaction type on row ${r + 1}`);
  if (!(sourceRows[r][6] in categoryMap)) throw new Error(`Unknown category on row ${r + 1}`);
  if (!(sourceRows[r][7] in subcategoryMap)) throw new Error(`Unknown subcategory on row ${r + 1}`);
  for (const c of [0, 3, 8, 9, 10, 11, 12]) {
    if (translatedRows[r][c] !== sourceRows[r][c]) {
      throw new Error(`Protected value changed on row ${r + 1}, column ${c + 1}`);
    }
  }
}

const expectedMapSizes = { headers: 13, entities: 15, types: 5, categories: 11, subcategories: 24 };
const actualMapSizes = {
  headers: Object.keys(headerMap).length,
  entities: Object.keys(entityMap).length,
  types: Object.keys(operationTypeMap).length,
  categories: Object.keys(categoryMap).length,
  subcategories: Object.keys(subcategoryMap).length,
};
if (JSON.stringify(actualMapSizes) !== JSON.stringify(expectedMapSizes)) {
  throw new Error(`Translation map size mismatch: ${JSON.stringify(actualMapSizes)}`);
}

const frenchAudit = /\b(?:ABONNEMENT|ASSURANCE|ATELIER|BANCAIRES|CADEAUX|CB|COTISATION|DEPENSES|DONNEES|DOUBLON|ENERGIE|FACT|FACTURE|FICTIF|IMPOT|LOYER|MISSION TRIMESTRIELLE|NOUVEAU TARIF|OPERATION EXCEPTIONNELLE|ORDINATEUR|PHARMACIE|PRELEVEMENT|PRLV|REMISE|REMBOURSEMENT|SALAIRE|SERENITE|VIR|VIREMENT)\b/i;
const untranslated = [];
for (let r = 1; r < translatedRows.length; r++) {
  for (const c of [1, 2, 4, 5, 6, 7]) {
    if (frenchAudit.test(translatedRows[r][c])) {
      untranslated.push({ row: r + 1, column: c + 1, value: translatedRows[r][c] });
    }
  }
}
if (untranslated.length > 0) {
  throw new Error(`Possible untranslated text: ${JSON.stringify(untranslated.slice(0, 20))}`);
}

const csvEscape = (value) => {
  const text = String(value ?? "");
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const translatedCsv = `\uFEFF${translatedRows.map((row) => row.map(csvEscape).join(";")).join("\r\n")}\r\n`;
await fs.writeFile(csvOutputPath, translatedCsv, "utf8");

const parseDate = (value) => {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
};
const parseAmount = (value) => (value === "" ? null : Number(value.replace(",", ".")));

const workbookRows = translatedRows.map((row, index) => {
  if (index === 0) return row;
  return [
    parseDate(row[0]),
    row[1],
    row[2],
    row[3],
    row[4],
    row[5],
    row[6],
    row[7],
    parseAmount(row[8]),
    parseAmount(row[9]),
    parseDate(row[10]),
    parseDate(row[11]),
    Number(row[12]),
  ];
});

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Transactions");
const dataRange = sheet.getRangeByIndexes(0, 0, workbookRows.length, workbookRows[0].length);
dataRange.values = workbookRows;

sheet.showGridLines = false;
sheet.freezePanes.freezeRows(1);
sheet.getRange(`A1:M${workbookRows.length}`).format = {
  font: { name: "Aptos", size: 10, color: "#1F2937" },
  verticalAlignment: "center",
};
sheet.getRange("A1:M1").format = {
  fill: "#17365D",
  font: { name: "Aptos", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  rowHeight: 32,
};
sheet.getRange(`A2:A${workbookRows.length}`).format.numberFormat = "dd/mm/yyyy";
sheet.getRange(`K2:L${workbookRows.length}`).format.numberFormat = "dd/mm/yyyy";
sheet.getRange(`I2:J${workbookRows.length}`).format.numberFormat = "#,##0.00;[Red]-#,##0.00";
sheet.getRange(`I2:M${workbookRows.length}`).format.horizontalAlignment = "right";
sheet.getRange(`A2:H${workbookRows.length}`).format.horizontalAlignment = "left";
sheet.getRange(`K2:L${workbookRows.length}`).format.horizontalAlignment = "center";

const widthsPx = [95, 205, 315, 150, 320, 135, 145, 235, 90, 90, 100, 95, 115];
for (let col = 0; col < widthsPx.length; col++) {
  sheet.getRangeByIndexes(0, col, workbookRows.length, 1).format.columnWidthPx = widthsPx[col];
}
sheet.getRange(`A2:M${workbookRows.length}`).format.rowHeight = 20;

const table = sheet.tables.add(`A1:M${workbookRows.length}`, true, "TransactionsTable");
table.style = "TableStyleMedium2";
table.showBandedRows = true;
table.showFilterButton = true;

const inspection = await workbook.inspect({
  kind: "table",
  range: "Transactions!A1:M12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 13,
  maxChars: 8000,
});
console.log(inspection.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "Transactions",
  range: "A1:M25",
  scale: 1.25,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(xlsxOutputPath);

const csvRoundTripRows = (await fs.readFile(csvOutputPath, "utf8"))
  .replace(/^\uFEFF/, "")
  .trimEnd()
  .split(/\r?\n/);
if (csvRoundTripRows.length !== translatedRows.length) {
  throw new Error(`CSV row-count mismatch: ${csvRoundTripRows.length} vs ${translatedRows.length}`);
}

console.log(JSON.stringify({
  rows: workbookRows.length - 1,
  columns: workbookRows[0].length,
  csvOutputPath,
  xlsxOutputPath,
  previewPath,
  untranslatedMatches: untranslated.length,
}, null, 2));

// Smoke-тест нечёткого поиска: node test-search.js
// Не требует токена и сети — только базу houses.db и fuse.js.
const {
    parseAddress,
    searchHouse,
    searchStreets
} = require("./bot.js");

function run(desc, input, expectKind) {
    const { street, house } = parseAddress(input);
    const result = searchHouse(street, house);
    const ok = result.kind === expectKind;
    const icon = ok ? "✅" : "❌";
    let extra = "";
    if (result.kind === "exact") extra = ` → ${result.data.address}`;
    if (result.kind === "fuzzy") extra = ` → ${result.data.address} (исправлена улица)`;
    if (result.kind === "suggest") extra = ` → ` + result.suggestions.map(s =>
        `г. Курган, ${s.street_type} ${s.street[0].toUpperCase() + s.street.slice(1)}, д. ${s.house}`).join(" | ");
    if (result.kind === "street-suggest") extra = ` → ` + result.streets.slice(0, 3).map(s => s.street).join(", ");
    console.log(`${icon} ${desc} (${input}) → ${result.kind}${extra}`);
    return ok;
}

let failed = 0;

// Точное совпадение (как раньше)
if (!run("Точное совпадение", "Кирова 117", "exact")) failed++;

// Опечатка в улице — автокоррекция до существующего адреса
if (!run("Опечатка в улице", "Корева 117", "fuzzy")) failed++;

// Регистр и «ё/е»
if (!run("Верхний регистр", "МАШИНОСТРОИТЕЛЕЙ 19", "exact")) failed++;

// Серьёзная опечатка — всё ещё автокоррекция
if (!run("Серьёзная опечатка", "Машиностроитилей 19", "fuzzy")) failed++;

// Улица без номера дома — список похожих улиц
if (!run("Только улица", "Кирова", "street-suggest")) failed++;

// Мусорный запрос — не найдено, но подсказки допустимы (kind suggest/notfound не падает)
const { street: s2, house: h2 } = parseAddress("вася петров 5");
const r2 = searchHouse(s2, h2);
if (r2.kind !== "notfound" && r2.kind !== "suggest") { console.log(`❌ Мусорный запрос → ${r2.kind}`); failed++; }
else console.log(`✅ Мусорный запрос (вася петров 5) → ${r2.kind}`);

if (failed === 0) {
    console.log("\n🎉 Все проверки пройдены!");
} else {
    console.log(`\n⚠️ Провалено проверок: ${failed}`);
    process.exitCode = 1;
}

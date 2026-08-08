"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function get(valuePath, object) {
	return String(valuePath || "").split(".").reduce((value, key) =>
		value === undefined || value === null ? undefined : value[key], object);
}
function textOf(value) {
	if(value === undefined || value === null) return "";
	if(typeof value !== "object") return String(value);
	return value["#text"] === undefined ? "" : String(value["#text"]);
}
const Common = {
	arrX(value) { return value === undefined || value === null ? [] : (Array.isArray(value) ? value : [value]); },
	textOf: textOf,
	normalizedReference() { return ""; },
	collectObjectsForKeys() { return []; },
	collectValuesForKeys() { return []; },
	featureNameOf(object, fallback) { return object && object.code || fallback || ""; },
	idKeysOf() { return []; },
	indexObjects() { return {}; },
	upperDepthOf() { return null; },
	lowerDepthOf() { return null; },
	depthOf() { return null; },
	rawXmlOfResult(result) { return result && (result.xml || result); }
};
let Profiles;
const source = fs.readFileSync(path.resolve(__dirname, "../src/profiles.js"), "utf8");
vm.runInNewContext(source, {
	Array: Array,
	Date: Date,
	Intl: Intl,
	Math: Math,
	Object: Object,
	String: String,
	WeakMap: WeakMap,
	console: console,
	js: {
		get: get,
		sf(format) {
			const args = Array.prototype.slice.call(arguments, 1);
			return String(format).replace(/%[sd]/g, () => args.shift());
		}
	},
	define(factory) {
		Profiles = factory(id => {
			if(id === "./ol/layers/common") return Common;
			if(id === "./ol/geometry") return { openLayersGeometryFrom() { return null; } };
			if(id === "./guess") return function() { return ""; };
			throw new Error("Onbekende testdependency: " + id);
		});
	}
}, { filename: "src/profiles.js" });

const layer = {
	bovenkant: "0",
	onderkant: "0.5",
	opmerking: "diameter=100",
	"brobhrgt:grondsoort": "siltigZand",
	"brobhrgt:zandmediaan": "fijn",
	"brobhrgt:tertiairebestanddelen": "geen",
	"brobhrgt:laaggrensbepaling": "afgeleid",
	"brobhrgt:kleur": "standaardBruin",
	"brobhrgt:organischestofgehalte": "zwakOrganisch",
	"brobhrgt:beschrijfkwaliteit": "QM5",
	"brobhrgt:antropogeen": "ja",
	"brobhrgt:boortechniek": "handDraaien"
};
const filter = {
	code: "F1",
	bovenkant: "0.1",
	onderkant: "0.4",
	materiaalpb: "pvc"
};
const finishing = {
	bovenkant: "0.05",
	onderkant: "0.3",
	aanvullingsoort: "filterzand"
};
const sample = {
	code: "M1",
	bovenkant: "0.2",
	onderkant: "0.4"
};
const result = Profiles.collectBoreholeProfiles({
	type: "sikb/bodeminformatie/9.1.0",
	version: "9.1.0",
	xml: {
		bodeminformatie: {
			metainformatie: { "@_versie": "9.1.0" },
			meetpunt: {
				code: "HB1",
				einddiepte: "0.5",
				bodemlaag: layer,
				filter: filter,
				afwerking: finishing,
				bodemmonster: sample
			}
		}
	}
});
const intervals = result.profiles[0].intervals;
const interval = intervals.find(item => item.kind === "Laag");

assert.strictEqual(interval.target, layer);
assert.deepStrictEqual(Array.from(new Set(intervals.map(item => item.kind))).sort(),
	["Afwerking", "Filter", "Laag", "Monster"],
	"SIKB 9.1-profielen moeten lagen, filters, afwerkingen en bodemmonsters meenemen");
assert.strictEqual(intervals.find(item => item.kind === "Filter").target, filter);
assert.strictEqual(intervals.find(item => item.kind === "Afwerking").target, finishing);
assert.strictEqual(intervals.find(item => item.kind === "Monster").target, sample);
assert.strictEqual(interval.material, "siltig zand",
	"de BRO-grondsoort moet het materiaal van een SIKB 9.1-laag bepalen");
assert.strictEqual(interval.soilPattern, "sand",
	"siltigZand moet met de zandarcering worden getekend");
assert.match(interval.label, /^siltig zand, fijn, standaard bruin, zwak organisch, QM5/);
assert.match(interval.label, /antropogeen/);
assert.match(interval.label, /laaggrens afgeleid/);
assert.match(interval.label, /hand draaien/);
assert.doesNotMatch(interval.label, /\bgeen\b/,
	"lege BRO-kwalificaties horen niet in het profiellabel");
assert.strictEqual(Profiles.descriptionNormOf({ version: "9.1.0", xml: result.context.xml }),
	"NEN-EN-ISO 14688",
	"commentaar-geparseerde BRO-BHR-GT-velden moeten als ISO 14688 worden aangeduid");
assert.strictEqual(Profiles.descriptionNormOf({ version: "9.1.0", xml: {
	bodeminformatie: { meetpunt: { bodemlaag: { grondsoort: "2" } } }
} }), "NEN 5104", "oude SIKB-laagcodering moet terugvallen op NEN 5104");
assert.strictEqual(Profiles.descriptionNormOf({ version: "15.0", xml: {
	"imsikb0101:descriptionProcedure": "NEN6693"
} }), "NEN 6693", "een expliciete NEN 6693-procedure moet worden herkend");

let ProfileRendering;
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, "../src/rendering/profiles.js"), "utf8"), {
	Array: Array,
	Math: Math,
	Object: Object,
	String: String,
	console: console,
	js: {
		sf(format) {
			const args = Array.prototype.slice.call(arguments, 1);
			return String(format).replace(/%([Hsd])/g, () => args.shift());
		}
	},
	define(factory) {
		ProfileRendering = factory(id => {
			if(id === "../ol/layers/common") return Common;
			throw new Error("Onbekende rendering-testdependency: " + id);
		});
	}
}, { filename: "src/rendering/profiles.js" });
const profileCard = ProfileRendering.renderBoreholeProfileCard(result.profiles[0], 0,
	{ count: 0, items: {} }, "legacy-test");
assert.match(profileCard, /class='profile-layer-fill/,
	"de SIKB 9.1-bodemlaag moet als laag worden gerenderd");
assert.match(profileCard, /class='profile-filter-screen/,
	"het SIKB 9.1-filter moet als filter worden gerenderd");
assert.match(profileCard, /class='profile-finishing/,
	"de SIKB 9.1-afwerking moet als afwerking worden gerenderd");
assert.match(profileCard, /class='profile-sample/,
	"het SIKB 9.1-bodemmonster moet als monster worden gerenderd");
assert.match(profileCard, /Lagen <b>1<\/b>/);
assert.match(profileCard, /Filters <b>1<\/b>/);
assert.match(profileCard, /Afwerkingen <b>1<\/b>/);
assert.match(profileCard, /Monsters <b>1<\/b>/);

const shallowDepthTicks = ProfileRendering.profileDepthTickScale(3100, 620);
assert.strictEqual(shallowDepthTicks.majorStep, 200,
	"een profiel van 31 meter moet ronde labels per 2 meter krijgen");
assert.strictEqual(shallowDepthTicks.minorStep, 100,
	"minor ticks moeten de major stap rustig in tweeën delen");
assert.ok(shallowDepthTicks.ticks.filter(tick => tick.major).length <= 20,
	"het aantal dieptelabels moet door de beschikbare hoogte worden begrensd");

const deepDepthTicks = ProfileRendering.profileDepthTickScale(12450, 620);
assert.strictEqual(deepDepthTicks.majorStep, 1000,
	"een diep profiel moet automatisch naar labels per 10 meter opschalen");
assert.strictEqual(deepDepthTicks.minorStep, 500);
assert.ok(deepDepthTicks.ticks.filter(tick => tick.major).length <= 20,
	"ook diepe profielen mogen geen zee van labels produceren");
const deepProfileSvg = ProfileRendering.renderBoreholeProfileSvg({
	name: "diep profiel",
	depth: 12450,
	intervals: []
}, 0, "deep-test", { count: 0, items: {} });
assert.ok((deepProfileSvg.match(/class='profile-depth-label'/g) || []).length <= 20,
	"de SVG-renderer moet de adaptieve labelschaal daadwerkelijk gebruiken");

const detailedDepthTicks = ProfileRendering.profileDepthTickScale(10, 220);
assert.strictEqual(detailedDepthTicks.majorStep, 2,
	"ondiepe profielen moeten juist voldoende detail behouden");
assert.strictEqual(detailedDepthTicks.minorStep, 1);
const legend = ProfileRendering.renderProfileLegend("NEN-EN-ISO 14688");
assert.match(legend, /class='sikb-profile-legend'/);
assert.match(legend, /Zand/);
assert.match(legend, /Filter/);
assert.match(legend, /Beschrijfnorm:<\/b> NEN-EN-ISO 14688/);
const usedLegend = ProfileRendering.renderProfileLegend("NEN 5104", [{ intervals: [
	{ kind: "Laag", soilPattern: "sand" }, { kind: "Filter" },
	{ kind: "Afwerking" }, { kind: "Monster" }
] }]);
assert.match(usedLegend, /Zand/);
assert.match(usedLegend, /Filter/);
assert.match(usedLegend, /Afwerking/);
assert.match(usedLegend, /Monster/);
assert.doesNotMatch(usedLegend, /Klei/,
	"de vaste legenda moet alleen categorieën tonen die in de profielen voorkomen");

const sikbFacetSource = fs.readFileSync(path.resolve(__dirname,
	"../src/vcl-comps/Tabs$/Document.sikb.js"), "utf8");
assert.match(sikbFacetSource, /"activate-facet": activateSikbFacet/,
	"de SIKB-facet moet een eerder geactiveerde BRO-facet expliciet vervangen");
assert.match(sikbFacetSource,
	/function sikbPreviewLabelOf[\s\S]*js\.nameOf\(urn\)[\s\S]*replace\(\/\\s\*\\\(urn:/,
	"URN-waarden in de previewheader moeten via dezelfde domeintabelresolver worden gelabeld");
const imsikbTables = require(path.resolve(__dirname, "../src/current/imsikb0101-all.json"));
const investigationReasons = imsikbTables["sikb.OnderzoekAanleidingen_c"].OnderzoekAanleidingen;
const investigationPhases = imsikbTables["sikb.OnderzoeksfaseType_c"].OnderzoeksfaseType;
assert.strictEqual(investigationReasons.find(item => item.ID === 12).Omschrijving, "Onbekend");
assert.strictEqual(investigationPhases.find(item => item.ID === 4).Omschrijving, "OO fase");

console.log("SIKB profile tests passed");

define(function(require) {
	const Common = require("../ol/layers/common");
	const Geometry = require("../ol/geometry");
	const Profiles = require("../profiles");
	const SampleReport = require("../testing/sample-report");
	const BotovaTesting = require("../botova/Testing");

	const arrX = Common.arrX;
	const textOf = Common.textOf;
	const normalizedReference = Common.normalizedReference;
	const collectObjectsForKeys = Common.collectObjectsForKeys;
	const featureNameOf = Common.featureNameOf;
	const idKeysOf = Common.idKeysOf;
	const upperDepthOf = Common.upperDepthOf;
	const lowerDepthOf = Common.lowerDepthOf;
	const xmlOfResult = Common.xmlOfResult;
	const openLayersGeometryFrom = Geometry.openLayersGeometryFrom;
	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;
	const nameOf = value => typeof js !== "undefined" && js.nameOf instanceof Function ? js.nameOf(value) : "";
	const sf = function(format) {
		const args = Array.prototype.slice.call(arguments, 1);
		if(typeof js !== "undefined" && js.sf instanceof Function) {
			return js.sf.apply(js, [format].concat(args));
		}
		let index = 0;
		return String(format).replace(/%[sd]/g, () => args[index++]);
	};

	const sheets = [{
		name: "1001_Veldonderzoek",
		columns: ["Boornaam", "Deellocatie", "X", "Y", "Maaiveldhoogte_NAP_m", "Van_m_mv_wl", "Tot_m_mv_wl", "Van_NAP_m", "Tot_NAP_m", "Grondsoort", "Toevoeging 1", "Toevoeging 2", "Toevoeging 3", "Bzb 1", "Bzb 2", "Bzb 3", "Bzb 4", "Bzb5", "Bzb6", "Bzb7", "Geurwaarneming", "Olie_water_reactie"]
	}, {
		name: "1002_Landbodem",
		columns: ["Boornaam", "Deelmonster", "Van_m_mv_wl", "Tot_m_mv_wl", "Van_NAP_m", "Tot_NAP_m", "Grondsoort", "Mengmonster", "Matrix", "Analysepakket", "T101", "T104", "T129", "T130", "Mengmonster_PFAS", "PFAS_Overig", "SOM_PFOA", "SOM_PFOS"]
	}, {
		name: "1003_Waterbodem",
		columns: ["Boornaam", "Deelmonster", "Van_m_mv_wl", "Tot_m_mv_wl", "Van_NAP_m", "Tot_NAP_m", "Grondsoort", "Mengmonster", "Matrix", "Analysepakket", "T101", "T101B", "T103a", "T105", "T106", "T129", "Mengmonster_PFAS", "PFAS_Overig", "SOM_PFOA", "SOM_PFOS"]
	}, {
		name: "1003a_Waterbodem_vak",
		columns: []
	}, {
		name: "1005_Bouwstoffen",
		columns: ["Boornaam", "Deelmonster", "Van_m_mv_wl", "Tot_m_mv_wl", "Van_NAP_m", "Tot_NAP_m", "Bouwstof", "Mengmonster", "Matrix", "Analysepakket", "T116", "T117"]
	}, {
		name: "1006_Asfalt",
		columns: []
	}, {
		name: "1007_Verontreinigingscontouren",
		columns: ["GIS_VlakNaam", "Mengmonsters", "Boringen", "Grondsoort", "Van_m_mv_wl", "Tot_m_mv_wl", "Van_NAP_m", "Tot_NAP_m", "Matrix", "T101", "T101_Parameter", "T103a", "T103a_Parameter", "T116", "T116_Parameter", "T117", "T117_Parameter", "Mengmonster_PFAS", "PFAS_Overig", "SOM_PFOA", "SOM_PFOS", "Asbest"]
	}, {
		name: "1008_Asbest",
		columns: []
	}];
	const sheetByName = sheets.reduce((acc, sheet) => {
		acc[sheet.name] = sheet;
		return acc;
	}, {});
	const testingLabelPatterns = Object.create(null);
	const testingColumnCache = typeof WeakMap !== "undefined" ? new WeakMap() : null;
	const codeCollator = typeof Intl !== "undefined" && Intl.Collator ? new Intl.Collator("nl-NL", { numeric: true, sensitivity: "base" }) : null;

	function compareNaturalCodes(left, right) {
		const a = String(left || "").trim().replace(/\s+/g, " ");
		const b = String(right || "").trim().replace(/\s+/g, " ");
		const result = codeCollator ? codeCollator.compare(a, b) : a.localeCompare(b);
		return result || a.localeCompare(b) || (String(left || "").length - String(right || "").length);
	}
	function unique(values) {
		const result = [];
		const seen = new Set();
		(values || []).forEach(value => {
			if(!value || seen.has(value)) return;
			seen.add(value);
			result.push(value);
		});
		return result;
	}
	function cachedByObject(map, target, create) {
		if(!map || !target || typeof target !== "object") return create();
		if(map.has(target)) return map.get(target);
		const value = create();
		map.set(target, value);
		return value;
	}
	function labelFromValue(value) {
		const text = textOf(value) || normalizedReference(value);
		return String(text || "").replace(new RegExp("^.*[:/#]([^:/#]+)$", "g"), "$1");
	}
	function shortUrnLabelOf(value) {
		const text = String(value || "");
		const tail = text.replace(new RegExp("^.*[:/#]([^:/#]+)$", "g"), "$1");
		return tail && tail !== text ? "urn:" + tail : text;
	}
	function displayLabelOfValue(value) {
		const name = nameOf(value);
		if(name && name !== "[object Object]") return String(name);
		const text = textOf(value);
		const ref = normalizedReference(value);
		const shortRef = shortUrnLabelOf(ref);
		if(text && shortRef && text.indexOf(shortRef) === -1) return sf("%s (%s)", text, shortRef);
		return text || shortRef || "";
	}
	function numericUrnPartOfValue(value) {
		const text = [normalizedReference(value), textOf(value), displayLabelOfValue(value)].filter(Boolean).join(" ");
		const matches = String(text).match(/(?:urn:|id:|[:/#])(\d+)(?=[)\s:/#]|$)/ig) || [];
		const match = matches.length && matches[matches.length - 1].match(/(\d+)/);
		return match ? parseInt(match[1], 10) : null;
	}
	function xlinkResolvedTargetsOf(obj) {
		const values = [];
		const pushValue = value => arrX(value).forEach(item => values.push(item));
		pushValue(get("@_xlink:href-resolved", obj));
		pushValue(get("@xlink:href-resolved", obj));
		pushValue(get("xlink:href-resolved", obj));
		return values.filter(Boolean);
	}
	function materialLabelOf(obj) {
		return labelFromValue(
			get("spec:materialClass", obj) ||
			get("immetingen:materialClass", obj) ||
			get("imsikb0101:materialClass", obj) ||
			get("immetingen:soilType", obj) ||
			get("imsikb0101:soilType", obj) ||
			get("soilType", obj) ||
			get("lithology", obj) ||
			get("grondsoort", obj)
		);
	}
	function layerTypeLabelOf(obj) {
		return labelFromValue(get("imsikb0101:layerType", obj) || get("layerType", obj));
	}
	function objectTypeOf(obj, fallback) {
		const name = obj && Object.keys(obj).filter(key => /:(?:Layer|Finishing|Filter|Sample|Borehole|Trench|Characteristic|Analysis)$/.test(key))[0];
		if(name) return name.split(":").pop();
		if(obj && (get("immetingen:indicator", obj) || get("indicator", obj))) return "Characteristic";
		return Common.objectTypeOf ? Common.objectTypeOf(obj, fallback) : fallback;
	}
	function characteristicIndicatorValueOf(characteristic) {
		return get("immetingen:indicator", characteristic) || get("indicator", characteristic);
	}
	function characteristicResultValueOf(characteristic) {
		return get("om:result.immetingen:ClassifiedResult.immetingen:classifiedResult", characteristic) ||
			get("om:result.immetingen:ClassifiedResult.classifiedResult", characteristic) ||
			get("om:result.immetingen:classifiedResult", characteristic) ||
			get("om:result.classifiedResult", characteristic) ||
			get("om:result.immetingen:MeasureResult.immetingen:numericValue", characteristic) ||
			get("om:result.immetingen:MeasureResult.numericValue", characteristic) ||
			get("om:result.immetingen:numericValue", characteristic) ||
			get("om:result.numericValue", characteristic) ||
			get("om:result.immetingen:TextResult.immetingen:textValue", characteristic) ||
			get("om:result.immetingen:TextResult.textValue", characteristic) ||
			get("om:result.textValue", characteristic);
	}
	function characteristicResultDisplayInfoOf(characteristic) {
		const result = characteristicResultValueOf(characteristic);
		const indicator = characteristicIndicatorValueOf(characteristic);
		const indicatorLabel = displayLabelOfValue(xlinkResolvedTargetsOf(indicator)[0] || indicator);
		const resultValue = xlinkResolvedTargetsOf(result)[0] || result;
		const resultLabel = displayLabelOfValue(resultValue);
		return {
			indicator: indicatorLabel,
			result: resultLabel,
			resultUrn: numericUrnPartOfValue(resultValue),
			label: [indicatorLabel, resultLabel].filter(Boolean).join(": ")
		};
	}
	function specimenTypeOf(sample) {
		const value = get("spec:specimenType", sample) ||
			get("imsikb0101:specimenType", sample) ||
			get("specimenType", sample);
		return textOf(value) || normalizedReference(value);
	}
	function isAnalysisSample(sample) {
		return (/(?:monstertype:)?id:10(?:\b|$)|urn:10|analysemonster/i).test(specimenTypeOf(sample));
	}
	function numberAttr(obj, names) {
		const value = names.map(name => obj && obj[name]).filter(value => value !== undefined && value !== null)[0];
		return value !== undefined ? parseFloat(value) : NaN;
	}
	function coordinateFromXY(obj) {
		const coordinate = [
			numberAttr(obj, ["@_xcoord", "@xcoord", "xcoord", "x", "@_x", "@x"]),
			numberAttr(obj, ["@_ycoord", "@ycoord", "ycoord", "y", "@_y", "@y"])
		];
		return coordinate.every(isFinite) ? coordinate : null;
	}
	function measureM(value) {
		const text = displayLabelOfValue(value);
		const match = String(text || "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
		if(!match) return null;
		const number = parseFloat(match[0]);
		if(!isFinite(number)) return null;
		if(/\bmm\b/i.test(text) || /Eenheid:id:21\b|eenheid:id:21\b/.test(text)) return number / 1000;
		if(/\bcm\b/i.test(text)) return number / 100;
		return number;
	}
	function surfaceLevelM(borehole) {
		return [
			"imsikb0101:surfaceLevel", "immetingen:surfaceLevel", "surfaceLevel",
			"imsikb0101:groundLevel", "immetingen:groundLevel", "groundLevel",
			"imsikb0101:altitude", "immetingen:altitude", "altitude",
			"maaiveldhoogte", "maaiveldhoogteNAP"
		].map(key => measureM(get(key, borehole))).filter(value => value !== null && isFinite(value))[0];
	}
	function depthM(value) {
		return value === null || value === undefined || !isFinite(value) ? "" : Math.round((value / 100) * 1000) / 1000;
	}
	function napDepth(surfaceLevel, depthCm) {
		return surfaceLevel === null || surfaceLevel === undefined || depthCm === null || depthCm === undefined || !isFinite(depthCm) ?
			"" : Math.round((surfaceLevel - depthCm / 100) * 1000) / 1000;
	}
	function projectName(context) {
		const project = context && context.objects && context.objects.projects && context.objects.projects[0];
		return project ? featureNameOf(project, "") : "";
	}
	function createExportCache(context, opts) {
		return {
			opts: opts || {},
			context: context,
			projectName: projectName(context),
			coordinates: new WeakMap(),
			surfaceLevels: new WeakMap(),
			characteristicInfos: new WeakMap(),
			characteristicResults: new WeakMap(),
			profileLayers: new WeakMap(),
			containingLayers: new WeakMap(),
			testingSummaries: new WeakMap(),
			profileSamples: null,
			contours: null
		};
	}
	function coordinateOf(borehole, cache) {
		return cachedByObject(cache && cache.coordinates, borehole, () => {
			const legacy = coordinateFromXY(borehole && (borehole.point || borehole));
			if(legacy) return legacy;
			const geometry = openLayersGeometryFrom(borehole);
			return geometry && geometry.getCoordinates instanceof Function ? geometry.getCoordinates() : null;
		});
	}
	function surfaceLevelOf(borehole, cache) {
		return cachedByObject(cache && cache.surfaceLevels, borehole, () => surfaceLevelM(borehole));
	}
	function characteristicInfosFor(target, context, cache) {
		if(!target || !context) return [];
		return cachedByObject(cache && cache.characteristicInfos, target, () =>
			Profiles.resolveCharacteristicTargets(target, context.objectIndex, context)
				.filter(characteristic => objectTypeOf(characteristic, "") === "Characteristic")
				.map(characteristicResultDisplayInfoOf)
				.filter(info => info && (info.indicator || info.result || info.label)));
	}
	function characteristicResults(target, context, matcher, cache) {
		const key = matcher.source + "/" + matcher.flags;
		const resultMap = cachedByObject(cache && cache.characteristicResults, target, () => Object.create(null));
		if(resultMap[key]) return resultMap[key];
		resultMap[key] = unique(characteristicInfosFor(target, context, cache)
			.filter(info => matcher.test([info.indicator, info.label].join(" ")))
			.map(info => info.result || info.label));
		return resultMap[key];
	}
	function layerSoilLabel(layer, context, cache) {
		if(!layer) return "";
		return characteristicResults(layer, context, /grondsoort|bodemsoort/i, cache)[0] ||
			materialLabelOf(layer) ||
			layerTypeLabelOf(layer);
	}
	function sheetRow(columns, values) {
		const row = {};
		columns.forEach(column => row[column] = values[column] === undefined || values[column] === null ? "" : values[column]);
		return row;
	}
	function baseIntervalValues(profile, interval, layer, context, cache) {
		const surfaceLevel = surfaceLevelOf(profile.borehole, cache);
		return {
			Boornaam: profile.name,
			Deellocatie: cache ? cache.projectName : projectName(context),
			Maaiveldhoogte_NAP_m: surfaceLevel === undefined ? "" : surfaceLevel,
			Van_m_mv_wl: depthM(interval.upper),
			Tot_m_mv_wl: depthM(interval.lower),
			Van_NAP_m: napDepth(surfaceLevel, interval.upper),
			Tot_NAP_m: napDepth(surfaceLevel, interval.lower),
			Grondsoort: layerSoilLabel(layer || interval.target, context, cache)
		};
	}
	function profileLayers(profile, cache) {
		return cachedByObject(cache && cache.profileLayers, profile, () =>
			(profile.intervals || []).filter(candidate => candidate.kind === "Laag"));
	}
	function containingLayer(profile, interval, cache) {
		return cachedByObject(cache && cache.containingLayers, interval, () => {
			const layers = profileLayers(profile, cache);
			let overlap = null;
			for(let i = 0; i < layers.length; ++i) {
				const layer = layers[i];
				if(layer.upper <= interval.upper && layer.lower >= interval.lower) return layer;
				if(!overlap && layer.upper < interval.lower && layer.lower > interval.upper) overlap = layer;
			}
			return overlap;
		});
	}
	function testingRowsBySample(report) {
		const map = {};
		(report && (report.allRows || report.rows) || []).forEach(row => {
			idKeysOf(row.sample).forEach(key => {
				(map[key] = map[key] || []).push(row);
			});
		});
		return map;
	}
	function testingRowsForSample(sample, context, map) {
		const rows = [];
		const seen = new Set();
		const addRows = target => idKeysOf(target).forEach(key => (map[key] || []).forEach(row => {
			if(seen.has(row)) return;
			seen.add(row);
			rows.push(row);
		}));
		addRows(sample);
		if(context && context.sampleIndex) {
			Profiles.resolveRelationTargets(sample, context.sampleIndex).forEach(addRows);
		}
		return rows;
	}
	function testingConclusionLabel(conclusion) {
		return BotovaTesting.toetsingLabelOfConclusion(conclusion, "");
	}
	function analysisParameterLabel(analysis) {
		const component = get("component", analysis);
		if(component) return component.naam || nameOf(component) || component.xid || "";
		const physicalProperty = get("immetingen:physicalProperty.immetingen:PhysicalProperty", analysis) ||
			get("immetingen:physicalProperty", analysis) ||
			get("physicalProperty", analysis);
		return [
			displayLabelOfValue(get("immetingen:quantity", physicalProperty) || get("quantity", physicalProperty)),
			displayLabelOfValue(get("immetingen:parameter", physicalProperty) || get("parameter", physicalProperty))
		].filter(Boolean).join(" / ");
	}
	function testingColumnsFor(columns) {
		if(testingColumnCache && testingColumnCache.has(columns)) return testingColumnCache.get(columns);
		const info = {
			flags: columns.filter(column => /^T\d/i.test(column) && column.indexOf("_") === -1),
			parameters: columns.filter(column => /^T\d/i.test(column) && column.indexOf("_Parameter") !== -1)
		};
		if(testingColumnCache) testingColumnCache.set(columns, info);
		return info;
	}
	function testingLabelPattern(toets) {
		if(!testingLabelPatterns[toets]) {
			testingLabelPatterns[toets] = new RegExp("(^|[^A-Za-z0-9])" + toets.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^A-Za-z0-9]|$)", "i");
		}
		return testingLabelPatterns[toets];
	}
	function hasTestingLabel(labels, toets) {
		const pattern = testingLabelPattern(toets);
		return labels.some(label => pattern.test(label));
	}
	function createTestingSummary(rows, opts) {
		opts = opts || {};
		const testingLabelOf = opts.testingConclusionLabel || testingConclusionLabel;
		const analysisLabelOf = opts.analysisParameterLabel || analysisParameterLabel;
		const testingLabels = unique(rows.reduce((values, row) =>
			values.concat(row.toetsingen || []).concat((row.conclusions || []).map(testingLabelOf)), []));
		const analysisLabels = unique(rows.reduce((values, row) =>
			values.concat((row.analyses || []).map(analysisLabelOf)), []));
		const analysisGroups = unique(rows.reduce((values, row) =>
			values.concat((row.paramGroups || []).map(group => group.name || group.key)), []));
		const analysisText = analysisLabels.join(", ");
		return {
			rows: rows,
			testingLabels: testingLabels,
			analysisLabels: analysisLabels,
			analysisText: analysisText,
			analysisGroups: analysisGroups,
			mengmonster: unique(rows.map(row => row.name)).join(", "),
			pfas: /pfas/i.test(analysisText),
			pfoa: /pfoa/i.test(analysisText),
			pfos: /pfos/i.test(analysisText)
		};
	}
	function testingSummaryForSample(sample, context, testingMap, cache) {
		return cachedByObject(cache && cache.testingSummaries, sample, () =>
			createTestingSummary(testingRowsForSample(sample, context, testingMap), cache && cache.opts));
	}
	function applyTestingColumns(values, columns, summary) {
		const info = testingColumnsFor(columns);
		info.flags.forEach(column => values[column] = hasTestingLabel(summary.testingLabels, column) ? "x" : "");
		info.parameters.forEach(column => {
			const toets = column.replace(/_Parameter$/, "");
			values[column] = hasTestingLabel(summary.testingLabels, toets) ? summary.analysisLabels.join(", ") : "";
		});
	}
	function matrixOf(sample, layer) {
		return displayLabelOfValue(get("imsikb0101:matrix", sample) || get("matrix", sample)) ||
			displayLabelOfValue(get("spec:materialClass", sample) || get("immetingen:materialClass", sample)) ||
			materialLabelOf(sample) ||
			materialLabelOf(layer);
	}
	function sampleSheetName(sample, layer) {
		const text = [specimenTypeOf(sample), matrixOf(sample, layer), materialLabelOf(layer), materialLabelOf(sample)]
			.join(" ").toLowerCase();
		if(/bouwstof|puin|granulaat|steen|beton|baksteen/.test(text)) return "1005_Bouwstoffen";
		if(/waterbodem|slib|oppervlaktewater|water/.test(text)) return "1003_Waterbodem";
		return "1002_Landbodem";
	}
	function profileSamples(profiles, cache) {
		if(cache && cache.profileSamples) return cache.profileSamples;
		const samples = new Set();
		profiles.forEach(profile =>
			(profile.intervals || []).filter(interval => interval.kind === "Monster").forEach(interval => samples.add(interval.target)));
		if(cache) cache.profileSamples = samples;
		return samples;
	}
	function collectLeanProfiles(result, opts) {
		opts = opts || {};
		const timer = opts.timer;
		const xml = xmlOfResult(result);
		const version = Profiles.sikbVersionOf(result || {}, xml);
		if(Profiles.legacySikbVersionOf(xml) || (!isNaN(version) && version <= 10)) {
			return timer ? timer.measure("collectBoreholeProfiles:legacy", () => Profiles.collectBoreholeProfiles(result)) :
				Profiles.collectBoreholeProfiles(result);
		}
		const context = timer ? timer.measure("createSikbPreviewContext", () => Profiles.createSikbPreviewContext(result)) :
			Profiles.createSikbPreviewContext(result);
		if(!context || !context.xml) return { profiles: [], context: null };
		const profiles = [];
		const collect = () => {
			context.boreholes.forEach((borehole, index) => {
				profiles.push({
					borehole: borehole,
					name: featureNameOf(borehole, sf("Borehole %d", index + 1)),
					sortIndex: index,
					intervals: Profiles.collectBoreholeProfileIntervals(borehole, context.xml, context.objectIndex, context)
				});
			});
		};
		if(timer) timer.measure("collectLeanProfileIntervals", collect);
		else collect();
		profiles.sort((left, right) => compareNaturalCodes(left.name, right.name) || ((left.sortIndex || 0) - (right.sortIndex || 0)));
		return { profiles: profiles, context: context };
	}
	function veldonderzoekRows(profiles, context, cache) {
		const columns = sheetByName["1001_Veldonderzoek"].columns;
		return profiles.reduce((rows, profile) => {
			const coordinate = coordinateOf(profile.borehole, cache);
			(profile.intervals || []).filter(interval => interval.kind === "Laag").forEach(interval => {
				const values = baseIntervalValues(profile, interval, interval.target, context, cache);
				const additions = characteristicResults(interval.target, context, /toevoeg|bijmeng|bestanddeel|mediaan|kleur|lutum|humus/i, cache);
				const bijzonderheden = characteristicResults(interval.target, context, /bijzonder/i, cache);
				values.X = coordinate ? Math.round(coordinate[0] * 1000) / 1000 : "";
				values.Y = coordinate ? Math.round(coordinate[1] * 1000) / 1000 : "";
				values["Toevoeging 1"] = additions[0] || "";
				values["Toevoeging 2"] = additions[1] || "";
				values["Toevoeging 3"] = additions[2] || "";
				values["Bzb 1"] = bijzonderheden[0] || "";
				values["Bzb 2"] = bijzonderheden[1] || "";
				values["Bzb 3"] = bijzonderheden[2] || "";
				values["Bzb 4"] = bijzonderheden[3] || "";
				values.Bzb5 = bijzonderheden[4] || "";
				values.Bzb6 = bijzonderheden[5] || "";
				values.Bzb7 = bijzonderheden[6] || "";
				values.Geurwaarneming = characteristicResults(interval.target, context, /geur/i, cache).join(", ");
				values.Olie_water_reactie = characteristicResults(interval.target, context, /olie|water.*reactie|olie.*water/i, cache).join(", ");
				rows.push(sheetRow(columns, values));
			});
			return rows;
		}, []);
	}
	function sampleRowsBySheet(profiles, context, testingMap, cache) {
		const rowsBySheet = {
			"1002_Landbodem": [],
			"1003_Waterbodem": [],
			"1005_Bouwstoffen": []
		};
		profiles.forEach(profile => {
			(profile.intervals || []).filter(interval => interval.kind === "Monster").forEach(interval => {
				const sample = interval.target;
				const layer = containingLayer(profile, interval, cache);
				const sheetName = sampleSheetName(sample, layer);
				const sheet = sheetByName[sheetName];
				const values = baseIntervalValues(profile, interval, layer, context, cache);
				const summary = testingSummaryForSample(sample, context, testingMap, cache);
				values.Deelmonster = featureNameOf(sample, interval.label || "");
				values.Mengmonster = summary.mengmonster;
				values.Matrix = matrixOf(sample, layer);
				values.Analysepakket = summary.analysisGroups.join(", ");
				values.Bouwstof = sheetName === "1005_Bouwstoffen" ? (materialLabelOf(sample) || materialLabelOf(layer) || values.Matrix) : "";
				applyTestingColumns(values, sheet.columns, summary);
				values.Mengmonster_PFAS = summary.pfas ? values.Mengmonster || "x" : "";
				values.PFAS_Overig = summary.pfas ? "x" : "";
				values.SOM_PFOA = summary.pfoa ? "x" : "";
				values.SOM_PFOS = summary.pfos ? "x" : "";
				rowsBySheet[sheetName].push(sheetRow(sheet.columns, values));
			});
		});
		return rowsBySheet;
	}
	function addReportOnlySampleRows(rowsBySheet, report, profiles, context, testingMap, cache) {
		const samples = profileSamples(profiles, cache);
		(report && (report.allRows || report.rows) || []).forEach(row => {
			const sample = row.sample;
			if(samples.has(sample)) return;
			const sheetName = sampleSheetName(sample);
			const sheet = sheetByName[sheetName];
			const summary = testingSummaryForSample(sample, context, testingMap, cache);
			const values = {
				Boornaam: "",
				Deelmonster: row.name || featureNameOf(sample, ""),
				Mengmonster: row.name || "",
				Matrix: matrixOf(sample),
				Analysepakket: summary.analysisGroups.join(", ")
			};
			applyTestingColumns(values, sheet.columns, summary);
			values.Mengmonster_PFAS = summary.pfas ? values.Mengmonster || "x" : "";
			values.PFAS_Overig = summary.pfas ? "x" : "";
			values.SOM_PFOA = summary.pfoa ? "x" : "";
			values.SOM_PFOS = summary.pfos ? "x" : "";
			rowsBySheet[sheetName].push(sheetRow(sheet.columns, values));
		});
		return rowsBySheet;
	}
	function contourRows(context, testingMap, cache) {
		const sheet = sheetByName["1007_Verontreinigingscontouren"];
		const contours = cache && cache.contours ? cache.contours : collectObjectsForKeys(context && context.xml, [
			"imsikb0101:ContaminationInformation", "ContaminationInformation"
		]);
		if(cache) cache.contours = contours;
		return contours.map(contour => {
			const summary = testingSummaryForSample(contour, context, testingMap, cache);
			const values = {
				GIS_VlakNaam: featureNameOf(contour, ""),
				Mengmonsters: summary.mengmonster,
				Boringen: "",
				Grondsoort: characteristicResults(contour, context, /grondsoort|bodemsoort/i, cache).join(", "),
				Van_m_mv_wl: depthM(upperDepthOf(contour)),
				Tot_m_mv_wl: depthM(lowerDepthOf(contour)),
				Matrix: matrixOf(contour)
			};
			applyTestingColumns(values, sheet.columns, summary);
			values.Asbest = /asbest/i.test([summary.analysisText, displayLabelOfValue(contour)].join(" ")) ? "x" : "";
			return sheetRow(sheet.columns, values);
		});
	}
	function collectReport(result, context, opts) {
		opts = opts || {};
		return SampleReport.collectReport(result, context, {
			compareNaturalCodes: opts.compareNaturalCodes || compareNaturalCodes,
			isAnalysisSample: opts.isAnalysisSample || isAnalysisSample,
			resolveGmlId: opts.resolveGmlId || null,
			warn: opts.warn
		});
	}
	function createRows(result, opts) {
		opts = opts || {};
		const timer = opts.timer;
		const collection = collectLeanProfiles(result, opts);
		const context = collection.context;
		const profiles = collection.profiles || [];
		const cache = createExportCache(context, opts);
		const report = context && !context.legacy ? (timer ?
			timer.measure("collectSikbSampleTestingReport", () => collectReport(result, context, opts)) :
			collectReport(result, context, opts)) : null;
		const testingMap = timer ? timer.measure("bknTestingRowsBySample", () => testingRowsBySample(report)) : testingRowsBySample(report);
		const sampleRows = timer ? timer.measure("bknSampleRowsBySheet", () => sampleRowsBySheet(profiles, context, testingMap, cache)) :
			sampleRowsBySheet(profiles, context, testingMap, cache);
		if(timer) {
			timer.measure("bknAddReportOnlySampleRows", () => addReportOnlySampleRows(sampleRows, report, profiles, context, testingMap, cache));
		} else {
			addReportOnlySampleRows(sampleRows, report, profiles, context, testingMap, cache);
		}
		return {
			"1001_Veldonderzoek": timer ? timer.measure("bknVeldonderzoekRows", () => veldonderzoekRows(profiles, context, cache)) :
				veldonderzoekRows(profiles, context, cache),
			"1002_Landbodem": sampleRows["1002_Landbodem"],
			"1003_Waterbodem": sampleRows["1003_Waterbodem"],
			"1005_Bouwstoffen": sampleRows["1005_Bouwstoffen"],
			"1007_Verontreinigingscontouren": context && !context.legacy ? (timer ?
				timer.measure("bknContourRows", () => contourRows(context, testingMap, cache)) :
				contourRows(context, testingMap, cache)) : []
		};
	}

	return {
		sheets: sheets,
		sheetByName: sheetByName,
		createRows: createRows,
		collectLeanProfiles: collectLeanProfiles,
		createTestingSummary: createTestingSummary
	};
});

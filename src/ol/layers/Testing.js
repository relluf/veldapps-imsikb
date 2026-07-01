define(function(require) {
	const ol = require("ol");
	const Common = require("./common");
	const Sample = require("./Sample");
	const BotovaTesting = require("../../botova/Testing");

	const featureNameOf = Common.featureNameOf;

	const sourceSampleEntriesOf = doc => {
		const xml = Common.xmlOfResult(doc && doc.result || doc);
		if(!xml) return [];

		return Sample.collectAnalysisSampleLayers(xml).map(entry => {
			entry.document = doc;
			return entry;
		});
	};
	const sourceSampleEntriesForDocs = docs => (docs || [])
		.map(sourceSampleEntriesOf)
		.reduce((all, entries) => all.concat(entries), []);
	const testingEntriesForDocs = docs => (docs || [])
		.map(BotovaTesting.testingEntriesOf)
		.reduce((all, entries) => all.concat(entries), []);
	const matchTestingItems = (testDocs, sourceDocs) => BotovaTesting.matchTestingEntries(
		testingEntriesForDocs(testDocs),
		sourceSampleEntriesForDocs(sourceDocs)
	);

	const testingLegendForFeatures = features => {
		const byColor = {};

		features.forEach(feature => (feature.get("toetsoordelen") || []).forEach(toetsoordeel => {
			const color = toetsoordeel.Kleur || "transparent";
			const title = toetsoordeel.Omschrijving || toetsoordeel.Afkorting || color;

			byColor[color + "/" + title] = { color, title };
		}));

		return Object.keys(byColor).sort().map(key => byColor[key]);
	};
	const testingFeatureStyle = (feature, resolution) => {
		const color = feature.get("toetsoordeel_kleur") || "#ffcc33";
		const radius = Math.min(Math.max(Math.round(0.5 / resolution) + 3, 5), 12);
		const key = color + "/" + radius;

		testingFeatureStyle.cache = testingFeatureStyle.cache || {};

		return testingFeatureStyle.cache[key] || (testingFeatureStyle.cache[key] = new ol.style.Style({
			image: new ol.style.Circle({
				radius,
				fill: new ol.style.Fill({ color }),
				stroke: new ol.style.Stroke({ color: "black", width: 1.5 })
			})
		}));
	};

	const cloneGeometry = geometry => geometry && geometry.clone instanceof Function ? geometry.clone() : geometry;
	const testingFeaturesForItems = (items, subtitle) => items.map(item => item.sourceEntry.features.map(sourceFeature => {
		const geometry = sourceFeature.getGeometry();
		const feature = new ol.Feature({ geometry: cloneGeometry(geometry) });
		const sampleName = item.testingEntry.name || item.sourceEntry.name;
		const measureName = sourceFeature.get("name") || sampleName;
		const oordeelHint = item.toetsoordelen.map(toetsoordeel => js.sf(
			"<span class='swatch' style='background-color:%s'></span>%H",
			toetsoordeel.Kleur,
			toetsoordeel.Omschrijving || toetsoordeel.Afkorting
		)).join("<br>");
		const meldingHint = item.toetsmeldingen
			.map(melding => js.sf("%H", melding.Omschrijving || js.nameOf(melding)))
			.join("<br>");
		const toetsing = item.toetsingen.join(", ");
		const analysesHint = (item.calculatedAnalyses || [])
			.map(analysis => featureNameOf(analysis, "CalculatedAnalysis"))
			.filter((name, index, arr) => name && arr.indexOf(name) === index)
			.join(", ");

		feature.set("name", js.sf("%s: %s", measureName, item.toetsoordelen.map(_ => _.Afkorting || _.Omschrijving).join(", ")));
		feature.set("toetsoordelen", item.toetsoordelen);
		feature.set("toetsmeldingen", item.toetsmeldingen);
		feature.set("toetsoordeel_kleur", item.toetsoordelen[0] && item.toetsoordelen[0].Kleur);
		feature.set("imsikb0101:Sample", item.sourceEntry.sample);
		feature.set("imsikb0101:TestingSample", item.testingEntry.sample);
		feature.set("immetingen:CalculatedAnalysis", item.calculatedAnalyses || []);
		feature.set("hint", js.sf("<b>Toetsing %H</b>%s<br>%s%s<br><span class='muted'>%H</span>%s",
			measureName,
			subtitle ? js.sf("<br><span class='muted'>%H</span>", subtitle) : "",
			oordeelHint,
			meldingHint ? js.sf("<br><span class='muted'>%s</span>", meldingHint) : "",
			[toetsing, sampleName].filter(Boolean).join(" / "),
			analysesHint ? js.sf("<br><span class='muted'>%H</span>", analysesHint) : ""));

		return feature;
	})).reduce((all, features) => all.concat(features), []).filter(feature => feature.getGeometry());

	const createDepthItemsForItems = items => {
		const depthGroups = {};

		items.forEach(item => item.depthGroups.forEach(depth => {
			const depthGroup = depthGroups[depth.key] || (depthGroups[depth.key] = {
				key: depth.key,
				name: depth.name,
				sort: depth.sort,
				items: [],
				paramGroups: {}
			});

			if(depthGroup.items.indexOf(item) === -1) depthGroup.items.push(item);
			item.paramGroups.forEach(paramGroup => {
				const group = depthGroup.paramGroups[paramGroup.key] || (depthGroup.paramGroups[paramGroup.key] = {
					key: paramGroup.key,
					name: paramGroup.name,
					items: []
				});

				if(group.items.indexOf(item) === -1) group.items.push(item);
			});
		}));

		return Object.keys(depthGroups).map(key => depthGroups[key])
			.sort((left, right) => left.sort - right.sort)
			.map(depth => {
				depth.paramGroups = Object.keys(depth.paramGroups)
					.map(key => depth.paramGroups[key])
					.sort((left, right) => left.name < right.name ? -1 : 1);
				depth.paramGroups.forEach(paramGroup => {
					paramGroup.features = testingFeaturesForItems(paramGroup.items, depth.name + " / " + paramGroup.name);
					paramGroup.source = new ol.source.Vector({ features: paramGroup.features });
					paramGroup.layer = ol.create(["ol:layer.Vector", {
						name: paramGroup.name,
						source: paramGroup.source,
						style: testingFeatureStyle
					}]);
				});
				depth.features = testingFeaturesForItems(depth.items, depth.name);
				depth.source = new ol.source.Vector({ features: depth.features });
				depth.layer = ol.create(["ol:layer.Group", {
					name: depth.name,
					layers: depth.paramGroups.map(paramGroup => paramGroup.layer)
				}]);
				return depth;
			});
	};

	const createLayerForItems = items => {
		const rootFeatures = testingFeaturesForItems(items);
		const rootSource = new ol.source.Vector({ features: rootFeatures });
		const depthItems = createDepthItemsForItems(items);
		const layer = ol.create(["ol:layer.Group", {
			name: "Toetsing",
			layers: depthItems.map(depth => depth.layer)
		}]);

		return {
			layer,
			rootFeatures,
			rootSource,
			depthItems
		};
	};

	const layerKeyForInfo = info => "extra-layers/document-sikb/" + (info && (info.id || info.uri || info.name) || "current");
	const addToMap = (OL, layerInfo, items, opts) => {
		const layerNeeded = OL && OL.qs && OL.qs("#ol-layer-needed");
		const map = OL && OL.vars && OL.vars("map");

		if(!items || !items.length || !layerNeeded || !map) return 0;

		opts = opts || {};
		layerInfo = layerInfo || {};

		const created = createLayerForItems(items);
		const parent = opts.parent;
		const key = opts.key || layerKeyForInfo(layerInfo) + "/toetsing";
		const toetsingNode = layerNeeded.execute({
			wantsNode: true,
			parent,
			layer: {
				key,
				name: "Toetsing",
				layer: created.layer,
				source: created.rootSource,
				count: created.rootFeatures.length,
				legend: testingLegendForFeatures(created.rootFeatures),
				runtime: true,
				closeable: false,
				expandable: true,
				expanded: true,
				checked: true,
				root: parent ? undefined : { key: "Documenten", name: "Documenten", expanded: true },
				path: parent ? undefined : [{ key: layerKeyForInfo(layerInfo), name: layerInfo.name || layerInfo.uri || "SIKB document", expanded: true }],
				document: layerInfo
			}
		});

		created.depthItems.forEach(depth => {
			const depthNode = layerNeeded.execute({
				wantsNode: true,
				parent: toetsingNode,
				layer: {
					key: key + "/" + depth.key,
					name: depth.name,
					layer: depth.layer,
					source: depth.source,
					count: depth.features.length,
					runtime: true,
					closeable: false,
					expandable: true,
					expanded: true,
					checked: true,
					document: layerInfo
				}
			});

			depth.paramGroups.forEach(paramGroup => layerNeeded.execute({
				parent: depthNode,
				layer: {
					key: key + "/" + depth.key + "/" + paramGroup.key,
					name: paramGroup.name,
					layer: paramGroup.layer,
					source: paramGroup.source,
					count: paramGroup.features.length,
					legend: testingLegendForFeatures(paramGroup.features),
					runtime: true,
					closeable: false,
					checked: true,
					document: layerInfo
				}
			}));
		});

		return created.rootFeatures.length;
	};

	return {
		sourceSampleEntriesOf,
		sourceSampleEntriesForDocs,
		testingEntriesForDocs,
		matchTestingItems,
		testingLegendForFeatures,
		testingFeatureStyle,
		testingFeaturesForItems,
		createDepthItemsForItems,
		createLayerForItems,
		addToMap
	};
});

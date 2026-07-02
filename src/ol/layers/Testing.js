define(function(require) {
	const ol = require("ol");
	const Common = require("./common");
	const Sample = require("./Sample");
	const BotovaTesting = require("../../botova/Testing");

	const featureNameOf = Common.featureNameOf;
	const objectKeyOf = Common.objectKeyOf;

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
			const title = toetsoordeelHintLabel(toetsoordeel) || color;

			byColor[color + "/" + title] = { color, title };
		}));

		return Object.keys(byColor).sort().map(key => byColor[key]);
	};
	const toetsoordeelHintLabel = toetsoordeel => {
		const abbreviation = toetsoordeel && toetsoordeel.Afkorting;
		const description = toetsoordeel && toetsoordeel.Omschrijving;

		return abbreviation && description && abbreviation !== description ?
			js.sf("[%s] %s", abbreviation, description) :
			description || abbreviation || "";
	};
	const toetsoordeelSeverity = toetsoordeel => {
		const color = String(toetsoordeel && toetsoordeel.Kleur || "").toLowerCase();
		const text = [
			toetsoordeel && toetsoordeel.Afkorting,
			toetsoordeel && toetsoordeel.Omschrijving,
			toetsoordeel && toetsoordeel.Waarde
		].join(" ").toLowerCase();

		if(/\bgtm\b/.test(text) || /geen\s+toetsoordeel\s+mogelijk/.test(text)) return 0;

		const volgorde = toetsoordeel && parseFloat(toetsoordeel.Volgorde);
		if(isFinite(volgorde)) return volgorde;

		if(/ff00ff|magenta/.test(color) || /interventie|industrie|>\s*i|oi\b/.test(text)) return 40;
		if(/ff0000|red/.test(color)) return 35;
		if(/ffff00|yellow/.test(color) || /wonen|achtergrondwaarde|streefwaarde|oa\b|os\b|>\s*s/.test(text)) return 20;
		if(/00ff33|00ff00|green/.test(color) || /voldoet|<=|\u2264|saw|vaa|<s/.test(text)) return 10;
		return 0;
	};
	const representativeToetsoordeel = toetsoordelen => (toetsoordelen || []).slice()
		.sort((left, right) => toetsoordeelSeverity(right) - toetsoordeelSeverity(left))[0];
	const featureToetsoordeelSeverity = feature => Math.max.apply(Math, (feature.get("toetsoordelen") || [])
		.map(toetsoordeelSeverity)
		.concat([0]));
	const paramGroupToetsoordeelSeverity = paramGroup => Math.max.apply(Math, (paramGroup.features || [])
		.map(featureToetsoordeelSeverity)
		.concat([0]));
	const defaultParamGroupForDepth = depth => (depth.paramGroups || []).reduce((best, paramGroup) => {
		if(!best) return paramGroup;
		return paramGroupToetsoordeelSeverity(paramGroup) > paramGroupToetsoordeelSeverity(best) ? paramGroup : best;
	}, null);
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
	const uniquePush = (arr, value) => {
		if(value && arr.indexOf(value) === -1) arr.push(value);
	};
	const uniqueConcat = (arr, values) => (values || []).forEach(value => uniquePush(arr, value));
	const measurementOfSourceFeature = sourceFeature => sourceFeature && sourceFeature.get && sourceFeature.get("imsikb0101:Measurement");
	const sourceFeatureKeyOf = sourceFeature => {
		const measurement = measurementOfSourceFeature(sourceFeature);
		const sample = sourceFeature.get("imsikb0101:Sample");
		const geometry = sourceFeature.getGeometry && sourceFeature.getGeometry();
		const coordinates = geometry && geometry.getCoordinates && geometry.getCoordinates();

		return objectKeyOf(measurement) ||
			objectKeyOf(sample) ||
			sourceFeature.get("sikb:id") ||
			featureNameOf(measurement, "") ||
			sourceFeature.get("name") ||
			(coordinates && coordinates.join && coordinates.join(",")) ||
			"feature";
	};
	const measureNameOfSourceFeature = sourceFeature => {
		const measurement = measurementOfSourceFeature(sourceFeature);

		return featureNameOf(measurement, sourceFeature.get("name") || "Meetpunt");
	};
	const testingFeatureGroupsForItems = items => {
		const groups = {};

		(items || []).forEach(item => {
			const toetsoordelen = item.toetsoordelen || [];
			if(!toetsoordelen.length) return;

			(item.sourceEntry.features || []).forEach(sourceFeature => {
				const geometry = sourceFeature.getGeometry && sourceFeature.getGeometry();
				if(!geometry) return;

				const key = sourceFeatureKeyOf(sourceFeature);
				const group = groups[key] || (groups[key] = {
					key,
					sourceFeature,
					geometry,
					measureName: measureNameOfSourceFeature(sourceFeature),
					items: [],
					sampleNames: [],
					toetsoordelen: [],
					toetsmeldingen: [],
					toetsingen: [],
					calculatedAnalyses: [],
					sourceSamples: [],
					testingSamples: []
				});

				uniquePush(group.items, item);
				uniquePush(group.sampleNames, item.testingEntry.name || item.sourceEntry.name);
				uniqueConcat(group.toetsoordelen, toetsoordelen);
				uniqueConcat(group.toetsmeldingen, item.toetsmeldingen || []);
				uniqueConcat(group.toetsingen, item.toetsingen || []);
				uniqueConcat(group.calculatedAnalyses, item.calculatedAnalyses || []);
				uniquePush(group.sourceSamples, item.sourceEntry.sample);
				uniquePush(group.testingSamples, item.testingEntry.sample);
			});
		});

		return Object.keys(groups).map(key => groups[key]);
	};
	const testingFeatureForGroup = (group, subtitle) => {
		const feature = new ol.Feature({ geometry: cloneGeometry(group.geometry) });
		const toetsoordeel = representativeToetsoordeel(group.toetsoordelen);
		const label = group.toetsoordelen
			.map(_ => _.Afkorting || _.Omschrijving)
			.filter((value, index, arr) => value && arr.indexOf(value) === index)
			.join(", ");
		const oordeelHint = group.toetsoordelen.map(toetsoordeel => js.sf(
			"<span class='swatch' style='background-color:%s'></span>%H",
			toetsoordeel.Kleur,
			toetsoordeelHintLabel(toetsoordeel)
		)).join("<br>");
		const meldingHint = group.toetsmeldingen
			.map(melding => js.sf("%H", melding.Omschrijving || js.nameOf(melding)))
			.filter((value, index, arr) => value && arr.indexOf(value) === index)
			.join("<br>");
		const toetsing = group.toetsingen.join(", ");
		const analysesHint = group.calculatedAnalyses
			.map(analysis => featureNameOf(analysis, "CalculatedAnalysis"))
			.filter((name, index, arr) => name && arr.indexOf(name) === index)
			.join(", ");

		feature.set("name", js.sf("%s: %s", group.measureName, label));
		feature.set("toetsoordelen", group.toetsoordelen);
		feature.set("toetsmeldingen", group.toetsmeldingen);
		feature.set("toetsoordeel_kleur", toetsoordeel && toetsoordeel.Kleur);
		feature.set("imsikb0101:Sample", group.sourceSamples[0]);
		feature.set("imsikb0101:Samples", group.sourceSamples);
		feature.set("imsikb0101:TestingSample", group.testingSamples);
		feature.set("immetingen:CalculatedAnalysis", group.calculatedAnalyses);
		feature.set("hint", js.sf("<b>Toetsing %H</b>%s<br>%s%s<br><span class='muted'>%H</span>%s",
			group.measureName,
			subtitle ? js.sf("<br><span class='muted'>%H</span>", subtitle) : "",
			oordeelHint,
			meldingHint ? js.sf("<br><span class='muted'>%s</span>", meldingHint) : "",
			[toetsing, group.sampleNames.join(", ")].filter(Boolean).join(" / "),
			analysesHint ? js.sf("<br><span class='muted'>%H</span>", analysesHint) : ""));

		return feature;
	};
	const testingFeaturesForItems = (items, subtitle) => testingFeatureGroupsForItems(items)
		.map(group => testingFeatureForGroup(group, subtitle))
		.filter(feature => feature.getGeometry());

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
	const testingLayerKeyForItems = (info, items) => {
		const keys = {};

		(items || []).forEach(item => {
			const doc = item && item.testingEntry && item.testingEntry.document || {};
			const docInfo = doc.info || {};
			const key = docInfo.id || docInfo.uri || docInfo.name ||
				doc.result && (doc.result.id || doc.result.uri || doc.result.name) ||
				doc.root && doc.root.hashCode && doc.root.hashCode();

			if(key) keys[key] = true;
		});

		return layerKeyForInfo(info) + "/toetsing/" + (Object.keys(keys).sort().join("+") || "current");
	};
	const removeLayerFromCollection = (collection, layer) => {
		if(!collection || !layer) return false;
		const items = collection.getArray instanceof Function ? collection.getArray().slice() : [];
		let removed = false;

		items.forEach(item => {
			if(item === layer) {
				collection.remove(layer);
				removed = true;
			}
		});

		return removed;
	};
	const cleanupLegacyTestingNodes = (parent, map, key) => {
		const controls = parent && parent.getControls && parent.getControls();
		const legacyPrefix = key + "/";

		if(!controls || !key) return;
		controls.slice().forEach(node => {
			const layerConfig = node.vars && node.vars("layer");
			const layerKey = layerConfig && (layerConfig.persistKey || layerConfig.key);

			if(layerConfig && layerConfig.name === "Toetsing" && layerKey && layerKey.indexOf(legacyPrefix) === 0) {
				removeLayerFromCollection(map && map.getLayers && map.getLayers(), node.vars && node.vars("ol"));
				node.destroy();
			}
		});
	};
	const addToMap = (OL, layerInfo, items, opts) => {
		const layerNeeded = OL && OL.qs && OL.qs("#ol-layer-needed");
		const map = OL && OL.vars && OL.vars("map");

		if(!items || !items.length || !layerNeeded || !map) return 0;

		opts = opts || {};
		layerInfo = layerInfo || {};

		const created = createLayerForItems(items);
		const parent = opts.parent;
		const key = opts.key || testingLayerKeyForItems(layerInfo, items);
		const defaultDepth = created.depthItems.filter(depth => depth.key === "bovengrond")[0] || created.depthItems[0];

		cleanupLegacyTestingNodes(parent, map, key);

		created.depthItems.forEach(depth => {
			const defaultParamGroup = defaultParamGroupForDepth(depth);

			depth.checked = depth === defaultDepth;
			depth.layer.setVisible(depth.checked);
			depth.paramGroups.forEach(paramGroup => {
				paramGroup.checked = paramGroup === defaultParamGroup;
				paramGroup.layer.setVisible(paramGroup.checked);
			});
		});
		const toetsingNode = layerNeeded.execute({
			wantsNode: true,
			parent,
			layer: {
				key,
				name: "Toetsing",
				layer: created.layer,
				source: created.rootSource,
				count: created.rootFeatures.length,
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
					name: depth.name,
					layer: depth.layer,
					source: depth.source,
					count: depth.features.length,
					runtime: true,
					fixed: true,
					closeable: false,
					expandable: true,
					expanded: depth.checked,
					checked: depth.checked,
					document: layerInfo
				}
			});

			depth.paramGroups.forEach(paramGroup => layerNeeded.execute({
				wantsNode: true,
				parent: depthNode,
				layer: {
					name: paramGroup.name,
					layer: paramGroup.layer,
					source: paramGroup.source,
					count: paramGroup.features.length,
					legend: testingLegendForFeatures(paramGroup.features),
					exclusive: key + "/" + depth.key,
					runtime: true,
					fixed: true,
					closeable: false,
					checked: paramGroup.checked,
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

define(function(require) {
	const ol = require("ol");
	const Common = require("./common");
	const Geometry = require("../geometry");
	const Borehole = require("./Borehole");
	const Trench = require("./Trench");

	const SAMPLE_COLOR = "rgba(183, 82, 168, 0.88)";
	const SAMPLE_LEGEND = [{ color: SAMPLE_COLOR, title: "Sample" }];
	const BOREHOLE_LEGEND = Borehole.spec.legend;
	const TRENCH_LEGEND = Trench.spec.legend;

	const arrX = Common.arrX;
	const textOf = Common.textOf;
	const normalizedReference = Common.normalizedReference;
	const idKeysOf = Common.idKeysOf;
	const indexObjects = Common.indexObjects;
	const featureNameOf = Common.featureNameOf;
	const objectKeyOf = (obj, fallback) => Common.objectKeyOf(obj) || featureNameOf(obj, fallback || "") || fallback || "";
	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;
	const sampleLayerContexts = typeof WeakMap !== "undefined" ? new WeakMap() : null;
	const now = () => Date.now();
	const addTiming = (timing, key, started) => {
		if(!timing) return;
		timing[key] = (timing[key] || 0) + now() - started;
	};
	const logTiming = timing => {
		if(typeof console !== "undefined" && console.log) {
			console.log("[veldapps-imsikb Sample timing]", timing);
		}
	};

	const specimenTypeOf = sample => {
		const value = get("spec:specimenType", sample) ||
			get("imsikb0101:specimenType", sample) ||
			get("specimenType", sample);

		return textOf(value) || normalizedReference(value);
	};
	const isAnalysisSample = sample => /(?:monstertype:)?id:10(?:\b|$)|urn:10|analysemonster/i.test(specimenTypeOf(sample));

	const relationRoleOf = relation => {
		const value = get("sam:role", relation) ||
			get("role", relation) ||
			get("sam:SamplingFeatureComplex.sam:role", relation) ||
			get("SamplingFeatureComplex.role", relation);

		return textOf(value) || normalizedReference(value);
	};
	const isBoreholeRelation = relation => /RelatedSamplingFeatureRollen:id:6(?:\b|$)|InBorehole|urn:6/i.test(relationRoleOf(relation));
	const isReverseSampleRelation = relation => /RelatedSamplingFeatureRollen:id:9(?:\b|$)|InMengMonster|urn:9/i.test(relationRoleOf(relation));

	const relationEntriesOf = obj => arrX(get("sam:relatedSamplingFeature", obj)).concat(arrX(get("relatedSamplingFeature", obj)));
	const relationTargetsOf = relation => {
		const complex = get("sam:SamplingFeatureComplex", relation) || get("SamplingFeatureComplex", relation);
		const values = [];
		const pushValue = value => arrX(value).forEach(item => values.push(item));

		pushValue(relation);
		if(complex) {
			pushValue(complex);
			pushValue(get("sam:relatedSamplingFeature", complex));
			pushValue(get("relatedSamplingFeature", complex));
		}
		pushValue(get("@_xlink:href-resolved", relation));
		pushValue(get("@xlink:href-resolved", relation));

		return values.filter(value => value !== undefined && value !== null);
	};
	const resolveRelationTargets = (obj, index, predicate) => {
		const targets = [];

		relationEntriesOf(obj).forEach(relation => {
			if(predicate && !predicate(relation)) return;

			relationTargetsOf(relation).forEach(value => {
				const ref = normalizedReference(value);
				const target = typeof value === "object" && idKeysOf(value).length ? value :
					index[ref] || index["#" + ref];

				if(target && targets.indexOf(target) === -1) targets.push(target);
			});
		});

		return targets;
	};
	const collectLayerObjectsForKeys = (context, keys) => {
		return context.model ? context.model.collect(keys) : [];
	};

	const createSampleLayerContext = model => ({
		model: model,
		xml: model && model.root,
		layerContext: Common.createLayerContext(model),
		samples: null,
		boreholes: null,
		trenches: null,
		sampleIndex: null,
		measurementIndex: null,
		typeIndex: null,
		resolvedPairsBySampleKey: {}
	});
	const sampleLayerContextFor = result => {
		const model = Common.modelOfResult(result);

		if(!model || !model.root || typeof model.root !== "object" || !sampleLayerContexts) return createSampleLayerContext(model);

		let context = sampleLayerContexts.get(model);
		if(!context) {
			context = createSampleLayerContext(model);
			sampleLayerContexts.set(model, context);
		}
		return context;
	};
	const sampleObjectsForContext = (context, timing) => {
		if(context.samples) return context.samples;
		const started = now();
		context.samples = collectLayerObjectsForKeys(context, [
			"immetingen:Sample",
			"imsikb0101:Sample",
			"Sample"
		]);
		timing && addTiming(timing, "collectSamples", started);
		return context.samples;
	};
	const boreholeObjectsForContext = (context, timing) => {
		if(!context.boreholes) {
			const started = now();
			context.boreholes = collectLayerObjectsForKeys(context, Borehole.spec.keys);
			Common.collectIndexedObjects(context.layerContext, context.boreholes);
			timing && addTiming(timing, "collectBoreholes", started);
		}
		return context.boreholes;
	};
	const trenchObjectsForContext = (context, timing) => {
		if(!context.trenches) {
			const started = now();
			context.trenches = collectLayerObjectsForKeys(context, Trench.spec.keys);
			Common.collectIndexedObjects(context.layerContext, context.trenches);
			timing && addTiming(timing, "collectTrenches", started);
		}
		return context.trenches;
	};
	const sampleIndexForContext = (context, timing) => {
		if(context.sampleIndex) return context.sampleIndex;
		const started = now();
		context.sampleIndex = indexObjects(sampleObjectsForContext(context, timing));
		timing && addTiming(timing, "indexSamples", started);
		return context.sampleIndex;
	};
	const measurementIndexForContext = (context, timing) => {
		if(context.measurementIndex) return context.measurementIndex;
		const started = now();
		context.measurementIndex = indexObjects(boreholeObjectsForContext(context, timing).concat(trenchObjectsForContext(context, timing)));
		timing && addTiming(timing, "indexMeasurements", started);
		return context.measurementIndex;
	};
	const typeIndexForContext = (context, timing) => {
		if(context.typeIndex) return context.typeIndex;
		const started = now();
		context.typeIndex = typeIndexOfMeasurements(boreholeObjectsForContext(context, timing), trenchObjectsForContext(context, timing));
		timing && addTiming(timing, "indexMeasurementTypes", started);
		return context.typeIndex;
	};
	const collectSampleObjects = result => sampleObjectsForContext(sampleLayerContextFor(result));
	const collectMeasurementObjects = result => {
		const context = sampleLayerContextFor(result);

		return boreholeObjectsForContext(context).concat(trenchObjectsForContext(context));
	};
	const collectTrenchFeatures = (result, timing) => {
		const context = sampleLayerContextFor(result);
		const started = now();

		const features = trenchObjectsForContext(context, timing).map((obj, index) => {
			const geometry = Geometry.cachedOpenLayersGeometryFrom(context.layerContext, obj);
			const feature = Common.createFeature(obj, Trench.spec.name, index, cloneGeometry(geometry), context.layerContext);

			if(feature) {
				feature.set("sikb:layerKey", Trench.spec.key || Trench.spec.name);
				feature.set("sikb:spec", Trench.spec);
			}
			return feature;
		}).filter(Boolean);
		timing && addTiming(timing, "trenchFeatures", started);
		return features;
	};

	const typeIndexOfMeasurements = (boreholes, trenches) => {
		const index = {};
		const add = (measurement, type) => idKeysOf(measurement).forEach(id => {
			index[id] = type;
		});

		boreholes.forEach(measurement => add(measurement, "Borehole"));
		trenches.forEach(measurement => add(measurement, "Trench"));

		return index;
	};
	const measurementTypeOf = (measurement, typeIndex) => idKeysOf(measurement).map(id => typeIndex[id]).filter(Boolean)[0] || "Borehole";

	const resolveSampleMeasurementObjects = (sample, sampleIndex, measurementIndex, seen, depth) => {
		const pairs = [];
		const sampleKey = objectKeyOf(sample);

		seen = seen || [];
		depth = depth || 0;

		if(!sample || depth > 2 || seen.indexOf(sampleKey) !== -1) return pairs;
		seen = seen.concat([sampleKey]);

		relationEntriesOf(sample).forEach(relation => {
			if(isBoreholeRelation(relation)) {
				resolveRelationTargets(sample, measurementIndex, rel => rel === relation)
					.forEach(measurement => pairs.push({ sample, measurement }));
				return;
			}
			if(isReverseSampleRelation(relation)) return;

			resolveRelationTargets(sample, sampleIndex, rel => rel === relation)
				.forEach(relatedSample => {
					resolveSampleMeasurementObjects(relatedSample, sampleIndex, measurementIndex, seen, depth + 1)
						.forEach(pair => pairs.push(pair));
				});
		});

		return pairs;
	};
	const resolveSampleMeasurementObjectsForContext = (sample, sampleIndex, measurementIndex, context, timing, seen, depth) => {
		const sampleKey = objectKeyOf(sample);
		const cache = context && context.resolvedPairsBySampleKey;
		const started = cache && timing ? now() : 0;

		const pairs = [];

		seen = seen || [];
		depth = depth || 0;
		if(!sample || depth > 2 || seen.indexOf(sampleKey) !== -1) return pairs;
		if(cache && cache[sampleKey]) {
			addTiming(timing, "resolvePairsCache", started);
			return cache[sampleKey];
		}
		seen = seen.concat([sampleKey]);

		relationEntriesOf(sample).forEach(relation => {
			if(isBoreholeRelation(relation)) {
				resolveRelationTargets(sample, measurementIndex, rel => rel === relation)
					.forEach(measurement => pairs.push({ sample, measurement }));
				return;
			}
			if(isReverseSampleRelation(relation)) return;

			resolveRelationTargets(sample, sampleIndex, rel => rel === relation)
				.forEach(relatedSample => {
					resolveSampleMeasurementObjectsForContext(relatedSample, sampleIndex, measurementIndex, context, timing, seen, depth + 1)
						.forEach(pair => pairs.push(pair));
				});
		});

		if(cache) {
			cache[sampleKey] = pairs;
			addTiming(timing, "resolvePairs", started);
		}
		return pairs;
	};

	const createFeature = (obj, type, index, geometry) => Common.createFeature(obj, type, index, geometry);

	const cloneGeometry = geometry => geometry && geometry.clone instanceof Function ? geometry.clone() : geometry;
	const measurementGeometryOf = (measurement, context) => context ?
		Geometry.cachedOpenLayersGeometryFrom(context.layerContext, measurement) :
		Geometry.openLayersGeometryFrom(measurement);

	const createAnalysisSampleFeature = (analysisSample, fieldSample, measurement, index, context) => {
		const geometry = measurementGeometryOf(measurement, context);
		if(!geometry) return null;

		const analysisName = featureNameOf(analysisSample, "Analysemonster");
		const fieldName = featureNameOf(fieldSample, typeof js !== "undefined" && js.sf ? js.sf("Sample %d", index + 1) : "Sample " + (index + 1));
		const measurementName = featureNameOf(measurement, "Meetpunt");
		const feature = createFeature(fieldSample, "Sample", index, cloneGeometry(geometry));

		if(!feature) return null;

		feature.set("name", typeof js !== "undefined" && js.sf ? js.sf("%s / %s", analysisName, fieldName) : analysisName + " / " + fieldName);
		feature.set("imsikb0101:Sample", fieldSample);
		feature.set("imsikb0101:AnalysisSample", analysisSample);
		feature.set("imsikb0101:Measurement", measurement);
		feature.set("hint", typeof js !== "undefined" && js.sf ?
			js.sf("<b>%H</b><br><span class='muted'>Sample</span><br><span class='muted'>%H via %H</span>", fieldName, analysisName, measurementName) :
			"<b>" + fieldName + "</b><br><span class='muted'>Sample</span><br><span class='muted'>" + analysisName + " via " + measurementName + "</span>");

		return feature;
	};

	const createAnalysisSampleMeasurementFeature = (analysisSample, fieldSample, measurement, type, index, context) => {
		const geometry = measurementGeometryOf(measurement, context);
		if(!geometry) return null;

		const analysisName = featureNameOf(analysisSample, "Analysemonster");
		const measurementName = featureNameOf(measurement, typeof js !== "undefined" && js.sf ? js.sf("%s %d", type, index + 1) : type + " " + (index + 1));
		const sampleName = featureNameOf(fieldSample, "Sample");
		const feature = createFeature(measurement, type, index, cloneGeometry(geometry));

		if(!feature) return null;

		feature.set("name", measurementName);
		feature.set("imsikb0101:Measurement", measurement);
		feature.set("imsikb0101:Sample", fieldSample);
		feature.set("imsikb0101:AnalysisSample", analysisSample);
		feature.set("hint", typeof js !== "undefined" && js.sf ?
			js.sf("<b>%H</b><br><span class='muted'>%H via %H</span>", measurementName, analysisName, sampleName) :
			"<b>" + measurementName + "</b><br><span class='muted'>" + analysisName + " via " + sampleName + "</span>");

		return feature;
	};

	const collectAnalysisSampleLayers = (result, timing) => {
		const started = now();
		const contextStarted = now();
		const context = sampleLayerContextFor(result);
		timing && addTiming(timing, "context", contextStarted);
		const samples = sampleObjectsForContext(context, timing);
		const sampleIndex = sampleIndexForContext(context, timing);
		const measurementIndex = measurementIndexForContext(context, timing);
		const typeIndex = typeIndexForContext(context, timing);
		const filterStarted = now();
		const analysisSamples = samples.filter(isAnalysisSample);
		timing && addTiming(timing, "filterAnalysisSamples", filterStarted);

		const entries = analysisSamples.map((analysisSample, analysisIndex) => {
			const features = [];
			const measurementFeatures = [];
			const pairKeys = {};
			const measurementTypes = [];
			const resolveStarted = now();
			const pairs = resolveSampleMeasurementObjectsForContext(analysisSample, sampleIndex, measurementIndex, context, timing);

			timing && addTiming(timing, "resolveAnalysisSamples", resolveStarted);
			pairs.forEach(pair => {
				const pairKey = objectKeyOf(pair.measurement, "measurement");
				const type = measurementTypeOf(pair.measurement, typeIndex);

				if(pairKeys[pairKey]) return;
				pairKeys[pairKey] = true;
				if(measurementTypes.indexOf(type) === -1) measurementTypes.push(type);

				const feature = createAnalysisSampleFeature(analysisSample, pair.sample, pair.measurement, features.length, context);
				feature && features.push(feature);

				const measurementFeature = createAnalysisSampleMeasurementFeature(analysisSample, pair.sample, pair.measurement, type, measurementFeatures.length, context);
				measurementFeature && measurementFeatures.push(measurementFeature);
			});

			const name = featureNameOf(analysisSample, typeof js !== "undefined" && js.sf ? js.sf("Analysemonster %d", analysisIndex + 1) : "Analysemonster " + (analysisIndex + 1));

			return features.length ? {
				name: name,
				features: features,
				boreholeFeatures: measurementFeatures,
				measurementFeatures: measurementFeatures,
				measurementTypes: measurementTypes,
				sample: analysisSample
			} : null;
		}).filter(Boolean);

		if(timing) {
			timing.analysisSamples = analysisSamples.length;
			timing.sampleEntries = entries.length;
			addTiming(timing, "collectAnalysisLayers", started);
		}
		return entries;
	};

	const textLabelOfNode = node => {
		const text = node && node.getNode && node.getNode("text");
		const label = text && text.qs && text.qs(".label");

		return (label && (label.textContent || label.innerText) || "").trim();
	};
	const findDocumentLayerNode = (OL, info) => {
		if(info && info.node) return info.node;

		const root = OL && OL.udown && (OL.udown("#root-features") || OL.udown("#root-layers"));
		const names = [info.name, info.uri].filter(Boolean);
		let found = null, foundScore = -1;
		const visit = node => {
			if(!node || !node.getControls) return;

			const layer = node.vars && node.vars("layer");
			const document = layer && layer.document;
			const olLayer = node.vars && node.vars("ol");
			const label = textLabelOfNode(node).replace(/\s+\(\d+\)$/, "");
			let score = -1;
			if(olLayer) {
				node.getControls().forEach(visit);
				return;
			}

			if(document && (document.id === info.id || document.uri === info.uri)) score = 40;
			if(names.indexOf(label) !== -1) score = Math.max(score, 80);
			if(score > foundScore) {
				found = node;
				foundScore = score;
			}

			node.getControls().forEach(visit);
		};

		visit(root);

		return found;
	};
	const countNodeOf = node => {
		const text = node && node.getNode && node.getNode("text");

		return text && text.qs && text.qs("a");
	};
	const countOfLayerNode = node => {
		const layer = node && node.vars && node.vars("layer");
		if(layer && layer.features instanceof Array) return layer.features.length;
		if(layer && layer.count !== undefined) return typeof layer.count === "function" ? layer.count() : layer.count;

		const countNode = countNodeOf(node);
		const count = countNode && parseInt((countNode.textContent || "").replace(/[^\d]/g, ""), 10);

		return isNaN(count) ? 0 : count;
	};
	const updateDocumentLayerCount = documentNode => {
		let countNode = countNodeOf(documentNode);
		const controls = documentNode && documentNode.getControls && documentNode.getControls();
		const text = documentNode && documentNode.getNode && documentNode.getNode("text");

		if(!controls || !text) return 0;
		if(!countNode) {
			countNode = window.document.createElement("a");
			countNode.href = "#";
			text.appendChild(window.document.createTextNode(" "));
			text.appendChild(countNode);
		}

		const count = controls.reduce((total, node) => total + countOfLayerNode(node), 0);

		countNode.textContent = typeof js !== "undefined" && js.sf ? js.sf("(%d)", count) : "(" + count + ")";

		return count;
	};
	const layerKeyForInfo = info => "extra-layers/document-sikb/" + (info.id || info.uri || info.name || "current");
	const documentPathForInfo = info => [{
		key: layerKeyForInfo(info),
		name: info.name || info.uri || "SIKB document",
		index: info.mapDocumentIndex,
		expanded: true,
		runtime: true,
		closeable: true,
		document: info
	}];
	const sampleCountForResult = result => sampleObjectsForContext(sampleLayerContextFor(result))
		.filter(isAnalysisSample)
		.length;
	const sampleFeatureCountForResult = result => {
		const context = sampleLayerContextFor(result);
		const samples = sampleObjectsForContext(context);
		const sampleIndex = sampleIndexForContext(context);
		const measurementIndex = measurementIndexForContext(context);

		return samples.filter(isAnalysisSample).reduce((count, analysisSample) => {
			const pairKeys = {};

			resolveSampleMeasurementObjectsForContext(analysisSample, sampleIndex, measurementIndex, context)
				.forEach(pair => pairKeys[objectKeyOf(pair.measurement, "measurement")] = true);
			return count + Object.keys(pairKeys).length;
		}, 0);
	};
	const scheduleLazyLoad = (OL, key, callback) => {
		if(OL && OL.setTimeout instanceof Function) {
			OL.setTimeout(key, callback, 25);
		} else if(typeof window !== "undefined" && window.setTimeout instanceof Function) {
			window.setTimeout(callback, 25);
		} else {
			setTimeout(callback, 25);
		}
	};
	const executeLayerEvents = (layerNeeded, layerEvents, wantsNode) => (layerEvents || []).map(layerEvent => {
		const event = Object.assign({}, layerEvent);

		if(wantsNode) event.wantsNode = true;
		return layerNeeded.execute(event);
	});
	const addLazyToMap = (OL, info, result, opts) => {
		const xml = Common.xmlOfResult(result);
		const layerNeeded = OL && OL.qs && OL.qs("#ol-layer-needed");
		const sampleCount = xml ? sampleFeatureCountForResult(result) || sampleCountForResult(result) : 0;

		if(!xml || !layerNeeded || !sampleCount) return 0;

		const parent = findDocumentLayerNode(OL, info);
		const key = layerKeyForInfo(info) + "/sample";
		const path = parent ? undefined : documentPathForInfo(info);
			const layer = {
				key: key,
				name: "Sample",
				features: [],
				style: sampleStyle,
				legend: SAMPLE_LEGEND,
				runtime: true,
				closeable: false,
				checked: false,
				count: sampleCount,
				ignoreSavedLayerState: true,
				root: parent ? undefined : { key: "Documenten", name: "Documenten", expanded: true },
				path: path,
				document: info,
				lazy: true,
				onLayerChecked(evt) {
					if(!evt.checked) return true;
					if(this.lazyLoading) return false;

					this.lazyLoading = true;
					evt.node && evt.node.addClass && evt.node.addClass("loading");
					evt.updateInput && evt.updateInput(true);
					scheduleLazyLoad(OL, "sikb-sample-lazy-" + key, () => {
						const loadOpts = Object.assign({}, opts || {}, {
							lazy: false
						});

						evt.removeNode && evt.removeNode();
						addToMap(OL, info, result, loadOpts);
					});
					return false;
				}
			};

		layerNeeded.execute({
			parent: parent,
			layer: layer
		});
		updateDocumentLayerCount(parent || findDocumentLayerNode(OL, info));
		return sampleCount;
	};

	const sampleStyle = new ol.style.Style({
		image: new ol.style.Circle({
			radius: 6,
			fill: new ol.style.Fill({ color: SAMPLE_COLOR }),
			stroke: new ol.style.Stroke({ color: "white", width: 2 })
		})
	});
	const flattenEntryFeatures = (entries, key) => entries.reduce((features, entry) =>
		features.concat(entry[key] || []), []);
	const uniqueMeasurementTypesOf = entries => {
		const types = [];

		entries.forEach(entry => (entry.measurementTypes || []).forEach(type => {
			if(types.indexOf(type) === -1) types.push(type);
		}));
		return types;
	};
	const measurementStyleForTypes = types => types.length === 1 && types[0] === "Trench" ?
		Trench.spec.style : Borehole.spec.style;
	const measurementLegendForTypes = types => types.length === 1 && types[0] === "Trench" ?
		TRENCH_LEGEND : (types.indexOf("Trench") !== -1 ? BOREHOLE_LEGEND.concat(TRENCH_LEGEND) : BOREHOLE_LEGEND);

	const addToMap = (OL, info, result, opts) => {
		const started = now();
		opts = opts || {};
		const timing = {
			total: 0,
			grouped: opts.groupSamples !== false
		};
		const xml = Common.xmlOfResult(result);
		const map = OL && OL.vars && OL.vars("map");
		const layerNeeded = OL && OL.qs && OL.qs("#ol-layer-needed");

		if(!xml || !map || !layerNeeded) return 0;

		info = info || {};
		if(opts.lazy === true) {
			return addLazyToMap(OL, info, result, opts);
		}

		const parentStarted = now();
		const parent = findDocumentLayerNode(OL, info);
		addTiming(timing, "findParent", parentStarted);
		const entries = opts.samples === false ? [] : collectAnalysisSampleLayers(xml, timing);
		const trenchFeatures = opts.trenches === false ? [] : collectTrenchFeatures(xml, timing);
		const path = parent ? [
			{ key: "Sample", name: "Sample", expanded: false, count: entries.length, legend: SAMPLE_LEGEND }
		] : documentPathForInfo(info).concat([
			{ key: "Sample", name: "Sample", expanded: false, count: entries.length, legend: SAMPLE_LEGEND }
		]);

		if(opts.groupSamples !== false) {
			const flattenStarted = now();
			const sampleFeatures = flattenEntryFeatures(entries, "features");
			const measurementFeatures = flattenEntryFeatures(entries, "measurementFeatures");
			const measurementTypes = uniqueMeasurementTypesOf(entries);
			addTiming(timing, "flattenFeatures", flattenStarted);
			const groupedPath = parent ? undefined : documentPathForInfo(info);
			const layerEvents = [];
			let trenchNode = null;
			let sampleNode = null;

			if(trenchFeatures.length) {
				layerEvents.push({
					parent: parent,
					layer: {
						key: (typeof js !== "undefined" && js.sf ? js.sf("%s/trench", layerKeyForInfo(info)) : layerKeyForInfo(info) + "/trench"),
						name: "Trench",
						features: trenchFeatures,
						style: Trench.spec.style,
						legend: TRENCH_LEGEND,
						runtime: true,
						closeable: false,
						checked: true,
						root: parent ? undefined : { key: "Documenten", name: "Documenten", expanded: true },
						path: groupedPath,
						document: info
					}
				});
			}
			if(sampleFeatures.length) {
					layerEvents.push({
						parent: parent,
						layer: {
							key: (typeof js !== "undefined" && js.sf ? js.sf("%s/sample", layerKeyForInfo(info)) : layerKeyForInfo(info) + "/sample"),
							name: "Sample",
							features: sampleFeatures,
							style: sampleStyle,
							legend: SAMPLE_LEGEND,
							runtime: true,
							closeable: false,
							expandable: measurementFeatures.length > 0,
							expanded: false,
							checked: true,
							ignoreSavedLayerState: true,
							root: parent ? undefined : { key: "Documenten", name: "Documenten", expanded: true },
							path: groupedPath,
							document: info
						}
					});
			}

			const layersStarted = now();
			const nodes = executeLayerEvents(layerNeeded, layerEvents, true);
			addTiming(timing, "layers", layersStarted);
			if(trenchFeatures.length) trenchNode = nodes[0];
			if(sampleFeatures.length) sampleNode = nodes[trenchFeatures.length ? 1 : 0];
			if(sampleNode && measurementFeatures.length) {
				const measurementLayerStarted = now();
				layerNeeded.execute({
					parent: sampleNode,
					layer: {
						key: typeof js !== "undefined" && js.sf ? js.sf("%s/sample/measurement", layerKeyForInfo(info)) : layerKeyForInfo(info) + "/sample/measurement",
						name: measurementTypes.length === 1 ? measurementTypes[0] : "Meetpunt",
						features: measurementFeatures,
						style: measurementStyleForTypes(measurementTypes),
						legend: measurementLegendForTypes(measurementTypes),
						runtime: true,
							closeable: false,
							checked: false,
							ignoreSavedLayerState: true,
							document: info
					}
				});
				addTiming(timing, "measurementLayer", measurementLayerStarted);
			}

			const countStarted = now();
			updateDocumentLayerCount(parent || findDocumentLayerNode(OL, info));
			addTiming(timing, "updateCount", countStarted);

			timing.samples = sampleFeatures.length;
			timing.measurements = measurementFeatures.length;
			timing.trenches = trenchFeatures.length;
			timing.total = now() - started;
			logTiming(timing);
			return sampleFeatures.length + (trenchNode ? 1 : 0);
		}

		const layerEvents = [];
		const sampleEntries = entries.map(entry => {
			const key = objectKeyOf(entry.sample, entry.name);
				const event = {
					parent: parent,
					layer: {
						key: typeof js !== "undefined" && js.sf ? js.sf("%s/sample/%s", layerKeyForInfo(info), key) : layerKeyForInfo(info) + "/sample/" + key,
						name: entry.name,
						features: entry.features,
						style: sampleStyle,
						legend: SAMPLE_LEGEND,
						runtime: true,
						closeable: false,
						expandable: true,
						expanded: false,
						checked: true,
						ignoreSavedLayerState: true,
						root: parent ? undefined : { key: "Documenten", name: "Documenten", expanded: true },
						path: path,
						document: info
					}
				};

			layerEvents.push(event);
			return { entry: entry, key: key, event: event, node: null };
		});
		let trenchNode = null;
		if(trenchFeatures.length) {
			layerEvents.unshift({
				parent: parent,
				layer: {
					key: (typeof js !== "undefined" && js.sf ? js.sf("%s/trench", layerKeyForInfo(info)) : layerKeyForInfo(info) + "/trench"),
					name: "Trench",
					features: trenchFeatures,
					style: Trench.spec.style,
					legend: TRENCH_LEGEND,
					runtime: true,
					closeable: false,
					checked: true,
					root: parent ? undefined : { key: "Documenten", name: "Documenten", expanded: true },
					path: parent ? undefined : documentPathForInfo(info),
					document: info
				}
			});
		}
		const layersStarted = now();
		const nodes = executeLayerEvents(layerNeeded, layerEvents, true);
		addTiming(timing, "layers", layersStarted);
		const nodeOffset = trenchFeatures.length ? 1 : 0;
		if(trenchFeatures.length) trenchNode = nodes[0];
		sampleEntries.forEach((sampleEntry, index) => {
			sampleEntry.node = nodes[index + nodeOffset];
		});

		const measurementEvents = [];
		const sampleCount = sampleEntries.map(sampleEntry => {
			const entry = sampleEntry.entry;
			const sampleNode = sampleEntry.node;

			if(sampleNode && entry.measurementFeatures.length) {
				const measurementIsTrench = entry.measurementTypes.length === 1 && entry.measurementTypes[0] === "Trench";
				measurementEvents.push({
					parent: sampleNode,
					layer: {
						key: typeof js !== "undefined" && js.sf ? js.sf("%s/sample/%s/measurement", layerKeyForInfo(info), sampleEntry.key) : layerKeyForInfo(info) + "/sample/" + sampleEntry.key + "/measurement",
						name: entry.measurementTypes.length === 1 ? entry.measurementTypes[0] : "Meetpunt",
						features: entry.measurementFeatures,
						style: measurementIsTrench ? Trench.spec.style : Borehole.spec.style,
						legend: measurementIsTrench ? TRENCH_LEGEND : BOREHOLE_LEGEND,
						runtime: true,
						closeable: false,
						checked: false,
						ignoreSavedLayerState: true,
						document: info
					}
				});
			}

			return sampleNode;
		}).filter(Boolean).length;
		if(measurementEvents.length) {
			const measurementLayerStarted = now();
			executeLayerEvents(layerNeeded, measurementEvents);
			addTiming(timing, "measurementLayer", measurementLayerStarted);
		}

		const countStarted = now();
		updateDocumentLayerCount(parent || findDocumentLayerNode(OL, info));
		addTiming(timing, "updateCount", countStarted);

		timing.samples = sampleCount;
		timing.measurementLayers = measurementEvents.length;
		timing.trenches = trenchFeatures.length;
		timing.total = now() - started;
		logTiming(timing);
		return sampleCount + (trenchNode ? 1 : 0);
	};

	return {
		addToMap,
		collectSampleObjects,
		collectMeasurementObjects,
		collectAnalysisSampleLayers,
		collectTrenchFeatures,
		resolveSampleMeasurementObjects,
		createAnalysisSampleFeature,
		createAnalysisSampleMeasurementFeature,
		isAnalysisSample,
		specimenTypeOf
	};
});

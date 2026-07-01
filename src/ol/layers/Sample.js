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
	const collectObjectsForKeys = Common.collectObjectsForKeys;
	const idKeysOf = Common.idKeysOf;
	const indexObjects = Common.indexObjects;
	const featureNameOf = Common.featureNameOf;
	const objectKeyOf = (obj, fallback) => Common.objectKeyOf(obj) || featureNameOf(obj, fallback || "") || fallback || "";
	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;

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

	const collectSampleObjects = result => collectObjectsForKeys(Common.xmlOfResult(result), [
		"immetingen:Sample",
		"imsikb0101:Sample",
		"Sample"
	]);
	const collectMeasurementObjects = result => Borehole.collectObjects(result).concat(Trench.collectObjects(result));
	const collectTrenchFeatures = result => Trench.collectFeatures(result);

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

		if(!sample || depth > 12 || seen.indexOf(sampleKey) !== -1) return pairs;
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

	const createFeature = (obj, type, index, geometry) => Common.createFeature(obj, type, index, geometry);

	const cloneGeometry = geometry => geometry && geometry.clone instanceof Function ? geometry.clone() : geometry;

	const createAnalysisSampleFeature = (analysisSample, fieldSample, measurement, index) => {
		const geometry = Geometry.openLayersGeometryFrom(measurement);
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
			js.sf("<b>%H</b><br><span class='muted'>%H via %H</span>", fieldName, analysisName, measurementName) :
			"<b>" + fieldName + "</b><br><span class='muted'>" + analysisName + " via " + measurementName + "</span>");

		return feature;
	};

	const createAnalysisSampleMeasurementFeature = (analysisSample, fieldSample, measurement, type, index) => {
		const geometry = Geometry.openLayersGeometryFrom(measurement);
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

	const collectAnalysisSampleLayers = result => {
		const samples = collectSampleObjects(result);
		const sampleIndex = indexObjects(samples);
		const boreholes = Borehole.collectObjects(result);
		const trenches = Trench.collectObjects(result);
		const measurementIndex = indexObjects(boreholes.concat(trenches));
		const typeIndex = typeIndexOfMeasurements(boreholes, trenches);

		return samples.filter(isAnalysisSample).map((analysisSample, analysisIndex) => {
			const features = [];
			const measurementFeatures = [];
			const pairKeys = {};
			const measurementTypes = [];

			resolveSampleMeasurementObjects(analysisSample, sampleIndex, measurementIndex).forEach(pair => {
				const pairKey = objectKeyOf(pair.measurement, "measurement");
				const type = measurementTypeOf(pair.measurement, typeIndex);

				if(pairKeys[pairKey]) return;
				pairKeys[pairKey] = true;
				if(measurementTypes.indexOf(type) === -1) measurementTypes.push(type);

				const feature = createAnalysisSampleFeature(analysisSample, pair.sample, pair.measurement, features.length);
				feature && features.push(feature);

				const measurementFeature = createAnalysisSampleMeasurementFeature(analysisSample, pair.sample, pair.measurement, type, measurementFeatures.length);
				measurementFeature && measurementFeatures.push(measurementFeature);
			});

			const name = featureNameOf(analysisSample, typeof js !== "undefined" && js.sf ? js.sf("Analysemonster %d", analysisIndex + 1) : "Analysemonster " + (analysisIndex + 1));

			return features.length ? {
				name,
				features,
				boreholeFeatures: measurementFeatures,
				measurementFeatures,
				measurementTypes,
				sample: analysisSample
			} : null;
		}).filter(Boolean);
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

			if(document && (document.id === info.id || document.uri === info.uri)) score = olLayer ? 10 : 40;
			if(names.indexOf(label) !== -1) score = Math.max(score, olLayer ? 20 : 80);
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

	const sampleStyle = new ol.style.Style({
		image: new ol.style.Circle({
			radius: 6,
			fill: new ol.style.Fill({ color: SAMPLE_COLOR }),
			stroke: new ol.style.Stroke({ color: "white", width: 2 })
		})
	});

	const addToMap = (OL, info, result, opts) => {
		const xml = Common.xmlOfResult(result);
		const map = OL && OL.vars && OL.vars("map");
		const layerNeeded = OL && OL.qs && OL.qs("#ol-layer-needed");

		if(!xml || !map || !layerNeeded) return 0;

		opts = opts || {};
		info = info || {};

		const parent = findDocumentLayerNode(OL, info);
		const entries = opts.samples === false ? [] : collectAnalysisSampleLayers(xml);
		const trenchFeatures = opts.trenches === false ? [] : collectTrenchFeatures(xml);
		const path = parent ? [
			{ key: "Sample", name: "Sample", expanded: false, count: entries.length, legend: SAMPLE_LEGEND }
		] : [
			{ key: layerKeyForInfo(info), name: info.name || info.uri || "SIKB document", expanded: true },
			{ key: "Sample", name: "Sample", expanded: false, count: entries.length, legend: SAMPLE_LEGEND }
		];

		const trenchNode = trenchFeatures.length && layerNeeded.execute({
			parent,
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
				path: parent ? undefined : [{ key: layerKeyForInfo(info), name: info.name || info.uri || "SIKB document", expanded: true }],
				document: info
			}
		});

		const sampleCount = entries.map(entry => {
			const key = objectKeyOf(entry.sample, entry.name);
			const sampleNode = layerNeeded.execute({
				wantsNode: true,
				parent,
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
					root: parent ? undefined : { key: "Documenten", name: "Documenten", expanded: true },
					path,
					document: info
				}
			});

			if(sampleNode && entry.measurementFeatures.length) {
				const measurementIsTrench = entry.measurementTypes.length === 1 && entry.measurementTypes[0] === "Trench";
				layerNeeded.execute({
					parent: sampleNode,
					layer: {
						key: typeof js !== "undefined" && js.sf ? js.sf("%s/sample/%s/measurement", layerKeyForInfo(info), key) : layerKeyForInfo(info) + "/sample/" + key + "/measurement",
						name: entry.measurementTypes.length === 1 ? entry.measurementTypes[0] : "Meetpunt",
						features: entry.measurementFeatures,
						style: measurementIsTrench ? Trench.spec.style : Borehole.spec.style,
						legend: measurementIsTrench ? TRENCH_LEGEND : BOREHOLE_LEGEND,
						runtime: true,
						closeable: false,
						checked: false,
						document: info
					}
				});
			}

			return sampleNode;
		}).filter(Boolean).length;

		updateDocumentLayerCount(parent || findDocumentLayerNode(OL, info));

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

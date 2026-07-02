define(function(require) {
	const ol = require("ol");
	const Geometry = require("../geometry");

	const arrX = Geometry.arrX;
	const textOf = value => {
		if(value === undefined || value === null) return "";
		if(typeof value === "string" || typeof value === "number") return "" + value;
		return value["#text"] || value._Data || value._data || value.text || value.value || "";
	};
	const xmlOfResult = result => result && (result.sikbXml || result.sikbRoot || result.xml || result.root || result.document || result);
	const normalizedReference = value => {
		if(value === undefined || value === null) return "";
		if(typeof value === "string" || typeof value === "number") return String(value).replace(/^#/, "");

		const href = value["@_xlink:href"] || value["@xlink:href"] || value["xlink:href"] || value.href;

		return href ? String(href).replace(/^#/, "") : "";
	};

	const createSeenObjects = () => [];
	const hasSeenObject = (seen, obj) => seen.indexOf(obj) !== -1;
	const addSeenObject = (seen, obj) => seen.push(obj);

	const collectValuesForKeys = (obj, keys, values, seen) => {
		values = values || [];
		seen = seen || createSeenObjects();

		if(obj instanceof Array) {
			obj.forEach(value => collectValuesForKeys(value, keys, values, seen));
		} else if(obj && typeof obj === "object") {
			if(hasSeenObject(seen, obj)) return values;
			addSeenObject(seen, obj);

			Object.keys(obj).forEach(key => {
				if(keys.indexOf(key) !== -1) values.push(obj[key]);
				collectValuesForKeys(obj[key], keys, values, seen);
			});
		}

		return values;
	};

	const collectObjectsForKeys = (obj, keys, values, seen) => {
		values = values || [];
		seen = seen || createSeenObjects();

		if(obj instanceof Array) {
			obj.forEach(value => collectObjectsForKeys(value, keys, values, seen));
		} else if(obj && typeof obj === "object") {
			if(hasSeenObject(seen, obj)) return values;
			addSeenObject(seen, obj);

			Object.keys(obj).forEach(key => {
				if(keys.indexOf(key) !== -1) {
					arrX(obj[key]).forEach(value => values.indexOf(value) === -1 && values.push(value));
				}
				collectObjectsForKeys(obj[key], keys, values, seen);
			});
		}

		return values;
	};

	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;

	const idKeysOf = obj => {
		if(!obj || typeof obj !== "object") return [];

		const keys = [
			obj["@_gml:id"],
			obj["@gml:id"],
			obj["gml:id"],
			obj.gml_id,
			textOf(get("immetingen:identification", obj)),
			textOf(get("imsikb0101:identification", obj)),
			textOf(get("immetingen:identification.immetingen:NEN3610ID.immetingen:lokaalID", obj)),
			textOf(get("imsikb0101:identification.immetingen:NEN3610ID.immetingen:lokaalID", obj)),
			textOf(get("immetingen:NEN3610ID.immetingen:lokaalID", obj)),
			textOf(get("immetingen:lokaalID", obj)),
			textOf(get("lokaalID", obj)),
			textOf(get("immetingen:name", obj)),
			textOf(get("imsikb0101:name", obj)),
			textOf(get("name", obj)),
			obj["@_id"],
			obj["@id"],
			obj.id
		].map(textOf).filter(Boolean);

		return keys.concat(keys.map(key => "#" + key));
	};

	const objectKeyOf = obj => idKeysOf(obj)[0] || "";

	const indexObjects = objects => {
		const index = {};

		objects.forEach(obj => {
			idKeysOf(obj).forEach(id => {
				index[id] = obj;
			});
		});

		return index;
	};

	const firstValueForKeys = (obj, keys) => collectValuesForKeys(obj, keys)
		.map(value => arrX(value)[0])
		.filter(value => value !== undefined && value !== null)[0];

	const relationEntriesOf = obj => collectObjectsForKeys(obj, [
		"immetingen:relatedObservation",
		"imsikb0101:relatedObservation",
		"relatedObservation",
		"immetingen:sampledFeature",
		"imsikb0101:sampledFeature",
		"sampledFeature",
		"immetingen:featureOfInterest",
		"imsikb0101:featureOfInterest",
		"featureOfInterest",
		"immetingen:relatedSamplingFeature",
		"imsikb0101:relatedSamplingFeature",
		"relatedSamplingFeature"
	]);

	const relationTargetsOf = obj => relationEntriesOf(obj).map(entry => normalizedReference(entry))
		.filter(Boolean);

	const xlinkResolvedTargetsOf = (obj, lookup) => relationTargetsOf(obj)
		.map(id => lookup[id])
		.filter(Boolean);

	const objectTypeOf = (obj, fallback) => {
		if(!obj || typeof obj !== "object") return fallback || "Object";

		const keys = Object.keys(obj);
		const typedKey = keys.filter(key => !/^@|#/.test(key) && /:/.test(key))[0];

		return typedKey ? typedKey.replace(/^.*:/, "") : (fallback || "Object");
	};

	const featureNameOf = (obj, fallback) => {
		const name = firstValueForKeys(obj, [
			"immetingen:name",
			"imsikb0101:name",
			"immetingen:naam",
			"imsikb0101:naam",
			"name",
			"naam",
			"gml:name",
			"brocommon:name",
			"brocommon:identification"
		]);

		return textOf(name) || textOf(get("code", obj)) || obj.gml_id || objectKeyOf(obj) || fallback || "";
	};

	const collectObjectsForSpec = (result, spec) => collectObjectsForKeys(xmlOfResult(result), spec.keys || []);

	const createLayerContext = result => ({
		xml: xmlOfResult(result),
		objects: null,
		objectIndex: null,
		geometryCache: Geometry.createGeometryCache()
	});

	const collectIndexedObjects = (context, extraObjects) => {
		context.objects = context.objects || [];
		context.objectIndex = context.objectIndex || {};

		arrX(extraObjects).forEach(obj => {
			if(context.objects.indexOf(obj) === -1) context.objects.push(obj);
		});

		const index = indexObjects(context.objects);
		Object.keys(index).forEach(key => {
			context.objectIndex[key] = index[key];
		});

		return context.objects;
	};

	const resolveRelationTargets = (context, obj, fallbackObjects) => {
		if(!context.objectIndex) {
			collectIndexedObjects(context, fallbackObjects || []);
		}

		return relationTargetsOf(obj).map(id => context.objectIndex[id]).filter(Boolean);
	};

	const createFeature = (obj, type, index, geometry, context) => {
		geometry = geometry || Geometry.cachedOpenLayersGeometryFrom(context, obj);
		if(!geometry) return null;

		const name = featureNameOf(obj, type + " " + (index + 1));
		const feature = new ol.Feature({ geometry });

		feature.set("name", name);
		feature.set("sikb:type", type);
		feature.set("sikb:name", name);
		feature.set("sikb:id", objectKeyOf(obj));
		feature.set("sikb:object", obj);
		feature.set("hint", typeof js !== "undefined" && js.sf ?
			js.sf("<b>%H</b><br><span class='muted'>%H</span>", name, type) :
			"<b>" + name + "</b><br><span class='muted'>" + type + "</span>");

		return feature;
	};

	const collectFeaturesForSpec = (result, spec, opts) => {
		const context = opts && opts.context || createLayerContext(result);
		const objects = collectObjectsForSpec(result, spec);

		collectIndexedObjects(context, objects);

		return objects.map((obj, index) => {
			const feature = (spec.createFeature || createFeature)(obj, spec.name, index, Geometry.cachedOpenLayersGeometryFrom(context, obj), context);

			if(feature) {
				feature.set("sikb:layerKey", spec.key || spec.name);
				feature.set("sikb:spec", spec);
			}

			return feature;
		}).filter(Boolean);
	};

	const styleWith = (fillColor, strokeColor, radius) => new ol.style.Style({
		image: new ol.style.Circle({
			radius: radius || 6,
			fill: new ol.style.Fill({ color: fillColor }),
			stroke: new ol.style.Stroke({ color: strokeColor || "#ffffff", width: 2 })
		}),
		fill: new ol.style.Fill({ color: fillColor.replace(/,\s*[\d.]+\)$/, ", 0.16)") }),
		stroke: new ol.style.Stroke({ color: strokeColor || fillColor, width: 2 })
	});

	const textLabelOfNode = node => {
		try {
			const text = node && node.getText ? node.getText() : "";
			if(typeof text === "string") {
				return text.replace(/\s*\(\d+\)\s*$/, "");
			}
		} catch(e) {
			// Best-effort bridge for optional VCL layer tree integration.
		}
		return "";
	};

	const countNodeOf = layerNode => layerNode && layerNode.getControls ? layerNode.getControls().filter(control => textLabelOfNode(control) === "Aantal")[0] : null;
	const countOfLayerNode = layerNode => {
		const node = countNodeOf(layerNode);
		const text = node && node.getText ? node.getText() : "";
		const match = text && String(text).match(/\((\d+)\)/);

		return match ? parseInt(match[1], 10) : 0;
	};
	const updateDocumentLayerCount = (layerNode, increment) => {
		const node = countNodeOf(layerNode);

		if(node && node.setText) {
			node.setText("Aantal (" + (countOfLayerNode(layerNode) + increment) + ")");
		}
	};

	const findDocumentLayerNode = (OL, info, label) => {
		const layersNode = OL && OL.scope && OL.scope().layers;
		const sourceText = info && info.node && info.node.getText ? info.node.getText() : "";

		if(!layersNode || !layersNode.getControls) return null;

		return layersNode.getControls().filter(node => textLabelOfNode(node) === sourceText)[0] || null;
	};

	const layerKeyForInfo = (info, suffix) => (info && info.node && info.node.hashCode ? info.node.hashCode() : "document") + ":" + suffix;

	const createVectorLayer = (title, features, style, legend) => new ol.layer.Vector({
		source: new ol.source.Vector({ features }),
		style,
		title,
		legend
	});

	const addFeatureLayerToMap = (OL, info, layerInfo, features, style, legend) => {
		if(!features || features.length === 0) return null;

		const layer = createVectorLayer(layerInfo.title, features, style, legend);

		layer.set("veldapps:key", layerInfo.key);
		if(OL && OL.getMap) {
			OL.getMap().addLayer(layer);
		}

		const documentNode = findDocumentLayerNode(OL, info, layerInfo.title);
		updateDocumentLayerCount(documentNode, features.length);

		return {
			layer,
			features,
			title: layerInfo.title,
			key: layerInfo.key,
			node: documentNode
		};
	};

	const addSpecToMap = (OL, info, result, spec, opts) => {
		opts = opts || {};

		const features = opts.features || collectFeaturesForSpec(result, spec, opts);

		return addFeatureLayerToMap(OL, info, {
			key: layerKeyForInfo(info, spec.key || spec.name),
			title: spec.title || spec.name
		}, features, spec.style, spec.legend);
	};

	const layerApi = spec => ({
		spec,
		collectObjects: result => collectObjectsForSpec(result, spec),
		collectFeatures: (result, opts) => collectFeaturesForSpec(result, spec, opts || {}),
		addToMap: (OL, info, result, opts) => addSpecToMap(OL, info, result, spec, opts || {}),
		createFeature: (obj, index, context) => (spec.createFeature || createFeature)(obj, spec.name, index || 0, Geometry.cachedOpenLayersGeometryFrom(context, obj), context)
	});

	const directValueForKeys = (obj, keys) => {
		if(!obj || typeof obj !== "object") return undefined;

		for(let i = 0; i < keys.length; i++) {
			if(obj[keys[i]] !== undefined && obj[keys[i]] !== null) {
				return arrX(obj[keys[i]])[0];
			}
		}
		return undefined;
	};

	const depthValueFor = (obj, keys) => {
		const value = firstValueForKeys(obj, keys);

		return value !== undefined && value !== null && (typeof value === "object" || textOf(value) !== "") ? value : null;
	};
	const parseDepthCm = value => {
		if(value === undefined || value === null || value === "") return null;
		if(typeof value === "number") return value;

		let text = textOf(value) || normalizedReference(value);
		let uom = "";

		if(value && typeof value === "object") {
			const depth = directValueForKeys(value, ["immetingen:Depth", "imsikb0101:Depth", "Depth"]) ||
				get("immetingen:Depth", value) ||
				get("imsikb0101:Depth", value) ||
				get("Depth", value) ||
				value;
			const measure = directValueForKeys(depth, ["immetingen:value", "imsikb0101:value", "value"]) ||
				get("immetingen:value", depth) ||
				get("imsikb0101:value", depth) ||
				get("value", depth);

			text = textOf(measure) || textOf(depth) || text;
			uom = textOf(directValueForKeys(measure, ["@_uom", "@uom", "uom"])) ||
				textOf(get("@_uom", measure)) ||
				textOf(get("@uom", measure)) ||
				textOf(get("uom", measure)) ||
				textOf(directValueForKeys(depth, ["@_uom", "@uom", "uom"])) ||
				textOf(get("@_uom", depth)) ||
				textOf(get("@uom", depth)) ||
				textOf(get("uom", depth));
		}

		const match = String(text).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
		if(!match) return null;

		const number = parseFloat(match[0]);
		if(!isFinite(number)) return null;
		if(/\bmm\b/i.test(text) || /Eenheid:id:66\b|eenheid:id:66\b/.test(uom)) return number / 10;
		if(/\bcm\b/i.test(text) || /Eenheid:id:19\b|eenheid:id:19\b/.test(uom)) return number;
		if(/\bm(?:eter)?(?:\b|-mv)/i.test(text) || /Eenheid:id:115\b|eenheid:id:115\b/.test(uom)) return number * 100;
		return number;
	};
	const upperDepthOf = obj => parseDepthCm(depthValueFor(obj, ["immetingen:upperDepth", "imsikb0101:upperDepth", "upperDepth", "bemonsterdeLaagBovenkant", "bovengrens"]));
	const lowerDepthOf = obj => parseDepthCm(depthValueFor(obj, ["immetingen:lowerDepth", "imsikb0101:lowerDepth", "lowerDepth", "bemonsterdeLaagOnderkant", "ondergrens"]));

	return {
		arrX,
		textOf,
		xmlOfResult,
		normalizedReference,
		createSeenObjects,
		hasSeenObject,
		addSeenObject,
		collectValuesForKeys,
		collectObjectsForKeys,
		idKeysOf,
		objectKeyOf,
		indexObjects,
		firstValueForKeys,
		relationEntriesOf,
		relationTargetsOf,
		xlinkResolvedTargetsOf,
		objectTypeOf,
		featureNameOf,
		collectObjectsForSpec,
		createLayerContext,
		collectIndexedObjects,
		resolveRelationTargets,
		createFeature,
		collectFeaturesForSpec,
		styleWith,
		textLabelOfNode,
		countNodeOf,
		countOfLayerNode,
		updateDocumentLayerCount,
		findDocumentLayerNode,
		layerKeyForInfo,
		createVectorLayer,
		addFeatureLayerToMap,
		addSpecToMap,
		layerApi,
		directValueForKeys,
		depthValueFor,
		parseDepthCm,
		upperDepthOf,
		lowerDepthOf
	};
});

define(function(require) {
	const Common = require("../ol/layers/common");
	const DocumentLayers = require("../ol/layers/Document");
	const Sample = require("../ol/layers/Sample");

	const DEFAULT_CRS = "EPSG:28992";
	const DEFAULT_INDENT = "\t";
	const INTERNAL_FEATURE_KEYS = {
		geometry: true,
		hint: true,
		"generate-svg-preview": true,
		"sikb:object": true,
		"sikb:spec": true,
		"sikb:profile": true
	};
	const SKIP_LOCAL_NAMES = {
		geometry: true,
		relatedSamplingFeature: true,
		relatedObservation: true,
		featureOfInterest: true,
		sampledFeature: true
	};

	const arrX = Common.arrX;
	const textOf = Common.textOf;
	const objectKeyOf = Common.objectKeyOf;
	const featureNameOf = Common.featureNameOf;
	const normalizedReference = Common.normalizedReference;

	const localNameOf = key => String(key || "")
		.replace(/^@_?/, "")
		.replace(/^.*:/, "");
	const propertyNameOf = key => String(key || "")
		.replace(/^@_?/, "")
		.replace(/:/g, "_")
		.replace(/^.*_/, "")
		.replace(/[^\w]+/g, "_")
		.replace(/^_+|_+$/g, "");
	const isPlainObject = value => value && typeof value === "object" &&
		!(value instanceof Array) && !(value instanceof Date);
	const scalarObjectValue = value => {
		if(!isPlainObject(value)) return undefined;

		const ref = normalizedReference(value);
		if(ref) return ref;

		const text = textOf(value);
		if(text !== "") return text;

		const keys = Object.keys(value).filter(key => key.charAt(0) !== "@" && key.charAt(0) !== "#");
		return keys.length === 1 ? propertyValueOf(value[keys[0]]) : undefined;
	};
	const propertyValueOf = value => {
		if(value === undefined || value === null) return undefined;
		if(value instanceof Date) return value.toISOString();
		if(typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
		if(value instanceof Array) {
			const values = value.map(propertyValueOf).filter(value => value !== undefined && value !== "");
			return values.length ? values.join(", ") : undefined;
		}
		return scalarObjectValue(value);
	};
	const addProperty = (properties, key, value) => {
		const name = propertyNameOf(key);
		const serialized = propertyValueOf(value);

		if(name && serialized !== undefined && serialized !== "") {
			properties[name] = serialized;
		}
	};
	const shouldSkipSourceProperty = key => {
		const localName = localNameOf(key);

		return key.charAt(0) === "#" ||
			key.charAt(0) === "@" ||
			SKIP_LOCAL_NAMES[localName] === true ||
			localName.toLowerCase().indexOf("geometry") !== -1;
	};
	const addSourceProperties = (properties, obj) => {
		if(!isPlainObject(obj)) return properties;

		const gmlId = obj["@_gml:id"] || obj["@gml:id"] || obj["gml:id"] || obj.gml_id;
		const parent = obj.gml_parent_property || obj["gml_parent_property"];

		if(gmlId !== undefined && gmlId !== null && gmlId !== "") properties.gml_id = String(gmlId);
		if(parent !== undefined && parent !== null && parent !== "") properties.gml_parent_property = String(parent);

		Object.keys(obj).forEach(key => {
			if(shouldSkipSourceProperty(key)) return;
			addProperty(properties, key, obj[key]);
		});
		return properties;
	};
	const addFeatureProperties = (properties, feature) => {
		const source = feature.get("sikb:object");

		properties.sikb_type = feature.get("sikb:type") || "";
		properties.sikb_name = feature.get("sikb:name") || feature.get("name") || "";
		properties.sikb_id = feature.get("sikb:id") || objectKeyOf(source);
		addSourceProperties(properties, source);
		[
			{ key: "imsikb0101:AnalysisSample", prefix: "analysis_sample" },
			{ key: "imsikb0101:Measurement", prefix: "measurement" },
			{ key: "imsikb0101:Sample", prefix: "sample" }
		].forEach(def => {
			const obj = feature.get(def.key);
			if(!obj) return;
			properties[def.prefix + "_id"] = objectKeyOf(obj);
			properties[def.prefix + "_name"] = featureNameOf(obj, "");
		});

		Object.keys(feature.getProperties()).forEach(key => {
			if(INTERNAL_FEATURE_KEYS[key] || key.indexOf("sikb:") === 0 || key.indexOf("imsikb0101:") === 0) return;
			addProperty(properties, key, feature.get(key));
		});
		return properties;
	};
	const geometryToGeoJSON = geometry => {
		if(!geometry || !(geometry.getType instanceof Function) || !(geometry.getCoordinates instanceof Function)) return null;

		return {
			type: geometry.getType(),
			coordinates: geometry.getCoordinates()
		};
	};
	const featureToGeoJSON = feature => {
		const geometry = geometryToGeoJSON(feature && feature.getGeometry && feature.getGeometry());

		return geometry ? {
			type: "Feature",
			geometry: geometry,
			properties: addFeatureProperties({}, feature)
		} : null;
	};
	const featureCollection = (features, opts) => ({
		type: "FeatureCollection",
		crs: opts.crs === false ? undefined : {
			type: "name",
			properties: opts.crs || DEFAULT_CRS
		},
		features: (features || []).map(featureToGeoJSON).filter(Boolean)
	});
	const flattenEntryFeatures = entries => (entries || []).reduce((features, entry) =>
		features.concat(entry && entry.features || []), []);
	const pushUnique = (values, value) => {
		if(value && values.indexOf(value) === -1) values.push(value);
		return value;
	};
	const sourceObjectOfFeature = feature => feature && feature.get instanceof Function && feature.get("sikb:object");
	const markFeatureObjects = (features, objects) => {
		(features || []).forEach(feature => pushUnique(objects, sourceObjectOfFeature(feature)));
		return objects;
	};
	const collectionNameForKey = (key, layerEntries) => {
		const localName = localNameOf(key);
		const entry = (layerEntries || []).filter(entry =>
			entry && entry.spec && (entry.spec.keys || []).some(specKey => specKey === key || localNameOf(specKey) === localName))[0];

		return entry && (entry.name || entry.key) || localName;
	};
	const addObjectEntry = (entriesByName, name, key, objects) => {
		const entry = entriesByName[name] || (entriesByName[name] = {
			key: key,
			name: name,
			objects: []
		});

		arrX(objects).forEach(obj => pushUnique(entry.objects, obj));
		return entry;
	};
	const collectObjectEntries = (result, layerEntries, opts) => {
		const model = Common.modelOfResult(result);
		const entriesByName = {};
		const root = model && model.root;

		if(root && typeof root === "object") {
			Object.keys(root).forEach(key => {
				if(/^@|#/.test(key) || !(root[key] instanceof Array)) return;
				addObjectEntry(entriesByName, collectionNameForKey(key, layerEntries), key, root[key]);
			});
		}

		if(opts.featureMembers !== false && model && model.indexFeatureMembers instanceof Function) {
			const index = model.indexFeatureMembers();

			Object.keys(index || {}).forEach(key => {
				addObjectEntry(entriesByName, collectionNameForKey(key, layerEntries), key, index[key]);
			});
		}
		return Object.keys(entriesByName).map(name => entriesByName[name]);
	};
	const collectSampleEntry = (result, opts) => {
		if(opts.samples === false) return null;

		const timing = opts.timing || null;
		const features = flattenEntryFeatures(Sample.collectAnalysisSampleLayers(result, timing));

		return features.length ? {
			key: "sample",
			name: "Sample",
			features: features
		} : null;
	};
	const collectEntries = (result, opts) => {
		opts = opts || {};

		const context = opts.context || Common.createLayerContext(result);
		const entries = DocumentLayers.collectLayerEntries(result, opts.layerModules || DocumentLayers.MAIN_LAYER_MODULES, {
			context: context
		});
		const sampleEntry = collectSampleEntry(result, opts);

		return sampleEntry ? entries.concat([sampleEntry]) : entries;
	};
	const rootKeyForEntry = entry => entry.name || entry.key;
	const objectToGeoJSON = (obj, type, index) => {
		const properties = {
			sikb_type: type,
			sikb_name: featureNameOf(obj, type + " " + (index + 1)),
			sikb_id: objectKeyOf(obj)
		};

		return {
			type: "Feature",
			geometry: null,
			properties: addSourceProperties(properties, obj)
		};
	};
	const toObject = (result, opts) => {
		opts = opts || {};

		const root = {};
		const exportedObjects = [];
		const entries = collectEntries(result, opts);

		entries.forEach(entry => {
			const collection = featureCollection(entry.features, opts);

			if(collection.features.length || opts.includeEmpty === true) {
				root[rootKeyForEntry(entry)] = collection;
				markFeatureObjects(entry.features, exportedObjects);
			}
		});
		if(opts.objects !== false) {
			collectObjectEntries(result, entries, opts).forEach(entry => {
				const name = rootKeyForEntry(entry);
				const collection = root[name] || featureCollection([], opts);
				const features = entry.objects
					.filter(obj => exportedObjects.indexOf(obj) === -1)
					.map((obj, index) => objectToGeoJSON(obj, localNameOf(entry.key || name), index));

				if(features.length || opts.includeEmpty === true) {
					collection.features = collection.features.concat(features);
					root[name] = collection;
				}
			});
		}
		return root;
	};
	const stringify = (result, opts) => {
		opts = opts || {};
		return JSON.stringify(toObject(result, opts), null, opts.indent === undefined ? DEFAULT_INDENT : opts.indent);
	};
	const toBlob = (result, opts) => new Blob([stringify(result, opts)], {
		type: "application/geo+json;charset=utf-8"
	});

	return {
		collectEntries: collectEntries,
		collectObjectEntries: collectObjectEntries,
		featureToGeoJSON: featureToGeoJSON,
		featureCollection: featureCollection,
		toObject: toObject,
		stringify: stringify,
		toBlob: toBlob
	};
});

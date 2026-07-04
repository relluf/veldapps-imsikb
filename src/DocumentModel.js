define(function(require) {
	const Geometry = require("./ol/geometry");

	const arrX = Geometry.arrX;
	const TYPE_GROUPS = {
		projects: ["imsikb0101:Project", "Project"],
		boreholes: ["immetingen:Borehole", "imsikb0101:Borehole", "bhrgt:Borehole", "Borehole"],
		trenches: ["immetingen:Trench", "imsikb0101:Trench", "Trench"],
		layers: ["imsikb0101:Layer", "Layer"],
		finishings: ["imsikb0101:Finishing", "Finishing"],
		filters: ["imsikb0101:Filter", "Filter"],
		samples: ["immetingen:Sample", "imsikb0101:Sample", "Sample"],
		characteristics: ["immetingen:Characteristic", "Characteristic"],
		analyses: ["immetingen:Analysis", "Analysis"],
		testingConclusions: ["imsikb0101:TestingConclusion", "TestingConclusion"]
	};

	const textOf = value => {
		if(value === undefined || value === null) return "";
		if(typeof value === "string" || typeof value === "number") return "" + value;
		return value["#text"] || value._Data || value._data || value.text || value.value || "";
	};
	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;
	const normalizedReference = value => {
		if(value === undefined || value === null) return "";
		if(typeof value === "string" || typeof value === "number") return String(value).replace(/^#/, "");

		const href = value["@_xlink:href"] || value["@xlink:href"] || value["xlink:href"] || value.href;

		return href ? String(href).replace(/^#/, "") : "";
	};
	const hasDirectCollectionKeys = obj => !!(obj && typeof obj === "object" &&
		Object.keys(obj).some(key => !/^@|#/.test(key) && obj[key] instanceof Array));
	const preferredRootOf = result => {
		if(!result || typeof result !== "object") return result;

		return [
			result.view,
			result.root,
			result.sikbRoot,
			result.sikbXml,
			result.xml,
			result.document
		].filter(hasDirectCollectionKeys)[0] ||
			(result.sikbXml || result.sikbRoot || result.xml || result.root || result.document || result);
	};
	const rawXmlOf = result => result && typeof result === "object" ?
		(result.sikbXml || result.sikbRoot || result.xml || result.document || result.root || result) :
		result;
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
	const pushUnique = (values, value) => {
		value && values.indexOf(value) === -1 && values.push(value);
		return value;
	};
	const collectDirectObjectsForKeys = (obj, keys, values) => {
		values = values || [];
		if(!obj || typeof obj !== "object") return values;

		(keys || []).forEach(key => {
			arrX(obj[key]).forEach(value => pushUnique(values, value));
		});
		return values;
	};
	const featureMembersOf = xml => {
		const root = xml && (
			xml["imsikb0101:FeatureCollectionIMSIKB0101"] ||
			xml["FeatureCollectionIMSIKB0101"] ||
			xml
		);

		return arrX(get("imsikb0101:featureMember", root) ||
			get("featureMember", root) ||
			get("gml:featureMember", root));
	};
	const createFeatureMemberIndex = xml => {
		const index = {};

		featureMembersOf(xml).forEach(member => {
			if(!member || typeof member !== "object") return;
			Object.keys(member).forEach(key => {
				if(/^@|#/.test(key)) return;
				arrX(member[key]).forEach(value => {
					if(value && typeof value === "object") {
						(index[key] || (index[key] = [])).push(value);
					}
				});
			});
		});
		return index;
	};
	const collectFromIndex = (index, keys) => {
		const values = [];

		(keys || []).forEach(key => {
			arrX(index[key]).forEach(value => pushUnique(values, value));
		});
		return values;
	};
	const collectDirectCollectionObjects = root => {
		const objects = [];

		if(!hasDirectCollectionKeys(root)) return objects;
		Object.keys(root).forEach(key => {
			if(!/^@|#/.test(key) && root[key] instanceof Array) {
				root[key].forEach(value => pushUnique(objects, value));
			}
		});
		return objects;
	};
	const collectIdentifiedObjectsDeep = (obj, values, seen) => {
		values = values || [];
		seen = seen || [];

		if(obj instanceof Array) {
			obj.forEach(value => collectIdentifiedObjectsDeep(value, values, seen));
		} else if(obj && typeof obj === "object") {
			if(seen.indexOf(obj) !== -1) return values;
			seen.push(obj);
			if(idKeysOf(obj).length) pushUnique(values, obj);
			Object.keys(obj).forEach(key => collectIdentifiedObjectsDeep(obj[key], values, seen));
		}
		return values;
	};
	const assignToResult = (result, model) => {
		if(result && typeof result === "object" && !result.isSikbDocumentModel) {
			try {
				Object.defineProperty(result, "sikbModel", {
					value: model,
					configurable: true,
					writable: true,
					enumerable: false
				});
			} catch(e) {
				result.sikbModel = model;
			}
		}
		return model;
	};
	const create = result => {
		const root = preferredRootOf(result);
		const xml = rawXmlOf(result);
		const model = {
			isSikbDocumentModel: true,
			source: result,
			root: root,
			xml: xml,
			typeGroups: TYPE_GROUPS,
			geometryCache: Geometry.createGeometryCache(),
			typeCache: {},
			featureMemberIndex: null,
			identified: null,
			byId: null,
			sharedObjects: null
		};

		model.featureMembers = () => featureMembersOf(model.xml || model.root);
		model.indexFeatureMembers = () => model.featureMemberIndex ||
			(model.featureMemberIndex = createFeatureMemberIndex(model.xml || model.root));
		model.collect = keys => {
			const direct = collectDirectObjectsForKeys(model.root, keys);
			if(direct.length) return direct;

			return collectFromIndex(model.indexFeatureMembers(), keys);
		};
		model.collectType = name => model.typeCache[name] ||
			(model.typeCache[name] = model.collect(TYPE_GROUPS[name] || [name]));
		model.identifiedObjects = () => {
			if(model.identified) return model.identified;

			const direct = collectDirectCollectionObjects(model.root);
			model.identified = direct.length ? direct.filter(obj => idKeysOf(obj).length) :
				collectIdentifiedObjectsDeep(model.root || model.xml);
			return model.identified;
		};
		model.indexById = () => {
			if(model.byId) return model.byId;

			model.byId = {};
			model.identifiedObjects().forEach(obj => {
				idKeysOf(obj).forEach(id => {
					if(model.byId[id] === undefined) model.byId[id] = obj;
				});
			});
			return model.byId;
		};
		model.collectSharedObjects = () => {
			if(model.sharedObjects) return model.sharedObjects;

			const objects = {
				identified: model.identifiedObjects(),
				projects: model.collectType("projects"),
				boreholes: model.collectType("boreholes"),
				trenches: model.collectType("trenches"),
				layers: model.collectType("layers"),
				finishings: model.collectType("finishings"),
				filters: model.collectType("filters"),
				samples: model.collectType("samples"),
				characteristics: model.collectType("characteristics"),
				analyses: model.collectType("analyses"),
				testingConclusions: model.collectType("testingConclusions")
			};

			model.sharedObjects = objects;
			return objects;
		};

		return assignToResult(result, model);
	};
	const from = result => {
		if(result && result.isSikbDocumentModel) return result;
		if(result && result.sikbModel && result.sikbModel.isSikbDocumentModel) return result.sikbModel;
		return create(result);
	};

	return {
		TYPE_GROUPS: TYPE_GROUPS,
		from: from,
		create: create,
		hasDirectCollectionKeys: hasDirectCollectionKeys,
		preferredRootOf: preferredRootOf,
		rawXmlOf: rawXmlOf,
		textOf: textOf,
		normalizedReference: normalizedReference,
		idKeysOf: idKeysOf,
		collectDirectObjectsForKeys: collectDirectObjectsForKeys,
		featureMembersOf: featureMembersOf
	};
});

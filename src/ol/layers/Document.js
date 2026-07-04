define(function(require) {
	const ol = require("ol");
	const Common = require("./common");
	const Geometry = require("../geometry");
	const Project = require("./Project");
	const Borehole = require("./Borehole");
	const SoilLocation = require("./SoilLocation");
	const Trench = require("./Trench");
	const ContaminationInformation = require("./ContaminationInformation");
	const Remediation = require("./Remediation");

	const DOCUMENT_ROOT_KEY = "Documenten";
	const MAIN_LAYER_MODULES = [
		Project,
		SoilLocation,
		ContaminationInformation,
		Remediation,
		Borehole,
		Trench
	];

	const arrX = Geometry.arrX;
	const textOf = Geometry.textOf;
	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;

	const textLabelOfNode = node => {
		const text = node && node.getNode && node.getNode("text");
		const label = text && text.qs && text.qs(".label");
		return (label && (label.textContent || label.innerText) || "").trim();
	};
	const layerKeyForInfo = info => "extra-layers/document-sikb/" +
		(info && (info.id || info.uri || info.name) || "current");
	const layerKeyForSpec = spec => spec.layerKey || String(spec.key || spec.name).toLowerCase();
	const layerNameForSpec = spec => spec.name;
	const layerTitleForSpec = spec => spec.title || spec.name;
	const createVectorEntry = entry => {
		const source = new ol.source.Vector({ features: entry.features });
		const layer = new ol.layer.Vector({
			name: entry.name,
			source: source,
			style: entry.style
		});

		return { source: source, layer: layer };
	};
	const findDocumentLayerNode = (OL, info) => {
		if(info && info.node) return info.node;

		const root = OL && OL.udown && (OL.udown("#root-features") || OL.udown("#root-layers"));
		const infoKey = layerKeyForInfo(info);
		const identities = [info && info.id, info && info.uri].filter(Boolean);
		const names = identities.length ? [] : [info && info.name, info && info.uri].filter(Boolean);
		let found = null;
		let foundScore = -1;
		const visit = node => {
			if(!node || !node.getControls) return;

			const layer = node.vars && node.vars("layer");
			const document = layer && layer.document;
			const olLayer = node.vars && node.vars("ol");
			const label = textLabelOfNode(node).replace(/\s+\(\d+\)$/, "");
			const documentIdentities = [document && document.id, document && document.uri, document && document.key].filter(Boolean);
			const hasDocumentIdentity = identities.some(identity => documentIdentities.indexOf(identity) !== -1);
			let score = -1;
			if(olLayer) {
				node.getControls().forEach(visit);
				return;
			}

			if(layer && (layer.key === infoKey || layer.pathKey === infoKey)) score = 60;
			if(hasDocumentIdentity) score = Math.max(score, 40);
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
	const eventForEntry = (info, parent, entry) => {
		const vector = createVectorEntry(entry);

		return {
			parent: parent,
			layer: {
				key: layerKeyForInfo(info) + "/" + entry.key,
				name: entry.name,
				title: entry.title,
				source: vector.source,
				layer: vector.layer,
				count: entry.features.length,
				style: entry.style,
				legend: entry.legend,
				runtime: true,
				static: true,
				closeable: false,
				checked: true,
				root: parent ? undefined : { key: DOCUMENT_ROOT_KEY, name: DOCUMENT_ROOT_KEY, expanded: true },
				path: parent ? undefined : [{
					key: layerKeyForInfo(info),
					name: info && (info.name || info.uri) || "SIKB document",
					index: info && info.mapDocumentIndex,
					expanded: true,
					runtime: true,
					closeable: true,
					document: info
				}],
				document: info
			}
		};
	};
	const addLayerEntriesToMap = (OL, info, entries) => {
		const layerNeeded = OL && OL.qs && OL.qs("#ol-layer-needed");

		entries = (entries || []).filter(entry => entry && entry.features && entry.features.length);
		if(!layerNeeded || !entries.length) return 0;

		const parent = findDocumentLayerNode(OL, info);
		const events = entries.map(entry => eventForEntry(info, parent, entry));

		if(events.length === 1) {
			layerNeeded.execute(events[0]);
		} else {
			layerNeeded.execute({ layers: events });
		}
		return entries.reduce((count, entry) => count + entry.features.length, 0);
	};
	const collectLayerEntries = (result, layerModules, opts) => {
		opts = opts || {};
		const context = opts.context || Common.createLayerContext(result);

		return (layerModules || MAIN_LAYER_MODULES).map(layerModule => {
			const started = Date.now();
			const spec = layerModule.spec;
			const features = layerModule.collectFeatures ?
				layerModule.collectFeatures(result, { context: context }) :
				Common.collectFeaturesForSpec(result, spec, { context: context });

			return {
				key: layerKeyForSpec(spec),
				name: layerNameForSpec(spec),
				title: layerTitleForSpec(spec),
				spec: spec,
				features: features,
				style: spec.style,
				legend: spec.legend,
				timing: {
					collect: Date.now() - started
				}
			};
		}).filter(entry => entry.features.length);
	};
	const parseCoordinateNumber = value => {
		if(value === undefined || value === null) return NaN;
		const text = typeof value === "object" ? textOf(value) : value;
		const match = String(text).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
		return match ? parseFloat(match[0]) : NaN;
	};
	const numberAttr = (obj, names) => {
		const value = names.map(name => obj && obj[name]).filter(value => value !== undefined && value !== null)[0];
		return value !== undefined ? parseCoordinateNumber(value) : NaN;
	};
	const coordinateFromPairValue = value => {
		if(value instanceof Array && value.length >= 2) {
			const coordinate = [parseCoordinateNumber(value[0]), parseCoordinateNumber(value[1])];
			return coordinate.every(isFinite) ? coordinate : null;
		}
		const text = textOf(value) || (value !== undefined && value !== null && typeof value !== "object" ? "" + value : "");
		const numbers = String(text).match(/-?\d+(?:[.,]\d+)?/g);
		if(numbers && numbers.length >= 2) {
			const coordinate = numbers.slice(0, 2).map(number => parseFloat(number.replace(",", ".")));
			return coordinate.every(isFinite) ? coordinate : null;
		}
		return null;
	};
	const coordinateFromXY = obj => {
		const pair = coordinateFromPairValue(obj);
		if(pair) return pair;
		const point = obj && (obj.point || obj.Point);
		if(point && point !== obj) {
			const coordinate = coordinateFromXY(point);
			if(coordinate) return coordinate;
		}
		const coordinate = [
			numberAttr(obj, ["@_xcoord", "@xcoord", "xcoord", "x", "@_x", "@x"]),
			numberAttr(obj, ["@_ycoord", "@ycoord", "ycoord", "y", "@_y", "@y"])
		];
		return coordinate.every(isFinite) ? coordinate : null;
	};
	const legacyPolygonGeometryFrom = obj => {
		const polygons = arrX(get("geoobject.polygon", obj)).map(polygon => {
			const rings = arrX(get("part", polygon)).map(part => {
				const coordinates = arrX(get("point", part))
					.map(point => coordinateFromXY(point.point || point))
					.filter(Boolean);
				return coordinates.length ? Geometry.closeRing(coordinates) : null;
			}).filter(Boolean);
			return rings.length ? rings : null;
		}).filter(Boolean);

		if(polygons.length > 1) return new ol.geom.MultiPolygon(polygons);
		return polygons.length ? new ol.geom.Polygon(polygons[0]) : null;
	};
	const legacyPointGeometryFrom = obj => {
		const coordinate = coordinateFromXY(obj && (obj.point || obj.Point || obj));
		return coordinate ? new ol.geom.Point(coordinate) : null;
	};
	const legacyObjectsAt = (obj, names) => names.reduce((values, name) => values.concat(arrX(get(name, obj))), []);
	const pushLegacyObject = (values, obj) => {
		obj && values.indexOf(obj) === -1 && values.push(obj);
		return obj;
	};
	const collectLegacySikbObjects = xml => {
		const objects = { Locatie: [], Onderzoek: [], Meetpunt: [] };
		const bodeminformatie = get("bodeminformatie", xml) || xml;
		const collectMeetpunten = onderzoek => legacyObjectsAt(onderzoek, ["meetpunt", "Meetpunt", "Meetpunten"])
			.forEach(meetpunt => pushLegacyObject(objects.Meetpunt, meetpunt));
		const collectOnderzoeken = locatie => legacyObjectsAt(locatie, ["onderzoek", "Onderzoek", "Onderzoeken"]).forEach(onderzoek => {
			pushLegacyObject(objects.Onderzoek, onderzoek);
			collectMeetpunten(onderzoek);
		});

		legacyObjectsAt(bodeminformatie, ["locatie", "Locatie", "Locaties"]).forEach(locatie => {
			pushLegacyObject(objects.Locatie, locatie);
			collectOnderzoeken(locatie);
		});
		legacyObjectsAt(bodeminformatie, ["onderzoek", "Onderzoek", "Onderzoeken"]).forEach(onderzoek => {
			pushLegacyObject(objects.Onderzoek, onderzoek);
			collectMeetpunten(onderzoek);
		});
		legacyObjectsAt(bodeminformatie, ["meetpunt", "Meetpunt", "Meetpunten"]).forEach(meetpunt => pushLegacyObject(objects.Meetpunt, meetpunt));
		return objects;
	};
	const legacySikbLayerSpecs = () => [{
		name: "Locatie",
		key: "sikb:Locatie",
		layerKey: "locatie",
		style: Project.spec.style,
		legend: [{ color: "rgba(255, 204, 51, 0.25)", borderColor: "#ff9900", title: "Locatie", radius: "0" }]
	}, {
		name: "Onderzoek",
		key: "sikb:Onderzoek",
		layerKey: "onderzoek",
		style: Project.spec.style,
		legend: [{ color: "rgba(255, 204, 51, 0.25)", borderColor: "#ff9900", title: "Onderzoek", radius: "0" }]
	}, {
		name: "Meetpunt",
		key: "sikb:Meetpunt",
		layerKey: "meetpunt",
		style: Borehole.spec.style,
		legend: [{ color: "rgba(56, 121, 217, 0.85)", title: "Meetpunt" }]
	}];
	const legacyObjectGeometry = (type, obj) => type === "Meetpunt" ? legacyPointGeometryFrom(obj) : legacyPolygonGeometryFrom(obj);
	const legacyLayerEntry = (legacy, spec) => ({
		key: spec.layerKey,
		name: spec.name,
		title: spec.title || spec.name,
		spec: spec,
		features: (legacy[spec.name] || []).map((obj, index) => {
			const feature = Common.createFeature(obj, spec.name, index, legacyObjectGeometry(spec.name, obj));
			if(feature) {
				feature.set(spec.key, obj);
				feature.set("sikb:layerKey", spec.key);
				feature.set("sikb:spec", spec);
			}
			return feature;
		}).filter(Boolean),
		style: spec.style,
		legend: spec.legend,
		timing: { collect: 0 }
	});
	const isLegacySikbResult = (result, context) => {
		const xml = context && (context.rawXml || context.xml) || Common.createLayerContext(result).xml;
		return !!(xml && (get("bodeminformatie", xml) || get("locatie", xml) || get("Locatie", xml)));
	};
	const collectLegacyLayerEntries = (result, context) => {
		const xml = context && (context.rawXml || context.xml) || Common.createLayerContext(result).xml;
		const legacy = collectLegacySikbObjects(xml);
		return legacySikbLayerSpecs().map(spec => legacyLayerEntry(legacy, spec)).filter(entry => entry.features.length);
	};
	const addEntityLayersToMap = (OL, info, result, opts) => {
		opts = opts || {};
		const started = Date.now();
		const contextStarted = Date.now();
		const context = opts.context || Common.createLayerContext(result);
		const layerModules = opts.layerModules || MAIN_LAYER_MODULES;
		const contextDuration = Date.now() - contextStarted;
		const collectStarted = Date.now();
		const entries = isLegacySikbResult(result, context) ?
			collectLegacyLayerEntries(result, context) :
			collectLayerEntries(result, layerModules, Object.assign({}, opts, {
				context: context
			}));
		const collectDuration = Date.now() - collectStarted;
		const layerStarted = Date.now();
		const added = addLayerEntriesToMap(OL, info, entries);
		const layerDuration = Date.now() - layerStarted;
		const timing = {
			total: Date.now() - started,
			context: contextDuration,
			collect: collectDuration,
			layer: layerDuration,
			groups: entries.reduce((acc, entry) => {
				acc[entry.spec.name] = {
					features: entry.features.length,
					collect: entry.timing && entry.timing.collect || 0
				};
				return acc;
			}, {}),
			added: added
		};

		if(opts.onTiming instanceof Function) {
			opts.onTiming(opts.timingLabel || (layerModules.length === 1 ?
				"map:" + layerModules[0].spec.name : "map:document-entities"), timing);
		}
		return added;
	};
	const addEntityLayerToMap = (OL, info, result, layerModule, opts) => addEntityLayersToMap(OL, info, result, Object.assign({}, opts || {}, {
		layerModules: [layerModule]
	}));

	return {
		DOCUMENT_ROOT_KEY: DOCUMENT_ROOT_KEY,
		MAIN_LAYER_MODULES: MAIN_LAYER_MODULES,
		layerKeyForInfo: layerKeyForInfo,
		findDocumentLayerNode: findDocumentLayerNode,
		collectLayerEntries: collectLayerEntries,
		addLayerEntriesToMap: addLayerEntriesToMap,
		addEntityLayerToMap: addEntityLayerToMap,
		addEntityLayersToMap: addEntityLayersToMap,
		addToMap: addEntityLayersToMap
	};
});

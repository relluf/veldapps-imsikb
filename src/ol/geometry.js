"use ../js/index";

define(function(require) {
	const ol = require("ol");
	const proj4 = require("proj4");
	require("veldapps-ol/proj/RD");

	const TARGET_PROJECTION = "EPSG:28992";

	const arrX = value => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
	const textOf = value => value && typeof value === "object" ? (value["#text"] || value._Data || value._data || value.text || value._ || value.value || "") : value;
	const firstValueForKeys = (obj, keys) => {
		let ret = undefined;
		keys.some(key => {
			if(obj && obj[key] !== undefined) {
				ret = arrX(obj[key])[0];
				return true;
			}
			return false;
		});
		return ret;
	};
	const collectValuesForKeys = (obj, keys, values, seen) => {
		values = values || [];
		seen = seen || [];

		if(Array.isArray(obj)) {
			obj.forEach(value => collectValuesForKeys(value, keys, values, seen));
		} else if(obj && typeof obj === "object") {
			if(seen.indexOf(obj) !== -1) return values;
			seen.push(obj);
			Object.keys(obj).forEach(key => {
				if(keys.indexOf(key) !== -1) values.push(obj[key]);
				collectValuesForKeys(obj[key], keys, values, seen);
			});
		}

		return values;
	};

	const coordinatePairsFromText = text => {
		const values = String(textOf(text) || "")
			.trim()
			.split(/[\s,]+/)
			.map(value => parseFloat(value))
			.filter(value => !isNaN(value));
		const coordinates = [];

		for(let i = 0; i + 1 < values.length; i += 2) {
			coordinates.push([values[i], values[i + 1]]);
		}

		return coordinates;
	};

	const closeRing = coordinates => {
		if(coordinates.length > 0) {
			const first = coordinates[0];
			const last = coordinates[coordinates.length - 1];

			if(first[0] !== last[0] || first[1] !== last[1]) {
				coordinates = coordinates.concat([[first[0], first[1]]]);
			}
		}

		return coordinates;
	};

	const srsNameOf = obj => obj && (
		obj["@_srsName"] ||
		obj["@srsName"] ||
		obj.srsName ||
		collectValuesForKeys(obj, ["@_srsName", "@srsName", "srsName"]).map(textOf).filter(Boolean)[0]
	);

	const isWgs84Coordinate = coordinate => coordinate && coordinate[0] >= 3 && coordinate[0] <= 8 && coordinate[1] >= 50 && coordinate[1] <= 54;
	const isWgs84AxisFlippedCoordinate = coordinate => coordinate && coordinate[0] >= 50 && coordinate[0] <= 54 && coordinate[1] >= 3 && coordinate[1] <= 8;
	const normalizeWgs84Coordinate = coordinate => isWgs84AxisFlippedCoordinate(coordinate) ? [coordinate[1], coordinate[0]] : coordinate;

	const transformCoordinateToRD = (coordinate, srsName) => {
		if(!coordinate || coordinate.length < 2) {
			return coordinate;
		}

		if(!srsName || srsName === TARGET_PROJECTION || /28992/.test(srsName)) {
			return isWgs84Coordinate(coordinate) || isWgs84AxisFlippedCoordinate(coordinate) ?
				proj4("EPSG:4326", TARGET_PROJECTION, normalizeWgs84Coordinate(coordinate)) :
				coordinate;
		}

		try {
			return proj4(srsName, TARGET_PROJECTION, coordinate);
		} catch(e) {
			return proj4("EPSG:4326", TARGET_PROJECTION, normalizeWgs84Coordinate(coordinate));
		}
	};

	const transformCoordinatesToRD = (coordinates, srsName) => coordinates.map(coordinate => transformCoordinateToRD(coordinate, srsName));

	const pointGeometryFrom = point => {
		point = Array.isArray(point) ? point[0] : point;
		if(!point) {
			return null;
		}

		const values = [
			firstValueForKeys(point, ["gml:pos", "pos", "gml:coordinates", "coordinates"]),
			typeof point === "string" ? point : ""
		].concat(collectValuesForKeys(point, ["gml:pos", "pos", "gml:coordinates", "coordinates"]));
		const coordinates = values.map(coordinatePairsFromText).filter(value => value.length)[0] || [];
		const coordinate = transformCoordinateToRD(coordinates[0], srsNameOf(point));

		return coordinate ? new ol.geom.Point(coordinate) : null;
	};

	const polygonCandidatesFrom = geometry => {
		const candidates = [];

		arrX(firstValueForKeys(geometry, ["gml:Polygon", "Polygon"])).forEach(value => candidates.push(value));
		arrX(firstValueForKeys(geometry, ["gml:MultiSurface", "MultiSurface"])).forEach(multiSurface => {
			arrX(firstValueForKeys(multiSurface, ["gml:surfaceMember", "surfaceMember"])).forEach(member => {
				arrX(firstValueForKeys(member, ["gml:Polygon", "Polygon"]) || member).forEach(value => candidates.push(value));
			});
		});
		if(!candidates.length && geometry && typeof geometry === "object" && /Polygon/.test(Object.keys(geometry)[0] || "")) {
			candidates.push(geometry);
		}

		return candidates;
	};
	const polygonGeometryFrom = polygon => {
		const source = polygon;
		const candidates = polygonCandidatesFrom(polygon);
		const polygons = candidates.concat(candidates.length ? [] : arrX(polygon))
			.map(polygon => {
				polygon = Array.isArray(polygon) ? polygon[0] : polygon;
				if(!polygon) return null;

				const exterior = firstValueForKeys(polygon, ["gml:exterior", "exterior"]) || polygon;
				const ring = firstValueForKeys(exterior, ["gml:LinearRing", "LinearRing"]) || exterior;
				const posList = firstValueForKeys(ring, ["gml:posList", "posList", "gml:coordinates", "coordinates"]) ||
					collectValuesForKeys(polygon, ["gml:posList", "posList", "gml:coordinates", "coordinates"])[0];
				let coordinates = coordinatePairsFromText(posList || ring);

				if(!coordinates.length) {
					coordinates = collectValuesForKeys(polygon, ["gml:pos", "pos"])
						.map(coordinatePairsFromText)
						.filter(value => value.length === 1)
						.map(value => value[0]);
				}

				coordinates = closeRing(transformCoordinatesToRD(coordinates, srsNameOf(polygon) || srsNameOf(source) || srsNameOf(ring)));
				return coordinates.length ? [coordinates] : null;
			})
			.filter(Boolean);

		if(polygons.length > 1) {
			return new ol.geom.MultiPolygon(polygons);
		}
		return polygons.length ? new ol.geom.Polygon(polygons[0]) : null;
	};

	const geometryOf = obj => {
		if(!obj || typeof obj !== "object") {
			return null;
		}

		return firstValueForKeys(obj, [
			"gml:Point",
			"gml:Polygon",
			"gml:MultiSurface",
			"immetingen:geometry",
			"imsikb0101:geometry",
			"immetingen:geometrie",
			"imsikb0101:geometrie",
			"sam:shape",
			"shape",
			"geometrie",
			"geometry",
			"gml:geometry"
		]) || Object.keys(obj).reduce((ret, key) => ret || (/Point|Polygon|MultiSurface|geometrie|geometry/.test(key) ? obj[key] : null), null);
	};

	const geometryCandidateOf = obj => {
		const geometry = geometryOf(obj);
		const candidates = arrX(geometry);

		return candidates[0] || obj;
	};

	const openLayersGeometryFrom = obj => {
		const geometry = geometryCandidateOf(obj);

		if(!geometry || typeof geometry !== "object") {
			return null;
		}

		if(geometry instanceof ol.geom.Geometry) {
			return geometry;
		}

		const point = firstValueForKeys(geometry, ["gml:Point", "Point"]) || (/Point/.test(Object.keys(geometry)[0] || "") ? geometry : null);
		if(point) {
			return pointGeometryFrom(point);
		}

		const polygon = firstValueForKeys(geometry, ["gml:Polygon", "Polygon"]) || (/Polygon/.test(Object.keys(geometry)[0] || "") ? geometry : null);
		if(polygon) {
			return polygonGeometryFrom(polygon);
		}

		const multiSurface = firstValueForKeys(geometry, ["gml:MultiSurface", "MultiSurface"]);
		if(multiSurface) {
			return polygonGeometryFrom(geometry);
		}

		if(firstValueForKeys(geometry, ["gml:pos", "pos"])) {
			return pointGeometryFrom(geometry);
		}
		if(firstValueForKeys(geometry, ["gml:posList", "posList"])) {
			return polygonGeometryFrom(geometry);
		}

		return null;
	};

	const createGeometryCache = () => typeof WeakMap !== "undefined" ? new WeakMap() : {
		keys: [],
		values: [],
		get: function(key) {
			const index = this.keys.indexOf(key);
			return index !== -1 ? this.values[index] : undefined;
		},
		set: function(key, value) {
			const index = this.keys.indexOf(key);
			if(index === -1) {
				this.keys.push(key);
				this.values.push(value);
			} else {
				this.values[index] = value;
			}
		}
	};

	const cachedOpenLayersGeometryFrom = (context, obj) => {
		context = context || {};
		context.geometryCache = context.geometryCache || createGeometryCache();

		if(obj && typeof obj === "object") {
			const cached = context.geometryCache.get(obj);
			if(cached !== undefined) {
				return cached;
			}
			const geometry = openLayersGeometryFrom(obj);
			context.geometryCache.set(obj, geometry || null);
			return geometry;
		}

		return openLayersGeometryFrom(obj);
	};

	return {
		TARGET_PROJECTION,
		arrX,
		textOf,
		coordinatePairsFromText,
		closeRing,
		srsNameOf,
		geometryOf,
		pointGeometryFrom,
		polygonGeometryFrom,
		openLayersGeometryFrom,
		createGeometryCache,
		cachedOpenLayersGeometryFrom,
		transformCoordinateToRD,
		transformCoordinatesToRD
	};
});

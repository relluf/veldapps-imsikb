define(function(require) {
	const Common = require("./ol/layers/common");
	const Geometry = require("./ol/geometry");
	const guessSikbEntity = require("./guess");

	const arrX = Common.arrX;
	const textOf = Common.textOf;
	const normalizedReference = Common.normalizedReference;
	const collectObjectsForKeys = Common.collectObjectsForKeys;
	const collectValuesForKeys = Common.collectValuesForKeys;
	const featureNameOf = Common.featureNameOf;
	const idKeysOf = Common.idKeysOf;
	const indexObjects = Common.indexObjects;
	const upperDepthOf = Common.upperDepthOf;
	const lowerDepthOf = Common.lowerDepthOf;
	const depthOf = Common.depthOf;
	const openLayersGeometryFrom = Geometry.openLayersGeometryFrom;
	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;
	const sf = (format, ...args) => typeof js !== "undefined" && js.sf ? js.sf(format, ...args) : format.replace(/%[sd]/g, () => args.shift());

	const BODEMSOORT_PATTERN_BY_ID = {
		1: "sand", 2: "sand", 3: "sand", 4: "sand", 5: "sand", 35: "sand", 44: "sand",
		6: "clay", 7: "clay", 8: "clay", 9: "clay", 10: "clay", 11: "clay", 12: "clay", 36: "clay", 42: "clay",
		13: "silt", 14: "silt", 25: "silt", 26: "silt", 27: "silt", 28: "silt", 29: "silt", 30: "silt", 31: "silt", 32: "silt", 33: "silt", 34: "silt", 37: "silt", 43: "silt",
		15: "peat", 16: "peat", 17: "peat", 18: "peat", 19: "peat", 38: "peat", 41: "peat",
		20: "gravel", 21: "gravel", 22: "gravel", 23: "gravel", 24: "gravel", 39: "gravel", 40: "gravel"
	};
	const LEGACY_SIKB9_GRONDSOORT = {
		1: { label: "grind", pattern: "gravel" },
		2: { label: "zand", pattern: "sand" },
		3: { label: "leem", pattern: "silt" },
		4: { label: "klei", pattern: "clay" },
		5: { label: "veen", pattern: "peat" },
		6: { label: "slib", pattern: "silt" },
		7: { label: "puin", pattern: "gravel" },
		8: { label: "water", pattern: "" }
	};
	const LEGACY_SIKB9_AANDEEL = {
		1: "geen",
		2: "zwak",
		3: "matig",
		4: "sterk",
		5: "uiterst"
	};
	const GUESSED_ENTITY_ALIASES = {
		Afwerking: "Finishing",
		Analysemonster: "Sample",
		Analyseresultaat: "Analysis",
		Bodemlaag: "Layer",
		Bodemmonster: "Sample",
		Meetpunt: "Borehole",
		Onderzoek: "Project"
	};
	const PROFILE_CODE_COLLATOR = typeof Intl !== "undefined" && Intl.Collator ?
		new Intl.Collator("nl-NL", { numeric: true, sensitivity: "base" }) : null;

	function naturalProfileCode(value) {
		return String(value || "").trim().replace(/\s+/g, " ");
	}
	function compareNaturalProfileCodes(left, right) {
		const a = naturalProfileCode(left);
		const b = naturalProfileCode(right);
		const result = PROFILE_CODE_COLLATOR ? PROFILE_CODE_COLLATOR.compare(a, b) : a.localeCompare(b);
		return result || a.localeCompare(b) || (String(left || "").length - String(right || "").length);
	}
	function compareBoreholeProfiles(left, right) {
		return compareNaturalProfileCodes(left.name, right.name) ||
			((left.sortIndex || 0) - (right.sortIndex || 0));
	}
	function dateFilterValueOf(value) {
		const text = textOf(value) || normalizedReference(value);
		const match = String(text || "").match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
		return match ? match[0].replace(/\//g, "-").replace(/-(\d)(?=-|$)/g, "-0$1") : "";
	}
	function objectDateFilterValueOf(obj, keys) {
		return keys.map(key => dateFilterValueOf(get(key, obj))).filter(Boolean)[0] || "";
	}
	function pushUnique(values, value) {
		value && values.indexOf(value) === -1 && values.push(value);
		return value;
	}
	function objectKeyOf(obj, fallback) {
		return idKeysOf(obj)[0] || featureNameOf(obj, fallback || "") || fallback || "";
	}
	function cachedIdKeysOf(context, obj) {
		if(!obj || typeof obj !== "object") return [];
		if(context && context.idKeysCache) {
			let keys = context.idKeysCache.get(obj);
			if(keys === undefined) {
				keys = idKeysOf(obj);
				context.idKeysCache.set(obj, keys);
			}
			return keys;
		}
		return idKeysOf(obj);
	}
	function cachedObjectKeyOf(context, obj, fallback) {
		return cachedIdKeysOf(context, obj)[0] || featureNameOf(obj, fallback || "") || fallback || "";
	}
	function guessedSikbEntityTypeOf(obj) {
		if(!obj || typeof obj !== "object") return "";
		const guessed = guessSikbEntity(obj);
		return GUESSED_ENTITY_ALIASES[guessed] || guessed || "";
	}
	function objectTypeOf(obj, fallback) {
		const name = obj && Object.keys(obj).filter(key => /:(?:Layer|Finishing|Filter|Sample|Borehole|Trench|Characteristic|Analysis)$/.test(key))[0];
		if(name) return name.split(":").pop();
		const guessed = guessedSikbEntityTypeOf(obj);
		if(guessed) return guessed;
		if(obj && (get("immetingen:indicator", obj) || get("indicator", obj))) return "Characteristic";
		if(obj && (get("imsikb0101:finishingType", obj) || get("finishingType", obj))) return "Finishing";
		if(obj && (get("imsikb0101:filtertubeMaterial", obj) || get("filtertubeMaterial", obj) ||
			get("imsikb0101:filtertubeDiameter", obj) || get("filtertubeDiameter", obj))) return "Filter";
		if(obj && (get("imsikb0101:layerType", obj) || get("layerType", obj))) return "Layer";
		return fallback;
	}
	function cachedObjectTypeOf(context, obj, fallback) {
		if(!obj || typeof obj !== "object") return fallback;
		if(context && context.objectTypeCache) {
			let type = context.objectTypeCache.get(obj);
			if(type === undefined) {
				type = objectTypeOf(obj, fallback);
				context.objectTypeCache.set(obj, type);
			}
			return type || fallback;
		}
		return objectTypeOf(obj, fallback);
	}
	function labelFromValue(value) {
		const text = textOf(value) || normalizedReference(value);
		return String(text || "").replace(new RegExp("^.*[:/#]([^:/#]+)$", "g"), "$1");
	}
	function depthValueFor(obj, keys) {
		return keys.map(key => get(key, obj))
			.filter(value => value !== undefined && value !== null && (typeof value === "object" || textOf(value) !== ""))[0];
	}
	function rawLabelOf(obj, keys) {
		return labelFromValue(depthValueFor(obj, keys));
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
		return rawLabelOf(obj, ["imsikb0101:layerType", "layerType"]);
	}
	function finishingLabelOf(obj) {
		const type = rawLabelOf(obj, ["imsikb0101:finishingType", "finishingType"]);
		const material = rawLabelOf(obj, ["imsikb0101:finishingMaterial", "finishingMaterial"]);
		return [type, material].filter(Boolean).join(" / ");
	}
	function filterLabelOf(obj) {
		return [
			rawLabelOf(obj, ["imsikb0101:filtertubeMaterial", "filtertubeMaterial"]),
			rawLabelOf(obj, ["imsikb0101:filtertubeDiameter", "filtertubeDiameter"])
		].filter(Boolean).join(" / ");
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
	function characteristicResultLabelOf(characteristic) {
		return labelFromValue(characteristicResultValueOf(characteristic));
	}
	function characteristicLabelOf(characteristic) {
		const indicator = labelFromValue(characteristicIndicatorValueOf(characteristic));
		const result = characteristicResultLabelOf(characteristic);
		const remarks = textOf(get("immetingen:remarks", characteristic) || get("remarks", characteristic));
		return [indicator, result || remarks].filter(Boolean).join(": ");
	}
	function relationRoleOf(relation) {
		const value = get("sam:role", relation) ||
			get("role", relation) ||
			get("sam:SamplingFeatureComplex.sam:role", relation) ||
			get("SamplingFeatureComplex.role", relation);
		return textOf(value) || normalizedReference(value);
	}
	function isBoreholeRelation(relation) {
		return /RelatedSamplingFeatureRollen:id:6(?:\b|$)|InBorehole|urn:6/i.test(relationRoleOf(relation));
	}
	function isReverseSampleRelation(relation) {
		return /RelatedSamplingFeatureRollen:id:9(?:\b|$)|InMengMonster|urn:9/i.test(relationRoleOf(relation));
	}
	function relationEntriesOf(obj) {
		return arrX(get("sam:relatedSamplingFeature", obj)).concat(arrX(get("relatedSamplingFeature", obj)));
	}
	function relationTargetsOf(relation) {
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
	}
	function resolveRelationTargets(obj, index, predicate) {
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
	}
	function collectSampleObjects(xml) {
		return Common.modelOfResult(xml).collectType("samples");
	}
	function resolveSampleBoreholes(sample, sampleIndex, boreholeIndex, seen, depth) {
		const pairs = [];
		seen = seen || [];
		depth = depth || 0;
		const sampleKey = objectKeyOf(sample);
		if(!sample || depth > 12 || seen.indexOf(sampleKey) !== -1) return pairs;
		seen = seen.concat([sampleKey]);
		relationEntriesOf(sample).forEach(relation => {
			if(isBoreholeRelation(relation)) {
				resolveRelationTargets(sample, boreholeIndex, rel => rel === relation)
					.forEach(borehole => pairs.push({ sample: sample, borehole: borehole }));
				return;
			}
			if(isReverseSampleRelation(relation)) return;
			resolveRelationTargets(sample, sampleIndex, rel => rel === relation)
				.forEach(relatedSample => {
					resolveSampleBoreholes(relatedSample, sampleIndex, boreholeIndex, seen, depth + 1)
						.forEach(pair => pairs.push(pair));
				});
		});
		return pairs;
	}
	function xlinkResolvedTargetsOf(obj) {
		const values = [];
		const pushValue = value => arrX(value).forEach(item => values.push(item));
		if(obj && typeof obj === "object") {
			pushValue(obj["@_xlink:href-resolved"]);
			pushValue(obj["@xlink:href-resolved"]);
			pushValue(obj["xlink:href-resolved"]);
		}
		return values.filter(value => value !== undefined && value !== null);
	}
	function featureOfInterestTargetsOf(analysis, sampleIndex) {
		const targets = [];
		arrX(get("om:featureOfInterest", analysis))
			.concat(arrX(get("featureOfInterest", analysis)))
			.forEach(featureOfInterest => {
				if(featureOfInterest && typeof featureOfInterest === "object") {
					xlinkResolvedTargetsOf(featureOfInterest).forEach(target => targets.push(target));
				}
				const ref = normalizedReference(featureOfInterest);
				if(ref) {
					const target = sampleIndex[ref] || sampleIndex["#" + ref];
					target && targets.push(target);
				}
				if(featureOfInterest && typeof featureOfInterest === "object" && idKeysOf(featureOfInterest).length) {
					targets.push(featureOfInterest);
				}
			});
		return targets;
	}
	function relatedObservationEntriesOf(obj) {
		return arrX(get("sam:relatedObservation", obj)).concat(arrX(get("relatedObservation", obj)));
	}
	function relatedObservationLabelOf(relatedObservation) {
		const label = relatedObservation && typeof js !== "undefined" && js.nameOf instanceof Function && js.nameOf(relatedObservation);
		return label && label !== "[object Object]" ? String(label) : "";
	}
	function relatedObservationLabelsFor(obj) {
		return relatedObservationEntriesOf(obj)
			.map(relatedObservationLabelOf)
			.filter(Boolean)
			.filter((label, index, arr) => arr.indexOf(label) === index);
	}
	function resolveObservationTargets(obj, index) {
		const targets = [];
		relatedObservationEntriesOf(obj).forEach(value => {
			xlinkResolvedTargetsOf(value).forEach(target => targets.push(target));
			const ref = normalizedReference(value);
			const target = ref && (index[ref] || index["#" + ref] || index["_" + ref.replace(/^_/, "")]);
			target && targets.push(target);
			if(value && typeof value === "object" && idKeysOf(value).length) targets.push(value);
		});
		return targets.filter((target, index, arr) => target && arr.indexOf(target) === index);
	}
	function referenceKeysForValue(context, value) {
		const keys = [];
		const add = key => {
			if(key && keys.indexOf(key) === -1) keys.push(key);
			if(key && key[0] !== "#" && keys.indexOf("#" + key) === -1) keys.push("#" + key);
		};
		if(value && typeof value === "object") {
			xlinkResolvedTargetsOf(value).forEach(target => cachedIdKeysOf(context, target).forEach(add));
			cachedIdKeysOf(context, value).forEach(add);
		}
		add(normalizedReference(value));
		return keys;
	}
	function addByReferenceKey(map, key, value) {
		if(!key) return;
		const values = map[key] || (map[key] = []);
		values.indexOf(value) === -1 && values.push(value);
	}
	function collectByReferenceKeys(context, map, values) {
		const targets = [];
		values.forEach(value => referenceKeysForValue(context, value).forEach(key => {
			(map[key] || []).forEach(target => targets.indexOf(target) === -1 && targets.push(target));
		}));
		return targets;
	}
	function resolveCharacteristicTargets(obj, objectIndex, context) {
		if(context) {
			let targets = context.characteristicTargetsCache.get(obj);
			if(targets !== undefined) return targets;
			targets = [];
			resolveObservationTargets(obj, objectIndex)
				.forEach(target => targets.indexOf(target) === -1 && targets.push(target));
			collectByReferenceKeys(context, context.characteristicsByTargetKey, [obj])
				.forEach(target => targets.indexOf(target) === -1 && targets.push(target));
			context.characteristicTargetsCache.set(obj, targets);
			return targets;
		}
		return resolveObservationTargets(obj, objectIndex)
			.filter((target, index, arr) => target && arr.indexOf(target) === index);
	}
	function characteristicLabelsFor(obj, objectIndex, context) {
		if(context) {
			let labels = context.characteristicLabelsCache.get(obj);
			if(labels !== undefined) return labels;
			labels = relatedObservationLabelsFor(obj);
			if(!labels.length) labels = resolveCharacteristicTargets(obj, objectIndex, context)
				.filter(target => cachedObjectTypeOf(context, target, "") === "Characteristic")
				.map(characteristicLabelOf)
				.filter(Boolean)
				.filter((label, index, arr) => arr.indexOf(label) === index);
			context.characteristicLabelsCache.set(obj, labels);
			return labels;
		}
		return relatedObservationLabelsFor(obj);
	}
	function domainIdOf(value, domainName) {
		const text = textOf(value) || normalizedReference(value);
		const match = String(text).match(new RegExp(domainName + ":id:(\\d+)", "i"));
		return match ? parseInt(match[1], 10) : null;
	}
	function soilPatternKeyFromText(value) {
		const text = String(value || "").toLowerCase();
		if(/bodemsoort:id:(?:20|21|22|23|24|39|40)(?:\b|$)|\bgr(?:ind|avel)?\b|grind/.test(text)) return "gravel";
		if(/bodemsoort:id:(?:1|2|3|4|5|35|44)(?:\b|$)|\bsa\b|\bz(?:and|andig)?\b|sand|zand/.test(text)) return "sand";
		if(/bodemsoort:id:(?:6|7|8|9|10|11|12|36|42)(?:\b|$)|\bcl\b|\bk(?:lei|leiig)?\b|clay|klei/.test(text)) return "clay";
		if(/bodemsoort:id:(?:15|16|17|18|19|38|41)(?:\b|$)|\b(pe|hu|de|li|gy)\b|veen|peat|humus|humeus|ligniet|gyttja|detritus/.test(text)) return "peat";
		if(/bodemsoort:id:(?:13|14|25|26|27|28|29|30|31|32|33|34|37|43)(?:\b|$)|\bsi\b|\bl(?:eem|eemig)?\b|silt|slib|leem/.test(text)) return "silt";
		return "";
	}
	function soilPatternKeyFromRelatedObservationLabels(labels) {
		return labels.map(label => {
			const text = String(label || "");
			if(!/grondsoort/i.test(text)) return "";
			const urns = (text.match(/urn:(\d+)/gi) || [])
				.map(value => parseInt(value.replace(/\D/g, ""), 10))
				.filter(value => isFinite(value));
			const urnPattern = urns.length && BODEMSOORT_PATTERN_BY_ID[urns[urns.length - 1]];
			if(urnPattern) return urnPattern;
			const result = text.replace(/^.*\):\s*/, "").trim();
			if(/^(?:z|zs|za|zand)/i.test(result)) return "sand";
			if(/^(?:k|ks|klei)/i.test(result)) return "clay";
			if(/^(?:v|veen)/i.test(result)) return "peat";
			if(/^(?:g|grind)/i.test(result)) return "gravel";
			if(/^(?:l|s|leem|slib|silt)/i.test(result)) return "silt";
			return soilPatternKeyFromText(result);
		}).filter(Boolean)[0] || "";
	}
	function soilPatternKeyForLayer(layer, objectIndex, context) {
		if(context) {
			let pattern = context.soilPatternCache.get(layer);
			if(pattern !== undefined) return pattern;
			const characteristics = resolveCharacteristicTargets(layer, objectIndex, context)
				.filter(target => cachedObjectTypeOf(context, target, "") === "Characteristic");
			const bodemsoort = characteristics.map(characteristic => {
				const indicatorId = domainIdOf(characteristicIndicatorValueOf(characteristic), "KenmerkBodemlaag");
				const bodemsoortId = domainIdOf(characteristicResultValueOf(characteristic), "Bodemsoort");
				return indicatorId === 11 && bodemsoortId ? BODEMSOORT_PATTERN_BY_ID[bodemsoortId] : "";
			}).filter(Boolean)[0];
			pattern = bodemsoort ||
				soilPatternKeyFromRelatedObservationLabels(relatedObservationLabelsFor(layer)) ||
				soilPatternKeyFromText(materialLabelOf(layer)) ||
				soilPatternKeyFromText(layerTypeLabelOf(layer)) ||
				soilPatternKeyFromText(characteristics.map(characteristic => [
					textOf(characteristicIndicatorValueOf(characteristic)) || normalizedReference(characteristicIndicatorValueOf(characteristic)),
					textOf(characteristicResultValueOf(characteristic)) || normalizedReference(characteristicResultValueOf(characteristic)),
					textOf(get("immetingen:remarks", characteristic) || get("remarks", characteristic))
				].join(" ")).join(" "));
			context.soilPatternCache.set(layer, pattern);
			return pattern;
		}
		return soilPatternKeyFromText(materialLabelOf(layer)) || soilPatternKeyFromText(layerTypeLabelOf(layer));
	}
	function intervalKindForRole(role) {
		if(/RelatedSamplingFeatureRollen:id:2(?:\b|$)|HeeftLaag|urn:2(?:\b|$)/i.test(role)) return "Laag";
		if(/RelatedSamplingFeatureRollen:id:3(?:\b|$)|HeeftAfwerking|urn:3(?:\b|$)/i.test(role)) return "Afwerking";
		if(/RelatedSamplingFeatureRollen:id:5(?:\b|$)|HeeftFilter|urn:5(?:\b|$)/i.test(role)) return "Filter";
		if(/RelatedSamplingFeatureRollen:id:1(?:\b|$)|HeeftMonster|urn:1(?:\b|$)/i.test(role)) return "Monster";
		return labelFromValue(role) || "Interval";
	}
	function intervalKindForTarget(target, fallbackKind) {
		const type = objectTypeOf(target, "");
		if(type === "Layer") return "Laag";
		if(type === "Finishing") return "Afwerking";
		if(type === "Filter") return "Filter";
		if(type === "Sample") return "Monster";
		return fallbackKind || type || "Interval";
	}
	function intervalLabelOfTarget(target, kind, objectIndex, context) {
		const name = featureNameOf(target, "");
		const details = [];
		if(kind === "Laag") {
			details.push(layerTypeLabelOf(target));
			characteristicLabelsFor(target, objectIndex, context).slice(0, 4).forEach(label => details.push(label));
		} else if(kind === "Afwerking") {
			details.push(finishingLabelOf(target));
		} else if(kind === "Filter") {
			details.push(filterLabelOf(target));
		} else {
			details.push(materialLabelOf(target));
		}
		return [name].concat(details.filter(Boolean)).filter(Boolean).join(" - ") || kind;
	}
	function intervalOfTarget(target, relation, fallbackKind, objectIndex, context) {
		let upper = upperDepthOf(target);
		let lower = lowerDepthOf(target);
		const depth = depthOf(target);
		if(lower === null && depth !== null) {
			upper = upper || 0;
			lower = depth;
		}
		if(upper === null || lower === null || lower <= upper) return null;
		const role = relation ? relationRoleOf(relation) : "";
		const kind = intervalKindForTarget(target, fallbackKind || intervalKindForRole(role));
		const material = materialLabelOf(target);
		return {
			target: target,
			upper: upper,
			lower: lower,
			kind: kind,
			material: material,
			soilPattern: kind === "Laag" ? soilPatternKeyForLayer(target, objectIndex, context) : "",
			label: intervalLabelOfTarget(target, kind, objectIndex, context),
			details: characteristicLabelsFor(target, objectIndex, context),
			key: objectKeyOf(target, sf("%s-%s-%s", kind, upper, lower))
		};
	}
	function numberAttr(obj, names) {
		const value = names.map(name => obj && obj[name]).filter(value => value !== undefined && value !== null)[0];
		return value !== undefined ? parseCoordinateNumber(value) : NaN;
	}
	function parseCoordinateNumber(value) {
		if(value === undefined || value === null) return NaN;
		const text = typeof value === "object" ? textOf(value) : value;
		const match = String(text).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
		return match ? parseFloat(match[0]) : NaN;
	}
	function coordinateFromPairValue(value) {
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
	}
	function coordinateFromXY(obj) {
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
	}
	function legacyPointGeometryFrom(obj) {
		const coordinate = coordinateFromXY(obj && (obj.point || obj.Point || obj));
		return coordinate ? true : null;
	}
	function legacyObjectsAt(obj, names) {
		return names.reduce((values, name) => values.concat(arrX(get(name, obj))), []);
	}
	function pushLegacyObject(values, obj) {
		obj && values.indexOf(obj) === -1 && values.push(obj);
		return obj;
	}
	function collectLegacySikbObjects(xml) {
		const objects = { Locatie: [], Onderzoek: [], Meetpunt: [], Analysemonster: [] };
		const bodeminformatie = get("bodeminformatie", xml) || xml;
		const collectMeetpunten = onderzoek => {
			legacyObjectsAt(onderzoek, ["meetpunt", "Meetpunt", "Meetpunten"]).forEach(meetpunt => pushLegacyObject(objects.Meetpunt, meetpunt));
			legacyObjectsAt(onderzoek, ["analysemonster", "Analysemonster", "Analysemonsters"]).forEach(analysemonster => pushLegacyObject(objects.Analysemonster, analysemonster));
		};
		const collectOnderzoeken = locatie => {
			legacyObjectsAt(locatie, ["onderzoek", "Onderzoek", "Onderzoeken"]).forEach(onderzoek => {
				pushLegacyObject(objects.Onderzoek, onderzoek);
				collectMeetpunten(onderzoek);
			});
		};

		legacyObjectsAt(bodeminformatie, ["locatie", "Locatie", "Locaties"]).forEach(locatie => {
			pushLegacyObject(objects.Locatie, locatie);
			collectOnderzoeken(locatie);
		});
		legacyObjectsAt(bodeminformatie, ["onderzoek", "Onderzoek", "Onderzoeken"]).forEach(onderzoek => {
			pushLegacyObject(objects.Onderzoek, onderzoek);
			collectMeetpunten(onderzoek);
		});
		legacyObjectsAt(bodeminformatie, ["meetpunt", "Meetpunt", "Meetpunten"]).forEach(meetpunt => pushLegacyObject(objects.Meetpunt, meetpunt));
		legacyObjectsAt(bodeminformatie, ["analysemonster", "Analysemonster", "Analysemonsters"]).forEach(analysemonster => pushLegacyObject(objects.Analysemonster, analysemonster));
		return objects;
	}
	function legacyAttribute(obj, name) {
		return obj && (obj["@_" + name] !== undefined ? obj["@_" + name] :
			(obj["@" + name] !== undefined ? obj["@" + name] : obj[name]));
	}
	function legacyText(obj, names) {
		return names.map(name => {
			const value = legacyAttribute(obj, name);
			return textOf(value) || (value !== undefined && value !== null && typeof value !== "object" ? "" + value : "");
		}).filter(Boolean)[0] || "";
	}
	function legacyChildren(obj, names) {
		return names.reduce((children, name) => children.concat(arrX(get(name, obj))), []);
	}
	function legacySikbVersionOf(xml) {
		return get("bodeminformatie.metainformatie.@_versie", xml) ||
			get("bodeminformatie.metainformatie.@versie", xml) ||
			get("metainformatie.@_versie", xml) ||
			get("metainformatie.@versie", xml);
	}
	function parseLegacyDepthCm(value) {
		if(value === undefined || value === null || value === "") return null;
		let depth = value;
		if(value && typeof value === "object") depth = legacyAttribute(value, "diepte");
		const text = textOf(depth) || (depth !== undefined && depth !== null ? "" + depth : "");
		const match = String(text).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
		if(!match) return null;
		const number = parseFloat(match[0]);
		return isFinite(number) ? number * 100 : null;
	}
	function legacyUpperDepthOf(obj) {
		return parseLegacyDepthCm(get("bovenkant", obj) || get("van", obj));
	}
	function legacyLowerDepthOf(obj) {
		return parseLegacyDepthCm(get("onderkant", obj) || get("tot", obj));
	}
	function legacyDepthOf(obj) {
		return parseLegacyDepthCm(get("einddiepte", obj) || get("diepte", obj));
	}
	function legacyCodeLabel(obj, fallback) {
		return legacyText(obj, ["code", "naam", "id"]) || fallback || "";
	}
	function legacyDomainLabel(map, value, fallbackPrefix) {
		const text = textOf(value) || (value !== undefined && value !== null ? "" + value : "");
		const key = parseInt(text, 10);
		const item = map[key];
		return item && item.label ? item.label : (item || (text ? (fallbackPrefix ? fallbackPrefix + " " + text : text) : ""));
	}
	function legacySoilTypeOf(layer) {
		const value = legacyAttribute(layer, "grondsoort");
		const key = parseInt(value, 10);
		const mapped = LEGACY_SIKB9_GRONDSOORT[key];
		const raw = textOf(value) || (value !== undefined && value !== null ? "" + value : "");
		const label = mapped ? mapped.label : raw;
		const pattern = mapped ? mapped.pattern : soilPatternKeyFromText(raw);
		return { label: label, pattern: pattern };
	}
	function legacyComponentLabel(layer, attribute, label) {
		const value = legacyAttribute(layer, attribute);
		const amount = legacyDomainLabel(LEGACY_SIKB9_AANDEEL, value, "");
		return amount && amount !== "geen" ? amount + " " + label : "";
	}
	function legacyLayerDescription(layer) {
		const soil = legacySoilTypeOf(layer);
		const parts = [
			soil.label,
			legacyComponentLabel(layer, "aandeelgrind", "grind"),
			legacyComponentLabel(layer, "aandeellutum", "lutum"),
			legacyComponentLabel(layer, "aandeelhumus", "humus"),
			legacyText(layer, ["opmerking"])
		].filter(Boolean);
		return parts.join(", ") || "bodemlaag";
	}
	function legacyFilterLabel(filter) {
		return [
			legacyCodeLabel(filter, "filter"),
			legacyText(filter, ["materiaalpb"]),
			legacyText(filter, ["diameterpb"]) ? legacyText(filter, ["diameterpb"]) + " mm" : "",
			legacyText(filter, ["opmerking"])
		].filter(Boolean).join(" - ");
	}
	function legacyFinishingLabel(finishing) {
		return [
			legacyText(finishing, ["aanvullingsoort"]) ? "aanvulling " + legacyText(finishing, ["aanvullingsoort"]) : "",
			legacyText(finishing, ["afdichtingsoort"]) ? "afdichting " + legacyText(finishing, ["afdichtingsoort"]) : "",
			legacyText(finishing, ["afwerkingsoort"]) ? "afwerking " + legacyText(finishing, ["afwerkingsoort"]) : "",
			legacyText(finishing, ["opmerking"])
		].filter(Boolean).join(" - ") || "afwerking";
	}
	function legacySampleLabel(sample, fallback) {
		const fieldSample = arrX(get("veldmonster", sample))[0];
		return legacyCodeLabel(sample, "") ||
			(fieldSample && legacyCodeLabel(fieldSample, "")) ||
			legacyText(sample, ["opmerking"]) ||
			fallback ||
			"monster";
	}
	function legacyIntervalOfTarget(target, kind, index) {
		let upper = legacyUpperDepthOf(target);
		let lower = legacyLowerDepthOf(target);
		if((upper === null || lower === null) && kind === "Monster") {
			const fieldSample = arrX(get("veldmonster", target))[0];
			upper = upper !== null ? upper : legacyUpperDepthOf(fieldSample);
			lower = lower !== null ? lower : legacyLowerDepthOf(fieldSample);
		}
		if(upper === null || lower === null || lower <= upper) return null;
		const soil = kind === "Laag" ? legacySoilTypeOf(target) : { label: "", pattern: "" };
		const label = kind === "Laag" ? legacyLayerDescription(target) :
			(kind === "Filter" ? legacyFilterLabel(target) :
				(kind === "Afwerking" ? legacyFinishingLabel(target) : legacySampleLabel(target, "monster " + (index + 1))));
		return {
			target: target,
			upper: upper,
			lower: lower,
			kind: kind,
			material: kind === "Laag" ? soil.label : label,
			soilPattern: kind === "Laag" ? soil.pattern : "",
			label: label,
			details: [label].filter(Boolean),
			key: legacyCodeLabel(target, sf("%s-%s-%s-%s", kind, upper, lower, index))
		};
	}
	function collectLegacySikbPreview(result) {
		const started = Date.now();
		const xml = Common.rawXmlOfResult(result);
		if(!xml) return { profiles: [], context: null };
		const legacy = collectLegacySikbObjects(xml);
		const objects = {
			boreholes: legacy.Meetpunt,
			projects: [],
			layers: [],
			finishings: [],
			filters: [],
			samples: [],
			waterSamples: [],
			analyses: legacy.Analysemonster || [],
			characteristics: [],
			testingConclusions: []
		};
		const profiles = legacy.Meetpunt.map((meetpunt, index) => {
			const layers = legacyChildren(meetpunt, ["bodemlaag"]);
			const filters = legacyChildren(meetpunt, ["filter"]);
			const finishings = legacyChildren(meetpunt, ["afwerking", "casing"]);
			const samples = legacyChildren(meetpunt, ["bodemmonster"]);
			const waterSamples = filters.map(filter => legacyChildren(filter, ["veldmonster", "watermonster"])).flat();
			objects.layers = objects.layers.concat(layers);
			objects.filters = objects.filters.concat(filters);
			objects.finishings = objects.finishings.concat(finishings);
			objects.samples = objects.samples.concat(samples);
			objects.waterSamples = objects.waterSamples.concat(waterSamples);
			const intervals = layers.map((layer, layerIndex) => legacyIntervalOfTarget(layer, "Laag", layerIndex))
				.concat(filters.map((filter, filterIndex) => legacyIntervalOfTarget(filter, "Filter", filterIndex)))
				.concat(finishings.map((finishing, finishingIndex) => legacyIntervalOfTarget(finishing, "Afwerking", finishingIndex)))
				.concat(samples.map((sample, sampleIndex) => legacyIntervalOfTarget(sample, "Monster", sampleIndex)))
				.filter(Boolean)
				.sort((a, b) => a.upper - b.upper || a.lower - b.lower || a.kind.localeCompare(b.kind));
			return {
				borehole: meetpunt,
				name: legacyCodeLabel(meetpunt, sf("Meetpunt %d", index + 1)),
				sortIndex: index,
				date: legacyText(meetpunt, ["datum"]),
				startTime: dateFilterValueOf(legacyText(meetpunt, ["datum"])),
				endTime: dateFilterValueOf(legacyText(meetpunt, ["datum"])),
				driller: legacyText(get("boormeester", meetpunt), ["naam"]),
				depth: legacyDepthOf(meetpunt),
				characteristicText: "",
				analysisText: "",
				diagnostics: {
					sampleWithoutRelated: false,
					boreholeWithoutCoordinates: !legacyPointGeometryFrom(meetpunt),
					characteristicWithoutGradation: false
				},
				intervals: intervals
			};
		}).sort(compareBoreholeProfiles);
		const context = {
			legacy: true,
			xml: xml,
			objects: objects,
			profileKind: "Meetpunt"
		};
		const duration = Date.now() - started;
		if(duration > 1000 && typeof console !== "undefined" && console.warn) {
			console.warn("[veldapps-imsikb/profiles] collectLegacySikbPreview", {
				duration: duration,
				meetpunten: profiles.length,
				layers: objects.layers.length,
				filters: objects.filters.length,
				samples: objects.samples.length
			});
		}
		return { profiles: profiles, context: context };
	}
	function collectProfileElementEntries(xml) {
		const model = Common.modelOfResult(xml);

		return model.collectType("layers").map(target => ({ target: target, kind: "Laag" }))
			.concat(model.collectType("finishings").map(target => ({ target: target, kind: "Afwerking" })))
			.concat(model.collectType("filters").map(target => ({ target: target, kind: "Filter" })));
	}
	function collectSikbSharedObjects(xml) {
		return Common.modelOfResult(xml).collectSharedObjects();
	}
	function createSikbObjectContext(result) {
		const started = Date.now();
		const model = Common.modelOfResult(result);
		const xml = model.root;
		if(!xml) return null;
		if(model.objectContext) {
			model.objectContext.timing = model.objectContext.timing || {};
			model.objectContext.timing.cached = true;
			return model.objectContext;
		}
		const collectStarted = Date.now();
		const objects = model.collectSharedObjects();
		const indexStarted = Date.now();
		const objectIndex = model.indexById();
		const context = {
			model: model,
			xml: xml,
			rawXml: model.xml,
			idKeysCache: new WeakMap(),
			objectTypeCache: new WeakMap(),
			openLayersGeometryCache: model.geometryCache,
			objects: objects,
			objectIndex: objectIndex,
			timing: {
				cached: false,
				collectObjects: indexStarted - collectStarted,
				indexObjects: Date.now() - indexStarted,
				total: Date.now() - started,
				counts: {
					identified: objects.identified.length,
					projects: objects.projects.length,
					boreholes: objects.boreholes.length,
					trenches: objects.trenches.length,
					samples: objects.samples.length,
					analyses: objects.analyses.length
				}
			}
		};
		model.objectContext = context;
		if(result && !result.isSikbDocumentModel) result.sikbObjectContext = context;
		return context;
	}
	function indexCharacteristicsByTarget(context) {
		context.objects.characteristics.forEach(characteristic => {
			featureOfInterestTargetsOf(characteristic, context.objectIndex).forEach(value => {
				referenceKeysForValue(context, value).forEach(key =>
					addByReferenceKey(context.characteristicsByTargetKey, key, characteristic));
			});
		});
	}
	function indexAnalysesByTarget(context) {
		context.objects.analyses.forEach(analysis => {
			featureOfInterestTargetsOf(analysis, context.objectIndex).forEach(value => {
				referenceKeysForValue(context, value).forEach(key =>
					addByReferenceKey(context.analysesByTargetKey, key, analysis));
			});
		});
	}
	function ensureAnalysesByTargetIndex(context) {
		if(!context || context.analysesByTargetKey) return;
		const started = Date.now();
		context.analysesByTargetKey = {};
		indexAnalysesByTarget(context);
		context.analysesByTargetTiming = Date.now() - started;
	}
	function indexProfileEntriesByBorehole(context) {
		context.profileElementEntries.forEach(entry => {
			relationEntriesOf(entry.target).forEach(relation => {
				const profileEntry = {
					target: entry.target,
					kind: entry.kind,
					relation: relation
				};
				relationTargetsOf(relation).forEach(value => {
					referenceKeysForValue(context, value).forEach(key =>
						addByReferenceKey(context.profileEntriesByBoreholeKey, key, profileEntry));
				});
			});
		});
	}
	function createSikbPreviewContext(result) {
		const started = Date.now();
		const sharedStarted = Date.now();
		const shared = createSikbObjectContext(result);
		const sharedDuration = Date.now() - sharedStarted;
		if(!shared || !shared.xml) return null;
		const context = {
			xml: shared.xml,
			idKeysCache: shared.idKeysCache,
			objectTypeCache: shared.objectTypeCache,
			characteristicTargetsCache: new WeakMap(),
			characteristicLabelsCache: new WeakMap(),
			objectFilterTextCache: new WeakMap(),
			soilPatternCache: new WeakMap(),
			characteristicsByTargetKey: {},
			analysesByTargetKey: null,
			profileEntriesByBoreholeKey: {},
			samplePairsByBorehole: {},
			objects: shared.objects,
			objectIndex: shared.objectIndex
		};
		context.boreholes = context.objects.boreholes;
		context.profileElementEntries = context.objects.layers.map(target => ({ target: target, kind: "Laag" }))
			.concat(context.objects.finishings.map(target => ({ target: target, kind: "Afwerking" })))
			.concat(context.objects.filters.map(target => ({ target: target, kind: "Filter" })));
		context.sampleObjects = context.objects.samples;
		const indexStarted = Date.now();
		context.sampleIndex = shared.sampleIndex || (shared.sampleIndex = indexObjects(context.sampleObjects));
		context.boreholeIndex = shared.boreholeIndex || (shared.boreholeIndex = indexObjects(context.boreholes));
		const samplePairsStarted = Date.now();
		context.sampleObjects.forEach(sample => {
			resolveSampleBoreholes(sample, context.sampleIndex, context.boreholeIndex).forEach(pair => {
				const key = cachedObjectKeyOf(context, pair.borehole);
				(context.samplePairsByBorehole[key] = context.samplePairsByBorehole[key] || []).push(pair);
			});
		});
		const characteristicStarted = Date.now();
		indexCharacteristicsByTarget(context);
		const profileEntriesStarted = Date.now();
		indexProfileEntriesByBorehole(context);
		context.timing = {
			shared: sharedDuration,
			sharedCached: shared.timing && shared.timing.cached === true,
			sharedContext: shared.timing,
			indexes: samplePairsStarted - indexStarted,
			samplePairs: characteristicStarted - samplePairsStarted,
			characteristics: profileEntriesStarted - characteristicStarted,
			analyses: "deferred",
			profileEntries: Date.now() - profileEntriesStarted,
			total: Date.now() - started
		};
		return context;
	}
	function createSikbSingleProfileContext(result) {
		const started = Date.now();
		const sharedStarted = Date.now();
		const shared = createSikbObjectContext(result);
		const sharedDuration = Date.now() - sharedStarted;
		if(!shared || !shared.xml) return null;
		const profileEntriesStarted = Date.now();
		const profileElementEntries = shared.profileElementEntries || (shared.profileElementEntries =
			shared.objects.layers.map(target => ({ target: target, kind: "Laag" }))
				.concat(shared.objects.finishings.map(target => ({ target: target, kind: "Afwerking" })))
				.concat(shared.objects.filters.map(target => ({ target: target, kind: "Filter" }))));
		const sampleIndexStarted = Date.now();
		const sampleIndex = shared.sampleIndex || (shared.sampleIndex = indexObjects(shared.objects.samples));
		const context = {
			xml: shared.xml,
			idKeysCache: shared.idKeysCache,
			objectTypeCache: shared.objectTypeCache,
			characteristicTargetsCache: new WeakMap(),
			characteristicLabelsCache: new WeakMap(),
			objectFilterTextCache: new WeakMap(),
			soilPatternCache: new WeakMap(),
			characteristicsByTargetKey: {},
			analysesByTargetKey: null,
			objects: shared.objects,
			objectIndex: shared.objectIndex,
			boreholes: shared.objects.boreholes,
			profileElementEntries: profileElementEntries,
			sampleObjects: shared.objects.samples,
			sampleIndex: sampleIndex,
			timing: {
				shared: sharedDuration,
				sharedCached: shared.timing && shared.timing.cached === true,
				profileElementEntries: sampleIndexStarted - profileEntriesStarted,
				sampleIndex: Date.now() - sampleIndexStarted,
				total: Date.now() - started
			}
		};
		return context;
	}
	function relationTargetsObject(relation, target, context) {
		return relationTargetsOf(relation).some(value => {
			if(value === target) return true;
			const ref = normalizedReference(value);
			const keys = cachedIdKeysOf(context, target);
			return ref && (keys.indexOf(ref) !== -1 || keys.indexOf("#" + ref) !== -1);
		});
	}
	function collectBoreholeProfileIntervals(borehole, xml, objectIndex, context) {
		const intervals = [];
		const intervalKeys = {};
		context = context || {};
		objectIndex = objectIndex || context.objectIndex;
		const addInterval = interval => {
			if(!interval) return;
			const key = interval.key + "/" + interval.kind + "/" + interval.upper + "/" + interval.lower;
			if(intervalKeys[key]) return;
			intervalKeys[key] = true;
			intervals.push(interval);
		};
		relationEntriesOf(borehole).forEach(relation => {
			const role = relationRoleOf(relation);
			const kind = intervalKindForRole(role);
			resolveRelationTargets(borehole, objectIndex, rel => rel === relation)
				.forEach(target => addInterval(intervalOfTarget(target, relation, kind, objectIndex, context)));
		});
		if(context.profileEntriesByBoreholeKey) {
			const entries = [];
			cachedIdKeysOf(context, borehole).forEach(key => {
				(context.profileEntriesByBoreholeKey[key] || [])
					.forEach(entry => entries.indexOf(entry) === -1 && entries.push(entry));
			});
			entries.forEach(entry => addInterval(intervalOfTarget(entry.target, entry.relation, entry.kind, objectIndex, context)));
		} else {
			(context.profileElementEntries || collectProfileElementEntries(xml)).forEach(entry => {
				relationEntriesOf(entry.target).forEach(relation => {
					if(relationTargetsObject(relation, borehole, context)) {
						addInterval(intervalOfTarget(entry.target, relation, entry.kind, objectIndex, context));
					}
				});
			});
		}
		if(context.samplePairsByBorehole) {
			(context.samplePairsByBorehole[cachedObjectKeyOf(context, borehole)] || [])
				.forEach(pair => addInterval(intervalOfTarget(pair.sample, null, "Monster", objectIndex, context)));
		} else {
			const sampleObjects = context.sampleObjects || collectSampleObjects(xml);
			const sampleIndex = context.sampleIndex || indexObjects(sampleObjects);
			const boreholeIndex = indexObjects([borehole]);
			sampleObjects.forEach(sample => {
				resolveSampleBoreholes(sample, sampleIndex, boreholeIndex)
					.forEach(pair => pair.borehole === borehole && addInterval(intervalOfTarget(sample, null, "Monster", objectIndex, context)));
			});
		}
		return intervals.sort((a, b) => a.upper - b.upper || a.lower - b.lower || a.kind.localeCompare(b.kind));
	}
	function collectBoreholeProfiles(result) {
		const started = Date.now();
		const timeline = [];
		const addTimingStep = (name, stepStarted) => {
			const ended = Date.now();
			const step = {
				name: name,
				at: stepStarted - started,
				end: ended - started,
				duration: ended - stepStarted
			};
			timeline.push(step);
			return step.duration;
		};
		const xml = Common.rawXmlOfResult(result);
		const version = sikbVersionOf(result || {}, xml);
		if(legacySikbVersionOf(xml) || (!isNaN(version) && version <= 10)) {
			return collectLegacySikbPreview(result);
		}
		const contextStarted = Date.now();
		const context = createSikbPreviewContext(result);
		addTimingStep("context", contextStarted);
		const contextXml = context && context.xml;
		if(!contextXml) return { profiles: [], context: null };
		const profilesStarted = Date.now();
		const profileParts = {
			intervals: 0,
			meta: 0,
			characteristicText: 0,
			analysisText: 0,
			diagnostics: 0,
			sort: 0
		};
		const profiles = context.boreholes.map((borehole, index) => {
			let partStarted = Date.now();
			const intervals = collectBoreholeProfileIntervals(borehole, contextXml, context.objectIndex, context);
			profileParts.intervals += Date.now() - partStarted;
			partStarted = Date.now();
			const name = featureNameOf(borehole, sf("Borehole %d", index + 1));
			const startTime = objectDateFilterValueOf(borehole, ["immetingen:startTime", "imsikb0101:startTime", "startTime"]);
			const endTime = objectDateFilterValueOf(borehole, ["immetingen:endTime", "imsikb0101:endTime", "endTime"]);
			const depth = depthOf(borehole);
			profileParts.meta += Date.now() - partStarted;
			return {
				borehole: borehole,
				name: name,
				sortIndex: index,
				startTime: startTime,
				endTime: endTime,
				depth: depth,
				characteristicText: undefined,
				analysisText: undefined,
				diagnostics: undefined,
				intervals: intervals
			};
		});
		const sortStarted = Date.now();
		profiles.sort(compareBoreholeProfiles);
		profileParts.sort = addTimingStep("sortProfiles", sortStarted);
		const duration = Date.now() - started;
		const timing = {
			total: duration,
			context: context.timing,
			profiles: addTimingStep("profiles", profilesStarted),
			timeline: timeline,
			profileParts: profileParts,
			deferred: ["characteristicText", "analysisText", "diagnostics"],
			boreholes: profiles.length,
			profileElementEntries: context.profileElementEntries.length,
			samples: context.sampleObjects.length
		};
		if(duration > 1000 && typeof console !== "undefined" && console.warn) {
			console.warn("[veldapps-imsikb/profiles] collectBoreholeProfiles", timing);
		}
		return { profiles: profiles, context: context, timing: timing };
	}
	function sikbVersionNumberOf(value) {
		const text = String(value || "");
		const match = text.match(/(?:^|[\/_\s-]v?)(\d+(?:\.\d+){0,2})(?=\.xsd|\/|\s|$)/i);
		return parseFloat(match ? match[1] : text);
	}
	function sikbVersionOf(result, xml) {
		result = result || {};
		const type = result.sikbType || result.type || "";
		const version = result.sikbVersion || result.version ||
			get("imsikb0101:metaData.imsikb0101:version", xml) ||
			get("imsikb0101:metaData.imsikb0101:version.@_xlink:href", xml) ||
			get("metaData.version", xml) ||
			get("bodeminformatie.metainformatie.@_versie", xml) ||
			get("bodeminformatie.metainformatie.@versie", xml) ||
			get("@_xsi:schemaLocation", xml) ||
			get("@xsi:schemaLocation", xml) ||
			type.split("/").pop();
		return sikbVersionNumberOf(version);
	}

	return {
		collectSikbSharedObjects: collectSikbSharedObjects,
		createSikbObjectContext: createSikbObjectContext,
		createSikbSingleProfileContext: createSikbSingleProfileContext,
		createSikbPreviewContext: createSikbPreviewContext,
		collectBoreholeProfileIntervals: collectBoreholeProfileIntervals,
		collectBoreholeProfiles: collectBoreholeProfiles,
		collectLegacySikbPreview: collectLegacySikbPreview,
		ensureAnalysesByTargetIndex: ensureAnalysesByTargetIndex,
		resolveCharacteristicTargets: resolveCharacteristicTargets,
		collectByReferenceKeys: collectByReferenceKeys,
		referenceKeysForValue: referenceKeysForValue,
		relationEntriesOf: relationEntriesOf,
		relationRoleOf: relationRoleOf,
		resolveRelationTargets: resolveRelationTargets,
		legacySikbVersionOf: legacySikbVersionOf,
		sikbVersionOf: sikbVersionOf,
		sikbVersionNumberOf: sikbVersionNumberOf
	};
});

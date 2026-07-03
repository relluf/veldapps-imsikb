define(function(require) {
	const Common = require("../ol/layers/common");

	const Toetsoordelen = require("json!../current/imsikb0101/Toetsoordelen").reduce((acc, item) => (acc[item.ID] = item, acc), {});
	const Toetsmeldingen = require("json!../current/imsikb0101/Toetsmeldingen").reduce((acc, item) => (acc[item.ID] = item, acc), {});
	const ToetsingNulniveau = require("json!../current/imsikb0101/ToetsingNulniveau").reduce((acc, item) => {
		acc[item.ID] = item;
		acc["T" + item.ID] = item;
		acc[item.Toetsing] = item;
		return acc;
	}, {});
	const AnalyseparameterGroepMap = require("json!../9.1.0/Analyseparameter-groep").reduce((acc, item) => {
		acc[item.sikbId] = item;
		acc[item.ID] = item;
		acc[item.parameter] = item;
		return acc;
	}, {});

	const arrX = Common.arrX;
	const textOf = Common.textOf;
	const normalizedReference = Common.normalizedReference;
	const collectValuesForKeys = Common.collectValuesForKeys;
	const collectObjectsForKeys = Common.collectObjectsForKeys;
	const idKeysOf = Common.idKeysOf;
	const featureNameOf = Common.featureNameOf;
	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;

	const uniqueObjects = values => values.filter((value, index, arr) => value && arr.indexOf(value) === index);
	const registerLookupKey = (index, key, value) => {
		if(key === undefined || key === null || key === "") return;

		String(key).split(/\s+/).filter(Boolean).forEach(part => {
			index[part] = value;
			index[part.replace(/^#/, "")] = value;
			index["#" + part.replace(/^#/, "")] = value;
		});
	};

	const codeTailOf = value => {
		const text = textOf(value) || normalizedReference(value);
		if(!text) return "";

		const direct = String(text).split(/[#:]/).pop().replace(/[^\dA-Za-z_-].*$/, "");
		const numeric = String(text).match(/(\d+)(?!.*\d)/);

		return direct || (numeric && numeric[1]) || "";
	};
	const lookupCode = (map, value) => {
		const code = codeTailOf(value);

		return code && map[code];
	};
	const normalizedTestingText = value => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
	const isAutoNulniveauToetsoordeel = toetsoordeel => [
		toetsoordeel && toetsoordeel.Omschrijving,
		toetsoordeel && toetsoordeel.Waarde,
		toetsoordeel && toetsoordeel.Afkorting
	].map(normalizedTestingText).filter(Boolean).some(value =>
		value === "gtm" ||
		(/^geen (meetwaarde|toetsing|toetsoordeel|toetsresultaat)( mogelijk)?$/).test(value) ||
		value === "niet getoetst"
	);
	const AutoNulToetsoordeelIds = Object.keys(Toetsoordelen)
		.filter(key => isAutoNulniveauToetsoordeel(Toetsoordelen[key]))
		.map(key => parseInt(key, 10))
		.filter(id => isFinite(id))
		.sort((left, right) => left - right);

	const lookupRegisteredReference = (index, ref) => {
		if(ref === undefined || ref === null || ref === "") return undefined;

		const value = String(ref).replace(/^#/, "");
		const bare = value.replace(/^_/, "");

		return index[ref] || index[value] || index["#" + value] ||
			index[bare] || index["#" + bare] ||
			index["_" + bare] || index["#_" + bare];
	};
	const gmlIdOf = obj => obj && (obj["@_gml:id"] || obj["@gml:id"] || obj["gml:id"] || obj.gml_id);
	const xlinkResolvedTargetsOf = obj => [
		get("@_xlink:href-resolved", obj),
		get("@xlink:href-resolved", obj),
		get("xlink:href-resolved", obj)
	].map(arrX).reduce((all, values) => all.concat(values), []).filter(Boolean);
	const xlinkHrefKeys = ["@_xlink:href", "@xlink:href", "xlink:href"];
	const xlinkHrefOf = obj => obj && xlinkHrefKeys.map(key => obj[key]).filter(Boolean)[0];
	const setXlinkResolvedTarget = (obj, target) => {
		if(!obj || typeof obj !== "object" || !target) return;

		const keys = xlinkHrefKeys.filter(key => obj[key] !== undefined);
		(keys.length ? keys : ["@_xlink:href"]).forEach(key => {
			obj[key + "-resolved"] = target;
		});
	};
	const resolveExternalXlinks = (obj, resolveGmlId, stats, seen) => {
		let count = 0;
		if(!resolveGmlId) return count;

		seen = seen || [];
		if(obj instanceof Array) {
			obj.forEach(value => count += resolveExternalXlinks(value, resolveGmlId, stats, seen));
		} else if(obj && typeof obj === "object") {
			if(seen.indexOf(obj) !== -1) return count;
			seen.push(obj);

			const href = xlinkHrefOf(obj);
			if(href && !xlinkResolvedTargetsOf(obj).length) {
				const target = resolveGmlId(href) || resolveGmlId(String(href).replace(/^#/, ""));
				if(target) {
					setXlinkResolvedTarget(obj, target);
					count++;
					if(stats) stats.externalXlinks = (stats.externalXlinks || 0) + 1;
				}
			}
			Object.keys(obj).forEach(key => {
				if(/href-resolved$/.test(key)) return;
				count += resolveExternalXlinks(obj[key], resolveGmlId, stats, seen);
			});
		}
		return count;
	};
	const relatedObservationsOfSample = sample => arrX(get("sam:relatedObservation", sample) || get("relatedObservation", sample));
	const asAnalysisObservation = value => get("immetingen:CalculatedAnalysis", value) ||
		get("CalculatedAnalysis", value) ||
		get("immetingen:Analysis", value) ||
		get("Analysis", value) ||
		value;
	const asTestingConclusion = value => get("imsikb0101:TestingConclusion", value) ||
		get("TestingConclusion", value) ||
		value;
	const calculatedAnalysisOfRelatedObservation = relatedObservation => {
		const direct = get("immetingen:CalculatedAnalysis", relatedObservation) ||
			get("CalculatedAnalysis", relatedObservation) ||
			get("immetingen:Analysis", relatedObservation) ||
			get("Analysis", relatedObservation);

		if(direct) return direct;

		return xlinkResolvedTargetsOf(relatedObservation)
			.map(asAnalysisObservation)
			.filter(gmlIdOf)[0];
	};
	const testingConclusionOfRelatedObservation = relatedObservation => {
		const direct = get("imsikb0101:TestingConclusion", relatedObservation) ||
			get("TestingConclusion", relatedObservation);

		if(direct) return direct;

		return xlinkResolvedTargetsOf(relatedObservation)
			.map(asTestingConclusion)
			.filter(gmlIdOf)[0];
	};
	const sampleRelatedObservationEntriesOf = sample => relatedObservationsOfSample(sample).map(relatedObservation => ({
		relatedObservation,
		calculatedAnalysis: calculatedAnalysisOfRelatedObservation(relatedObservation),
		testingConclusion: testingConclusionOfRelatedObservation(relatedObservation)
	}));
	const ANALYSIS_OBSERVATION_KEYS = [
		"immetingen:CalculatedAnalysis",
		"CalculatedAnalysis",
		"immetingen:Analysis",
		"Analysis"
	];
	const TESTING_CONCLUSION_KEYS = [
		"imsikb0101:TestingConclusion",
		"TestingConclusion"
	];
	const featureOfInterestValuesOf = observation => arrX(get("om:featureOfInterest", observation) || get("featureOfInterest", observation));
	const featureOfInterestRefsOf = observation => uniqueObjects(featureOfInterestValuesOf(observation)
		.map(value => [normalizedReference(value)]
			.concat(idKeysOf(value))
			.concat(xlinkResolvedTargetsOf(value).map(idKeysOf).reduce((all, keys) => all.concat(keys), [])))
		.reduce((all, refs) => all.concat(refs), [])
		.filter(Boolean));
	const sampleReferenceIndexOf = sample => {
		const index = {};

		idKeysOf(sample).forEach(key => registerLookupKey(index, key, sample));
		return index;
	};
	const observationReferencesSample = (observation, sampleIndex) => featureOfInterestRefsOf(observation)
		.some(ref => lookupRegisteredReference(sampleIndex, ref));
	const observationsForSample = (xml, sample, keys, normalize) => {
		const sampleIndex = sampleReferenceIndexOf(sample);
		const root = Common.xmlOfResult(xml);

		return uniqueObjects(collectObjectsForKeys(root, keys)
			.map(normalize || (value => value))
			.filter(Boolean)
			.filter(observation => observationReferencesSample(observation, sampleIndex)));
	};
	const analysisObservationsForSample = (xml, sample) => observationsForSample(xml, sample, ANALYSIS_OBSERVATION_KEYS, asAnalysisObservation)
		.filter(gmlIdOf);

	const testingConclusionsOf = obj => {
		const entries = sampleRelatedObservationEntriesOf(obj);
		const conclusions = entries.map(entry => entry.testingConclusion).filter(Boolean);

		return conclusions.length ? conclusions : uniqueObjects(collectObjectsForKeys(obj, TESTING_CONCLUSION_KEYS).map(asTestingConclusion));
	};
	const testingConclusionsForSample = (xml, sample) => {
		const direct = testingConclusionsOf(sample);
		const byFeatureOfInterest = observationsForSample(xml, sample, TESTING_CONCLUSION_KEYS, asTestingConclusion);

		return uniqueObjects(direct.concat(byFeatureOfInterest));
	};

	const observationContextValuesOf = observation => arrX(get("om:relatedObservation", observation) || get("relatedObservation", observation))
		.map(relatedObservation => get("om:ObservationContext", relatedObservation) ||
			get("ObservationContext", relatedObservation) ||
			relatedObservation);
	const relatedObservationTargetsOfObservationContext = context => uniqueObjects(arrX(get("om:relatedObservation", context) || get("relatedObservation", context))
		.map(value => [normalizedReference(value)]
			.concat(idKeysOf(value))
			.concat(xlinkResolvedTargetsOf(value).map(idKeysOf).reduce((all, keys) => all.concat(keys), [])))
		.reduce((all, refs) => all.concat(refs), [])
		.filter(Boolean));
	const relatedObservationRefsOfObservation = observation => uniqueObjects(observationContextValuesOf(observation)
		.map(relatedObservationTargetsOfObservationContext)
		.reduce((all, refs) => all.concat(refs), []));
	const calculatedAnalysisIndexOfEntries = (entries, analyses) => {
		const index = {};
		const registerAnalysis = analysis => {
			if(!analysis) return;

			registerLookupKey(index, gmlIdOf(analysis), analysis);
			relatedObservationRefsOfObservation(analysis)
				.forEach(ref => registerLookupKey(index, ref, analysis));
		};

		(entries || []).forEach(entry => registerAnalysis(entry.calculatedAnalysis));
		(analyses || []).forEach(registerAnalysis);
		return index;
	};
	const relatedObservationRoleOfObservationContext = context => {
		const role = get("om:role", context) || get("role", context);

		return textOf(role) || normalizedReference(role);
	};
	const isTestingConclusionJudgementContext = context => /urn:immetingen:RelatedObservationRollen:id:3(?:\b|$)|RelatedObservationRollen:id:3(?:\b|$)|urn:3(?:\b|$)|OordeelOver/i
		.test(relatedObservationRoleOfObservationContext(context));
	const observationContextsOfTestingConclusion = conclusion => observationContextValuesOf(conclusion)
		.filter(isTestingConclusionJudgementContext);
	const linkTestingConclusionToCalculatedAnalyses = (conclusion, analysisIndex) => {
		const analyses = [];

		observationContextsOfTestingConclusion(conclusion).forEach(context => {
			relatedObservationTargetsOfObservationContext(context).forEach(ref => {
				const analysis = lookupRegisteredReference(analysisIndex, ref);

				if(analysis && analyses.indexOf(analysis) === -1) {
					analysis["imsikb0101:testingConclusion"] = conclusion;
					analyses.push(analysis);
				}
			});
		});

		return analyses;
	};
	const linkTestingConclusionsToCalculatedAnalyses = (sample, conclusions, entries, analyses) => {
		entries = entries || sampleRelatedObservationEntriesOf(sample);
		conclusions = conclusions || entries.map(entry => entry.testingConclusion).filter(Boolean);

		const analysisIndex = calculatedAnalysisIndexOfEntries(entries, analyses);

		return conclusions
			.map(conclusion => linkTestingConclusionToCalculatedAnalyses(conclusion, analysisIndex))
			.reduce((all, analyses) => all.concat(analyses), [])
			.filter((analysis, index, arr) => arr.indexOf(analysis) === index);
	};

	const toetsoordeelOfConclusion = conclusion => {
		const values = [
			get("om:result.imsikb0101:ClassifiedResult.imsikb0101:classifiedResult", conclusion),
			get("om:result.imsikb0101:ClassifiedResult.classifiedResult", conclusion),
			get("om:result.classifiedResult", conclusion)
		].concat(collectValuesForKeys(conclusion, ["imsikb0101:classifiedResult", "classifiedResult"]));

		return values.map(value => lookupCode(Toetsoordelen, value)).filter(Boolean)[0];
	};
	const toetsmeldingOfConclusion = conclusion => {
		const values = [
			get("imsikb0101:botovaAdditions.imsikb0101:BoToVaSpecific.imsikb0101:testingMessageCode", conclusion),
			get("botovaAdditions.BoToVaSpecific.testingMessageCode", conclusion)
		].concat(collectValuesForKeys(conclusion, ["imsikb0101:testingMessageCode", "testingMessageCode"]));

		return values.map(value => lookupCode(Toetsmeldingen, value)).filter(Boolean)[0];
	};
	const executedTestingOfConclusion = conclusion => {
		const testing = get("imsikb0101:testing", conclusion) || get("testing", conclusion);
		if(!testing) return null;

		return get("imsikb0101:ExecutedTesting", testing) ||
			get("ExecutedTesting", testing) ||
			xlinkResolvedTargetsOf(testing)[0] ||
			testing;
	};
	const toetsingLabelOfConclusion = (conclusion, fallback) => {
		const testing = executedTestingOfConclusion(conclusion);
		const type = testing && (
			get("imsikb0101:testingType", testing) ||
			get("testingType", testing)
		);
		const code = codeTailOf(type);

		return code ? "T" + code : fallback;
	};
	const toetsingCodeOfConclusion = conclusion => {
		const testing = executedTestingOfConclusion(conclusion);
		const type = testing && (
			get("imsikb0101:testingType", testing) ||
			get("testingType", testing)
		);

		return codeTailOf(type);
	};
	const nulniveauOfToetsing = toetsing => {
		const code = codeTailOf(toetsing);

		return code && (ToetsingNulniveau[code] || ToetsingNulniveau["T" + code] || ToetsingNulniveau["T." + code]);
	};
	const nulToetsoordeelIdsOfToetsing = toetsing => {
		const nulniveau = nulniveauOfToetsing(toetsing);
		const ids = nulniveau && nulniveau.NulToetsoordelen || AutoNulToetsoordeelIds;

		return ids.map(id => "" + id);
	};
	const isNulniveauToetsoordeel = (toetsoordeel, toetsing) => {
		const id = toetsoordeel && toetsoordeel.ID;

		return id !== undefined && nulToetsoordeelIdsOfToetsing(toetsing).indexOf("" + id) !== -1;
	};
	const isInformativeToetsoordeel = (toetsoordeel, toetsing) =>
		!!toetsoordeel && !isNulniveauToetsoordeel(toetsoordeel, toetsing);
	const isInformativeTestingConclusion = conclusion =>
		isInformativeToetsoordeel(toetsoordeelOfConclusion(conclusion), toetsingCodeOfConclusion(conclusion));
	const informativeConclusionsOf = conclusions => (conclusions || []).filter(isInformativeTestingConclusion);
	const informativeToetsoordelenOfConclusions = conclusions => uniqueObjects(informativeConclusionsOf(conclusions)
		.map(toetsoordeelOfConclusion)
		.filter(Boolean));
	const isTrueValue = value => value === true || /^(true|1|ja|yes)$/i.test(textOf(value) || normalizedReference(value));
	const isSampleTestingConclusion = conclusion => {
		const values = [
			get("imsikb0101:botovaAdditions.imsikb0101:BoToVaSpecific.imsikb0101:isSampleConclusion", conclusion),
			get("botovaAdditions.BoToVaSpecific.isSampleConclusion", conclusion)
		].concat(collectValuesForKeys(conclusion, ["imsikb0101:isSampleConclusion", "isSampleConclusion"]));

		return values.some(isTrueValue);
	};
	const mapConclusionsOf = conclusions => {
		const informativeConclusions = informativeConclusionsOf(conclusions);
		const sampleConclusions = informativeConclusions.filter(isSampleTestingConclusion);

		return sampleConclusions.length ? sampleConclusions : informativeConclusions;
	};
	const mapToetsoordelenOfConclusions = conclusions => uniqueObjects(mapConclusionsOf(conclusions)
		.map(toetsoordeelOfConclusion)
		.filter(Boolean));

	const paramGroupOfCalculatedAnalysis = analysis => {
		const parameter = get("immetingen:physicalProperty.immetingen:PhysicalProperty.immetingen:parameter", analysis) ||
			get("physicalProperty.PhysicalProperty.parameter", analysis);
		const group = lookupCode(AnalyseparameterGroepMap, parameter);

		return group && group.groep;
	};
	const paramGroupsOfCalculatedAnalyses = analyses => {
		const groups = {};

		analyses.forEach(analysis => {
			const group = paramGroupOfCalculatedAnalysis(analysis);
			if(group) groups[group] = { key: group, name: group };
		});

		return Object.keys(groups).sort().map(key => groups[key]);
	};
	const materialTextOf = sample => {
		const value = get("spec:materialClass", sample) ||
			get("immetingen:materialClass", sample) ||
			get("imsikb0101:materialClass", sample) ||
			get("materialClass", sample);

		return textOf(value) || normalizedReference(value);
	};
	const isGroundwaterSample = sample => /grondwater|urn:2|id:2(?:\b|$)/i.test(materialTextOf(sample));
	const depthTopFromText = value => {
		const text = String(value || "").replace(",", ".");
		const match = text.match(new RegExp("(?:^|[\\s(])(-?\\d+(?:\\.\\d+)?)\\s*(?:-|\\u2013|\\u2014|tot|t\\s*/\\s*m)\\s*-?\\d+(?:\\.\\d+)?\\s*(cm|m)?(?:\\)|\\s|$)", "i"));
		if(!match) return null;

		const number = parseFloat(match[1]);
		if(!isFinite(number)) return null;
		return match[2] && /^m$/i.test(match[2]) ? number * 100 : number;
	};
	const depthFromText = value => {
		const text = String(value || "").replace(",", ".");
		const match = text.match(new RegExp("(?:^|[\\s(])-?\\d+(?:\\.\\d+)?\\s*(?:-|\\u2013|\\u2014|tot|t\\s*/\\s*m)\\s*(-?\\d+(?:\\.\\d+)?)\\s*(cm|m)?(?:\\)|\\s|$)", "i"));
		if(!match) return null;

		const number = parseFloat(match[1]);
		if(!isFinite(number)) return null;
		return match[2] && /^m$/i.test(match[2]) ? number * 100 : number;
	};
	const depthTopOf = obj => {
		let top = Common.upperDepthOf(obj);
		if(top !== null) return top;

		top = depthTopFromText(featureNameOf(obj, ""));
		if(top !== null) return top;

		top = depthTopFromText(textOf(obj));
		if(top !== null) return top;

		return depthTopFromText(normalizedReference(obj));
	};
	const depthBottomOf = obj => {
		let bottom = Common.lowerDepthOf(obj);
		if(bottom !== null) return bottom;

		bottom = depthFromText(featureNameOf(obj, ""));
		if(bottom !== null) return bottom;

		bottom = depthFromText(textOf(obj));
		if(bottom !== null) return bottom;

		return depthFromText(normalizedReference(obj));
	};
	const addUnique = (arr, value) => {
		if(value && arr.indexOf(value) === -1) arr.push(value);
	};
	const depthObjectsForTestingItem = item => {
		const objects = [];
		const add = value => addUnique(objects, value);

		add(item.sourceEntry.sample);
		add(item.sourceEntry.name);
		add(item.testingEntry && item.testingEntry.sample);
		add(item.testingEntry && item.testingEntry.name);
		(item.sourceEntry.features || []).forEach(feature => {
			if(!feature || !feature.get) return;
			add(feature.get("imsikb0101:AnalysisSample"));
			add(feature.get("imsikb0101:Sample"));
			add(feature.get("imsikb0101:Measurement"));
		});
		return objects;
	};
	const addDepthGroupsForTrajectory = (groups, top, bottom) => {
		if(top === null) return;
		bottom = bottom === null ? top : bottom;
		if(top < 100) {
			groups.bovengrond = { key: "bovengrond", name: "Grond - bovengrond (<100 cm-mv)", sort: 1 };
		}
		if(bottom > 100 || top >= 100) {
			groups.ondergrond = { key: "ondergrond", name: "Grond - ondergrond (>=100 cm-mv)", sort: 2 };
		}
	};
	const depthGroupsForTestingItem = item => {
		const objects = depthObjectsForTestingItem(item);
		const depths = {};

		if(objects.some(isGroundwaterSample)) {
			return [{ key: "grondwater", name: "Grondwater", sort: 3 }];
		}

		objects.forEach(obj => {
			const top = depthTopOf(obj);
			addDepthGroupsForTrajectory(depths, top, depthBottomOf(obj));
		});

		return Object.keys(depths).map(key => depths[key]);
	};

	const sourceSampleIndexOf = sourceEntries => {
		const index = {};

		sourceEntries.forEach(entry => {
			idKeysOf(entry.sample).forEach(key => registerLookupKey(index, key, entry));
			registerLookupKey(index, entry.name, entry);
			registerLookupKey(index, featureNameOf(entry.sample, ""), entry);
		});

		return index;
	};
	const documentFallbackName = doc => doc && (
		doc.name ||
		doc.info && (doc.info.name || doc.info.uri) ||
		doc.result && (doc.result.name || doc.result.uri)
	) || "Toetsing";
	const testingEntriesOf = doc => {
		const xml = Common.xmlOfResult(doc && doc.result || doc);
		const fallback = documentFallbackName(doc);

		if(!xml) return [];

		return collectObjectsForKeys(xml, ["immetingen:Sample", "imsikb0101:Sample", "Sample"]).map(sample => {
			const entries = sampleRelatedObservationEntriesOf(sample);
			const conclusions = testingConclusionsForSample(xml, sample);
			const sampleAnalyses = analysisObservationsForSample(xml, sample);
			const calculatedAnalyses = linkTestingConclusionsToCalculatedAnalyses(sample, conclusions, entries, sampleAnalyses);
			const toetsoordelen = uniqueObjects(conclusions.map(toetsoordeelOfConclusion).filter(Boolean));
			const informativeConclusions = informativeConclusionsOf(conclusions);
			const informativeToetsoordelen = informativeToetsoordelenOfConclusions(conclusions);
			const mapConclusions = mapConclusionsOf(conclusions);
			const mapToetsoordelen = mapToetsoordelenOfConclusions(conclusions);

			if(!conclusions.length || !toetsoordelen.length) return null;

			return {
				document: doc,
				sample,
				name: featureNameOf(sample, "Analysemonster"),
				keys: idKeysOf(sample),
				conclusions,
				informativeConclusions,
				mapConclusions,
				calculatedAnalyses,
				toetsoordelen,
				informativeToetsoordelen,
				mapToetsoordelen,
				toetsmeldingen: uniqueObjects(conclusions.map(toetsmeldingOfConclusion).filter(Boolean)),
				toetsingen: uniqueObjects(conclusions.map(conclusion => toetsingLabelOfConclusion(conclusion, fallback)).filter(Boolean)),
				paramGroups: paramGroupsOfCalculatedAnalyses(calculatedAnalyses)
			};
		}).filter(Boolean);
	};
	const matchTestingEntries = (testingEntries, sourceEntries) => {
		const sourceIndex = sourceSampleIndexOf(sourceEntries);
		const items = [];

		testingEntries.forEach(entry => {
			let sourceEntry;

			entry.keys.concat([entry.name]).some(key => {
				sourceEntry = sourceIndex[key] || sourceIndex[String(key).replace(/^_/, "")] || sourceIndex["_" + key];
				return !!sourceEntry;
			});
			if(!sourceEntry) return;
			if(!(entry.mapToetsoordelen || []).length) return;

			const item = {
				testingEntry: entry,
				sourceEntry,
				calculatedAnalyses: entry.calculatedAnalyses,
				conclusions: entry.mapConclusions,
				allConclusions: entry.conclusions,
				toetsoordelen: entry.mapToetsoordelen,
				informativeToetsoordelen: entry.informativeToetsoordelen,
				allToetsoordelen: entry.toetsoordelen,
				toetsmeldingen: entry.toetsmeldingen,
				toetsingen: entry.toetsingen,
				paramGroups: entry.paramGroups.length ? entry.paramGroups : [{ key: "unknown", name: "Parametergroep onbekend" }]
			};

			item.depthGroups = depthGroupsForTestingItem(item);
			if(!item.depthGroups.length) {
				item.depthGroups = [{ key: "ondergrond", name: "Grond - ondergrond (>=100 cm-mv)", sort: 2 }];
			}
			items.push(item);
		});

		return items;
	};
	const missingAnalysisRefsForConclusion = (conclusion, analysisIndex) => observationContextsOfTestingConclusion(conclusion)
		.map(relatedObservationTargetsOfObservationContext)
		.reduce((all, refs) => all.concat(refs), [])
		.filter((ref, index, refs) => refs.indexOf(ref) === index)
		.filter(ref => !lookupRegisteredReference(analysisIndex, ref));
	const missingAnalysisRefsOf = (conclusions, entries, analyses) => {
		const analysisIndex = calculatedAnalysisIndexOfEntries(entries, analyses);

		return conclusions
			.map(conclusion => missingAnalysisRefsForConclusion(conclusion, analysisIndex))
			.reduce((all, refs) => all.concat(refs), [])
			.filter((ref, index, refs) => refs.indexOf(ref) === index);
	};
	const linkTestingObservations = (xml, opts) => {
		const root = Common.xmlOfResult(xml);
		const stats = { samples: 0, conclusions: 0, links: 0, missingAnalysisRefs: [], relatedObservations: [], externalXlinks: 0 };

		opts = opts || {};
		resolveExternalXlinks(root, opts.resolveGmlId, stats);
		collectObjectsForKeys(root, ["immetingen:Sample", "imsikb0101:Sample", "Sample"]).forEach(sample => {
			const entries = sampleRelatedObservationEntriesOf(sample);
			const conclusions = testingConclusionsForSample(xml, sample);
			if(!conclusions.length) return;

			stats.samples++;
			stats.conclusions += conclusions.length;

			const sampleAnalyses = analysisObservationsForSample(xml, sample);
			const analyses = linkTestingConclusionsToCalculatedAnalyses(sample, conclusions, entries, sampleAnalyses);
			stats.links += analyses.length;
			missingAnalysisRefsOf(conclusions, entries, sampleAnalyses).forEach(ref => {
				if(stats.missingAnalysisRefs.indexOf(ref) === -1) {
					stats.missingAnalysisRefs.push(ref);
				}
			});
			analyses.forEach(analysis => {
				if(stats.relatedObservations.indexOf(analysis) === -1) {
					stats.relatedObservations.push(analysis);
				}
			});
		});

		return stats;
	};
	const isTestingResult = result => {
		const xml = Common.xmlOfResult(result);

		return !!(xml && testingConclusionsOf(xml).length);
	};

	return {
		Toetsoordelen,
		Toetsmeldingen,
		ToetsingNulniveau,
		AutoNulToetsoordeelIds,
		AnalyseparameterGroepMap,
		uniqueObjects,
		registerLookupKey,
		codeTailOf,
		lookupCode,
		relatedObservationsOfSample,
		calculatedAnalysisOfRelatedObservation,
		testingConclusionOfRelatedObservation,
		sampleRelatedObservationEntriesOf,
		gmlIdOf,
		xlinkResolvedTargetsOf,
		testingConclusionsOf,
		linkTestingConclusionToCalculatedAnalyses,
		linkTestingConclusionsToCalculatedAnalyses,
		toetsoordeelOfConclusion,
		toetsmeldingOfConclusion,
		executedTestingOfConclusion,
		toetsingCodeOfConclusion,
		toetsingLabelOfConclusion,
		nulniveauOfToetsing,
		nulToetsoordeelIdsOfToetsing,
		isNulniveauToetsoordeel,
		isInformativeToetsoordeel,
		isInformativeTestingConclusion,
		informativeConclusionsOf,
		informativeToetsoordelenOfConclusions,
		isSampleTestingConclusion,
		mapConclusionsOf,
		mapToetsoordelenOfConclusions,
		paramGroupOfCalculatedAnalysis,
		paramGroupsOfCalculatedAnalyses,
		materialTextOf,
		isGroundwaterSample,
		depthObjectsForTestingItem,
		depthGroupsForTestingItem,
		sourceSampleIndexOf,
		testingEntriesOf,
		matchTestingEntries,
		linkTestingObservations,
		isTestingResult
	};
});

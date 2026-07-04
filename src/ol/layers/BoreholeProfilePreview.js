define(function(require) {
	const Common = require("./common");
	const Profiles = require("../../profiles");
	const Rendering = require("../../rendering/profiles");

	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;
	const sf = (format, ...args) => typeof js !== "undefined" && js.sf ? js.sf(format, ...args) : format.replace(/%[sd]/g, () => args.shift());

	const featureNameOf = Common.featureNameOf;
	const idKeysOf = Common.idKeysOf;
	const depthOf = Common.depthOf;
	const textOf = Common.textOf;
	const normalizedReference = Common.normalizedReference;

	function dateFilterValueOf(value) {
		const text = textOf(value) || normalizedReference(value);
		const match = String(text || "").match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
		return match ? match[0].replace(/\//g, "-").replace(/-(\d)(?=-|$)/g, "-0$1") : "";
	}
	function objectDateFilterValueOf(obj, keys) {
		return keys.map(key => dateFilterValueOf(get(key, obj))).filter(Boolean)[0] || "";
	}
	function mapFeatureProfilePatternScope(feature, index) {
		return String("map-profile-" + (feature && feature.get && (feature.get("sikb:id") || feature.get("name")) || index || Date.now()))
			.replace(/[^A-Za-z0-9_-]/g, "-");
	}
	function defaultRenderOptions(options) {
		options = options || {};
		return {
			coordinateLabelOf: options.coordinateLabelOf,
			featureNameOf: options.featureNameOf || featureNameOf,
			formatDepthCm: options.formatDepthCm,
			inspectObjectFor: options.inspectObjectFor,
			profileDataAttrs: options.profileDataAttrs
		};
	}
	function boreholeProfileForMapFeature(result, context, borehole, index) {
		const xml = context && context.xml || Common.xmlOfResult(result);
		if(!xml || !borehole) return null;
		const intervals = Profiles.collectBoreholeProfileIntervals(borehole, xml, context && context.objectIndex, context);
		return {
			borehole: borehole,
			name: featureNameOf(borehole, sf("Borehole %d", index + 1)),
			sortIndex: index,
			startTime: objectDateFilterValueOf(borehole, ["immetingen:startTime", "imsikb0101:startTime", "startTime"]),
			endTime: objectDateFilterValueOf(borehole, ["immetingen:endTime", "imsikb0101:endTime", "endTime"]),
			depth: depthOf(borehole),
			intervals: intervals
		};
	}
	function attachToFeatures(features, result, options) {
		if(!features || !features.length) return features;
		const lazy = !options || options.lazy !== false;
		const renderOptions = defaultRenderOptions(options);
		let collection = null;
		let context = null;
		let profileByKey = null;

		const ensureCollection = () => {
			if(!collection) {
				collection = Profiles.collectBoreholeProfiles(result);
				context = collection && collection.context || Profiles.createSikbPreviewContext(result);
			}
			if(!profileByKey) {
				profileByKey = {};
				((collection && collection.profiles) || []).forEach((profile, index) => {
					idKeysOf(profile.borehole).forEach(key => profileByKey[key] = { profile: profile, index: index });
				});
			}
			return collection;
		};
		const ensureContext = () => {
			if(!context) {
				context = lazy ? (Profiles.createSikbSingleProfileContext || Profiles.createSikbPreviewContext)(result) :
					(ensureCollection() && collection.context || Profiles.createSikbPreviewContext(result));
			}
			return context;
		};
		const profileEntryFor = (object, featureIndex) => {
			if(!object) return null;
			if(!lazy) {
				ensureCollection();
				const indexed = idKeysOf(object).map(key => profileByKey[key]).filter(Boolean)[0];
				if(indexed) return indexed;
			}

			const profileContext = ensureContext();
			const profile = profileContext && boreholeProfileForMapFeature(result, profileContext, object, featureIndex);
			return profile ? { profile: profile, index: featureIndex } : null;
		};

		features.forEach((feature, featureIndex) => {
			const object = feature && feature.get && (feature.get("sikb:object") ||
				feature.get("imsikb0101:Borehole") ||
				feature.get("immetingen:Borehole") ||
				feature.get("Borehole"));
			let entry = null;

			if(!object) return;
			feature.set("generate-svg-preview", () => {
				entry = entry || profileEntryFor(object, featureIndex);
				if(!entry || !entry.profile) return null;
				feature.set("sikb:profile", entry.profile);
				return Rendering.renderBoreholeProfileHoverPreview(
					entry.profile, entry.index, mapFeatureProfilePatternScope(feature, featureIndex), renderOptions);
			});
		});
		return features;
	}

	return {
		attachToFeatures: attachToFeatures,
		boreholeProfileForMapFeature: boreholeProfileForMapFeature,
		defaultRenderOptions: defaultRenderOptions,
		mapFeatureProfilePatternScope: mapFeatureProfilePatternScope
	};
});

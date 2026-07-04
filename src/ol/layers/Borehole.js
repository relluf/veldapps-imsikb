define(function(require) {
	const Common = require("./common");
	const Preview = require("./BoreholeProfilePreview");

	const spec = {
		key: "Borehole",
		name: "Borehole",
		keys: [
			"immetingen:Borehole",
			"imsikb0101:Borehole",
			"bhrgt:Borehole",
			"Borehole"
		],
		style: Common.styleWith("rgba(56, 121, 217, 0.85)", "#ffffff", 6),
		legend: [{ color: "rgba(56, 121, 217, 0.85)", title: "Borehole" }]
	};

	const api = Common.layerApi(spec);
	const collectFeatures = (result, opts) => Preview.attachToFeatures(
		Common.collectFeaturesForSpec(result, spec, opts || {}), result, opts || {});
	const addToMap = (OL, info, result, opts) => {
		opts = opts || {};
		const features = opts.features ? Preview.attachToFeatures(opts.features, result, opts) : collectFeatures(result, opts);
		const addOpts = Object.assign({}, opts, { features: features });
		return Common.addSpecToMap(OL, info, result, spec, addOpts);
	};

	api.collectFeatures = collectFeatures;
	api.addToMap = addToMap;
	api.attachProfilePreviews = Preview.attachToFeatures;
	api.boreholeProfileForMapFeature = Preview.boreholeProfileForMapFeature;
	api.mapFeatureProfilePatternScope = Preview.mapFeatureProfilePatternScope;

	return api;
});

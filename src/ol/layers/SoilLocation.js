define(function(require) {
	const Common = require("./common");

	const spec = {
		key: "SoilLocation",
		name: "SoilLocation",
		title: "Soil location",
		keys: [
			"imsikb0101:SoilLocation",
			"immetingen:SoilLocation",
			"SoilLocation"
		],
		style: Common.styleWith("rgba(120, 113, 108, 0.24)", "rgba(120, 113, 108, 0.92)", 6),
		legend: [{ color: "rgba(120, 113, 108, 0.92)", title: "Soil location" }]
	};

	return Common.layerApi(spec);
});

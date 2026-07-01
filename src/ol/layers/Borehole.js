define(function(require) {
	const Common = require("./common");

	const spec = {
		key: "Borehole",
		name: "Borehole",
		title: "Boreholes",
		keys: [
			"immetingen:Borehole",
			"imsikb0101:Borehole",
			"bhrgt:Borehole",
			"Borehole"
		],
		style: Common.styleWith("rgba(56, 121, 217, 0.85)", "#ffffff", 6),
		legend: [{ color: "rgba(56, 121, 217, 0.85)", title: "Borehole" }]
	};

	return Common.layerApi(spec);
});

define(function(require) {
	const Common = require("./common");

	const spec = {
		key: "Trench",
		name: "Trench",
		title: "Trenches",
		keys: [
			"immetingen:Trench",
			"imsikb0101:Trench",
			"Trench"
		],
		style: Common.styleWith("rgba(20, 184, 166, 0.9)", "#ffffff", 6),
		legend: [{ color: "rgba(20, 184, 166, 0.9)", title: "Trench" }]
	};

	return Common.layerApi(spec);
});

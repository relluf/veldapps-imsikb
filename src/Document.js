define(function(require) {
	const Xml = require("veldapps-xml/index");

	function array(value) {
		return value instanceof Array ? value : (value === undefined || value === null ? [] : [value]);
	}
	function flatten(values) {
		return values.reduce((result, value) => result.concat(value), []);
	}
	function get(path, object) {
		return js.get(path, object);
	}
	function view(xml, type, version) {
		type = String(type || "sikb");
		if(type.startsWith("sikb/validatieresultaat/")) {
			const result = get("s:Envelope.s:Body.ValidateResponse.ValidateResult", xml);
			return {
				Messages: array(get("a:Validation.a:Messages.a:ValidationMessage", result)),
				"Validate Result": array(result),
				Envelope: array(xml["s:Envelope"])
			};
		}
		if(parseFloat(version) >= parseFloat("12.0.0")) {
			return Xml.gml(xml);
		}
		if(get("bodeminformatie.metainformatie.@_versie", xml)) {
			const info = xml.bodeminformatie;
			const locations = array(info.locatie);
			const projects = flatten(locations.map(location => array(location.onderzoek)));
			const points = flatten(projects.map(project => array(project.meetpunt)));
			const filters = flatten(points.map(point => array(point.filter)));
			const soilSamples = flatten(points.map(point => array(point.bodemmonster)));
			const waterSamples = flatten(filters.map(filter => array(filter.veldmonster))).filter(Boolean);
			return {
				Bodeminformatie: array(info),
				Locaties: locations,
				Onderzoeken: projects,
				Meetpunten: points,
				Lagen: flatten(points.map(point => array(point.bodemlaag))),
				Casingen: flatten(points.map(point => array(point.casing))),
				Afwerking: flatten(points.map(point => array(point.afwerking))),
				Filters: filters,
				Bodemmonsters: soilSamples,
				Watermonsters: waterSamples,
				Potten: soilSamples.map(sample => sample.veldmonster).filter(Boolean)
					.map(sample => sample.barcode1 || sample.barcode2 || sample.barcode),
				Flessen: flatten(waterSamples.map(sample => array(sample.fles))),
				Veldwaarnemingen: flatten(soilSamples.map(sample => array(sample.veldwaarneming)))
					.concat(flatten(waterSamples.map(sample => array(sample.veldwaarneming))))
			};
		}
		if(xml.labresultaat) {
			const result = xml.labresultaat;
			const samples = array(get("projectgegevens.analysemonsters.analysemonster", result));
			return {
				Project: array(result.projectgegevens),
				Analysemonsters: samples,
				Analyseresultaten: flatten(samples.map(sample =>
					array(get("analyseresultaten.analyseresultaat", sample))))
			};
		}
		return xml;
	}
	function interpret(xml, options) {
		options = options || {};
		const started = Date.now();
		const version = String(options.version || "1.0");
		const type = String(options.type || "sikb/" + version);
		return {
			type: type,
			version: version,
			facetUri: "veldapps-imsikb/Tabs<Document.sikb>",
			xml: xml,
			root: xml,
			view: view(xml, type, version),
			timing: { total: Date.now() - started },
			capabilities: {
				gml: parseFloat(version) >= parseFloat("12.0.0"),
				sikb: true,
				xml: true,
				view: true
			}
		};
	}

	return {
		interpret: interpret,
		view: view
	};
});

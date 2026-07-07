define(function(require) {

	const Xml = require("veldapps-xml/index");
	const Parser = require("bxv/Parser");

	const XML_NAMESPACES = Object.assign({}, Parser.XML_NAMESPACES, {
		"imsikb0101": ["http://www.sikb.nl/imsikb0101"],
		"immetingen": ["http://www.sikb.nl/immetingen"],
		"sam": ["http://www.opengis.net/sampling/2.0"],
		"sams": ["http://www.opengis.net/samplingSpatial/2.0"],
		"spec": ["http://www.opengis.net/samplingSpecimen/2.0"]
	});

	const arrX = arr => arr === null || arr === undefined ? [] : arr instanceof Array ? arr : [arr];
	let xmlParseDecodesEntities;

	function xmlEntityDecoded(value) {
		if(typeof value !== "string") return value;
		return value
			.replace(/&#x([0-9a-f]+);/gi, (match, code) => String.fromCodePoint(parseInt(code, 16)))
			.replace(/&#([0-9]+);/g, (match, code) => String.fromCodePoint(parseInt(code, 10)))
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&apos;/g, "'")
			.replace(/&quot;/g, "\"")
			.replace(/&amp;/g, "&");
	}
	function xmlParseSupportsEntityDecode() {
		if(xmlParseDecodesEntities === undefined) {
			const parsed = Xml.parse("<value>&amp;</value>", { ignoreAttributes: false, decodeHTMLchar: true });
			xmlParseDecodesEntities = parsed && parsed.value === "&";
		}
		return xmlParseDecodesEntities;
	}
	function decodeXmlEntitiesInPlace(value, seen) {
		if(value instanceof Array) {
			value.forEach((item, index) => {
				value[index] = typeof item === "string" ? xmlEntityDecoded(item) : decodeXmlEntitiesInPlace(item, seen);
			});
			return value;
		}
		if(!value || typeof value !== "object") {
			return value;
		}
		seen = seen || [];
		if(seen.indexOf(value) !== -1) {
			return value;
		}
		seen.push(value);
		Object.keys(value).forEach(key => {
			const item = value[key];
			value[key] = typeof item === "string" ? xmlEntityDecoded(item) : decodeXmlEntitiesInPlace(item, seen);
		});
		return value;
	}
	function getXmlParseOptions(type) {
		type = type || "";
		const options = {
			namespaces: XML_NAMESPACES,
			decodeHTMLchar: true,
			comments: type.match(/sikb.*9\.1\.0/) ? "kvp" : false
		};
		if(!type.startsWith("sikb/")) {
			options.defaultNSPrefix = false;
		}
		return options;
	}
	function hasKeyMatching(obj, matcher, seen) {
		seen = seen || [];
		if(obj instanceof Array) {
			return obj.some(value => hasKeyMatching(value, matcher, seen));
		}
		if(!obj || typeof obj !== "object") {
			return false;
		}
		if(seen.indexOf(obj) !== -1) {
			return false;
		}
		seen.push(obj);
		return Object.keys(obj).some(key => matcher(key, obj[key]) || hasKeyMatching(obj[key], matcher, seen));
	}
	function classifyGmlDocument(xml, text, ext) {
		if(!xml || typeof xml !== "object") {
			return null;
		}
		const hasGmlNamespace = /xmlns(?::gml)?\s*=\s*["']http:\/\/www\.opengis\.net\/gml\//i.test(text || "");
		const hasGmlKey = hasKeyMatching(xml, key => key === "gml" || key.indexOf("gml:") === 0 ||
			key.indexOf("@_gml:") === 0 || key.indexOf("@gml:") === 0);
		const isWfs = hasKeyMatching(xml, key => key === "wfs:FeatureCollection" ||
			key === "FeatureCollection" || key === "wfs:member" || key === "featureMember");

		if(ext === "gml" || hasGmlNamespace || hasGmlKey) {
			return isWfs ? "wfs/gml" : "gml";
		}
		return null;
	}
	function getXmlCollectionView(xml) {
		if(!xml || xml instanceof Array || typeof xml !== "object") {
			return null;
		}
		const contentKeys = Object.keys(xml).filter(key => key.indexOf("@") !== 0 && key !== "#text");
		if(contentKeys.length !== 1) {
			return null;
		}
		const rootKey = contentKeys[0];
		const root = xml[rootKey];
		if(!root || root instanceof Array || typeof root !== "object") {
			return null;
		}
		const childKeys = Object.keys(root).filter(key => key.indexOf("@") !== 0 && key !== "#text");
		const arrayKeys = childKeys.filter(key => root[key] instanceof Array);
		if(arrayKeys.length !== 1 || childKeys.length !== 1) {
			return null;
		}
		const arrayKey = arrayKeys[0];
		const view = {};
		view[arrayKey] = root[arrayKey];
		view[rootKey] = [root];
		return view;
	}
	function sikbView(xml, type, version) {
		if(type.startsWith("sikb/validatieresultaat/")) {
			const vres = js.get("s:Envelope.s:Body.ValidateResponse.ValidateResult", xml);
			return {
				Messages: Array.as(js.get("a:Validation.a:Messages.a:ValidationMessage", vres) || []),
				"Validate Result": [vres],
				Envelope: [xml["s:Envelope"]]
			};
		}
		if(parseFloat(version) >= parseFloat("12.0.0")) {
			return Xml.gml(xml);
		}
		if(js.get("bodeminformatie.metainformatie.@_versie", xml)) {
			const bi = xml.bodeminformatie;
			let locs, ozks, mpts, fils, bms, wms, vwn;
			return {
				Bodeminformatie: arrX(bi),
				Locaties: (locs = arrX(bi.locatie || [])),
				Onderzoeken: (ozks = locs.map(l => l.onderzoek || []).flat()),
				Meetpunten: (mpts = ozks.map(o => o.meetpunt || []).flat()),
				Lagen: (mpts.map(m => m.bodemlaag || []).flat()),
				Casingen: (mpts.map(m => m.casing || []).flat()),
				Afwerking: (mpts.map(m => m.afwerking || []).flat()),
				Filters: (fils = (mpts.map(m => m.filter || []).flat())),
				Bodemmonsters: (bms = mpts.map(m => m.bodemmonster || []).flat()),
				Watermonsters: (wms = fils.map(f => f.veldmonster || []).flat().filter(Array.fn.truthy)),
				Potten: bms.map(bm => bm.veldmonster).filter(Array.fn.truthy).map(bm => bm.barcode1 || bm.barcode2 || bm.barcode),
				Flessen: (wms.map(m => m.fles || []).flat()),
				Veldwaarnemingen: (vwn = bms.map(bm => bm.veldwaarneming || []).flat().concat(wms.map(wm => wm.veldwaarneming || []).flat()))
			};
		}
		if(xml.labresultaat) {
			const lr = xml.labresultaat;
			let amns;
			return {
				Project: arrX(lr.projectgegevens || []),
				Analysemonsters: (amns = arrX(js.get("projectgegevens.analysemonsters.analysemonster", lr) || [])),
				Analyseresultaten: (amns.map(amn => arrX(js.get("analyseresultaten.analyseresultaat", amn)).flat()).flat())
			};
		}
		return xml;
	}
	function tiView(xml) {
		return xml.VeldData ? Object.entries(xml.VeldData).reduce((t, o) =>
			((t[o[0].substring(3)] = o[1] instanceof Array ? o[1] : [o[1]]), t), {}) : null;
	}
	function xsdView(xml) {
		const schema = xml && xml["xs:schema"];
		return schema && Object.fromEntries(Object.entries(schema)
			.filter(e => !e[0].startsWith("@_"))
			.map(e => [e[0], e[1] instanceof Array ? e[1] : [e[1]]]));
	}
	function parseXmlDocument(text, doc, opts) {
		opts = opts || {};
		const started = Date.now();
		const timing = { timeline: [] };
		const addTimingStep = (name, stepStarted, extra) => {
			const ended = Date.now();
			const step = Object.assign({
				name: name,
				at: stepStarted - started,
				end: ended - started,
				duration: ended - stepStarted
			}, extra || {});
			timing.timeline.push(step);
			if(typeof window !== "undefined" && window.console && window.console.info instanceof Function) {
				window.console.info("[DocumentXml timing - " + Math.max(0, Math.round(step.end)) + "ms] parse:" + name, step);
			}
			return step.duration;
		};
		const ext = String(opts.ext || "").toLowerCase();
		let partStarted = Date.now();
		const inferredType = opts.type || (ext === "xml" || !ext ? Parser.determineType(text) : null) || ext;
		timing.determineType = addTimingStep("determineType", partStarted);
		partStarted = Date.now();
		const parseOptions = getXmlParseOptions(inferredType);
		timing.parseOptions = addTimingStep("parseOptions", partStarted);
		partStarted = Date.now();
		const xml = Xml.parse(text, parseOptions);
		if(parseOptions.decodeHTMLchar && !xmlParseSupportsEntityDecode()) {
			decodeXmlEntitiesInPlace(xml);
		}
		timing.parse = addTimingStep("parse", partStarted);
		partStarted = Date.now();
		let gmlType = null;
		if(inferredType === "xml" || inferredType === "gml" || ext === "gml") {
			gmlType = classifyGmlDocument(xml, text, ext);
			timing.classify = addTimingStep("classify", partStarted);
		} else {
			timing.classify = addTimingStep("classify", partStarted, { skipped: true, type: inferredType });
		}
		const type = (gmlType && (inferredType === "xml" || ext === "gml") ? gmlType : inferredType) || ext;
		const version = type.split("/").pop();
		let view;

		partStarted = Date.now();
		if(type.startsWith("sikb/")) {
			view = sikbView(xml, type, version);
		} else if(type.startsWith("kl/")) {
			view = Xml.gml(xml);
		} else if(type === "ti" || ext === "ti") {
			view = tiView(xml);
		} else if(ext === "xsd") {
			view = xsdView(xml);
		} else {
			view = getXmlCollectionView(xml) || xml;
		}
		timing.view = addTimingStep("view", partStarted);
		timing.total = Date.now() - started;
		timing.type = type;
		timing.version = version;

		return {
			type: type,
			version: version,
			xml: xml,
			root: xml,
			view: view || xml,
			timing: timing,
			capabilities: {
				gml: !!gmlType,
				xml: true,
				view: true
			}
		};
	}

	return {
		parse: parseXmlDocument,
		parseXmlDocument: parseXmlDocument
	};
});

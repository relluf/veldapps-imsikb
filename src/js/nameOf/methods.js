define(function(require) {

	var rxe = require("veldapps-xml/index").replaceXmlEntities;
	var lookup = (str) => require("../../lookup")(str);
	var guess = (obj) => require("../../guess")(obj);
	// var joinNames = (names, ch) => names.filter(v => v).map(v=>js.nameOf(v)).join(ch || ": ");
	var sampleDepthTextOf = (value) => {
		if(value === undefined || value === null) return "";
		if(typeof value !== "object") return String(value);

		var depth = js.get("immetingen:Depth", value) ||
			js.get("imsikb0101:Depth", value) ||
			js.get("Depth", value) ||
			value;
		var measure = js.get("immetingen:value", depth) ||
			js.get("imsikb0101:value", depth) ||
			js.get("value", depth) ||
			depth;

		return js.get("#text", measure) ||
			(typeof measure !== "object" ? String(measure) : "") ||
			js.get("#text", depth) ||
			(typeof depth !== "object" ? String(depth) : "");
	};
	var sampleDepthUomOf = (value) => {
		if(!value || typeof value !== "object") return "";

		var depth = js.get("immetingen:Depth", value) ||
			js.get("imsikb0101:Depth", value) ||
			js.get("Depth", value) ||
			value;
		var measure = js.get("immetingen:value", depth) ||
			js.get("imsikb0101:value", depth) ||
			js.get("value", depth) ||
			depth;

		return js.get("@_uom", measure) ||
			js.get("@uom", measure) ||
			js.get("uom", measure) ||
			js.get("@_uom", depth) ||
			js.get("@uom", depth) ||
			js.get("uom", depth) ||
			"";
	};
	var sampleDepthCmOf = (value) => {
		var text = sampleDepthTextOf(value);
		var match = String(text || "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
		if(!match) return null;

		var number = parseFloat(match[0]);
		var uom = sampleDepthUomOf(value);
		if(!isFinite(number)) return null;
		if(/\bmm\b/i.test(text) || /Eenheid:id:66\b|eenheid:id:66\b/.test(uom)) return number / 10;
		if(/\bm(?:eter)?(?:\b|-mv)/i.test(text) || /Eenheid:id:115\b|eenheid:id:115\b/.test(uom)) return number * 100;
		return number;
	};
	var sampleValueForKeys = (obj, keys) => {
		for(var i = 0; i < keys.length; ++i) {
			if(obj[keys[i]] !== undefined && obj[keys[i]] !== null) return obj[keys[i]];
		}
	};
	var formatSampleDepthCm = (value) => value % 1 === 0 ? js.sf("%d", value) : js.sf("%s", value.toFixed(1));
	var sampleDepthRangeNameOf = (obj) => {
		var upper = sampleDepthCmOf(sampleValueForKeys(obj, ["imsikb0101:upperDepth", "immetingen:upperDepth", "upperDepth"]));
		var lower = sampleDepthCmOf(sampleValueForKeys(obj, ["imsikb0101:lowerDepth", "immetingen:lowerDepth", "lowerDepth"]));

		if(upper === null || lower === null) return "";
		return js.sf("%s-%scm", formatSampleDepthCm(upper), formatSampleDepthCm(lower));
	};
	var sampleNameOf = (obj) => {
		var name = obj['imsikb0101:name'] || obj['immetingen:name'] || obj.name;
		var depth = sampleDepthRangeNameOf(obj);

		if(!name || !depth || /\(\s*-?\d+(?:[.,]\d+)?\s*-\s*-?\d+(?:[.,]\d+)?\s*(?:cm|m)?\s*\)$/.test(name)) return name;
		return js.sf("%s (%s)", name, depth);
	};
	var personNameOf = (obj) => {
		var ln = sampleValueForKeys(obj, ["immetingen:lastName", "imsikb0101:lastName", "lastName"]);
		var fn = sampleValueForKeys(obj, ["immetingen:firstName", "imsikb0101:firstName", "firstName"]);

		if(fn === ln) return ln && js.nameOf(ln);
		return [ln, fn].filter(v=>v).map(v=>js.nameOf(v)).join(", ");
	};
	var remediationNameOf = (obj) => {
		var transition = [
			sampleValueForKeys(obj, ["imsikb0101:destinationBeforeRemediation", "destinationBeforeRemediation"]),
			sampleValueForKeys(obj, ["imsikb0101:destinationAfterRemediation", "destinationAfterRemediation"])
		].filter(v=>v).map(v=>js.nameOf(v)).join(" => ");

		return transition || [
			sampleValueForKeys(obj, ["imsikb0101:remediationReason", "remediationReason"]),
			sampleValueForKeys(obj, ["imsikb0101:startTime", "startTime"])
		].filter(v=>v).map(v=>js.nameOf(v)).join(", ");
	};
	var modernFinishingNameOf = (obj) => {
		var traject = js.sf("%n-%n",
			obj['imsikb0101:upperDepth'] || "?",
			obj['imsikb0101:lowerDepth'] || "?");
		var finishing = [
			obj['imsikb0101:finishingType'],
			obj['imsikb0101:finishingMaterial']
		].filter(v=>v).map(v=>js.nameOf(v)).join(": ");
		return [traject, finishing].filter(v=>v).join(" ");
	};
	
	require("js/nameOf").methods.push(
		(obj) => {
				// Waarde en Omschrijving zijn niet consequent ingevuld
				// - als ze allebei een string zijn, dan worden de kortste teruggegeven
				// - als waarde een nummer is, dan wordt omschrijving genomen
				var w, o = (obj.Omschrijving || obj.omschrijving) || (obj.Naam || obj.naam);
				if(obj.ID && (w=obj.Waarde||obj.waarde||obj.Code)) {
					if((typeof w === "string" && w !== w.toUpperCase()) && typeof o === "string") {
						return w.length < o.length ? w : o;
					}
					return o || w || "?";
				}	
		},
		(obj) => {
			var keys = Object.keys(obj);
			if(keys.length === 1) {
				obj = obj[keys[0]];
				if(keys[0].startsWith("immetingen:") && obj.xs) {
					return;
				}
				
				if(keys[0].startsWith("immetingen:AnalyticResult")) {
					var nv = obj['immetingen:numericValue'];
					var av = obj['immetingen:alphanumericValue'];
					return (!nv && av) || js.sf("%s %s %s", 
						rxe(obj['immetingen:limitSymbol'])||"", 
						Math.f(nv['#text']), js.get("Code", lookup(nv['@_uom'] || nv.uom)) || "");
				}
				if(keys[0] === "immetingen:Analysis") {
					// return js.nameOf(obj['immetingen:physicalProperty']);
					return [
						obj['immetingen:physicalProperty'] && js.nameOf(obj['immetingen:physicalProperty']),
						obj['om:result'] && js.nameOf(obj['om:result'])
					].filter(v=>v).map(v=>js.nameOf(v)).join(": ");
				}
				if(keys[0] === "immetingen:AnalysisProcess") {
					return [
						obj['immetingen:certification']
					].filter(v=>v).map(v=>js.nameOf(v)).join(", ");
				}
				if(keys[0] === "immetingen:Characteristic") {
					return [
						obj['immetingen:indicator'] && js.nameOf(obj['immetingen:indicator']),
						obj['om:result'] && js.nameOf(obj['om:result'])
					].filter(v=>v).map(v=>js.nameOf(v)).join(": ");
				}
				if(keys[0] === "immetingen:Depth") {
					return js.sf("%s %s", 
						Math.f(js.get("immetingen:value.#text", obj)),
						js.get("Code", lookup(js.get("immetingen:value.@_uom", obj))));
				}
				if(keys[0] === "immetingen:MeasureResult") {
					var nv = obj['immetingen:numericValue'];
					return js.sf("%s %s %s", 
						obj['immetingen:limitSymbol']||"", 
						Math.f(nv['#text']), js.get("Code", lookup(nv['@_uom'])) || "");
					
				}
				if(keys[0] === "immetingen:PhysicalProperty") {
					if(!obj.hasOwnProperty("immetingen:parameter")) {
						return [
							obj['immetingen:quantity'],
							obj['immetingen:condition']
						].filter(v=>v).map(v=>js.nameOf(v)).join(": ");
					} else {
						return obj['immetingen:parameter'] && js.nameOf(obj['immetingen:parameter']);
					}
				}
				if(keys[0] === "immetingen:Package") {
					return [
						obj['immetingen:packageType'],
						obj['immetingen:barcode']
					].filter(v=>v).map(v=>js.nameOf(v)).join(": ");
				}
				if(keys[0] === "immetingen:Person") {
					return personNameOf(obj);
				}
				if(keys[0] === "imsikb0101:Activity") {
					return js.sf("%s (%s-%s)", 
						js.nameOf(obj['imsikb0101:UBI']) || "?", 
						obj['imsikb0101:startTime'] || "?", 
						obj['imsikb0101:endTime'] || "?");
				}
				if(keys[0] === "imsikb0101:Address") {
					return [
						obj['imsikb0101:publicSpace'],
						obj['imsikb0101:zipcode'],
						obj['imsikb0101:city']
					].filter(v=>v).map(v=>js.nameOf(v)).join(", ");
				}
				if(keys[0] === "imsikb0101:ContaminationInformation") {
					// var d = (depth) => js.get("immetingen:value.#text", obj["immetingen:" + depth + "Depth"], obj);
					// return js.sf("%s-%s %n", d("upper"), d("lower"), obj['imsikb0101:exceededClass']||"?");
					return obj['imsikb0101:exceededClass'] && js.nameOf(obj['imsikb0101:exceededClass']);
				}
				if(keys[0] === "imsikb0101:Cost") {
					return [obj['imsikb0101:amount'], obj['imsikb0101:determinationMethod'] && 
						js.nameOf(obj['imsikb0101:determinationMethod'])].filter(v=>v).join(", ");
				}
				if(keys[0] === "imsikb0101:CurrentUsage") {
					var cu = obj['imsikb0101:landuseType'];
					return cu && (js.sf("%s (%s%%)", js.nameOf(cu), obj['imsikb0101:coveragePercentage']) || "?");
				}
				if(keys[0] === "imsikb0101:Decision") {
					return [
						obj['imsikb0101:decisionType'],
						obj['imsikb0101:statusOfDecision']
					].filter(v => v).map(v => js.nameOf(v)).join(", ");
				}
				if(keys[0] === "imsikb0101:DestinationAfterRemediation") {
					return js.nameOf(obj['imsikb0101:destinationType']);
				}
				if(keys[0] === "imsikb0101:Dossier") {
					return (obj['imsikb0101:soilLocation'] && js.nameOf(obj['imsikb0101:soilLocation'])) || [
						obj['imsikb0101:dossierIdLocalAuthority'],
						obj['imsikb0101:dossierIdNotLocalAuthority']
					].filter(v=>v).join("/");
				}
				if(keys[0] === "imsikb0101:Layer") {
					return js.sf("%n-%n %n", 
						// js.get(["imsikb0101:upperDepth", "immetingen:Depth", "immetingen:value", "#text"], obj),
						obj['imsikb0101:upperDepth'] || "?", 
						obj['imsikb0101:lowerDepth'] || "?", 
						obj['imsikb0101:layerType'] || "");
					
				}
				if(keys[0] === "imsikb0101:Finishing") {
						return modernFinishingNameOf(obj);
				}
				if(keys[0] === "imsikb0101:Nature") {
					return obj['imsikb0101:physicalProperty'] && js.nameOf(obj['imsikb0101:physicalProperty']);
				}
				if(keys[0] === "imsikb0101:Person") {
					return personNameOf(obj);
				}
				if(keys[0] === "imsikb0101:Sample") {
					return sampleNameOf(obj);
				}
				if(keys[0] === "imsikb0101:Remediation") {
					return remediationNameOf(obj);
				}
				if(keys[0] === "imsikb0101:SourceSystem") {
					return js.sf("%s @ %n", obj['imsikb0101:applicationID'], obj['imsikb0101:application']);
				}
				// if(keys[0] === "imsikb0101:SoilLocation") {
				// 	return obj['imsikb0101:name'] || js.nameOf(obj['imsikb0101:Addresses']);
				// }
				if(keys[0] === "imsikb0101:UBI") {
					return js.nameOf(obj);
				}
				if(keys[0] === "om:ObservationContext") {
					return [
						obj['om:role'],
						obj['om:relatedObservation']
					].filter(v=>v).map(v=>js.nameOf(v)).join(" ");
				}
				if(keys[0] === "sam:SamplingFeatureComplex") {
					var rsf = obj['sam:relatedSamplingFeature'];
					var role = obj['sam:role'];
					return [role && js.nameOf(role), rsf && js.nameOf(rsf)].filter(v => v).join(": ");
				}
				if(keys[0] === "immetingen:NEN3610ID") {
					return obj['immetingen:lokaalID'];
				}
			}
		},
		(obj) => {
			if(guess(obj) === "Sample") {
				return sampleNameOf(obj);
			}
		},
		(obj) => obj['imsikb0101:name'],
		(obj) => obj['immetingen:name'],
		(obj) => {
			
			if(obj['immetingen:physicalProperty']) {
			// TODO duplicate code in this file			
				return [
					obj['immetingen:physicalProperty'] && js.nameOf(obj['immetingen:physicalProperty']),
					obj['om:result'] && js.nameOf(obj['om:result'])
				].filter(v=>v).map(v=>js.nameOf(v)).join(": ");
			}
			if(obj['imsikb0101:publicSpace'] || obj['imsikb0101:zipcode'] || obj['imsikb0101:districtCode'] || obj['imsikb0101:city']) {
			// TODO duplicate code in this file			
				return [
					obj['imsikb0101:publicSpace'],
					obj['imsikb0101:zipcode'],
					obj['imsikb0101:districtCode'],
					obj['imsikb0101:city'],
					obj['imsikb0101:country'],
				].filter(v=>v).map(v=>js.nameOf(v)).join(", ");
			}
			if(obj['immetingen:firstName'] || obj['immetingen:lastName'] || obj['imsikb0101:firstName'] || obj['imsikb0101:lastName'] || obj.firstName || obj.lastName) {
				return personNameOf(obj);
			}
			if(obj['imsikb0101:destinationBeforeRemediation'] || obj['imsikb0101:destinationAfterRemediation'] ||
					obj['imsikb0101:remediationReason'] || obj['imsikb0101:amountCleaned']) {
				return remediationNameOf(obj);
			}

			var ent = guess(obj);//.split(":").pop();
			if(ent === "Meetpunt") {
				return obj.code;
			}
			if((ent === "Bodemlaag" || ent === "Bodemmonster" || ent === "Filter") && js.get("onderkant", obj) !== undefined) {
				if(js.get("onderkant.@_diepte", obj) !== undefined) {
					return js.sf("%s-%s m", Math.f(js.get("bovenkant.@_diepte", obj)), Math.f(js.get("onderkant.@_diepte", obj)));
				}
				return js.sf("%s-%s m", js.get("bovenkant", obj), js.get("onderkant", obj));
			}
			if(ent === "Finishing") {

				return modernFinishingNameOf(obj);

			}

			if(ent === "Afwerking") {
				if(js.get("tot", obj) !== undefined) {
					return js.sf("%s-%s m", Math.f(js.get("van.@_diepte", obj)), Math.f(js.get("tot.@_diepte", obj)));
				}
				return js.sf("%s-%s m", Math.f(js.get("bovenkant", obj)), Math.f(js.get("onderkant", obj)));
			}
			if(ent === "Point") {
				return js.sf("[%s, %s]", obj['@_xcoord'], obj['@_ycoord']);
			}
			if(ent === "Diepte") {
				return js.sf("%s m", Math.f(obj['@_diepte']));
			}
			if(ent === "Subject") {
				return obj.contactpersoon;
			}
			if(ent === "Analyseresultaat") {
				return js.sf("%n: %s %n", obj['@_componentid-urn'], rxe(obj.meetwaarde_oms||"") || obj.meetwaarde, obj['@_eenheid-urn']);
			}
			if(obj.hasOwnProperty("meetpunt")) {
				var code = js.get("meetpunt.code", obj);//, naam = obj.naam;
				if(obj.hasOwnProperty("van") && obj.hasOwnProperty("tot")) {
					return js.sf("%s-%s m", Math.f(js.get("van.@_diepte", obj)), Math.f(js.get("tot.@_diepte", obj)));
				}
				if(js.get("onderkant.@_diepte", obj) !== undefined) {
					return js.sf("%s-%s m", Math.f(js.get("bovenkant.@_diepte", obj)), Math.f(js.get("onderkant.@_diepte", obj)));
				}
				if(js.get("onderkant", obj) !== undefined) {
					return js.sf("%s-%s m", Math.f(js.get("bovenkant", obj)), Math.f(js.get("onderkant", obj)));
				}
			}
			if(obj['@_va:filter'] && obj['@_va:analysemonsters']) {
				return js.nameOf(obj['@_va:filter']);
			}
			if(obj['@_va:bodemmonster'] && obj['@_va:analysemonsters']) {
				return js.nameOf(obj['@_va:bodemmonster']);
			}
			if(obj['@_toetskader']) {
				return js.sf("T%s: %s", obj['@_toetskader'], obj.getalswaarde || "?");
			}
		},
		(obj) => {
			if(typeof obj === "string" && obj.indexOf("urn:") === 0) {
				const lu = lookup(obj);
				const id = obj.split(":").pop();
				if(lu) {
					return js.sf("%s (urn:%d)", js.nameOf(lu), id);
				}
				return obj;
			}
		}
	);
	require("js/nameOf").methods.after.push(
		(obj) => js.get(["imsikb0101:identification", "immetingen:NEN3610ID", "immetingen:lokaalID"], obj),
		(obj) => obj['gml:timePosition'],
		(obj) => obj['@_xlink:href-resolved'] ? js.nameOf(obj['@_xlink:href-resolved']) : undefined,
		(obj) => obj['_@xlink:href-resolved'] ? js.nameOf(obj['_@xlink:href-resolved']) : undefined
	);
});

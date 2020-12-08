define(function(require) {

	var rxe = require("veldapps-xml/index").replaceXmlEntities;
	var lookup = (str) => require("../../lookup")(str);
	var guess = (obj) => require("../../guess")(obj);
	// var joinNames = (names, ch) => names.filter(v => v).map(v=>js.nameOf(v)).join(ch || ": ");
	
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
				if(keys[0].startsWith("immetingen:AnalyticResult")) {
					var nv = obj['immetingen:numericValue'];
					var av = obj['immetingen:alphanumericValue'];
					return (!nv && av) || js.sf("%s %s %s", 
						rxe(obj['immetingen:limitSymbol'])||"", 
						nv['#text'], js.get("Code", lookup(nv['@_uom'])) || "");
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
						js.get("immetingen:value.#text", obj), 
						js.get("Code", lookup(js.get("immetingen:value.@_uom", obj))));
				}
				if(keys[0] === "immetingen:NEN3610ID") {
					return obj['immetingen:lokaalID'];
				}
				if(keys[0] === "immetingen:MeasureResult") {
					var nv = obj['immetingen:numericValue'];
					return js.sf("%s %s %s", obj['immetingen:limitSymbol']||"", nv['#text'], js.get("Code", lookup(nv['@_uom'])) || "");
					
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
					return [
						obj['immetingen:lastName'],
						obj['immetingen:firstName'],
					].filter(v=>v).map(v=>js.nameOf(v)).join(", ");
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
					return js.sf("%n-%n %n", 
						// js.get(["imsikb0101:upperDepth", "immetingen:Depth", "immetingen:value", "#text"], obj),
						obj['imsikb0101:upperDepth'] || "?", 
						obj['imsikb0101:lowerDepth'] || "?", 
						obj['imsikb0101:layerType'] || "");
				}
				if(keys[0] === "imsikb0101:Nature") {
					return obj['imsikb0101:physicalProperty'] && js.nameOf(obj['imsikb0101:physicalProperty']);
				}
				if(keys[0] === "imsikb0101:Person") {
					var ln = obj['imsikb0101:lastName'];
					var fn = obj['imsikb0101:firstName'];
					if(fn === ln) return ln;
					return [ln,fn].filter(v=>v).map(v=>js.nameOf(v)).join(", ");
				}
				if(keys[0] === "imsikb0101:Remediation") {
					return [
						obj['imsikb0101:destinationBeforeRemediation'],
						obj['imsikb0101:destinationAfterRemediation']
					].filter(v=>v).map(v=>js.nameOf(v)).join(" => ");
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
			}
		},
		(obj) => obj['imsikb0101:name'],
		(obj) => obj['immetingen:name'],
		(obj) => {
			var ent = guess(obj);//.split(":").pop();
			if(ent === "Meetpunt") {
				return obj.code;
			}
			if((ent === "Bodemlaag" || ent === "Bodemmonster" || ent === "Filter") && js.get("onderkant")) {
				return js.sf("%s-%s m", js.get("bovenkant.@_diepte", obj), js.get("onderkant.@_diepte", obj));
			}
			if(ent === "Afwerking") {
				return js.sf("%s-%s m", js.get("van.@_diepte", obj), js.get("tot.@_diepte", obj));
			}
			if(ent === "Point") {
				return js.sf("[%s, %s]", obj['@_xcoord'], obj['@_ycoord']);
			}
			if(ent === "Diepte") {
				return js.sf("%s m", obj['@_diepte']);
			}
			if(ent === "Subject") {
				return obj.contactpersoon;
			}
			if(ent === "Analyseresultaat") {
				return js.sf("%n: %s %n", obj['@_componentid-urn'], rxe(obj.meetwaarde_oms||"") || obj.meetwaarde, obj['@_eenheid-urn']);
			}
			if(obj.hasOwnProperty("van") && obj.hasOwnProperty("tot")) {
				return js.sf("%s-%s m", js.get("van.@_diepte", obj), js.get("tot.@_diepte", obj));
			}
			if(js.get("onderkant", obj)) {
				return js.sf("%s-%s m", js.get("bovenkant.@_diepte", obj), js.get("onderkant.@_diepte", obj));
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
		(obj) => typeof obj === "string" && obj.indexOf("urn:") === 0 ? (obj = lookup(obj)) && js.nameOf(obj) : undefined
	);
	require("js/nameOf").methods.after.push(
		(obj) => js.get(["imsikb0101:identification", "immetingen:NEN3610ID", "immetingen:lokaalID"], obj),
		(obj) => obj['gml:timePosition'],
		(obj) => obj['_@xlink:href-resolved'] ? js.nameOf(obj['_@xlink:href-resolved']) : undefined
	);
});
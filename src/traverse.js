define(["./guess"], function(guessSikbEntity) { 
return function traverse(root, handlers, cache) {
	if(!cache) cache = { objs: [], result: {} };
	if(root === undefined) return;
	if(cache.objs.indexOf(root) !== -1) return;
	
	cache.objs.push(root);

	var handle = (type, instance) => {
		var mth = handlers && (handlers[type] || handlers['*']);
		if(mth) {
			mth(instance, type);
		}
		if(!cache.result[type]) {
			cache.result[type] = [];
		}
		if(!cache.result[type].includes(instance)) {
			cache.result[type].push(instance);
		}
	};
	
	if(root instanceof Array) {
		root.forEach(obj => traverse(obj, handlers, cache));
	} else {
		Object.keys(root).forEach(key => {
			var value = root[key], keys;
			
			if(key === '@_xlink:href-resolved') {
				traverse(value, handlers, cache);
			} else if(key.startsWith("imsikb0101:")) {
				key = key.split(":").pop();
	
				if(key.charAt(0) === key.charAt(0).toUpperCase()) {
					// imsikb0101 - entity instance
					handle(key, value);
				}
	
				if(key === "Project") {
					// TODO enkel wanneer geen coordinaat
					traverse(value['imsikb0101:measurementObjects'], handlers, cache);
					
					
				} else if(key === "Borehole") {
					traverse(value['sam:relatedSamplingFeature'], handlers, cache);
					
					
				} else if(key === "Layer") {
					// traverse()
					
					
				} else if(key === "Sample") {
					if(value['sam:relatedObservation']) {
						traverse(value['sam:relatedObservation'], handlers, cache);
					}

					var arr = Array.as(value['sam:relatedSamplingFeature']||[]);
					
					// InMengMonster
					var r9 = arr.filter(_ => js.get("sam:SamplingFeatureComplex.sam:role.@_xlink:href", _)
						.split(":").pop() === "9")
						.map(_ => js.get([
							"sam:SamplingFeatureComplex","sam:relatedSamplingFeature",
							"@_xlink:href-resolved"
						], _)).filter(_ => _);
						
					// HeeftDeelmonster
					var r10 = arr.filter(_ => js.get("sam:SamplingFeatureComplex.sam:role.@_xlink:href", _)
						.split(":").pop() === "10")
						.map(_ => js.get([
							"sam:SamplingFeatureComplex","sam:relatedSamplingFeature",
							"@_xlink:href-resolved"//, "imsikb0101:Sample"
						], _)).filter(_ => _);
						
						try {
							traverse(r9, handlers, cache);
							traverse(r10, handlers, cache);
						} catch(e) {
							console.log(e);
						}

				} if(key === "usedInProject") {
					traverse(value['imsikb0101:usedInProject'], handlers, cache);
				}
			} else if(key === "sam:SamplingFeatureComplex") {
				traverse(value['sam:relatedSamplingFeature'], handlers, cache);
			} else {
				keys = key.split(":");
				if(keys.length > 1 && (keys[1].charAt(0) === keys[1].charAt(0).toUpperCase())) {
					handle(key, value);
					// some entity instance
				}

				if(keys.length === 1 || keys[0] === "sikb") {
					var entity = keys[1] || guessSikbEntity(value);
					
					if(entity === "Onderzoek") {
						handle("sikb:Onderzoek", value);
						
						// Array.as(value.bodemlaag||[]).forEach(_ => _ && handle("sikb:Bodemlaag", _));
						
					} else if(entity === "Meetpunt") {
						handle("sikb:Meetpunt", value);
						Array.as(value.bodemlaag||[]).forEach(_ => _ && handle("sikb:Bodemlaag", _));
						Array.as(value.bodemmonster||[]).forEach(bodemmonster => {
							handle("sikb:Bodemmonster", bodemmonster);
							Array.as(js.get("@_va:veldmonster.@_va:analysemonsters", bodemmonster)||[]).forEach(analysemonster => {
								handle("sikb:Analysemonster", analysemonster);
								Array.as(analysemonster.analyseresultaat||[]).forEach(analyseresultaat => {
									handle("sikb:Analyseresultaat", analyseresultaat);
								});
							});
						});
						Array.as(value.filter||[]).forEach(filter => {
							handle("sikb:Filter", filter);
							Array.as(filter['@_va:veldmonsters']||[]).forEach(veldmonster => {
								Array.as(js.get('@_va:analysemonsters', veldmonster)||[]).forEach(analysemonster => {
									handle("sikb:Analysemonster", analysemonster);
									Array.as(analysemonster.analyseresultaat||[]).forEach(analyseresultaat => {
										handle("sikb:Analyseresultaat", analyseresultaat);
										analyseresultaat['@_va:analysemonster'] = analysemonster;
									});
								});
							});
						});
						Array.as(value.afwerking||[]).forEach(_ => _ && handle("sikb:Afwerking", _));
					}
				}
			}
			
		});
	}

	return cache.result;
}});

/*- 2020-10-05 Produce JSON file for all xml files found in subdirs */
	var SUBDIR = ["immetingen", "imsikb0101"][1];

	var Parser = require("fast-xml-parser");
	var parse = (source) => Parser.parse(source, {ignoreAttributes:false});
	
	var result = {};
	
	require("devtools/Resources")
		.list(js.sf("%s/%s/xmls", js.up(this.vars(["resource.uri"])), SUBDIR))
		.then(resources => /*- resources: all xml files */
			Promise.all(resources.filter(resource => resource.uri.endsWith(".xml"))
				.map(resource => 
					fetch("/home/" + resource.uri).then(response => response.text()
						.then(text => 
							result[resource.uri.split("/").pop()] = parse(text)
						))
				))
				.then(docs => { /*- docs: an array with all parsed xml docs */
					return docs.reduce((all, doc) => {
						doc = doc['sikb.lookup']; // find the array, strip stuff
						
						var key = Object.keys(doc).filter(k => k.startsWith("sikb.") && k.endsWith("_c")).pop();
						if(key) {
							all[key] = doc[key];
						}
						return all;
					}, {});
					// return docs.reduce((all, doc) => {
					// 	doc = doc['sikb.lookup']; // find the array, strip stuff
					// 	Object.keys(doc)
					// 		.filter(k => k.startsWith("sikb.") && k.endsWith("_c"))
					// 		.map(k => {
					// 			var p = (js.get([k, k.substring(5, k.length - 2)], doc)||doc);
					// 			return (all[k.substring(5, k.length - 2)] = p);
					// 		});
							
					// 	return all;
					// }, {});
				})
		)
		.then(docs => { /*- docs: JS object with key/value pairs to all parsed xml docs */
			var tab = this.udr("#editor-needed").execute({
				resource: { uri: js.sf("./%s-all.json", SUBDIR) } 
			});
			var ace = tab.down("#ace");
			if(ace) {
				ace.setValue(js.sj(docs));
			} else {
				tab.once("resource-loaded", () => tab.down("#ace").setValue(js.sj(docs)));
			}
			return docs;
		});
		
		
	// urls.map(_ => req("text!home/" + this._uri.substring(6) + "xmls/" + _.split("/").pop())); 
	
	// result;
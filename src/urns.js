define(function(require) {

	var lowerkeys = (obj) => Object.keys(obj).reduce((a, key) => { 
		var newkey = key.toLowerCase();
		newkey = newkey.substring(5, newkey.length - 2);
		
		var arrkey = Object.keys(obj[key]).filter(_ => obj[key][_] instanceof Array).pop();
		var arr = obj[key][arrkey];
		if(!(arr instanceof Array)) return a;
		
		a[newkey] = (a[arrkey.toLowerCase()] = arr.reduce(function(acc, obj) {
			acc[obj.ID] = obj;
			return acc;
		}, {}));
		return a; 
	}, {});
	var urns = {
		immetingen: lowerkeys(require("json!./current/immetingen-all")),
		imsikb0101: lowerkeys(require("json!./current/imsikb0101-all"))
	};
	function alias(target, key, source) {
		if(!target[key] && source) {
			target[key] = source;
		}
	}

// `#VA-20200923-1` Katwijk1-500.xml
	alias(urns.imsikb0101, "onderzoektype", urns.imsikb0101.ond_type);
	alias(urns.imsikb0101, "onderzoekaanleidingen", urns.imsikb0101.aanleiding);
	alias(urns.imsikb0101, "contour", urns.imsikb0101.contourtype);
	alias(urns.immetingen, "meting", urns.immetingen.meetobjectsoort);
	
// 180116.xml - TerraIndex ![image](https://user-images.githubusercontent.com/686773/95287341-42aa3900-082b-11eb-930e-9d5ab67d0365.png)
	alias(urns.immetingen, "situatiebeschrijving", urns.imsikb0101.situatiebeschrijving);
	alias(urns.immetingen, "bodemlaagbijzonderheden", urns.immetingen.bodemlaagbodemkenmerken);
	alias(urns.immetingen, "bodemlaagbijzonderhedengradatie", urns.immetingen.bodemlaagbodemkenmerkengradatie);

	return urns;	
});

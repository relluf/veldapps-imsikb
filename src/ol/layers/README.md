# imsikb0101 OpenLayers layers

Deze map bevat kleine OpenLayers-adapters voor imsikb0101 objecttypen. De eenvoudige modules, zoals `Project.js`, `SoilLocation.js` en `Trench.js`, definieren alleen een `spec` en geven daarna `Common.layerApi(spec)` terug.

```js
const spec = {
	key: "Project",
	name: "Project",
	title: "Project",
	keys: [
		"imsikb0101:Project",
		"Project"
	],
	style: Common.styleWith("rgba(245, 158, 11, 0.24)", "rgba(245, 158, 11, 0.92)", 6),
	legend: [{ color: "rgba(255, 204, 51, 0.25)", borderColor: "#ff9900", title: "Project", radius: "0" }]
};

return Common.layerApi(spec);
```

# Layer specs

Een `spec` beschrijft hoe een imsikb0101 objecttype als kaartlaag wordt gelezen en weergegeven.

- `key`: stabiele interne key voor feature metadata en layer keys.
- `name`: objecttype dat op de feature komt als `sikb:type`.
- `title`: label voor de kaartlaag.
- `keys`: XML/root-property namen waarmee objecten van dit type worden gevonden.
- `style`: OpenLayers style voor de vectorlaag.
- `legend`: metadata voor de layer tree/legend.
- `createFeature`: optioneel. Vervangt de default feature-creatie voor dit type.

De `keys` beschrijven dus de objectcollectie, niet de geometry property. Bijvoorbeeld `Project.keys` zegt: vind objecten onder `imsikb0101:Project` of `Project`.

# layerApi(spec)

`Common.layerApi(spec)` maakt een standaard API-object:

```js
{
	spec,
	collectObjects(result),
	collectFeatures(result, opts),
	addToMap(OL, info, result, opts),
	createFeature(obj, index, context)
}
```

## collectObjects(result)

`collectObjects` gebruikt `Common.collectObjectsForSpec(result, spec)`. Die route maakt een `DocumentModel` van het parse-resultaat en roept daarna:

```js
context.model.collect(spec.keys || [])
```

`DocumentModel.collect(...)` probeert eerst snelle paden:

1. Directe root-collecties, bijvoorbeeld een root met `imsikb0101:Borehole: [...]`.
2. Een `featureMember` index, voor klassieke GML feature collections.
3. Pas als fallback: een diepere zoekactie tot een match.

Daardoor hoort een document met bekende root-arrays niet volledig doorzocht te worden om hoofdfeatures te verzamelen.

## collectFeatures(result, opts)

`collectFeatures` doet:

1. Maak of hergebruik een layer context.
2. Verzamel objecten via `spec.keys`.
3. Indexeer die objecten voor id/reference lookups.
4. Maak per object een `ol.Feature`.
5. Filter objecten zonder geometry weg.

De default feature krijgt onder andere:

```js
feature.set("name", name);
feature.set("sikb:type", type);
feature.set("sikb:name", name);
feature.set("sikb:id", objectKeyOf(obj));
feature.set("sikb:object", obj);
feature.set("sikb:layerKey", spec.key || spec.name);
feature.set("sikb:spec", spec);
```

Daarnaast worden `spec.keys` en `spec.key` als property op de feature gezet met het bronobject als value. Dat maakt downstream inspectie en bestaande kaartcode eenvoudiger.

## addToMap(OL, info, result, opts)

`addToMap` verzamelt features, maakt een vector layer en registreert die in de kaart/layer tree. Als `opts.features` is meegegeven, worden die features gebruikt in plaats van opnieuw te verzamelen.

De documentgerichte helper `Document.js` gebruikt dezelfde laagmodules, maar batcht meerdere entity layers samen. Voor `Document (alles)` is dat meestal de voorkeursroute.

# Geometry

Er is op dit moment geen geometry property in de layer `spec`. Geometry wordt centraal en conventie-gebaseerd gevonden via:

```js
Geometry.cachedOpenLayersGeometryFrom(context, obj)
```

Die roept `Geometry.openLayersGeometryFrom(obj)` aan en cachet het resultaat per bronobject in `context.geometryCache`.

De geometry resolver zoekt in het object naar bekende IMSIKB/GML properties:

```js
[
	"gml:Point",
	"gml:Polygon",
	"gml:MultiSurface",
	"immetingen:geometry",
	"imsikb0101:geometry",
	"immetingen:geometrie",
	"imsikb0101:geometrie",
	"sam:shape",
	"shape",
	"geometrie",
	"geometry",
	"gml:geometry"
]
```

Als die keys niets opleveren, is er nog een laatste fallback: een eigen property waarvan de naam lijkt op `Point`, `Polygon`, `MultiSurface`, `geometrie` of `geometry`.

Daarna wordt de gevonden geometry kandidaat geconverteerd:

- `gml:Point` of `gml:pos` wordt een `ol.geom.Point`.
- `gml:Polygon`, `gml:MultiSurface` of `gml:posList` wordt een `ol.geom.Polygon` of `ol.geom.MultiPolygon`.
- Coordinaten worden waar nodig naar RD (`EPSG:28992`) getransformeerd.

Kort gezegd: `spec.keys` vertelt welke objecten in de laag zitten; `Geometry.openLayersGeometryFrom(...)` bepaalt op basis van bekende propertynamen waar de geometry in elk object staat.

# Wanneer een custom createFeature?

Gebruik `spec.createFeature` alleen als het objecttype afwijkende feature metadata, geometrylogica of stylinginformatie nodig heeft. De default is genoeg voor de meeste imsikb0101 entity layers.

Voorbeeldvorm:

```js
const spec = {
	key: "Example",
	name: "Example",
	title: "Examples",
	keys: ["imsikb0101:Example", "Example"],
	createFeature: (obj, type, index, geometry, context) => {
		const feature = Common.createFeature(obj, type, index, geometry, context);
		if(feature) {
			feature.set("example:extra", obj);
		}
		return feature;
	}
};
```

# BoreholeProfilePreview

`Borehole.js` gebruikt ook `Common.layerApi(spec)`, maar vervangt daarna `collectFeatures` en `addToMap` om Borehole-features te decoreren met profiel-preview gedrag.

```js
const api = Common.layerApi(spec);
const collectFeatures = (result, opts) => Preview.attachToFeatures(
	Common.collectFeaturesForSpec(result, spec, opts || {}), result, opts || {});
```

De normale objectcollectie en geometry-resolutie blijven dus hetzelfde als bij andere entity layers. Het enige extra werk is dat `BoreholeProfilePreview.attachToFeatures(...)` op elke Borehole-feature een lazy preview generator zet.

## Feature contract

`attachToFeatures(features, result, options)` verwacht features die door `Common.createFeature(...)` zijn gemaakt, of ten minste een bronobject kunnen leveren via een van deze feature properties:

```js
feature.get("sikb:object")
feature.get("imsikb0101:Borehole")
feature.get("immetingen:Borehole")
feature.get("Borehole")
```

Voor elke feature met zo'n bronobject wordt gezet:

```js
feature.set("generate-svg-preview", () => { ... });
```

De kaartconsumer hoeft daardoor alleen `feature.get("generate-svg-preview")()` aan te roepen. De preview-helper zet bij eerste render ook:

```js
feature.set("sikb:profile", profile);
```

## Lazy profielopbouw

Standaard is de helper lazy:

```js
const lazy = !options || options.lazy !== false;
```

Dat betekent dat het profiel niet wordt opgebouwd tijdens het maken van de kaartfeatures. Pas wanneer `generate-svg-preview` wordt aangeroepen:

1. wordt een IMSIKB preview context gemaakt met `Profiles.createSikbPreviewContext(result)`;
2. wordt alleen voor deze ene Borehole `boreholeProfileForMapFeature(...)` uitgevoerd;
3. worden de intervals opgehaald via `Profiles.collectBoreholeProfileIntervals(...)`;
4. wordt de hover-SVG gerenderd met `Rendering.renderBoreholeProfileHoverPreview(...)`.

Dit is belangrijk voor kaartperformance: een kaartlaag met veel boringen kan snel worden getekend zonder voor alle boringen vooraf profiel-SVG's of volledige profielmodellen te bouwen.

Als `options.lazy === false`, gebruikt de helper de volledige collectie via `Profiles.collectBoreholeProfiles(result)` en indexeert hij profielen op Borehole id-keys. Dat is vooral nuttig wanneer je bewust alle profielen vooraf nodig hebt.

## API

`BoreholeProfilePreview.js` exporteert:

- `attachToFeatures(features, result, options)`: decoreert Borehole-features met `generate-svg-preview`.
- `boreholeProfileForMapFeature(result, context, borehole, index)`: maakt een profielmodel voor een enkele Borehole.
- `defaultRenderOptions(options)`: vertaalt kaart/render opties naar profiel-render opties.
- `mapFeatureProfilePatternScope(feature, index)`: maakt een stabiele SVG pattern scope per feature.

## Render options

`defaultRenderOptions(...)` geeft deze opties door aan de rendering-laag:

```js
{
	coordinateLabelOf,
	featureNameOf,
	formatDepthCm,
	inspectObjectFor,
	profileDataAttrs
}
```

Er zit bewust geen harde VCL-afhankelijkheid in deze helper. Een VCL-scherm mag inspectie- of formattercallbacks meegeven, maar de kaartpreview kan ook zonder die callbacks renderen.

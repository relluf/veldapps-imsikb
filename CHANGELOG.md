### `2026/08/05` Normalized SIKB Documents, richer profiles and domain-table snapshots

#### Parser-owned Document interpretation

* Adds [src/Document.js]() as the package-owned interpreter for validation results, legacy SIKB documents and modern GML feature collections, returning the normalized SIKB facet, capabilities, view and timing contract.
* Updates [src/profiles/xml.js]() to detect versions from modern namespace URIs and delegate interpretation to the new Document module with the parser-provided type and version.
* Simplifies [src/vcl-comps/Tabs$/Document.sikb.js]() so already normalized SIKB Documents pass through unchanged and other input is routed back through `Parser.run()`; [src/index.js]() exports the interpreter for package consumers.

#### Borehole profiles and preview controls

* Extends [src/profiles.js]() to read BRO-BHR-GT attributes embedded in SIKB 9.1 layers, derive readable material details and patterns, and determine whether a profile follows NEN 5104, NEN-EN-ISO 14688 or NEN 6693.
* Adds a fixed, content-aware material/filter/finishing/sample legend in [src/rendering/profiles.js]() and the matching layout and pattern styles in [src/vcl-comps/Tabs$/Document.sikb.css.js]().
* Gives [src/vcl-comps/Tabs$/Document.sikb.js]() a fixed clickable project header with URN labels resolved through the SIKB 9.1 lookups, SIKB 9.1 layer-property filters, a menubar toggle for the filter panel and explicit SIKB facet activation; the generic print action is hidden for this specialized view.

#### Domain-table acquisition and migration assets

* Changes [.gitignore]() to keep only macOS `.DS_Store` files out of version control, making the previously ignored tools and migration snapshots part of the repository.
* Adds [tools/scripts/download-sikb-domain-tables.js]() for reproducible catalog and table downloads and [tools/scripts/build-immetingen-new.js]() plus [tools/scripts/build-imsikb0101-new.js]() for converting a selected snapshot to package lookup structures.
* Adds the complete 166-table service snapshot under [tools/output/domain-tables/2026-07-01T02-00-29-836Z/](): six catalog/registry/metadata aggregate files, 58 Metingen tables, 84 SIKB0101 tables and 24 SIKB0102 tables, with zero recorded download failures.
* Adds the comparison/migration datasets [src/immetingen-old.json](), [src/imsikb0101-old.json]() and [src/imsikb0101-new.json]().

#### BoToVa artifacts and tests

* Adds the six-page BoToVa findings reference [tools/output/pdf/botova-sikb14-bevindingen.pdf]() and its intermediate/reference PDF and PNG renders under [tools/tmp/pdfs/]().
* Adds [test/Profiles.test.js]() for legacy profile composition, BRO material enrichment, description-norm selection, legend filtering, SIKB facet activation and domain-label regressions.
* Extends [test/ParserContract.test.js]() with the normalized facet contract and updates [package.json]() so parser and profile regressions both run under `npm test`.

### `2026/08/01` XML profile integration and SIKB parser improvements

#### XML profile support

* Adds `src/bxv.js` to register XML profiles with `Profiles` using priority-based registration.
* Adds `src/profiles/xml.js` for automatic SIKB XML profile detection.
* Detects SIKB XML from namespaces and known root elements (`<metainformatie>`, `<labresultaat>`, `<bodeminformatie>`).
* Adds XML version detection and profile-specific parser options.
* Enables `comments: "kvp"` automatically for SIKB `9.1.0`.
* Exposes parsed XML through `interpret()` with `capabilities.sikb`.

#### Parser improvements

* Updates `parseSikbDocument()` to accept pre-parsed input via `opts.parsed`.
* Reuses parsed XML, detected type, and version when available.
* Falls back to automatic detection only when parsed metadata is absent.
* Preserves existing parsing and entity-linking behavior.

#### Resource updates

* Switches lookup resources from `13.5` to the `current` dataset.
* Updates JSON table imports to use `./current/immetingen-all` and `./current/imsikb0101-all`.

#### UI

* Refactors SVG export visibility to detect an actual rendered `<svg>` in the preview.

* Removes the dedicated preview-tab selection helper.

* Prevents SVG export actions from appearing when no preview SVG is available.

* No explicit breaking API changes are introduced in this diff. 

### `2026/07/31` Package-owned SIKB document facet and safer 9.1 output

#### BXV integration contract

* Adds the package-owned SIKB XML profile and an explicit, idempotent `bxv.install()` entrypoint.
* Adds positive SIKB and generic XML fallback contract fixtures against the shared parser harness.

#### Document parsing and views

* Adds `Tabs<Document.sikb>` as the package-owned SIKB document specialization for validation results, legacy SIKB 9 documents and modern IMSIKB/IMMetingen feature collections.
* Restores domain-specific collection views at the client boundary while preserving normalized parser results and document capabilities.
* Adds GML/xlink resolution, cross-document linking and object inspection for related samples, analyses, characteristics and boreholes.
* Adds document summaries for projects, boreholes, locations, layers, characteristics, samples and analyses.

#### Profiles, filtering and testing

* Adds interactive SVG borehole profiles with soil patterns, intervals, samples, filters, finishing details, zooming, panning and click-through inspection.
* Adds lazy batched rendering for large profile collections with filtering by code, text, type, depth, date, diagnostics and domain-specific values.
* Adds sample-testing reports with BoToVa conclusions, severity ordering, parameter grouping and links back to their spatial and analytical context.
* Adds a dedicated CSS module for profile cards, filters, testing reports, tables, badges and SVG presentation.

#### Actions, exports and maps

* Adds SIKB validation actions for BRO SAD, laboratory, LIB, notification and investigation document variants.
* Adds BoToVa presets and custom testing actions, including linked testing documents and map-layer generation.
* Adds map actions for complete documents, projects, boreholes, soil locations, trenches, samples and testing results.
* Adds exports for filtered profile SVG, GeoJSON and the BKN Excel template.

#### Writer and package metadata

* Changes the SIKB 9.1 writer to emit key and barcode comments only when a numeric identifier is available, preventing `key: undefined` output.
* Updates the project index with current versions, rendering/testing modules and the package-owned VCL components.
* Changes the declared package version from `2.0.0` to `1.0.25`.

### `2026/07/07` Improve remediation labels and document legends

- Adds `remediationNameOf(obj)` in `src/js/nameOf/methods.js`.
- Uses remediation destination transitions as `"before => after"` labels.
- Falls back to `remediationReason` and `startTime` when destinations are missing.
- Supports both prefixed and unprefixed remediation keys.
- Applies remediation naming to `imsikb0101:Remediation` objects.
- Detects remediation-like objects by destination, reason, or `amountCleaned`.
- Adds geometry-type detection for document layer features.
- Adjusts document legend entries based on geometry type.
- Sets legend `radius` to `"0"` for surface and line geometries.
- Preserves point legend radius behavior.
- Avoids mutating original legend items by cloning entries.

### `2026/07/04` Document model, geometry and sample layer improvements

#### Features

* Adds `DocumentModel`-based layer context and object collection across `ol/layers/common.js`.
* Adds Borehole profile preview integration via `BoreholeProfilePreview`, including new preview-related API methods.
* Adds lazy loading support for Sample layers to reduce initial map load time.
* Adds grouped Sample rendering with optional grouped measurement sublayers.
* Adds support for `sam:shape` / `shape` geometry sources.
* Adds support for `@_xlink:href-resolved` when resolving display names.

#### Geometry & Parsing

* Improves geometry parsing to support nested `srsName` discovery.
* Adds support for `gml:coordinates` alongside `gml:pos` / `gml:posList`.
* Improves polygon extraction from `MultiSurface` and nested `Polygon` structures.
* Supports `MultiPolygon` creation when multiple polygons are present.
* Extends text extraction to recognize `_Data`, `_data` and `text` fields.

#### Performance

* Caches Sample, Borehole and Trench collections and lookup indices per document.
* Caches sample-to-measurement relationship resolution.
* Reuses cached geometries during feature creation.
* Adds timing instrumentation for Sample layer processing.

#### Improvements

* Unifies person name formatting across `immetingen`, `imsikb0101` and generic person objects.
* Expands supported depth field names (`topDepth`, `bottomDepth`, `upperdepth`, `lowerdepth`, `depth`) and additional unit identifiers.
* Prevents duplicate object indexing from overwriting existing entries.
* Stores source object references on generated OpenLayers features.
* Simplifies layer metadata by relying on `name` instead of explicit `title` definitions for multiple layer specs.

*No breaking API changes detected.*

### `2026/07/02` 2.0.0

**SIKB entity detection**

* `guess.js`: modern SIKB 11+/IMSIKB/IMMetingen detection.
* Wrapped entity recognition.
* Safer `hasOwnProperty` handling.

**Naming / display labels**

* `nameOf/methods.js`: sample names with depth ranges.
* Better formatting for depths, measures, URNs, finishing, samples.
* Numeric formatting via `Math.f`.

**Depth parsing / units**

* `common.js`: better nested value extraction.
* Correct unit handling for mm/cm/m.
* Adds `directValueForKeys`.

**URN lookup / tables**

* `urns.js`: switches lookup tables to `./current/...`.
* Safer aliases via `alias()`.
* Fixes accidental global `arr`.
* `lookup.js`: debug guard for empty URN.

**Map layers / styling**

* `Project.js`: updated project legend styling.
* `Testing.js`: major testing layer improvements:
  * groups testing features by source feature;
  * representative/severity-based judgement selection;
  * cleaner hints and legends;
  * unique testing layer keys;
  * default visible depth/parameter group;
  * cleanup of legacy testing nodes.

**Parsing / entity linking**

* `util.js`: still parses legacy and modern documents.
* Links `Analysis` back to `Sample`.
* Links `Characteristic` back to `Layer`.
* Uses current lookup tables.

### `2026/06/30` Bijgewerkt: [imsikb0101-all.json](src/current/:) en [immetingen-all.json](src/current/:)

* **[imsikb0101-new.json](src/:)**: 84 tabellen, 3732 waarden
* **[immetingen-new.json](src/:)**: 58 brontabellen, 62 wrappers, 11609 waarden

#### > [build-imsikb0101-new.js](tools/scripts/:)

- Oude file: 96 XML-wrapper-tabellen, 677 KB
- Nieuwe file: 84 `SIKB0101` service-tabellen, 1.1 MB
- Nieuwe waarden: 3.732
- Tabellen met `name !== technicalName`: 48
- Shape blijft runtime-compatible: `sikb.<TechnicalName>_c` met array `<TechnicalName>` en `ID`

Voor `Toetsoordelen` zit dit er nu in:

```json
{
  "@_naam": "ToetsOordeel",
  "@_technicalName": "Toetsoordelen",
  "@_urnDomain": "imsikb0101",
  "@_urnKey": "toetsoordelen"
}
```

En ID 79/91 zitten erin, inclusief de nieuwe service-metadata. De genormaliseerde runtime-vergelijking gaf 60 overlappende keys, 24 nieuwe keys en 35 verdwenen oude keys. Veel verschil komt door oude technische namen die nu explicieter/anders heten, zoals `aanleiding` versus `onderzoekaanleidingen`.

#### > [build-immetingen-new.js](scripts/:)

- 58 `Metingen` brontabellen
- 11.609 unieke servicewaarden
- 62 wrappers in JSON, omdat ik 4 alias-wrappers heb toegevoegd voor `name !== technicalName`
- Bestand: 4.5 MB

Belangrijk voor runtime/URNs: bij de bodemlaag-tabellen zijn beide vormen opgenomen. Bijvoorbeeld:

```text
sikb.BodemlaagBijzonderheden_c      // technicalName / URN key
sikb.BodemlaagBodemkenmerken_c      // name / bestaande runtime key
```

Daarmee blijven zowel `urn:immetingen:bodemlaagbijzonderheden:id:*` als bestaande code die `bodemlaagbodemkenmerken` verwacht bruikbaar.

Sanity checks:

- `MonsterType` ID 10 = `analysemonster`
- `Compartiment` ID 1 = `Bodem/Sediment`
- `BodemlaagBijzonderheden` en `BodemlaagBodemkenmerken` wijzen inhoudelijk naar dezelfde tabel
- Nieuwe runtime keys t.o.v. oud: o.a. `conserveringsmethode`, `limietsymboolreferentie`, `primertargetgen`
- Verdwenen t.o.v. oud: `grondsoort`, `grondsoortmediaan`

### TODOS

- Maybe we need some parse() options?
	- resolve urns, yes or no?

### 2020-12-23 - 1.0.24
- Updating in favor of `#VA-20201218-1` (ie. Arcadis SIKB/CSV-conversion - 1st order)
- Mainly refactored a lot of js/nameOf.methods 

### 2020-11-11 - 1.0.19
- Refactoring js/nameOf-methods over several packages (Rijkswaterstaat-demo)
- Finetuning js.nameOf more and more (_I don't know where I am going to_)

### 2020-11-09 - 1.0.16
- Developing SIKB 9 and 13

### 2020-10-28 - 1.0.15
- Introducing `traverse`

### 2020-10-06 - 1.0.14
- Added more `js.nameOf`-implementations

### 2020-10-06 - 1.0.13
- Developing tools/-section in order to auto-generate files like being introduced today:
	- imsikb0101-all.json
	- immetingen-all.json 

### 2020-10-04 - 1.0.12
- Contour_type added (13.5)
- js/nameOf/methods added

### 2020-09-07 - 1.0.11
- Added ParameterToetswaarden.json

### 2020-08-28 - 1.0.10
- Fine-tuning colors

### 2020-08-27 - 1.0.9
- Fine-tuning colors

### 2020-08-17 - 1.0.8
* <=AW (Sander Vermaat [S&R])

### 2020-08-16 - 1.0.7
* Updating for Veldoffice-geografie

### 2020-08-15 - 1.0.6
- **13.5/imsikb**: Adding Toetsingoordelen.json with Kleur, Afkorting and Toetskader properties

### 2020-08-08 - 1.0.5
- **13.5/immetingen**: Adding Eenheid.json

### 2020-08-04 (13.5)
* Downloaded all XML files (via tools)
* Added several JSON files based upon XML

### 2020-07-22
* Initial coding, taken from V7
* Adding 13.5/imsikb0101/Toetsingen-codes in JSON

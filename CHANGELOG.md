### 2026/07/02 2.0.0

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

### 2026/06/30 Bijgewerkt: [imsikb0101-all.json](src/current/:) en [immetingen-all.json](src/current/:)

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
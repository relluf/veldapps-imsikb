# veldapps-imsikb

`veldapps-imsikb` is het centrale domeinpackage voor het lezen, verrijken, presenteren, visualiseren en exporteren van SIKB/IMSIKB/IMMetingen-documenten binnen de Veldapps-stack.

## Hoofdfuncties

Het package combineert meerdere verantwoordelijkheden:

- SIKB-codelijsten en standaarden voor versies 9.1.0, 13.5, 14.8 en 14.9.
- XML-detectie en parsing van legacy SIKB en moderne IMSIKB/IMMetingen-documenten.
- Resolutie van GML-identifiers, URN’s, xlinks en relaties tussen domeinobjecten.
- Domeinmodellen voor projecten, locaties, boringen, lagen, monsters, analyses en kenmerken.
- Leesbare namen en labels voor SIKB-entiteiten.
- Interactieve boorprofielen en monstertoetsingsrapporten.
- OpenLayers-kaartlagen voor onder andere boringen, sleuven, bodemlocaties, monsters en toetsresultaten.
- BoToVa-toetsingen en classificatie van toetsresultaten.
- Exports naar SVG, GeoJSON en het BKN Excel-sjabloon.
- Een complete VCL-documentinterface voor inspectie, filtering, kaarten en acties.

## Opbouw

### Tabellen en standaarden

De versiemappen bevatten de daadwerkelijke domeintabellen en lookups:

- `src/9.1.0`: legacy SIKB, inclusief writer en oude lookups.
- `src/13.5`: oudere IMSIKB/IMMetingen-tabellen en BoToVa-gegevens.
- `src/14.8` en `src/14.9`: nieuwere gebundelde domeintabellen.
- `src/current` wijst momenteel naar versie `14.9`.

De URN- en lookupmodules maken deze tabellen programmatisch toegankelijk.

### Parsing en documentmodel

[DocumentXml.js](/Users/ralph/Workspaces/veldapps.com/veldapps-imsikb/src/DocumentXml.js) verzorgt XML-parsing en maakt een genormaliseerd resultaat met type, versie, view, capabilities en timing.

[DocumentModel.js](/Users/ralph/Workspaces/veldapps.com/veldapps-imsikb/src/DocumentModel.js) vormt daarboven een efficiënte domeinlaag. Het verzamelt objecttypen, bouwt indices en voorkomt herhaald diep doorzoeken van grote documenten.

De oudere [index.js](/Users/ralph/Workspaces/veldapps.com/veldapps-imsikb/src/index.js) ondersteunt daarnaast legacy documentstructuren en legt terugverwijzingen tussen bijvoorbeeld monsters, analyses en kenmerken.

### BXV-integratie

[bxv.js](/Users/ralph/Workspaces/veldapps.com/veldapps-imsikb/src/bxv.js) biedt een expliciete, idempotente `install()` waarmee het package zijn XML-profiel bij BXV registreert.

Het package-owned profiel:

- Herkent SIKB-documenten aan namespaces en documentstructuren.
- Bepaalt de SIKB-versie.
- Activeert commentaarverwerking voor 9.1.0.
- Markeert resultaten met de capability `sikb`.

### Profielen en toetsingen

[profiles.js](/Users/ralph/Workspaces/veldapps.com/veldapps-imsikb/src/profiles.js) verzamelt boringen, lagen, intervallen, monsters en gerelateerde analyses tot profielmodellen.

De renderingmodules maken daarvan:

- Interactieve SVG-boorprofielen.
- Bodempatronen en diepte-intervallen.
- Afwerkingen en filterconstructies.
- Klikbare monsters en analysecontext.
- BoToVa-monstertoetsingsrapporten.

### Kaartlagen

De modules onder `src/ol/layers` vertalen domeinobjecten naar OpenLayers-features en -lagen. De gedeelde infrastructuur verzorgt:

- Objectcollectie via het documentmodel.
- Geometry-detectie voor punten, polygonen en multisurfaces.
- Transformatie naar RD (`EPSG:28992`).
- Caching van geometrieën en relaties.
- Featuremetadata en legends.
- Lazy profielpreviews voor boorpunten.

### VCL-interface

[Document.sikb.js](/Users/ralph/Workspaces/veldapps.com/veldapps-imsikb/src/vcl-comps/Tabs$/Document.sikb.js) is de package-owned documentspecialisatie. Deze grote UI-module brengt vrijwel alles samen:

- Documentoverzichten en objectcollecties.
- Profielkaarten en filters.
- Toetsingsrapporten.
- Objectinspectie en onderlinge navigatie.
- Validatie- en BoToVa-acties.
- Kaartlagen.
- SVG-, GeoJSON- en Excel-exports.

## Technische vorm

Het package gebruikt voornamelijk AMD-modules met `define()` en is sterk geïntegreerd met:

- VCL
- BXV Parser
- `veldapps-xml`
- OpenLayers
- De gedeelde `js`-runtime

Het is daarmee vooral een intern Veldapps-platformpackage, geen zelfstandig generiek npm-package.

## Publieke moderne API

[core.js](/Users/ralph/Workspaces/veldapps.com/veldapps-imsikb/src/core.js) bundelt de modernere API rond:

- `DocumentModel`
- Object- en referentiehelpers
- Diepteberekeningen
- Geometry-conversie
- Profielcollectie
- GeoJSON- en BKN-export
- Lazy boorprofielpreviews

## Versie en tests

De huidige packageversie is `1.0.26`. De beschikbare geautomatiseerde test is momenteel vooral een parsercontracttest:

- Controleert dat installatie idempotent is.
- Controleert herkenning van een SIKB 14.9-document.
- Controleert dat generieke XML naar het standaard BXV-profiel terugvalt.

De dekking van de omvangrijke UI-, kaart-, profiel- en BoToVa-functionaliteit is vooralsnog grotendeels niet geautomatiseerd.
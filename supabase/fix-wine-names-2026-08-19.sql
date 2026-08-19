-- Namenskorrektur: 77 Weine (Kategorie A + B + 3 recherchierte Fehler)
-- Erzeugt 2026-08-19 -- vor Ausfuehrung: lokale Sicherung liegt vor unter
-- backups/wines-backup-2026-08-19-vor-namenskorrektur.json
--
-- Im Supabase Dashboard -> SQL Editor einfuegen und ausfuehren.
-- Jede Zeile aendert genau einen Wein per id (Primaerschluessel), betrifft
-- ausschliesslich das Namensfeld (bei Francisco Barona zusaetzlich Region/
-- Rebsorte, die vorher leer waren). Keine Zeilen werden geloescht.

-- Kategorie A: Appellation+Klassifikation -> Chateau-Name (69)
UPDATE public.wines SET name = 'Château Giscours' WHERE id = '3a2e2ff8-b3ff-4f9e-a8bb-65e103502431'; -- war: Château Giscours (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Giscours' WHERE id = '990bf521-9674-4bd6-ac22-05f490917958'; -- war: Château Giscours (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Giscours' WHERE id = 'd3f08fef-44f0-4863-8c7a-82f87535c9a2'; -- war: Château Giscours (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Giscours' WHERE id = '056e65be-06c5-4c2c-b67d-3274bcbc8dce'; -- war: Château Giscours (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Brane-Cantenac' WHERE id = '64095540-6331-4563-902f-30f0412050f5'; -- war: Margaux (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Brane-Cantenac' WHERE id = '6f1ff502-b975-4940-8de7-7fd26928c427'; -- war: Margaux (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Cantenac Brown' WHERE id = '72cf9fc9-a74d-4729-9e76-09868e657edb'; -- war: Margaux (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Malescot St. Exupery' WHERE id = '6d955e81-7b9a-4567-aac2-8120629c9e40'; -- war: Margaux (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Brane-Cantenac' WHERE id = '8aa99e9c-8af4-4f3a-8848-204ae3196570'; -- war: Margaux (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Cantenac Brown' WHERE id = '316162e5-d415-42d1-a466-0ff15df04707'; -- war: Margaux (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Cantenac Brown' WHERE id = 'db6af1e5-1f0b-439d-b9c5-c8d16cc8ad0f'; -- war: Margaux (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Malescot St. Exupery' WHERE id = '6fb93bc6-b83b-4a3a-836a-b32eaccadfd5'; -- war: Margaux (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Lascombes' WHERE id = '7f53761d-2bfe-4e90-9eb4-8f0bfbbc216d'; -- war: Margaux (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Pontet-Canet' WHERE id = 'ae378d01-d3d6-44c3-b3ae-c6651b6373db'; -- war: Pauillac (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Pontet-Canet' WHERE id = 'c558d23d-2b6b-4ef0-a65b-a1dbef7e13de'; -- war: Pauillac (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Haut-Bages Libéral' WHERE id = '6e103397-3bc6-4d88-a462-30561e9381b8'; -- war: Pauillac (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Haut-Bages Libéral' WHERE id = '9c7adf02-ea37-4a13-bf4c-1b790dfe3310'; -- war: Pauillac (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Pichon Longueville Comtesse de Lalande' WHERE id = '9a3ddeb2-b544-48d8-805c-246ea856468b'; -- war: Pauillac (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Grand-Puy-Lacoste' WHERE id = '650c3673-2eb2-484e-be53-4d56f26cfdfb'; -- war: Pauillac (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Batailley' WHERE id = 'a7f8e957-667e-4514-a90d-d349193950ea'; -- war: Pauillac (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Grand-Puy-Lacoste' WHERE id = '905b862b-b53b-4799-92c6-cfcbddd36587'; -- war: Pauillac (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Grand-Puy-Lacoste' WHERE id = 'e141fe99-71a3-4b4f-beb4-91bdb821b042'; -- war: Pauillac (Grand Cru Classé)
UPDATE public.wines SET name = 'Domaine de Chevalier' WHERE id = 'cf1a90ec-adb0-495c-85e1-0a0488326c35'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Château Malartic-Lagravière' WHERE id = '909a3222-5282-4229-a936-0caf62309c80'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Château Malartic-Lagravière' WHERE id = '43c4655d-aa4d-4d75-80b8-26c366ec5cb0'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Château Malartic-Lagravière' WHERE id = '155977c5-ac17-4a3c-ba37-def1c811cb8d'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Château Pape Clément' WHERE id = 'da5d7f70-b4ff-4bff-9680-6378e049d93c'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Domaine de Chevalier' WHERE id = '4b6521b7-b7e1-4c8d-8ab6-27d2665e14ad'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Château de Fieuzal' WHERE id = '529cf0aa-e66d-4dc4-9875-64b2fb40d678'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Château de Fieuzal' WHERE id = '53fc1a61-94c7-40e7-8208-4266c0604c62'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Château de Fieuzal' WHERE id = '5a4b36ed-dda4-459d-a213-7baaf9f4c4e9'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Domaine de Chevalier' WHERE id = '37da2614-92f0-496e-b964-77342dbeafd8'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Domaine de Chevalier' WHERE id = '04669d65-eb9a-4b8b-a4ed-7ee1cb5b32b7'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Domaine de Chevalier' WHERE id = '384f56dd-ff3b-4f23-b5db-d80dc258f774'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Domaine de Chevalier' WHERE id = '3e879049-6892-4f6a-a0ff-f00f62334aed'; -- war: Pessac-Léognan (Grand Cru Classé de Graves)
UPDATE public.wines SET name = 'Château Tour Saint-Christophe' WHERE id = 'ea6f683b-88d3-4c06-86f9-98215b216a41'; -- war: Saint-Émilion Grand Cru
UPDATE public.wines SET name = 'Château Tour Saint-Christophe' WHERE id = '5dfb0869-da59-49da-807a-49880b69bf14'; -- war: Saint-Émilion Grand Cru
UPDATE public.wines SET name = 'Clos Saint-Julien' WHERE id = '3bbca93f-5b0e-442c-83cb-8bbe5e0479b5'; -- war: Saint-Émilion Grand Cru
UPDATE public.wines SET name = 'Château Laroque' WHERE id = '94173f78-b78c-4866-97f0-196a1bf0a0af'; -- war: Saint-Émilion Grand Cru (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Jean Faure' WHERE id = 'c9f47ecb-79b7-4c2f-a1f0-0b0eaf86b09d'; -- war: Saint-Émilion Grand Cru (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Faugères' WHERE id = '62640edf-a3bb-44b2-b45f-bffcd6f564f4'; -- war: Saint-Émilion Grand Cru (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Laroque' WHERE id = 'c09bf703-fc7d-4351-9f51-3ec0596a3f8a'; -- war: Saint-Émilion Grand Cru (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Faugères' WHERE id = 'e171e3dd-bc38-456a-8da9-21843e79779f'; -- war: Saint-Émilion Grand Cru (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Beau-Sejour Becot' WHERE id = '0be6e6c3-5db3-4fd3-a350-635e62ef2f4e'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Beau-Sejour Becot' WHERE id = '31b842aa-a229-47a3-b4b5-2d1de556fd20'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Beau-Sejour Becot' WHERE id = '4d070a0e-430f-4093-b3c5-c4d79fac2507'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Beau-Sejour Becot' WHERE id = '2479237b-0dc7-40ba-85ad-118f68d58c09'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château La Gaffelière' WHERE id = 'a1f01769-beea-4bbc-806e-f0320ed502a9'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Troplong Mondot' WHERE id = '64f47286-0b59-4fea-9332-34bda80c4484'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Canon-La-Gaffelière' WHERE id = '1dcbbdae-f6d9-484f-9532-186102e182e1'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Figeac' WHERE id = '4f4f3061-3e07-451c-8fc9-3821f688295d'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Larcis Ducasse' WHERE id = 'e36618f0-24cf-487e-9463-8386a68a2af3'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Beau-Sejour Becot' WHERE id = 'dcd277eb-7065-4ba5-b56d-b0a6e3ef352a'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Beau-Sejour Becot' WHERE id = 'a5bb9fc1-bd15-43c9-88cb-44dbfc13994a'; -- war: Saint-Émilion Grand Cru (Premier Grand Cru Classé)
UPDATE public.wines SET name = 'Château Phélan Ségur' WHERE id = '99e4409a-9151-402d-a1d1-9da7aee6f65d'; -- war: Saint-Estèphe
UPDATE public.wines SET name = 'Château Phélan Ségur' WHERE id = '37248590-c073-4e2a-9b35-e8d62ac49a39'; -- war: Saint-Estèphe
UPDATE public.wines SET name = 'Château Tronquoy' WHERE id = '67657eee-3b52-4e7e-b732-44f79ca9dde3'; -- war: Saint-Estèphe
UPDATE public.wines SET name = 'Château Phélan Ségur' WHERE id = '851fc43c-6615-41ba-8c0c-96f0a3a2823c'; -- war: Saint-Estèphe
UPDATE public.wines SET name = 'Château Phélan Ségur' WHERE id = 'ed30f36e-bc45-4930-9cfd-ce57ce8efd37'; -- war: Saint-Estèphe
UPDATE public.wines SET name = 'Château Montrose' WHERE id = 'a515e8e7-8eb8-4cfc-bc54-3deac97b5585'; -- war: Saint-Estèphe (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Branaire-Ducru' WHERE id = 'd3a17e30-fea4-40e5-bebb-6e854a0d0357'; -- war: Saint-Julien (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Langoa Barton' WHERE id = 'c9d7d980-41e8-408b-87d5-1ee34dcbac34'; -- war: Saint-Julien (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Léoville Barton' WHERE id = '1d8bf447-eec4-415a-8e0f-5f7bafd4bae7'; -- war: Saint-Julien (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Branaire-Ducru' WHERE id = 'd3f93c7e-79ed-4672-bad6-0daae6936e96'; -- war: Saint-Julien (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Branaire-Ducru' WHERE id = '5d87d9d3-49bc-441c-88c0-b0b2af65f60c'; -- war: Saint-Julien (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Branaire-Ducru' WHERE id = 'cc3790b2-ad08-4110-a373-3971112103d4'; -- war: Saint-Julien (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Langoa Barton' WHERE id = 'a00520aa-cf7d-4e6a-8b8e-a9123178c6eb'; -- war: Saint-Julien (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Lagrange' WHERE id = '9fb90ef2-f0d8-4df7-bb1a-0b964807eee0'; -- war: Saint-Julien (Grand Cru Classé)
UPDATE public.wines SET name = 'Château Léoville Barton' WHERE id = '4c3e81f1-827d-46fc-942d-bc63d3f1a6bd'; -- war: Saint-Julien (Grand Cru Classé)

-- Kategorie B: Zweitwein-Namen getrimmt (5)
UPDATE public.wines SET name = 'L''Aura de Cambon' WHERE id = '3074b94b-2738-4896-bd9e-4829dcce2766'; -- war: L'Aura de Cambon Margaux
UPDATE public.wines SET name = 'La Dame de Montrose' WHERE id = '44406b7d-85e5-4f30-a300-62e750b2b7c4'; -- war: La Dame de Montrose Saint-Estèphe
UPDATE public.wines SET name = 'La Dame de Montrose' WHERE id = 'a9bbd4bb-b007-4c88-8c25-7c72a73b8ba6'; -- war: La Dame de Montrose Saint-Estèphe
UPDATE public.wines SET name = 'La Goutte Rouge Denis Darriet' WHERE id = '86d0e166-8f4d-46f1-aa5b-079ce7475e86'; -- war: La Goutte Rouge Denis Darriet Pessac-Léognan
UPDATE public.wines SET name = 'Réserve de la Comtesse' WHERE id = '8586899d-ee38-464b-bd9e-59d5e764f0e0'; -- war: Réserve (de la Comtesse) Pauillac

-- Recherchierte Einzelfehler (3)
UPDATE public.wines SET name = 'Orma' WHERE id = '76495585-d06f-4ea6-87fb-c664afe1c00b'; -- war: Toscana
UPDATE public.wines SET name = 'Clos Louie' WHERE id = '509ee225-8d06-4e90-a7cb-df18a8a66632'; -- war: Rouge
UPDATE public.wines SET name = 'Francisco Barona', region = 'Ribera del Duero', grape_variety = 'Tinto Fino (Tempranillo)' WHERE id = '02ee4666-3843-4d49-ba14-041cbad94353'; -- war: Tinto (Region/Rebsorte vorher leer)

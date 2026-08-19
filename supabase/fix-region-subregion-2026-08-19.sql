-- Region/Subregion-Korrektur: 85 Weine (Appellation -> uebergeordnete Region)
-- Erzeugt 2026-08-19.
--
-- Bisher stand bei Bordeaux-/Piemonte-/Toscana-Weinen die spezifische
-- Appellation (z.B. "Margaux", "Barolo", "Chianti Classico") direkt im
-- Region-Feld - die uebergeordnete, bekannte Weinregion ("Bordeaux",
-- "Piemonte", "Toscana") tauchte nirgends auf. Ab jetzt: Region = die
-- uebergeordnete Region, Subregion = die spezifische Appellation.
--
-- Bei 14 Weinen wird dabei eine bisher feinere Subregion-Angabe (Gemeinde/
-- Cru, z.B. "Leognan") durch die Appellation ersetzt (z.B. "Pessac-
-- Leognan") - bewusst so entschieden, siehe Chat-Verlauf. Spanische/
-- sonstige Regionen (Rioja, Ribera del Duero etc.) bleiben unveraendert,
-- da dort keine bekannte, uebliche uebergeordnete Region existiert.
--
-- Im Supabase Dashboard -> SQL Editor einfuegen und ausfuehren.

UPDATE public.wines SET region = 'Piemonte', subregion = 'Barolo' WHERE id = '2acab0ee-d952-4b44-9f47-8278e110893f'; -- Barolo Ravera
UPDATE public.wines SET region = 'Toscana', subregion = 'Brunello di Montalcino' WHERE id = '07f69deb-4b4f-49be-a79d-fd5d243784dc'; -- Brunello di Montalcino
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = 'a7f8e957-667e-4514-a90d-d349193950ea'; -- Château Batailley
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = 'a5bb9fc1-bd15-43c9-88cb-44dbfc13994a'; -- Château Beau-Sejour Becot
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion Grand Cru' WHERE id = '4d070a0e-430f-4093-b3c5-c4d79fac2507'; -- Château Beau-Sejour Becot
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = '2479237b-0dc7-40ba-85ad-118f68d58c09'; -- Château Beau-Sejour Becot
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = '31b842aa-a229-47a3-b4b5-2d1de556fd20'; -- Château Beau-Sejour Becot
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = '0be6e6c3-5db3-4fd3-a350-635e62ef2f4e'; -- Château Beau-Sejour Becot
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = 'dcd277eb-7065-4ba5-b56d-b0a6e3ef352a'; -- Château Beau-Sejour Becot
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Julien' WHERE id = '5d87d9d3-49bc-441c-88c0-b0b2af65f60c'; -- Château Branaire-Ducru
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Julien' WHERE id = 'd3a17e30-fea4-40e5-bebb-6e854a0d0357'; -- Château Branaire-Ducru
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Julien' WHERE id = 'd3f93c7e-79ed-4672-bad6-0daae6936e96'; -- Château Branaire-Ducru
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Julien' WHERE id = 'cc3790b2-ad08-4110-a373-3971112103d4'; -- Château Branaire-Ducru
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '8aa99e9c-8af4-4f3a-8848-204ae3196570'; -- Château Brane-Cantenac
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '64095540-6331-4563-902f-30f0412050f5'; -- Château Brane-Cantenac
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '6f1ff502-b975-4940-8de7-7fd26928c427'; -- Château Brane-Cantenac
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = '1dcbbdae-f6d9-484f-9532-186102e182e1'; -- Château Canon-La-Gaffelière
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = 'db6af1e5-1f0b-439d-b9c5-c8d16cc8ad0f'; -- Château Cantenac Brown
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '72cf9fc9-a74d-4729-9e76-09868e657edb'; -- Château Cantenac Brown
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '316162e5-d415-42d1-a466-0ff15df04707'; -- Château Cantenac Brown
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '53fc1a61-94c7-40e7-8208-4266c0604c62'; -- Château de Fieuzal
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '5a4b36ed-dda4-459d-a213-7baaf9f4c4e9'; -- Château de Fieuzal
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '529cf0aa-e66d-4dc4-9875-64b2fb40d678'; -- Château de Fieuzal
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = 'e171e3dd-bc38-456a-8da9-21843e79779f'; -- Château Faugères
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = '62640edf-a3bb-44b2-b45f-bffcd6f564f4'; -- Château Faugères
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = '4f4f3061-3e07-451c-8fc9-3821f688295d'; -- Château Figeac
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '990bf521-9674-4bd6-ac22-05f490917958'; -- Château Giscours
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '056e65be-06c5-4c2c-b67d-3274bcbc8dce'; -- Château Giscours
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '3a2e2ff8-b3ff-4f9e-a8bb-65e103502431'; -- Château Giscours
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = 'd3f08fef-44f0-4863-8c7a-82f87535c9a2'; -- Château Giscours
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = '650c3673-2eb2-484e-be53-4d56f26cfdfb'; -- Château Grand-Puy-Lacoste
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = 'e141fe99-71a3-4b4f-beb4-91bdb821b042'; -- Château Grand-Puy-Lacoste
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = '905b862b-b53b-4799-92c6-cfcbddd36587'; -- Château Grand-Puy-Lacoste
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = '6e103397-3bc6-4d88-a462-30561e9381b8'; -- Château Haut-Bages Libéral
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = '9c7adf02-ea37-4a13-bf4c-1b790dfe3310'; -- Château Haut-Bages Libéral
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion Grand Cru' WHERE id = 'c9f47ecb-79b7-4c2f-a1f0-0b0eaf86b09d'; -- Château Jean Faure
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = 'a1f01769-beea-4bbc-806e-f0320ed502a9'; -- Château La Gaffelière
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Julien' WHERE id = '9fb90ef2-f0d8-4df7-bb1a-0b964807eee0'; -- Château Lagrange
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Julien' WHERE id = 'c9d7d980-41e8-408b-87d5-1ee34dcbac34'; -- Château Langoa Barton
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Julien' WHERE id = 'a00520aa-cf7d-4e6a-8b8e-a9123178c6eb'; -- Château Langoa Barton
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion Grand Cru' WHERE id = 'e36618f0-24cf-487e-9463-8386a68a2af3'; -- Château Larcis Ducasse
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion Grand Cru' WHERE id = '94173f78-b78c-4866-97f0-196a1bf0a0af'; -- Château Laroque
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = 'c09bf703-fc7d-4351-9f51-3ec0596a3f8a'; -- Château Laroque
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '7f53761d-2bfe-4e90-9eb4-8f0bfbbc216d'; -- Château Lascombes
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Julien' WHERE id = '1d8bf447-eec4-415a-8e0f-5f7bafd4bae7'; -- Château Léoville Barton
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Julien' WHERE id = '4c3e81f1-827d-46fc-942d-bc63d3f1a6bd'; -- Château Léoville Barton
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '155977c5-ac17-4a3c-ba37-def1c811cb8d'; -- Château Malartic-Lagravière
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '43c4655d-aa4d-4d75-80b8-26c366ec5cb0'; -- Château Malartic-Lagravière
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '909a3222-5282-4229-a936-0caf62309c80'; -- Château Malartic-Lagravière
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '6d955e81-7b9a-4567-aac2-8120629c9e40'; -- Château Malescot St. Exupery
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Margaux' WHERE id = '6fb93bc6-b83b-4a3a-836a-b32eaccadfd5'; -- Château Malescot St. Exupery
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Estèphe' WHERE id = 'a515e8e7-8eb8-4cfc-bc54-3deac97b5585'; -- Château Montrose
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = 'da5d7f70-b4ff-4bff-9680-6378e049d93c'; -- Château Pape Clément
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Estèphe' WHERE id = '99e4409a-9151-402d-a1d1-9da7aee6f65d'; -- Château Phélan Ségur
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Estèphe' WHERE id = '851fc43c-6615-41ba-8c0c-96f0a3a2823c'; -- Château Phélan Ségur
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Estèphe' WHERE id = 'ed30f36e-bc45-4930-9cfd-ce57ce8efd37'; -- Château Phélan Ségur
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Estèphe' WHERE id = '37248590-c073-4e2a-9b35-e8d62ac49a39'; -- Château Phélan Ségur
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = '9a3ddeb2-b544-48d8-805c-246ea856468b'; -- Château Pichon Longueville Comtesse de Lalande
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = 'ae378d01-d3d6-44c3-b3ae-c6651b6373db'; -- Château Pontet-Canet
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = 'c558d23d-2b6b-4ef0-a65b-a1dbef7e13de'; -- Château Pontet-Canet
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion' WHERE id = '5dfb0869-da59-49da-807a-49880b69bf14'; -- Château Tour Saint-Christophe
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion Grand Cru' WHERE id = 'ea6f683b-88d3-4c06-86f9-98215b216a41'; -- Château Tour Saint-Christophe
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Estèphe' WHERE id = '67657eee-3b52-4e7e-b732-44f79ca9dde3'; -- Château Tronquoy
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion Grand Cru' WHERE id = '64f47286-0b59-4fea-9332-34bda80c4484'; -- Château Troplong Mondot
UPDATE public.wines SET region = 'Toscana', subregion = 'Chianti Classico' WHERE id = '8cfd4a45-764b-4369-bd5a-c256bace903c'; -- Chianti Classico Vigneto Gran Selezione San Lorenzo
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Castillon Côtes de Bordeaux' WHERE id = '509ee225-8d06-4e90-a7cb-df18a8a66632'; -- Clos Louie
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion Grand Cru' WHERE id = '3bbca93f-5b0e-442c-83cb-8bbe5e0479b5'; -- Clos Saint-Julien
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Estèphe' WHERE id = '80c7f923-e817-43da-83be-1f0d6ba9edd8'; -- Cos d'Estournel
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = 'cf1a90ec-adb0-495c-85e1-0a0488326c35'; -- Domaine de Chevalier
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '4b6521b7-b7e1-4c8d-8ab6-27d2665e14ad'; -- Domaine de Chevalier
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '3e879049-6892-4f6a-a0ff-f00f62334aed'; -- Domaine de Chevalier
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '37da2614-92f0-496e-b964-77342dbeafd8'; -- Domaine de Chevalier
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '04669d65-eb9a-4b8b-a4ed-7ee1cb5b32b7'; -- Domaine de Chevalier
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '384f56dd-ff3b-4f23-b5db-d80dc258f774'; -- Domaine de Chevalier
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Haut-Médoc' WHERE id = '3074b94b-2738-4896-bd9e-4829dcce2766'; -- L'Aura de Cambon
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Estèphe' WHERE id = '44406b7d-85e5-4f30-a300-62e750b2b7c4'; -- La Dame de Montrose
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Estèphe' WHERE id = 'a9bbd4bb-b007-4c88-8c25-7c72a73b8ba6'; -- La Dame de Montrose
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pessac-Léognan' WHERE id = '86d0e166-8f4d-46f1-aa5b-079ce7475e86'; -- La Goutte Rouge Denis Darriet
UPDATE public.wines SET region = 'Toscana', subregion = 'Bolgheri' WHERE id = '76495585-d06f-4ea6-87fb-c664afe1c00b'; -- Orma
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Pauillac' WHERE id = '8586899d-ee38-464b-bd9e-59d5e764f0e0'; -- Réserve de la Comtesse
UPDATE public.wines SET region = 'Toscana', subregion = 'Maremma Toscana' WHERE id = '36465fd9-0237-4bee-b498-f5c3d238c75b'; -- Saffredi
UPDATE public.wines SET region = 'Toscana', subregion = 'Bolgheri' WHERE id = '90c3e2ab-fab9-451b-8b02-7c94b05b97bc'; -- Sor Ugo
UPDATE public.wines SET region = 'Bordeaux', subregion = 'Saint-Émilion Grand Cru' WHERE id = 'f27d0171-541e-4901-b53a-70e2c0b27329'; -- Troplong Mondot
UPDATE public.wines SET region = 'Toscana', subregion = 'Brunello di Montalcino' WHERE id = '23b5439a-c96e-4582-b169-5f5275609279'; -- Brunello di Montalcino (Casanova di Neri)
UPDATE public.wines SET region = 'Toscana', subregion = 'Chianti Classico' WHERE id = 'ecd41257-3f40-4688-97a7-99ebeb6330a0'; -- Siepi

# Journal des versions — Access

Le numéro de version se met à jour dans `src/lib/version.ts` (pied de page et fenêtre « À propos » le lisent).

Chaque version qui change quelque chose de visible pour l'équipe a une puce « Nouveauté : … », en langage courant : c'est la seule phrase affichée sur la page « Nouveautés » de l'Accueil.

## 2.22 — 10 novembre 2026

- Nouveauté : dans le menu des applis, la ligne « Rechercher » est alignée avec les autres.

## 2.21 — 10 novembre 2026

- Nouveauté : Ctrl+K ouvre la recherche de l'Accueil (applis, chantiers, fiches Index, notes Check) dans un nouvel onglet ; le menu de l'appli propose aussi « Rechercher ».

## 2.20 — 10 novembre 2026

- Nouveauté : un bouton « Noter dans Check » sur chaque fournisseur ouvre Check avec le début de la note déjà écrit.

## 2.19 — 9 novembre 2026

- Nouveauté : au téléphone, les fiches fournisseurs n'affichent plus les rubriques vides (Contact, Accès, Notes) : les cartes sont plus courtes.

## 2.18 — 9 novembre 2026

- Nouveauté : au téléphone, les liens du pied de page (« Conçu par », « Sauvegarde », « Suggestion / bug ») se touchent plus facilement.

## 2.17 — 8 novembre 2026

- Technique : nettoyage de la configuration, qui pointait encore vers d'anciens projets Supabase ; aucun changement visible.

## 2.16 — 8 novembre 2026

- Technique : les données sont passées sur le nouveau serveur Supabase en Suisse (adresse, clé et mémoire de connexion mises à jour). Il faut se reconnecter une fois.

## 2.15 — 7 novembre 2026

- Correction : le texte de l'écran de connexion est raccourci pour tenir sur une ligne.

## 2.14 — 7 novembre 2026

- Nouveauté : le menu des applis propose maintenant Joint (dilatation et joints) et Membrane (étanchéité).

## 2.13 — 6 novembre 2026

- Le menu des applis propose Joint (en préparation), pour le concepteur seulement : aucune Nouveauté à annoncer à l'équipe.

## 2.12 — 5 novembre 2026

- Nouveauté : la « Personne de contact » d'un fournisseur a maintenant aussi un email (cliquable pour écrire, avec l'objet « Demande d'information » pré-rempli).
- Un script SQL est à lancer une fois dans Supabase (`supabase/migrations/20261105100000_access_contact_email.sql`).

## 2.11 — 5 novembre 2026

- Nouveauté : dans la fiche d'un fournisseur, « Email du service technique » est remplacé par « Personne de contact » : une petite flèche déroule nom, prénom et téléphone. L'email général (info@fournisseur) reste.
- Nouveauté : sans compte validé, on ne peut plus télécharger la sauvegarde JSON (l'import était déjà réservé aux comptes).
- Un script SQL est à lancer une fois dans Supabase (`supabase/migrations/20261105090000_access_contact.sql`). Les anciens emails techniques restent en base mais ne sont plus affichés.

## 2.10 — 4 novembre 2026

- Nouveauté : un encart « Fournisseurs d'Index sans fiche ici » liste les fournisseurs cités dans les fiches d'Index qui n'ont pas encore de fiche dans l'annuaire, avec un bouton « Créer la fiche » qui pré-remplit le nom. Visible pour les comptes validés.

## 2.9 — 4 novembre 2026

- Nouveauté : la connexion d'Access est maintenant la même que celle d'Index, Masse, Format, Strate et Check : se connecter dans l'une suffit pour toutes. Une seule reconnexion est nécessaire dans Access après cette mise à jour.

## 2.8 — 3 novembre 2026

- Nouveauté : un lien depuis une fiche d'Index ouvre l'annuaire directement sur le bon fournisseur : la recherche est remplie à sa place et sa ligne est surlignée quelques secondes.
- L'adresse accepte `?fournisseur=` suivi de l'identifiant ou du nom du fournisseur.

## 2.7 — 1er novembre 2026

- Nouveauté : dans l'annuaire, un clic sur une note la déroule en entier (et un second clic la referme), au lieu de la laisser coupée.

## 2.6 — 1er novembre 2026

- Nouveauté : sur téléphone, l'annuaire s'affiche en cartes et une adresse de site invalide est signalée avant l'enregistrement.
- Le site et le site CAO sont vérifiés à la saisie : message sous le champ, enregistrement bloqué tant que l'adresse est fausse.
- Chaque domaine affiche 30 fournisseurs, puis « Afficher la suite » ; la recherche et le filtre montrent toujours tous les résultats.
- Si la base est injoignable, un bouton « Réessayer » évite de recharger la page.
- Un lien « Aller à la recherche » apparaît au premier appui sur Tab.
- À côté de « Connexion requise », un bouton « Me connecter ».
- Boutons plus grands sur téléphone (44 px), bandeau resserré.

## 2.5 — 1er novembre 2026

- Nouveauté : le mode clair ou sombre que tu choisis dans une appli est repris dans toutes les autres.
- Le réglage clair / sombre est aussi enregistré dans une clé commune à toutes les applis (`outils-theme`, même site) ; la clé propre à l'appli est conservée.

## 2.4 — 31 octobre 2026

- Disparition de l'avertissement technique « React #418 » dans la console du navigateur : le contenu s'affiche une fois la page chargée, au lieu de se télescoper avec la page de départ générée au build. Aucun changement visible.

## 2.3 — 31 octobre 2026

- Toutes les applis sont maintenant sur GitHub Pages : le sélecteur d'applis pointe vers `https://outils-hn.github.io/<Appli>/` à la place des adresses Lovable. Les liens vers les fiches d'Index (`?fiche=`, `?q=`, création de compte) ouvrent `https://outils-hn.github.io/Index/`.

## 2.2 — 31 octobre 2026

- Publication sur GitHub Pages (`https://outils-hn.github.io/Access/`) : l'appli est construite en mode SPA statique, sans serveur.
- Nouveau workflow « Pages » : construction avec le sous-dossier `/Access/`, page de repli `404.html`, déploiement automatique à chaque fusion sur `main`.
- Mise à jour de la configuration de build (`@lovable.dev/vite-tanstack-config` 2.25.3, TanStack Start 1.168.60, Router 1.170.41) pour produire la version statique, comme les autres applis. `bun.lock` sera actualisé au prochain `bun install`.
- Pages « Page introuvable » et « Cette page ne s'est pas chargée » en français.

## 2.1 — 31 octobre 2026

- Adresses mises à jour après le renommage du compte GitHub en `outils-hn` : « Suggestion / bug » ouvre l'Accueil sur `https://outils-hn.github.io/`, et le sélecteur d'applis pointe vers Strate (`https://outils-hn.github.io/Strate/`) et Trame (`https://outils-hn.github.io/Trame/`), publiées sur GitHub Pages.
